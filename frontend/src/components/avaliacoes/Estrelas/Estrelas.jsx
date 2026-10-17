import { useId } from 'react'
import { faixaDaMedia, preenchimentoDasEstrelas } from '../../../services/avaliacoes'
import './Estrelas.css'

// Estrela de cinco pontas num quadro de 24 x 24
const CAMINHO = 'M12 2.4l2.95 6.02 6.63.94-4.8 4.66 1.14 6.6L12 17.5l-5.92 3.12 1.14-6.6-4.8-4.66 6.63-.94z'

/**
 * Cinco estrelas preenchidas pelo valor exato (4,3 pinta 30% da quinta).
 * A cor vem da faixa da média (`faixa`, ou calculada de `valor`); `destaque`
 * (plano Destaque) muda só o acabamento: contorno dourado e brilho. A nota
 * e a quantidade de estrelas são sempre as mesmas para qualquer plano.
 *
 * - `rotulo`: texto para leitores de tela; sem ele, as estrelas são decorativas
 * - `quantidade`: quantas estrelas desenhar (1 no seletor, uma por botão)
 */
function Estrelas({ valor, total = 1, faixa, tamanho = 18, destaque = false, rotulo, quantidade = 5, className = '' }) {
  const id = useId()
  const corDaFaixa = faixa ?? faixaDaMedia(valor, total)
  const preenchimentos = preenchimentoDasEstrelas(total ? valor : 0).slice(0, quantidade)

  return (
    <span
      className={`estrelas estrelas--${corDaFaixa} ${destaque ? 'estrelas--destaque' : ''} ${className}`}
      style={{ '--estrela': `${tamanho}px` }}
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
    >
      {/* Gradiente desta instância (id único: várias estrelas na mesma página) */}
      <svg className="estrelas__definicoes" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-cor`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" className="estrelas__parada-clara" />
            <stop offset="100%" className="estrelas__parada-escura" />
          </linearGradient>
        </defs>
      </svg>
      {preenchimentos.map((parte, indice) => (
        <span key={indice} className="estrela">
          <svg className="estrela__vazia" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={CAMINHO} />
          </svg>
          {parte > 0 && (
            <span className="estrela__cheia" style={{ width: `${parte * 100}%` }}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d={CAMINHO} fill={`url(#${id}-cor)`} />
              </svg>
            </span>
          )}
        </span>
      ))}
    </span>
  )
}

export default Estrelas
