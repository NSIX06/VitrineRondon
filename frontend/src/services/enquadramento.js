// Enquadramento das fotos: o ponto ("x% y%") que fica à vista quando a foto é
// cortada para caber na faixa da página ou no cartão e, opcionalmente, o zoom
// ("x% y% 1.4"), que aproxima a foto a partir desse mesmo ponto.

export const FOCO_PADRAO = '50% 50%'
export const ZOOM_MINIMO = 1
export const ZOOM_MAXIMO = 3

const limitar = (n) => Math.min(100, Math.max(0, n))
const limitarZoom = (z) => Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, Math.round(z * 10) / 10))

/** "30% 70% 1.5" -> { x: 30, y: 70, zoom: 1.5 } (o que não estiver no formato volta ao centro, sem zoom) */
export function lerFoco(foco) {
  const achado = /^(\d{1,3})% (\d{1,3})%(?: (\d(?:\.\d)?))?$/.exec(String(foco ?? '').trim())
  if (!achado) return { x: 50, y: 50, zoom: 1 }
  return {
    x: limitar(Number(achado[1])),
    y: limitar(Number(achado[2])),
    zoom: achado[3] ? limitarZoom(Number(achado[3])) : 1,
  }
}

/** { x, y, zoom } -> "30% 70%" ou "30% 70% 1.5", arredondado e dentro dos limites */
export function escreverFoco({ x, y, zoom = 1 }) {
  const ponto = `${Math.round(limitar(x))}% ${Math.round(limitar(y))}%`
  const z = limitarZoom(zoom)
  return z > 1 ? `${ponto} ${z}` : ponto
}

/**
 * Estilo pronto para a <img>: { objectPosition } e, com zoom, a escala a partir
 * do mesmo ponto (a moldura em volta precisa de overflow: hidden)
 */
export function estiloDoFoco(foco) {
  const { x, y, zoom } = lerFoco(foco)
  const ponto = `${x}% ${y}%`
  if (zoom <= 1) return { objectPosition: ponto }
  return { objectPosition: ponto, transform: `scale(${zoom})`, transformOrigin: ponto }
}
