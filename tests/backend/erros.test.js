import { describe, it, expect } from 'vitest'
import { erroHttp, parseId, mensagemPadrao, MENSAGEM_GENERICA } from '../../backend/src/utils/erros.js'

describe('erroHttp', () => {
  it('guarda o status e a mensagem informados', () => {
    const erro = erroHttp(403, 'Você só pode alterar o seu próprio negócio')
    expect(erro).toBeInstanceOf(Error)
    expect(erro.status).toBe(403)
    expect(erro.message).toBe('Você só pode alterar o seu próprio negócio')
  })

  it('marca a mensagem como própria para exibição', () => {
    // É essa marca que autoriza o errorHandler a repassar o texto
    expect(erroHttp(404, 'Produto não encontrado').publico).toBe(true)
    expect(new Error('falha de biblioteca').publico).toBeUndefined()
  })
})

describe('parseId', () => {
  it('aceita inteiro positivo, como número ou texto', () => {
    expect(parseId('7')).toBe(7)
    expect(parseId(7)).toBe(7)
  })

  it.each([
    ['texto', 'abc'],
    ['vazio', ''],
    ['zero', '0'],
    ['negativo', '-3'],
    ['quebrado', '1.5'],
    ['nulo', null],
    ['ausente', undefined],
    ['injeção', '1 OR 1=1'],
  ])('recusa %s', (_rotulo, valor) => {
    expect(() => parseId(valor)).toThrowError('ID inválido')
  })

  it('recusa com status 400 e mensagem exibível', () => {
    expect.assertions(2)
    try {
      parseId('abc')
    } catch (erro) {
      expect(erro.status).toBe(400)
      expect(erro.publico).toBe(true)
    }
  })
})

describe('mensagemPadrao', () => {
  it('tem texto próprio para os status que a API usa', () => {
    expect(mensagemPadrao(401)).toMatch(/login/i)
    expect(mensagemPadrao(403)).toMatch(/permissão/i)
    expect(mensagemPadrao(404)).toMatch(/não encontrado/i)
    expect(mensagemPadrao(429)).toMatch(/requisições/i)
  })

  it('cai no texto genérico para status que não mapeamos', () => {
    expect(mensagemPadrao(418)).toBe(MENSAGEM_GENERICA)
    expect(mensagemPadrao(undefined)).toBe(MENSAGEM_GENERICA)
  })

  it('nenhuma mensagem padrão descreve o sistema por dentro', () => {
    const suspeito = /prisma|mysql|sql|node|express|stack|\.js/i
    for (const status of [400, 401, 403, 404, 409, 413, 415, 429, 500]) {
      expect(mensagemPadrao(status)).not.toMatch(suspeito)
    }
  })
})
