// Regra central do VitrineRondon: navegar é gratuito; divulgar um negócio exige
// conta + assinatura em vigor. Toda consulta pública (listas, busca, mapa,
// destaques, produtos, contato e métricas) passa por estas funções, e o
// frontend só reflete o que a API decide.
//
// "Em vigor" = negócio ativo (não suspenso pela administração) e publicadoAte
// no futuro. publicadoAte é escrito só pelo serviço de assinaturas, com o fim
// do período pago; ao vencer, o negócio sai da vitrine sozinho, sem depender
// de rotina agendada. Os dados nunca são apagados por isso.

/** Situação do negócio, para o dono e para a administração */
export const SITUACAO = Object.freeze({
  RASCUNHO: 'RASCUNHO', // cadastrado, nunca teve plano
  AGUARDANDO_PAGAMENTO: 'AGUARDANDO_PAGAMENTO', // plano escolhido, pagamento não confirmado
  ATIVO: 'ATIVO', // assinatura em vigor: aparece na vitrine
  ASSINATURA_EXPIRADA: 'ASSINATURA_EXPIRADA', // já teve plano, não tem mais
  SUSPENSO: 'SUSPENSO', // retirado pela administração (moderação)
});

/** Filtro do Prisma para negócio visível ao público */
export function filtroPublicado(agora = new Date()) {
  return { ativo: true, publicadoAte: { gt: agora } };
}

/** O negócio aparece na vitrine agora? */
export function estaPublicado(negocio, agora = new Date()) {
  return Boolean(negocio?.ativo && negocio.publicadoAte && new Date(negocio.publicadoAte) > agora);
}

/**
 * Situação do negócio a partir dele e das suas assinaturas ({ status, inicioEm }).
 * Suspensão administrativa vale mais que tudo; depois, estar publicado.
 */
export function situacaoDoNegocio(negocio, assinaturas = [], agora = new Date()) {
  if (!negocio?.ativo) return SITUACAO.SUSPENSO;
  if (estaPublicado(negocio, agora)) return SITUACAO.ATIVO;
  if (assinaturas.some((a) => a.status === 'PENDENTE')) return SITUACAO.AGUARDANDO_PAGAMENTO;
  if (assinaturas.some((a) => a.inicioEm)) return SITUACAO.ASSINATURA_EXPIRADA;
  return SITUACAO.RASCUNHO;
}

/**
 * Plano que vale agora para os benefícios (estatísticas, divulgação): o
 * guardado no negócio, se o período pago ainda não acabou. 'NENHUM' depois do
 * vencimento, mesmo antes da varredura que zera o campo.
 */
export function planoEmVigor(negocio, agora = new Date()) {
  const dentroDoPeriodo = negocio?.publicadoAte && new Date(negocio.publicadoAte) > agora;
  return dentroDoPeriodo ? negocio.planoAtual || 'NENHUM' : 'NENHUM';
}

/** Campos das assinaturas que situacaoDoNegocio precisa (para o include do Prisma) */
export const ASSINATURAS_PARA_SITUACAO = { select: { status: true, inicioEm: true } };
