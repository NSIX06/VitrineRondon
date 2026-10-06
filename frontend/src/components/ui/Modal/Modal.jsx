import { useEffect, useRef } from 'react'
import './Modal.css'

/**
 * Modal genérico e acessível.
 * - Fecha com Esc, clique no fundo ou botão de fechar.
 * - Trava a rolagem da página enquanto aberto.
 * - `tamanho`: "sm" | "md" | "lg" | "xl"
 */
function Modal({ aberto, titulo, onFechar, children, tamanho = 'md' }) {
  const caixaRef = useRef(null)

  useEffect(() => {
    if (!aberto) return undefined

    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') onFechar()
    }

    document.addEventListener('keydown', aoTeclar)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Leva o foco para dentro do modal ao abrir
    caixaRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  const aoClicarFundo = (evento) => {
    if (evento.target === evento.currentTarget) onFechar()
  }

  return (
    <div className="modal__fundo" onClick={aoClicarFundo}>
      <div
        className={`modal modal--${tamanho}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        ref={caixaRef}
      >
        <header className="modal__cabecalho">
          <h2 id="modal-titulo" className="modal__titulo">
            {titulo}
          </h2>
          <button
            type="button"
            className="modal__fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            &times;
          </button>
        </header>
        <div className="modal__corpo">{children}</div>
      </div>
    </div>
  )
}

export default Modal
