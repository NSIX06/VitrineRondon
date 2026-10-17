// Regras das avaliações dos negócios (RN-AVAL).
//
// A média e a contagem nunca são gravadas: saem das avaliações publicadas a
// cada leitura. Assim nenhuma tela, nem o dono do negócio, consegue mexer
// nelas (RN-AVAL-08), e editar, apagar ou remover uma avaliação já muda a
// reputação na próxima leitura (RN-AVAL-06). O plano do negócio não entra em
// nenhuma conta daqui: o Destaque muda só a aparência das estrelas na tela.
import prisma from '../config/prisma.js';
import { PERFIS } from '../middlewares/auth.js';
import { estaPublicado } from './publicacao.js';

export const STATUS_AVALIACAO = Object.freeze({
  PUBLICADA: 'PUBLICADA',
  REMOVIDA: 'REMOVIDA', // retirada pela administração (o registro fica, com o motivo)
});

export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;
export const COMENTARIO_MINIMO = 3;
export const COMENTARIO_MAXIMO = 1000;

// Ordenações da lista pública; o desempate por id deixa a paginação estável
export const ORDENS = Object.freeze({
  recentes: [{ createdAt: 'desc' }, { id: 'desc' }],
  maior: [{ nota: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  menor: [{ nota: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
});

/**
 * Nome que aparece na avaliação: o primeiro nome e a inicial do último
 * ("Maria S."). E-mail, telefone e sobrenome completo nunca saem daqui.
 */
export function nomePublico(nome) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return 'Cliente';
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

/**
 * Resumo a partir da contagem por nota ([{ nota, _count: { _all } }], o que o
 * groupBy do Prisma devolve). A média vai com duas casas, sem arredondar para
 * meia estrela: a tela preenche as estrelas pelo valor exato.
 */
export function montarResumo(grupos = []) {
  const distribuicao = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let soma = 0;
  for (const grupo of grupos) {
    const nota = Number(grupo.nota);
    const quantidade = Number(grupo._count?._all ?? 0);
    if (!(nota in distribuicao) || quantidade <= 0) continue;
    distribuicao[nota] += quantidade;
    total += quantidade;
    soma += nota * quantidade;
  }
  const media = total ? Math.round((soma / total) * 100) / 100 : null;
  return { media, total, distribuicao };
}

/** Média, total e distribuição das avaliações publicadas de um negócio */
export async function resumoDoNegocio(empreendedorId) {
  const grupos = await prisma.avaliacao.groupBy({
    by: ['nota'],
    where: { empreendedorId, status: STATUS_AVALIACAO.PUBLICADA },
    _count: { _all: true },
  });
  return montarResumo(grupos);
}

/**
 * Média e total de vários negócios numa consulta só (cartões das listagens).
 * Devolve { [empreendedorId]: { media, total } }; quem não tem avaliação
 * publicada fica com { media: null, total: 0 }. Mesma conta do resumoDoNegocio.
 */
export async function resumosDosNegocios(ids = []) {
  const unicos = [...new Set(ids)];
  const resumos = Object.fromEntries(unicos.map((id) => [id, { media: null, total: 0 }]));
  if (!unicos.length) return resumos;
  const grupos = await prisma.avaliacao.groupBy({
    by: ['empreendedorId', 'nota'],
    where: { empreendedorId: { in: unicos }, status: STATUS_AVALIACAO.PUBLICADA },
    _count: { _all: true },
  });
  const porNegocio = {};
  for (const grupo of grupos) (porNegocio[grupo.empreendedorId] ??= []).push(grupo);
  for (const [id, lista] of Object.entries(porNegocio)) {
    const { media, total } = montarResumo(lista);
    resumos[id] = { media, total };
  }
  return resumos;
}

/** Junta a reputação ({ media, total }) em cada negócio de uma lista */
export async function comReputacao(negocios) {
  const resumos = await resumosDosNegocios(negocios.map((n) => n.id));
  return negocios.map((n) => ({ ...n, avaliacoes: resumos[n.id] ?? { media: null, total: 0 } }));
}

/**
 * Quem pode avaliar este negócio (RN-AVAL-02). Devolve null quando pode, ou o
 * motivo: 'LOGIN' (sem sessão), 'DONO' (o próprio negócio), 'ADMIN' (quem
 * modera não avalia) ou 'INDISPONIVEL' (negócio fora da vitrine).
 */
export function motivoParaNaoAvaliar(usuario, negocio, agora = new Date()) {
  if (!estaPublicado(negocio, agora)) return 'INDISPONIVEL';
  if (!usuario) return 'LOGIN';
  if (usuario.perfil === PERFIS.ADMIN) return 'ADMIN';
  if (negocio.usuarioId && negocio.usuarioId === usuario.id) return 'DONO';
  return null;
}

/** Uma avaliação no formato público (sem id de usuário nem dados de contato) */
export function avaliacaoPublica(avaliacao, usuarioAtual = null) {
  return {
    id: avaliacao.id,
    nota: avaliacao.nota,
    comentario: avaliacao.comentario,
    autor: nomePublico(avaliacao.usuario?.nome),
    criadaEm: avaliacao.createdAt,
    editadaEm: avaliacao.editadaEm ?? null,
    minha: Boolean(usuarioAtual && avaliacao.usuarioId === usuarioAtual.id),
  };
}
