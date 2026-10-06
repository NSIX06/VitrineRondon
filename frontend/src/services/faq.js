// Busca e filtro da central de ajuda, feitos no navegador: a lista pública é
// pequena e já chega inteira, então filtrar a cada tecla não custa nada.

/** Minúsculas e sem acento: "endereço" encontra "Endereco" e vice-versa */
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Categorias que existem de fato nas perguntas, sem repetir, em ordem alfabética */
export function categoriasDoFaq(perguntas = []) {
  const unicas = new Set(perguntas.map((p) => p.categoria).filter(Boolean))
  return [...unicas].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * Perguntas que batem com a busca (na pergunta ou na resposta) e com a
 * categoria. Todas as palavras digitadas precisam aparecer, em qualquer ordem.
 */
export function filtrarFaq(perguntas = [], { busca = '', categoria = '' } = {}) {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean)
  return perguntas.filter((p) => {
    if (categoria && p.categoria !== categoria) return false
    if (!palavras.length) return true
    const texto = normalizar(`${p.pergunta} ${p.resposta}`)
    return palavras.every((palavra) => texto.includes(palavra))
  })
}

// Os mesmos limites do servidor (faqController): a tela avisa antes, e o
// servidor confere de novo
export const LIMITES_FAQ = { pergunta: 300, resposta: 5000, categoria: 80, ordemMaxima: 9999 }

/** Erros de preenchimento por campo; objeto vazio quando está tudo certo */
export function validarFaq(valores) {
  const erros = {}
  const pergunta = valores.pergunta.trim()
  const resposta = valores.resposta.trim()
  const ordem = Number(valores.ordem)

  if (!pergunta) erros.pergunta = 'A pergunta é obrigatória'
  else if (pergunta.length > LIMITES_FAQ.pergunta) {
    erros.pergunta = `A pergunta pode ter até ${LIMITES_FAQ.pergunta} caracteres`
  }
  if (!resposta) erros.resposta = 'A resposta é obrigatória'
  else if (resposta.length > LIMITES_FAQ.resposta) {
    erros.resposta = `A resposta pode ter até ${LIMITES_FAQ.resposta} caracteres`
  }
  if (valores.categoria.trim().length > LIMITES_FAQ.categoria) {
    erros.categoria = `A categoria pode ter até ${LIMITES_FAQ.categoria} caracteres`
  }
  if (String(valores.ordem).trim() === '' || !Number.isInteger(ordem) || ordem < 0 || ordem > LIMITES_FAQ.ordemMaxima) {
    erros.ordem = `Use um número inteiro de 0 a ${LIMITES_FAQ.ordemMaxima}`
  }
  return erros
}
