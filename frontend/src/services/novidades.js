// "Novo na vitrine": negócio que entrou na vitrine há pouco tempo. A data vem
// da API (publicadoDesde, a primeira publicação); renovar a assinatura ou
// voltar depois de sair não faz o negócio parecer novo de novo.

/** Por quantos dias o negócio é apresentado como novidade */
export const DIAS_DE_NOVIDADE = 30

const DIA_MS = 24 * 60 * 60 * 1000

/** O negócio entrou na vitrine nos últimos DIAS_DE_NOVIDADE dias? */
export function ehNovidade(publicadoDesde, agora = new Date()) {
  if (!publicadoDesde) return false
  const desde = new Date(publicadoDesde)
  if (Number.isNaN(desde.getTime())) return false
  const idade = agora.getTime() - desde.getTime()
  return idade >= 0 && idade < DIAS_DE_NOVIDADE * DIA_MS
}
