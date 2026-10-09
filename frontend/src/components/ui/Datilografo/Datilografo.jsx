import { useEffect, useState } from 'react'
import './Datilografo.css'

/**
 * Texto que aparece letra por letra, como numa máquina de escrever (adaptado
 * do Typewriter do exemplo). O leitor de tela recebe a frase inteira de uma vez;
 * com "reduzir movimento" ligado, a frase já aparece completa.
 * - `texto`: frase a escrever; trocar o texto recomeça a escrita
 * - `velocidade`: milissegundos por letra
 */
function Datilografo({ texto, velocidade = 55, className = '' }) {
  const [quantas, setQuantas] = useState(0)
  const parado =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Texto novo: recomeça do zero (ajuste durante a renderização, sem efeito)
  const [textoAnterior, setTextoAnterior] = useState(texto)
  if (textoAnterior !== texto) {
    setTextoAnterior(texto)
    setQuantas(0)
  }

  useEffect(() => {
    if (parado || quantas >= texto.length) return undefined
    const tempo = setTimeout(() => setQuantas((n) => n + 1), velocidade)
    return () => clearTimeout(tempo)
  }, [parado, quantas, texto, velocidade])

  const visivel = parado ? texto : texto.slice(0, quantas)
  return (
    <span className={`datilografo ${className}`.trim()}>
      <span className="visualmente-oculto">{texto}</span>
      <span aria-hidden="true">
        {visivel}
        <span className="datilografo__cursor">|</span>
      </span>
    </span>
  )
}

export default Datilografo
