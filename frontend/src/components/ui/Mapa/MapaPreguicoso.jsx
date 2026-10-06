import { Suspense, lazy } from 'react'
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
  const espera = (
    <div className="mapa-espera" style={props.altura ? { height: props.altura } : undefined}>
      <span>Carregando o mapa...</span>
    </div>
  )

  return (
    <Suspense fallback={espera}>
      <Mapa {...props} />
    </Suspense>
  )
}

export default MapaPreguicoso
