import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import './MapaPreguicoso.css'

/* O Leaflet e o seu CSS somam cerca de 43 kB comprimidos, e só duas telas
   mostram mapa. Carregando o componente à parte, quem navega pela vitrine não
   baixa nada disso. */
const Mapa = lazy(() => import('./Mapa'))

/**
 * Mapa carregado só quando aparece na tela.
 * A caixa de espera tem a mesma altura do mapa, para o conteúdo em volta não
 * pular quando ele chega.
 */
function MapaPreguicoso(props) {
  // O lazy() sozinho baixava o Leaflet assim que a página abria, mesmo com o
  // mapa a várias telas de distância: agora espera ele chegar perto da tela
  const caixa = useRef(null)
  const [perto, setPerto] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (perto) return undefined
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) setPerto(true)
      },
      { rootMargin: '600px 0px' }
    )
    observador.observe(caixa.current)
    return () => observador.disconnect()
  }, [perto])

  const espera = (
    <div ref={caixa} className="mapa-espera" style={props.altura ? { height: props.altura } : undefined}>
      <span>Carregando o mapa...</span>
    </div>
  )

  if (!perto) return espera

  return (
    <Suspense fallback={espera}>
      <Mapa {...props} />
    </Suspense>
  )
}

export default MapaPreguicoso
