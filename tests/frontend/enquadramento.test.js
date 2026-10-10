import { describe, it, expect } from 'vitest'
import { FOCO_PADRAO, escreverFoco, estiloDoFoco, lerFoco } from '../../frontend/src/services/enquadramento.js'

describe('enquadramento das fotos', () => {
  it('lê e escreve o ponto de foco', () => {
    expect(lerFoco('30% 70%')).toEqual({ x: 30, y: 70 })
    expect(escreverFoco({ x: 30.4, y: 69.6 })).toBe('30% 70%')
  })

  it('arrastar além da borda para em 0% ou 100%', () => {
    expect(escreverFoco({ x: -20, y: 140 })).toBe('0% 100%')
  })

  it.each([[null], [''], ['center'], ['50% 50%; color:red'], ['200% 10%']])('valor fora do formato volta ao centro: %s', (valor) => {
    const foco = lerFoco(valor)
    expect(foco.x).toBeGreaterThanOrEqual(0)
    expect(foco.x).toBeLessThanOrEqual(100)
    if (valor !== '200% 10%') expect(foco).toEqual({ x: 50, y: 50 })
  })

  it('estilo pronto para a imagem, com o centro quando não há foco salvo', () => {
    expect(estiloDoFoco('10% 20%')).toEqual({ objectPosition: '10% 20%' })
    expect(estiloDoFoco(undefined)).toEqual({ objectPosition: FOCO_PADRAO })
  })
})
