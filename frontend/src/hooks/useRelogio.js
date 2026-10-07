import { useEffect, useState } from 'react'

/**
 * Hora atual que se atualiza sozinha: o selo de "aberto agora" troca quando o
 * horário de atendimento começa ou termina, sem recarregar a página.
 * @param {number} [intervaloMs=30000]
 */
export function useRelogio(intervaloMs = 30000) {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), intervaloMs)
    return () => clearInterval(relogio)
  }, [intervaloMs])
  return agora
}
