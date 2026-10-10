import { describe, it, expect } from 'vitest'
import { digitosDoTelefone, formatarTelefone, telefoneCompleto } from '../../frontend/src/services/telefone.js'

describe('formatarTelefone', () => {
  it.each([
    ['6', '(6'],
    ['66', '(66'],
    ['669', '(66) 9'],
    ['669912', '(66) 9912'],
    ['6699123', '(66) 9912-3'],
    ['6634211234', '(66) 3421-1234'],
    ['66991234567', '(66) 99123-4567'],
  ])('vai formatando enquanto digita: %s -> %s', (entrada, esperado) => {
    expect(formatarTelefone(entrada)).toBe(esperado)
  })

  it.each([
    ['(66) 99123-4567'],
    ['66 99123-4567'],
    ['66 9 9123 4567'],
    ['+55 66 99123-4567'],
    ['+55 (66) 99123-4567'],
    ['5566991234567'],
  ])('colado com ou sem máscara (%s) vira o mesmo celular', (colado) => {
    expect(formatarTelefone(colado)).toBe('(66) 99123-4567')
  })

  it('colado como fixo, com código do país', () => {
    expect(formatarTelefone('+55 66 3421-1234')).toBe('(66) 3421-1234')
  })

  it('ignora letras e símbolos digitados por engano', () => {
    expect(formatarTelefone('66a99#12x3-4567')).toBe('(66) 99123-4567')
  })

  it('para em 11 dígitos', () => {
    expect(formatarTelefone('669912345678999')).toBe('(66) 99123-4567')
  })

  it('não confunde o DDD 55 (Santa Maria-RS) com o código do país', () => {
    expect(formatarTelefone('5532201234')).toBe('(55) 3220-1234')
    expect(formatarTelefone('55991234567')).toBe('(55) 99123-4567')
  })

  it.each([[''], [null], [undefined], ['abc']])('vazio continua vazio: %s', (entrada) => {
    expect(formatarTelefone(entrada)).toBe('')
  })
})

describe('digitosDoTelefone', () => {
  it('manda só os dígitos ao servidor', () => {
    expect(digitosDoTelefone('(66) 99123-4567')).toBe('66991234567')
  })

  it('tira o +55 de quem colou com o código do país', () => {
    expect(digitosDoTelefone('+55 (66) 99123-4567')).toBe('66991234567')
  })

  it('número antigo salvo com 55 na frente volta sem ele', () => {
    expect(digitosDoTelefone('556634211234')).toBe('6634211234')
  })
})

describe('telefoneCompleto', () => {
  it.each([['(66) 99123-4567'], ['(66) 3421-1234'], ['+55 66 99123-4567']])('aceita %s', (valor) => {
    expect(telefoneCompleto(valor)).toBe(true)
  })

  it.each([[''], ['(66'], ['(66) 9912-3'], ['991234567']])('recusa incompleto: %s', (valor) => {
    expect(telefoneCompleto(valor)).toBe(false)
  })
})
