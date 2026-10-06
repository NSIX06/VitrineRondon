import { describe, it, expect } from 'vitest'
import { numeroInternacional, linkWhatsapp } from '../../frontend/src/services/whatsapp.js'

describe('numeroInternacional', () => {
  it.each([
    ['(66) 99123-4567', '5566991234567'],
    ['66991234567', '5566991234567'],
    ['66 9 9123 4567', '5566991234567'],
  ])('põe o código do Brasil em %s', (entrada, esperado) => {
    expect(numeroInternacional(entrada)).toBe(esperado)
  })

  it('não repete o 55 de quem já digitou o código do país', () => {
    expect(numeroInternacional('+55 66 99123-4567')).toBe('5566991234567')
  })

  it('trata 55 no começo do DDD como número local', () => {
    // (55) é o DDD de Santa Maria-RS: sem isso, o número perderia o país
    expect(numeroInternacional('(55) 3220-1234')).toBe('555532201234')
  })

  it.each([[null], [undefined], ['']])('aguenta número ausente: %s', (entrada) => {
    expect(numeroInternacional(entrada)).toBe('55')
  })
})

describe('linkWhatsapp', () => {
  it('monta o endereço do wa.me', () => {
    expect(linkWhatsapp('(66) 99123-4567')).toBe('https://wa.me/5566991234567')
  })

  it('leva a mensagem inicial já escrita', () => {
    const link = linkWhatsapp('66991234567', 'Olá! Vi seu bolo na VitrineLocal')
    expect(link).toBe('https://wa.me/5566991234567?text=Ol%C3%A1!%20Vi%20seu%20bolo%20na%20VitrineLocal')
  })

  it('escapa quebra de linha e símbolos da mensagem', () => {
    const link = linkWhatsapp('66991234567', 'Oi\nQuanto custa? 50% mais barato?')
    expect(link).toContain('%0A')
    expect(link).not.toMatch(/[\n ]/)
  })

  it('sem mensagem, abre a conversa em branco', () => {
    expect(linkWhatsapp('66991234567', '')).toBe('https://wa.me/5566991234567')
  })
})
