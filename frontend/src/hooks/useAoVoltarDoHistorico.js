import { useEffect, useRef } from 'react'

/**
 * Chama `aoVoltar` quando o navegador restaura a página do cache de
 * ida-e-volta (bfcache): a pessoa saiu para o checkout e tocou em "voltar".
 * A página volta congelada como estava, com botões em "Abrindo o pagamento..."
 * e desativados; quem usa o hook destrava esses estados aqui.
 */
export function useAoVoltarDoHistorico(aoVoltar) {
  const ref = useRef(aoVoltar)
  useEffect(() => {
    ref.current = aoVoltar
  })

  useEffect(() => {
    const ouvinte = (evento) => {
      if (evento.persisted) ref.current?.()
    }
    window.addEventListener('pageshow', ouvinte)
    return () => window.removeEventListener('pageshow', ouvinte)
  }, [])
}
