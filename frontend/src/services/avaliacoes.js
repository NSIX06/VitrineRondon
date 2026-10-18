// Regras de exibição das avaliações (o cálculo da média é do servidor).
//
// A faixa de cor vem da média real e nunca muda o número; o plano Destaque
// muda só o acabamento das estrelas (ver Estrelas.jsx), não a nota.

// Mesmos limites do servidor (backend/src/services/avaliacoes.js)
export const COMENTARIO_MINIMO = 3
export const COMENTARIO_MAXIMO = 1000

export const ORDENS_DAS_AVALIACOES = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'maior', rotulo: 'Maior nota' },
  { valor: 'menor', rotulo: 'Menor nota' },
]

/** Rótulo de cada nota no seletor de estrelas */
export const ROTULOS_DAS_NOTAS = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Excelente',
}

/**
 * Faixa de cor pela média: neutra (sem avaliações), vermelha (1 a 1,9),
 * laranja (2 a 2,9), dourada (3 a 3,9), verde (4 a 4,4) e excelente (4,5 a 5, dourado premium).
 */
export function faixaDaMedia(media, total = 1) {
  if (!total || media == null || Number.isNaN(Number(media))) return 'neutra'
  const valor = Number(media)
  if (valor < 2) return 'vermelha'
  if (valor < 3) return 'laranja'
  if (valor < 4) return 'dourada'
  if (valor < 4.5) return 'verde'
  return 'excelente'
}

/**
 * Quanto de cada uma das cinco estrelas fica pintado, de 0 a 1, pelo valor
 * exato (sem arredondar antes): 4,3 vira [1, 1, 1, 1, 0.3].
 */
export function preenchimentoDasEstrelas(valor) {
  const nota = Math.min(5, Math.max(0, Number(valor) || 0))
  return [0, 1, 2, 3, 4].map((indice) => Math.round(Math.min(1, Math.max(0, nota - indice)) * 100) / 100)
}

const umaCasa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** "4,8" (uma casa, como nas lojas de aplicativo); sem média, null */
export function formatarMedia(media) {
  if (media == null) return null
  // Corta em vez de arredondar para cima: 4,96 aparece 4,9, nunca um 5,0 que não é
  return umaCasa.format(Math.floor(Number(media) * 10) / 10)
}

/** "1 avaliação", "32 avaliações" */
export function textoDaQuantidade(total) {
  const n = Number(total) || 0
  return `${n} ${n === 1 ? 'avaliação' : 'avaliações'}`
}

/** Leitura completa para leitores de tela: "Nota 4,3 de 5, 12 avaliações" */
export function descricaoDaReputacao(media, total) {
  if (!total) return 'Ainda sem avaliações'
  return `Nota ${formatarMedia(media)} de 5, ${textoDaQuantidade(total)}`
}

/** Percentual de cada nota na distribuição (0 a 100), pelo total real */
export function percentuaisDaDistribuicao(distribuicao = {}, total = 0) {
  return [5, 4, 3, 2, 1].map((nota) => {
    const quantidade = Number(distribuicao[nota]) || 0
    return { nota, quantidade, percentual: total ? Math.round((quantidade / total) * 100) : 0 }
  })
}

/** Erros do formulário antes de enviar (o servidor confere de novo) */
export function validarAvaliacao({ nota, comentario }) {
  const erros = {}
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) erros.nota = 'Escolha de 1 a 5 estrelas'
  const texto = String(comentario ?? '').trim()
  if (texto.length < COMENTARIO_MINIMO) erros.comentario = 'Conte um pouco como foi a sua experiência'
  else if (texto.length > COMENTARIO_MAXIMO) {
    erros.comentario = `O comentário pode ter até ${COMENTARIO_MAXIMO} caracteres`
  }
  return erros
}
