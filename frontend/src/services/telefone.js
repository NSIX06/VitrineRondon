// Telefone brasileiro: máscara para a tela e só os dígitos para o servidor.
// Celular (11 dígitos): (66) 99123-4567 · Fixo (10 dígitos): (66) 3421-1234

const MAXIMO_DIGITOS = 11

/**
 * Só os dígitos, sem o código do país: "+55 (66) 99123-4567" -> "66991234567".
 * O 55 só sai quando sobra número a mais, para não comer o DDD 55 (RS).
 */
export function digitosDoTelefone(valor) {
  let digitos = String(valor ?? '').replace(/\D/g, '')
  if (digitos.length > MAXIMO_DIGITOS && digitos.startsWith('55')) digitos = digitos.slice(2)
  return digitos.slice(0, MAXIMO_DIGITOS)
}

/** Aplica a máscara conforme a quantidade de dígitos digitados até agora */
export function formatarTelefone(valor) {
  const d = digitosDoTelefone(valor)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = `(${d.slice(0, 2)}) `
  const resto = d.slice(2)
  if (resto.length <= 4) return ddd + resto
  // Até 8 dígitos depois do DDD é fixo (4-4); com 9, celular (5-4)
  const corte = resto.length <= 8 ? 4 : 5
  return `${ddd}${resto.slice(0, corte)}-${resto.slice(corte)}`
}

/** Fixo ou celular completo, com DDD */
export function telefoneCompleto(valor) {
  const tamanho = digitosDoTelefone(valor).length
  return tamanho === 10 || tamanho === 11
}
