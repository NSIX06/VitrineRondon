import { describe, it, expect } from 'vitest'
import { FOCO_PADRAO, escreverFoco, estiloDoFoco, lerFoco } from '../../frontend/src/services/enquadramento.js'

describe('enquadramento das fotos', () => {
  it('lê e escreve o ponto de foco', () => {
    expect(lerFoco('30% 70%')).toEqual({ x: 30, y: 70, zoom: 1 })
    expect(escreverFoco({ x: 30.4, y: 69.6 })).toBe('30% 70%')
  })

  it('arrastar além da borda para em 0% ou 100%', () => {
    expect(escreverFoco({ x: -20, y: 140 })).toBe('0% 100%')
  })

  it.each([[null], [''], ['center'], ['50% 50%; color:red'], ['200% 10%']])('valor fora do formato volta ao centro: %s', (valor) => {
    const foco = lerFoco(valor)
    expect(foco.x).toBeGreaterThanOrEqual(0)
    expect(foco.x).toBeLessThanOrEqual(100)
    if (valor !== '200% 10%') expect(foco).toEqual({ x: 50, y: 50, zoom: 1 })
  })

  it('estilo pronto para a imagem, com o centro quando não há foco salvo', () => {
    expect(estiloDoFoco('10% 20%')).toEqual({ objectPosition: '10% 20%' })
    expect(estiloDoFoco(undefined)).toEqual({ objectPosition: FOCO_PADRAO })
  })

  it('lê e escreve o zoom junto do ponto', () => {
    expect(lerFoco('30% 70% 1.5')).toEqual({ x: 30, y: 70, zoom: 1.5 })
    expect(escreverFoco({ x: 30, y: 70, zoom: 1.54 })).toBe('30% 70% 1.5')
    // Zoom 1 não vai para o texto: o valor fica igual ao de antes do zoom existir
    expect(escreverFoco({ x: 30, y: 70, zoom: 1 })).toBe('30% 70%')
  })

  it('zoom fica entre 1 e 3', () => {
    expect(escreverFoco({ x: 50, y: 50, zoom: 9 })).toBe('50% 50% 3')
    expect(escreverFoco({ x: 50, y: 50, zoom: 0.2 })).toBe('50% 50%')
    expect(lerFoco('50% 50% 7').zoom).toBe(3)
  })

  it('com zoom, a imagem aumenta a partir do ponto escolhido', () => {
    expect(estiloDoFoco('20% 80% 2')).toEqual({ objectPosition: '20% 80%', transform: 'scale(2)', transformOrigin: '20% 80%' })
  })
})
