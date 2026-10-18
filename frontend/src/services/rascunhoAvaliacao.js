// Avaliação escrita antes de confirmar com o Google: fica guardada no
// navegador durante a ida e a volta, e é publicada sozinha quando a pessoa
// volta confirmada. Se ela cancelar no Google, o texto continua no formulário.
// Vale por 2 horas e para um negócio só.
const CHAVE = 'vitrinelocal.rascunhoAvaliacao'
const VALIDADE_MS = 2 * 60 * 60 * 1000

export function guardarRascunho(negocioId, { nota, comentario }) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ negocioId, nota, comentario, em: Date.now() }))
  } catch {
    // Sem armazenamento (modo privado): a pessoa escreve de novo na volta
  }
}

/** Rascunho deste negócio ({ nota, comentario }) ou null */
export function lerRascunho(negocioId, agora = Date.now()) {
  try {
    const rascunho = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (!rascunho || rascunho.negocioId !== negocioId) return null
    if (agora - rascunho.em > VALIDADE_MS) {
      apagarRascunho()
      return null
    }
    return { nota: rascunho.nota, comentario: rascunho.comentario }
  } catch {
    return null
  }
}

export function apagarRascunho() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // nada a fazer
  }
}
