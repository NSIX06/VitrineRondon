// Regras das assinaturas. É o único lugar que muda status de assinatura e os
// campos planoAtual/emDestaque do negócio: webhook, conciliação com o gateway
// e simulação (fora de produção) passam todos por aplicarEvento, então a
// demonstração percorre exatamente o mesmo caminho de um pagamento real.
//
// Status: PENDENTE (checkout criado) -> ATIVA (pago) -> INADIMPLENTE (cobrança
// do ciclo recusada) / CANCELADA.
//
// Vigência: cada assinatura paga guarda até quando vale (vigenteAte = próxima
// cobrança + um dia de folga). A assinatura "vigente" é a ATIVA, ou a
// CANCELADA pelo empreendedor que ainda está dentro do período pago: o
// cancelamento respeita o que já foi pago. Cobrança recusada e plano
// substituído encerram a vigência na hora. Só a assinatura vigente publica o
// negócio (publicadoAte) e libera os benefícios do plano.
//
// Troca de plano: é um checkout novo do plano escolhido. Quando ele é pago, a
// assinatura anterior é cancelada no gateway. Assim o benefício muda na hora
// (o change-plan do gateway só valeria no próximo ciclo).
import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import { registrarLog } from './auditoria.js';
import { EVENTOS, provedorPagamento } from './pagamento/index.js';
import { erroHttp } from '../utils/erros.js';

export const STATUS = Object.freeze({
  PENDENTE: 'PENDENTE',
  ATIVA: 'ATIVA',
  INADIMPLENTE: 'INADIMPLENTE',
  CANCELADA: 'CANCELADA',
});

// Assinaturas do seed de demonstração usam ids com este prefixo: parecem vir
// do gateway (a simulação as encontra), mas nunca existiram lá
export const PREFIXO_DEMO = 'demo_';

/** A assinatura existe no gateway? (as de demonstração, não) */
const noGateway = (id) => Boolean(id) && !id.startsWith(PREFIXO_DEMO);

const MESES_POR_CICLO = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUALLY: 6, ANNUALLY: 12 };

/** Data da próxima cobrança: o gateway não informa, então vem do ciclo do plano */
export function proximaCobrancaApos(data, ciclo = 'MONTHLY') {
  const proxima = new Date(data);
  if (ciclo === 'WEEKLY') {
    proxima.setDate(proxima.getDate() + 7);
    return proxima;
  }
  const meses = MESES_POR_CICLO[ciclo] ?? 1;
  const dia = proxima.getDate();
  proxima.setMonth(proxima.getMonth() + meses);
  // 31/01 + 1 mês não vira 03/03: fica no último dia de fevereiro
  if (proxima.getDate() < dia) proxima.setDate(0);
  return proxima;
}

/** Folga depois da data de cobrança, para o aviso de renovação do gateway chegar */
export const FOLGA_RENOVACAO_MS = 24 * 60 * 60 * 1000;

/** Até quando vale o período pago que começa (ou renova) agora */
export function vigenciaApos(data, ciclo = 'MONTHLY') {
  const proximaCobranca = proximaCobrancaApos(data, ciclo);
  return { proximaCobranca, vigenteAte: new Date(proximaCobranca.getTime() + FOLGA_RENOVACAO_MS) };
}

/** Assinatura dentro do período pago: ATIVA, ou CANCELADA que ainda não venceu */
function filtroVigente(agora = new Date()) {
  return { status: { in: [STATUS.ATIVA, STATUS.CANCELADA] }, vigenteAte: { gt: agora } };
}

/** Planos à venda, na ordem da página de planos */
export function listarPlanos(cliente = prisma) {
  return cliente.plano.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } });
}

/**
 * Copia para o negócio o plano da assinatura vigente (ou NENHUM) e até quando
 * ele fica publicado. A vitrine lê daqui para filtrar, ordenar e mostrar o selo
 * sem juntar tabelas.
 */
export async function sincronizarNegocio(cliente, empreendedorId, agora = new Date()) {
  const vigente = await cliente.assinatura.findFirst({
    where: { empreendedorId, ...filtroVigente(agora) },
    orderBy: { inicioEm: 'desc' },
    include: { plano: true },
  });
  const dados = vigente
    ? { planoAtual: vigente.plano.nome, emDestaque: vigente.plano.destaque, publicadoAte: vigente.vigenteAte }
    : { planoAtual: 'NENHUM', emDestaque: false, publicadoAte: null };
  // Primeira publicação: guarda a data (ela marca o "Novo na vitrine")
  if (vigente) {
    const { publicadoDesde } = await cliente.empreendedor.findUnique({
      where: { id: empreendedorId },
      select: { publicadoDesde: true },
    });
    if (!publicadoDesde) dados.publicadoDesde = vigente.inicioEm ?? agora;
  }
  await cliente.empreendedor.update({ where: { id: empreendedorId }, data: dados });
  return dados;
}

/** Negócio da conta logada; quem não tem negócio não assina */
export async function negocioDoUsuario(usuario) {
  const negocio = await prisma.empreendedor.findUnique({
    where: { usuarioId: usuario.id },
    select: { id: true, nomeNegocio: true, planoAtual: true, emDestaque: true, publicadoAte: true, ativo: true },
  });
  if (!negocio) throw erroHttp(404, 'Cadastre seu negócio antes de escolher um plano');
  return negocio;
}

const incluirPlano = { plano: true };

/**
 * Assinatura para mostrar no painel: a ATIVA; senão a cancelada ainda dentro
 * do período pago; senão a PENDENTE mais nova (checkout em andamento); senão a
 * última que existiu.
 */
export async function assinaturaAtual(empreendedorId, cliente = prisma) {
  const agora = new Date();
  const ordem = [
    { status: STATUS.ATIVA },
    { status: STATUS.CANCELADA, vigenteAte: { gt: agora } },
    { status: STATUS.PENDENTE },
    { status: STATUS.INADIMPLENTE },
  ];
  for (const filtro of ordem) {
    const achada = await cliente.assinatura.findFirst({
      where: { empreendedorId, ...filtro },
      orderBy: { criadoEm: 'desc' },
      include: incluirPlano,
    });
    if (achada) return achada;
  }
  return cliente.assinatura.findFirst({ where: { empreendedorId }, orderBy: { criadoEm: 'desc' }, include: incluirPlano });
}

/**
 * Inicia a assinatura (ou a troca) de um plano: cria a assinatura PENDENTE e
 * o checkout no gateway. Devolve a assinatura com a URL do checkout.
 */
export async function iniciarAssinatura(req, empreendedorId, nomePlano) {
  const plano = await prisma.plano.findFirst({ where: { nome: String(nomePlano || '').toUpperCase(), ativo: true } });
  if (!plano) throw erroHttp(400, 'Plano não encontrado');

  const ativa = await prisma.assinatura.findFirst({ where: { empreendedorId, status: STATUS.ATIVA } });
  if (ativa?.planoId === plano.id) throw erroHttp(409, `Você já assina o plano ${plano.titulo}`);

  // Checkout anterior que não foi pago deixa de valer: só um em andamento
  await prisma.assinatura.updateMany({
    where: { empreendedorId, status: STATUS.PENDENTE },
    data: { status: STATUS.CANCELADA, canceladaEm: new Date() },
  });

  const provedor = provedorPagamento();
  const produtoId = await provedor.garantirProduto(plano);
  if (produtoId !== plano.gatewayProdutoId) {
    await prisma.plano.update({ where: { id: plano.id }, data: { gatewayProdutoId: produtoId } });
  }

  const assinatura = await prisma.assinatura.create({
    data: { empreendedorId, planoId: plano.id, status: STATUS.PENDENTE },
  });
  const site = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  let checkout;
  try {
    checkout = await provedor.criarCheckoutAssinatura({
      produtoId,
      // Única de verdade: o id sozinho se repete entre bancos (local e
      // produção usam a mesma conta de testes do gateway, e um banco novo
      // recomeça do 1). Com "assinatura-1" repetido, o AbacatePay devolvia o
      // checkout de uma assinatura antiga e cancelada: "link não encontrado".
      referencia: `assinatura-${assinatura.id}-${randomUUID().slice(0, 8)}`,
      urlRetorno: `${site}/planos`,
      urlConclusao: `${site}/meu-negocio?assinatura=retorno`,
    });
  } catch (erro) {
    // Sem checkout a assinatura não tem como ser paga: não deixa pendência solta
    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data: { status: STATUS.CANCELADA, canceladaEm: new Date() },
    });
    throw erro;
  }

  const atualizada = await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: { gatewayCheckoutId: checkout.checkoutId, checkoutUrl: checkout.url },
    include: incluirPlano,
  });

  await registrarLog(req, {
    acao: 'CREATE',
    tipoEntidade: 'Assinatura',
    entidadeId: atualizada.id,
    descricao: ativa
      ? `Troca de plano iniciada: checkout do plano ${plano.titulo}`
      : `Assinatura iniciada: checkout do plano ${plano.titulo}`,
    depois: { plano: plano.nome, status: STATUS.PENDENTE, gatewayCheckoutId: checkout.checkoutId },
  });
  return atualizada;
}

/** Acha a assinatura local de um evento: pela assinatura do gateway, senão pelo checkout */
async function acharPorEvento(cliente, evento) {
  if (evento.assinaturaId) {
    const pelaAssinatura = await cliente.assinatura.findUnique({
      where: { gatewayAssinaturaId: evento.assinaturaId },
      include: incluirPlano,
    });
    if (pelaAssinatura) return pelaAssinatura;
  }
  if (evento.checkoutId) {
    return cliente.assinatura.findUnique({ where: { gatewayCheckoutId: evento.checkoutId }, include: incluirPlano });
  }
  return null;
}

/**
 * Aplica um evento normalizado (webhook, conciliação ou simulação). Idempotente:
 * o mesmo evento repetido (o gateway reenvia) não muda nada de novo.
 * Devolve { assinatura, mudou } ou null quando o evento não é de nenhuma
 * assinatura nossa.
 */
export async function aplicarEvento(req, evento, origem) {
  if (!evento || evento.tipo === EVENTOS.IGNORADO) return null;

  const resultado = await prisma.$transaction(async (tx) => {
    const assinatura = await acharPorEvento(tx, evento);
    if (!assinatura) return null;
    const agora = new Date();
    let dados = null;

    switch (evento.tipo) {
      case EVENTOS.ATIVADA:
        if (assinatura.status === STATUS.ATIVA) break;
        // Já esteve ativa e foi cancelada: um aviso atrasado não a ressuscita.
        // Checkout abandonado (cancelado sem nunca ter virado assinatura) e
        // pago mesmo assim é ativado: quem pagou recebe o plano.
        if (assinatura.status === STATUS.CANCELADA && assinatura.gatewayAssinaturaId) break;
        dados = {
          status: STATUS.ATIVA,
          gatewayAssinaturaId: evento.assinaturaId ?? assinatura.gatewayAssinaturaId,
          inicioEm: assinatura.inicioEm ?? agora,
          ...vigenciaApos(agora, assinatura.plano.ciclo),
          canceladaEm: null,
        };
        break;
      case EVENTOS.RENOVADA:
        if (assinatura.status === STATUS.CANCELADA) break;
        dados = { status: STATUS.ATIVA, ...vigenciaApos(agora, assinatura.plano.ciclo) };
        break;
      case EVENTOS.FALHOU:
        if (assinatura.status !== STATUS.ATIVA) break;
        // Sem pagamento, sem divulgação: o negócio sai da vitrine até regularizar
        dados = { status: STATUS.INADIMPLENTE, vigenteAte: agora };
        break;
      case EVENTOS.CANCELADA:
        if (assinatura.status === STATUS.CANCELADA) break;
        // O que já foi pago continua valendo: vigenteAte não muda
        dados = { status: STATUS.CANCELADA, canceladaEm: agora };
        break;
      default:
        break;
    }
    if (!dados) return { assinatura, mudou: false, substituidas: [] };

    const atualizada = await tx.assinatura.update({ where: { id: assinatura.id }, data: dados, include: incluirPlano });

    // Plano novo pago: as outras assinaturas em vigor do negócio são
    // substituídas na hora (inclusive a cancelada que ainda valia), para não
    // haver dois planos ao mesmo tempo
    let substituidas = [];
    if (dados.status === STATUS.ATIVA && evento.tipo === EVENTOS.ATIVADA) {
      substituidas = await tx.assinatura.findMany({
        where: { empreendedorId: assinatura.empreendedorId, ...filtroVigente(agora), id: { not: assinatura.id } },
        include: incluirPlano,
      });
      if (substituidas.length) {
        await tx.assinatura.updateMany({
          where: { id: { in: substituidas.map((s) => s.id) } },
          data: { status: STATUS.CANCELADA, canceladaEm: agora, vigenteAte: agora },
        });
      }
    }

    const negocio = await sincronizarNegocio(tx, assinatura.empreendedorId, agora);
    return { assinatura: atualizada, antes: assinatura, mudou: true, substituidas, negocio };
  });

  if (!resultado?.mudou) return resultado;

  // Fora da transação: cancelar no gateway é chamada de rede e não pode
  // segurar o banco. Se falhar, fica no log para tratar à mão.
  for (const antiga of resultado.substituidas) {
    try {
      // A cancelada pelo empreendedor já saiu do gateway; só a ATIVA precisa
      if (antiga.status === STATUS.ATIVA && noGateway(antiga.gatewayAssinaturaId)) {
        await provedorPagamento().cancelarAssinatura(antiga.gatewayAssinaturaId);
      }
    } catch (erro) {
      console.error(`Não foi possível cancelar no gateway a assinatura substituída ${antiga.id}:`, erro.message);
    }
    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Assinatura',
      entidadeId: antiga.id,
      descricao: `Assinatura do plano ${antiga.plano.titulo} substituída pela troca de plano`,
      antes: { status: antiga.status },
      depois: { status: STATUS.CANCELADA },
    });
  }

  const { assinatura, antes } = resultado;
  await registrarLog(req, {
    acao: 'UPDATE',
    tipoEntidade: 'Assinatura',
    entidadeId: assinatura.id,
    descricao: `Assinatura ${assinatura.plano.titulo}: ${antes.status} -> ${assinatura.status} (${origem})`,
    antes: { status: antes.status },
    depois: {
      status: assinatura.status,
      evento: evento.tipo,
      origem,
      eventoGateway: evento.eventoId,
      planoAtual: resultado.negocio.planoAtual,
      emDestaque: resultado.negocio.emDestaque,
      publicadoAte: resultado.negocio.publicadoAte,
    },
  });
  return resultado;
}

/**
 * Conciliação: assinatura PENDENTE pergunta ao gateway se o checkout já foi
 * pago. Roda quando o empreendedor volta do checkout e abre o painel; é o que
 * dispensa túnel/webhook no localhost.
 */
async function conciliar(req, assinatura) {
  if (assinatura?.status !== STATUS.PENDENTE || !assinatura.gatewayCheckoutId) return assinatura;
  try {
    const evento = await provedorPagamento().consultarPorCheckout(assinatura.gatewayCheckoutId);
    if (evento) await aplicarEvento(req, evento, 'CONCILIACAO');
  } catch (erro) {
    // Gateway fora do ar não impede o painel de abrir: mostra a pendência
    console.error(`Conciliação da assinatura ${assinatura.id} falhou:`, erro.message);
  }
  return prisma.assinatura.findUnique({ where: { id: assinatura.id }, include: incluirPlano });
}

/**
 * Concilia todas as pendências do negócio, e não só a assinatura mostrada:
 * numa troca de plano a ATIVA continua sendo a "atual" enquanto o checkout do
 * plano novo (PENDENTE) espera pagamento, e é ele que precisa ser consultado.
 */
export async function conciliarPendentes(req, empreendedorId) {
  const pendentes = await prisma.assinatura.findMany({
    where: { empreendedorId, status: STATUS.PENDENTE, gatewayCheckoutId: { not: null } },
    include: incluirPlano,
  });
  for (const pendente of pendentes) await conciliar(req, pendente);
}

/** Checkout de troca de plano esperando pagamento (há outra assinatura ATIVA) */
export async function trocaPendente(empreendedorId, cliente = prisma) {
  const ativa = await cliente.assinatura.findFirst({ where: { empreendedorId, status: STATUS.ATIVA } });
  if (!ativa) return null;
  return cliente.assinatura.findFirst({
    where: { empreendedorId, status: STATUS.PENDENTE },
    orderBy: { criadoEm: 'desc' },
    include: incluirPlano,
  });
}

/**
 * Cancela a assinatura atual do negócio (no gateway e aqui). As próximas
 * cobranças param, mas o negócio segue publicado até o fim do período pago.
 */
export async function cancelarAssinaturaDoNegocio(req, empreendedorId) {
  const atual = await assinaturaAtual(empreendedorId);
  if (!atual || atual.status === STATUS.CANCELADA) throw erroHttp(404, 'Você não tem assinatura para cancelar');

  if (atual.status === STATUS.PENDENTE) {
    const cancelada = await prisma.assinatura.update({
      where: { id: atual.id },
      data: { status: STATUS.CANCELADA, canceladaEm: new Date() },
      include: incluirPlano,
    });
    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Assinatura',
      entidadeId: atual.id,
      descricao: `Checkout do plano ${atual.plano.titulo} abandonado pelo empreendedor`,
      antes: { status: STATUS.PENDENTE },
      depois: { status: STATUS.CANCELADA },
    });
    return cancelada;
  }

  if (noGateway(atual.gatewayAssinaturaId)) {
    await provedorPagamento().cancelarAssinatura(atual.gatewayAssinaturaId);
  }
  await aplicarEvento(
    req,
    { tipo: EVENTOS.CANCELADA, assinaturaId: atual.gatewayAssinaturaId, checkoutId: atual.gatewayCheckoutId },
    'EMPREENDEDOR'
  );
  return prisma.assinatura.findUnique({ where: { id: atual.id }, include: incluirPlano });
}

/**
 * Negócios cujo período pago acabou guardam o plano e o selo antigos (a
 * vitrine já os esconde pela data). Esta varredura zera plano e selo para o
 * painel e a administração mostrarem a situação real. Roda na subida do
 * servidor e de hora em hora.
 */
export async function encerrarVencidas(agora = new Date()) {
  const vencidos = await prisma.empreendedor.findMany({
    // Só pela data: negócio suspenso pela administração mantém o plano pago
    where: { planoAtual: { not: 'NENHUM' }, OR: [{ publicadoAte: null }, { publicadoAte: { lte: agora } }] },
    select: { id: true },
  });
  for (const { id } of vencidos) await sincronizarNegocio(prisma, id, agora);
  return vencidos.length;
}
