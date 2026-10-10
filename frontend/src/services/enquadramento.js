// Enquadramento das fotos do negócio: o ponto ("x% y%") que fica à vista
// quando a foto é cortada para caber na faixa da página ou no cartão.

export const FOCO_PADRAO = '50% 50%'

const limitar = (n) => Math.min(100, Math.max(0, n))

/** "30% 70%" -> { x: 30, y: 70 } (o que não estiver no formato volta ao centro) */
export function lerFoco(foco) {
  const achado = /^(\d{1,3})% (\d{1,3})%$/.exec(String(foco ?? '').trim())
  if (!achado) return { x: 50, y: 50 }
  return { x: limitar(Number(achado[1])), y: limitar(Number(achado[2])) }
}

/** { x, y } -> "30% 70%", arredondado e dentro de 0 a 100 */
export function escreverFoco({ x, y }) {
  return `${Math.round(limitar(x))}% ${Math.round(limitar(y))}%`
}

/** Estilo pronto para a <img>: { objectPosition } (sem foco salvo, o centro) */
export const estiloDoFoco = (foco) => ({ objectPosition: escreverFoco(lerFoco(foco)) })
