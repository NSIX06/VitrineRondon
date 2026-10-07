// Formatação de números para a tela, num lugar só: toda a interface mostra
// preço e quantidade do mesmo jeito.

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const inteiro = new Intl.NumberFormat('pt-BR')

/** 49.9 -> "R$ 49,90" */
export const formatarPreco = (reais) => moeda.format(reais ?? 0)

/** 1240 -> "1.240" */
export const formatarNumero = (valor) => inteiro.format(valor ?? 0)
