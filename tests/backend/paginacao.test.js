import { describe, it, expect } from 'vitest'
import { lerPaginacao, resumoPaginacao } from '../../backend/src/utils/paginacao.js'

describe('lerPaginacao', () => {
  it('sem pedido de página, a listagem vem inteira como antes', () => {
    expect(lerPaginacao({ categoria: 'Moda' })).toEqual({ ativa: false })
    expect(lerPaginacao()).toEqual({ ativa: false })
  })

  it('calcula quantos itens pular e quantos trazer', () => {
    expect(lerPaginacao({ pagina: '3', porPagina: '9' })).toEqual({
      ativa: true,
      pagina: 3,
      porPagina: 9,
      skip: 18,
      take: 9,
    })
  })

  it('usa 12 por página quando só a página vem', () => {
    expect(lerPaginacao({ pagina: '2' })).toMatchObject({ porPagina: 12, skip: 12 })
  })

  it('começa da primeira página quando só o tamanho vem', () => {
    expect(lerPaginacao({ porPagina: '6' })).toMatchObject({ pagina: 1, skip: 0, take: 6 })
  })

  it.each([['0'], ['-1'], ['abc'], ['1.5']])('recusa a página %s', (pagina) => {
    expect(() => lerPaginacao({ pagina })).toThrowError('Página inválida')
  })

  it.each([['0'], ['61'], ['abc']])('recusa %s itens por página', (porPagina) => {
    expect(() => lerPaginacao({ porPagina })).toThrowError(/de 1 a 60 itens por página/)
  })

  it('recusa com status 400 e mensagem exibível', () => {
    expect.assertions(2)
    try {
      lerPaginacao({ pagina: '0' })
    } catch (erro) {
      expect(erro.status).toBe(400)
      expect(erro.publico).toBe(true)
    }
  })
})

describe('resumoPaginacao', () => {
  it('conta as páginas arredondando para cima', () => {
    expect(resumoPaginacao({ pagina: 1, porPagina: 9 }, 13)).toEqual({
      pagina: 1,
      porPagina: 9,
      total: 13,
      totalPaginas: 2,
    })
  })

  it('conta exatamente quando o total divide certo', () => {
    expect(resumoPaginacao({ pagina: 1, porPagina: 6 }, 12).totalPaginas).toBe(2)
  })

  it('lista vazia ainda tem uma página, para a tela não mostrar "página 1 de 0"', () => {
    expect(resumoPaginacao({ pagina: 1, porPagina: 9 }, 0).totalPaginas).toBe(1)
  })
})
