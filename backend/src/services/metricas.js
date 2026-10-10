// Desempenho dos negócios (estatísticas do painel).
//
// Privacidade: o banco guarda só "negócio, dia, tipo, quantidade". Ninguém é
// identificado: sem cookie, sem IP gravado. Para a mesma pessoa recarregando a
// página não inflar os números, a memória do servidor guarda por 30 minutos
// uma marca anônima (hash do IP + navegador com um sal sorteado na subida do
// servidor). Ela nunca vai para o banco e some ao reiniciar.
//
// O dono do negócio e a administração não contam como visitantes.
import { createHash, randomBytes } from 'node:crypto';
import prisma from '../config/prisma.js';
import { estaPublicado } from './publicacao.js';

export const TIPOS = Object.freeze({
  VISUALIZACAO_PERFIL: 'VISUALIZACAO_PERFIL',
  CLIQUE_WHATSAPP: 'CLIQUE_WHATSAPP',
  CLIQUE_TELEFONE: 'CLIQUE_TELEFONE',
  CLIQUE_ENDERECO: 'CLIQUE_ENDERECO',
  CLIQUE_INSTAGRAM: 'CLIQUE_INSTAGRAM',
  VISUALIZACAO_PRODUTO: 'VISUALIZACAO_PRODUTO',
  IMPRESSAO_DESTAQUE: 'IMPRESSAO_DESTAQUE',
});

/** O que o site pode registrar. Impressão em destaque é contada pelo servidor. */
export const TIPOS_PUBLICOS = Object.freeze([
  TIPOS.VISUALIZACAO_PERFIL,
  TIPOS.CLIQUE_WHATSAPP,
  TIPOS.CLIQUE_TELEFONE,
  TIPOS.CLIQUE_ENDERECO,
  TIPOS.CLIQUE_INSTAGRAM,
  TIPOS.VISUALIZACAO_PRODUTO,
]);

/** Cada tipo conta no máximo uma vez por visitante nesta janela */
export const JANELA_MS = 30 * 60 * 1000;
const LIMITE_MEMORIA = 50_000;
const SAL = randomBytes(16).toString('hex');
const vistos = new Map(); // marca -> expira em (ms)

/** Dia em Rondonópolis (America/Cuiaba), como data pura para a coluna DATE */
export function diaLocal(agora = new Date()) {
  const texto = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
  return new Date(`${texto}T00:00:00.000Z`);
}

function marcaDoVisitante(req) {
  // req.ip respeita o "trust proxy" do app.js; ler o X-Forwarded-For direto
  // deixaria qualquer um virar "visitante novo" só mandando outro cabeçalho
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  const navegador = String(req.headers?.['user-agent'] || '');
  return createHash('sha256').update(`${SAL}|${ip}|${navegador}`).digest('base64url').slice(0, 22);
}

/**
 * Já contamos este visitante para este evento nos últimos 30 minutos? Se não,
 * marca agora. Devolve true quando deve contar.
 */
export function primeiraVez(req, chave, agora = Date.now()) {
  const marca = `${marcaDoVisitante(req)}|${chave}`;
  const expira = vistos.get(marca);
  if (expira && expira > agora) return false;
  if (vistos.size >= LIMITE_MEMORIA) {
    for (const [m, ate] of vistos) if (ate <= agora) vistos.delete(m);
    if (vistos.size >= LIMITE_MEMORIA) vistos.clear();
  }
  vistos.set(marca, agora + JANELA_MS);
  return true;
}

/** Só para os testes: esquece os visitantes da janela atual */
export function esquecerVisitantes() {
  vistos.clear();
}

async function incrementar(empreendedorId, tipo, referenciaId = 0, cliente = prisma) {
  const dia = diaLocal();
  await cliente.metricaDiaria.upsert({
    where: { empreendedorId_dia_tipo_referenciaId: { empreendedorId, dia, tipo, referenciaId } },
    create: { empreendedorId, dia, tipo, referenciaId, quantidade: 1 },
    update: { quantidade: { increment: 1 } },
  });
}

/** Quem não conta: o próprio dono do negócio e a administração */
function ehDonoOuAdmin(req, negocio) {
  if (!req.usuario) return false;
  return req.usuario.perfil === 'ADMIN' || (negocio.usuarioId && negocio.usuarioId === req.usuario.id);
}

/**
 * Registra um evento vindo do site. Devolve true se contou. Negócio inativo,
 * produto de outro negócio, dono/admin ou visitante repetido não contam.
 */
export async function registrarEvento(req, { empreendedorId, tipo, produtoId }) {
  if (!TIPOS_PUBLICOS.includes(tipo)) return false;
  const negocio = await prisma.empreendedor.findUnique({
    where: { id: empreendedorId },
    select: { id: true, ativo: true, usuarioId: true, publicadoAte: true },
  });
  // Negócio fora da vitrine não recebe visitas: nada a contar
  if (!estaPublicado(negocio) || ehDonoOuAdmin(req, negocio)) return false;

  let referenciaId = 0;
  if (tipo === TIPOS.VISUALIZACAO_PRODUTO) {
    const produto = produtoId
      ? await prisma.produto.findFirst({ where: { id: produtoId, empreendedorId }, select: { id: true } })
      : null;
    if (!produto) return false;
    referenciaId = produto.id;
  }
  if (!primeiraVez(req, `${tipo}|${empreendedorId}|${referenciaId}`)) return false;
  await incrementar(empreendedorId, tipo, referenciaId);
  return true;
}

/**
 * Conta uma impressão em destaque para cada negócio mostrado na seção de
 * destaques. Nunca derruba a página: erro aqui só vai para o log.
 */
export async function registrarImpressoes(req, ids) {
  try {
    for (const id of ids) {
      if (req.usuario?.perfil === 'ADMIN') return;
      if (primeiraVez(req, `${TIPOS.IMPRESSAO_DESTAQUE}|${id}`)) await incrementar(id, TIPOS.IMPRESSAO_DESTAQUE);
    }
  } catch (erro) {
    console.error('Não foi possível contar impressões em destaque:', erro.message);
  }
}

const zerados = () => Object.fromEntries(Object.values(TIPOS).map((tipo) => [tipo, 0]));
const formatarDia = (data) => data.toISOString().slice(0, 10);

/**
 * Resumo do desempenho de um negócio nos últimos `dias`.
 * - básico (Essencial): totais por tipo no período
 * - ampliado (Destaque): também a série por dia e os produtos mais vistos
 */
export async function resumoDesempenho(empreendedorId, { dias = 30, ampliado = false } = {}) {
  const fim = diaLocal();
  const inicio = new Date(fim);
  inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));
  // Período anterior, do mesmo tamanho, para dizer se cada número subiu ou caiu
  const inicioAnterior = new Date(inicio);
  inicioAnterior.setUTCDate(inicioAnterior.getUTCDate() - dias);

  const todas = await prisma.metricaDiaria.findMany({
    where: { empreendedorId, dia: { gte: inicioAnterior, lte: fim } },
    orderBy: { dia: 'asc' },
  });
  const linhas = todas.filter((linha) => linha.dia >= inicio);

  const somar = (lista) => {
    const soma = zerados();
    for (const linha of lista) soma[linha.tipo] = (soma[linha.tipo] ?? 0) + linha.quantidade;
    soma.INTERACOES = soma.CLIQUE_WHATSAPP + soma.CLIQUE_TELEFONE + soma.CLIQUE_ENDERECO + soma.CLIQUE_INSTAGRAM;
    return soma;
  };
  const totais = somar(linhas);

  const resumo = {
    periodo: { inicio: formatarDia(inicio), fim: formatarDia(fim), dias },
    totais,
    anterior: somar(todas.filter((linha) => linha.dia < inicio)),
    ampliado,
  };
  if (!ampliado) return resumo;

  // Série diária com todos os dias do período, inclusive os sem movimento
  const porDia = new Map();
  for (let d = new Date(inicio); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) porDia.set(formatarDia(d), zerados());
  for (const linha of linhas) {
    const dia = porDia.get(formatarDia(linha.dia));
    if (dia) dia[linha.tipo] += linha.quantidade;
  }

  const visualizacoesPorProduto = new Map();
  for (const linha of linhas) {
    if (linha.tipo !== TIPOS.VISUALIZACAO_PRODUTO) continue;
    visualizacoesPorProduto.set(linha.referenciaId, (visualizacoesPorProduto.get(linha.referenciaId) ?? 0) + linha.quantidade);
  }
  const produtos = visualizacoesPorProduto.size
    ? await prisma.produto.findMany({
        where: { id: { in: [...visualizacoesPorProduto.keys()] }, empreendedorId },
        select: { id: true, nome: true },
      })
    : [];

  return {
    ...resumo,
    serie: [...porDia].map(([dia, valores]) => ({ dia, ...valores })),
    produtosMaisVistos: produtos
      .map((p) => ({ id: p.id, nome: p.nome, visualizacoes: visualizacoesPorProduto.get(p.id) }))
      .sort((a, b) => b.visualizacoes - a.visualizacoes)
      .slice(0, 10),
  };
}
