// Formatação dos planos e assinaturas, num lugar só para a página de planos,
// o painel do empreendedor e o painel da administração falarem igual.

const formatadorPreco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })

export const precoEmReais = (centavos) => formatadorPreco.format((centavos ?? 0) / 100)

export const dataLonga = (valor) => (valor ? formatadorData.format(new Date(valor)) : '—')

const CICLOS = { WEEKLY: 'semana', MONTHLY: 'mês', QUARTERLY: 'trimestre', SEMIANNUALLY: 'semestre', ANNUALLY: 'ano' }
export const porCiclo = (ciclo) => `por ${CICLOS[ciclo] ?? 'mês'}`

/** Status da assinatura: texto e variante de tag */
export const STATUS_ASSINATURA = {
  PENDENTE: { rotulo: 'Aguardando pagamento', variante: 'neutra' },
  ATIVA: { rotulo: 'Ativa', variante: 'ouro' },
  INADIMPLENTE: { rotulo: 'Pagamento recusado', variante: 'alerta' },
  CANCELADA: { rotulo: 'Cancelada', variante: 'neutra' },
}
