import { describe, it, expect } from 'vitest'
import {
  COMENTARIO_MAXIMO,
  descricaoDaReputacao,
  faixaDaMedia,
  formatarMedia,
  percentuaisDaDistribuicao,
  preenchimentoDasEstrelas,
  textoDaQuantidade,
  validarAvaliacao,
} from '../../frontend/src/services/avaliacoes.js'
import * as servidor from '../../backend/src/services/avaliacoes.js'

describe('faixaDaMedia (cor das estrelas)', () => {
  it('sem avaliações é neutra, nunca "mal avaliado"', () => {
    expect(faixaDaMedia(null, 0)).toBe('neutra')
    expect(faixaDaMedia(0, 0)).toBe('neutra')
  })

  it('cada faixa nos limites pedidos', () => {
    expect(faixaDaMedia(1)).toBe('vermelha')
    expect(faixaDaMedia(1.99)).toBe('vermelha')
    expect(faixaDaMedia(2)).toBe('laranja')
    expect(faixaDaMedia(2.99)).toBe('laranja')
    expect(faixaDaMedia(3)).toBe('dourada')
    expect(faixaDaMedia(3.99)).toBe('dourada')
    expect(faixaDaMedia(4)).toBe('verde')
    expect(faixaDaMedia(4.49)).toBe('verde')
    expect(faixaDaMedia(4.5)).toBe('excelente')
    expect(faixaDaMedia(5)).toBe('excelente')
  })
})

describe('preenchimentoDasEstrelas', () => {
  it('4,3 pinta quatro estrelas e 30% da quinta, sem arredondar antes', () => {
    expect(preenchimentoDasEstrelas(4.3)).toEqual([1, 1, 1, 1, 0.3])
    expect(preenchimentoDasEstrelas(4.25)).toEqual([1, 1, 1, 1, 0.25])
  })

  it('limites: 0, 5 e valores fora do intervalo', () => {
    expect(preenchimentoDasEstrelas(0)).toEqual([0, 0, 0, 0, 0])
    expect(preenchimentoDasEstrelas(5)).toEqual([1, 1, 1, 1, 1])
    expect(preenchimentoDasEstrelas(7)).toEqual([1, 1, 1, 1, 1])
    expect(preenchimentoDasEstrelas(null)).toEqual([0, 0, 0, 0, 0])
  })
})

describe('textos da reputação', () => {
  it('média com uma casa e vírgula, cortando em vez de arredondar para cima', () => {
    expect(formatarMedia(4.8)).toBe('4,8')
    expect(formatarMedia(4)).toBe('4,0')
    expect(formatarMedia(4.96)).toBe('4,9')
    expect(formatarMedia(null)).toBeNull()
  })

  it('singular e plural', () => {
    expect(textoDaQuantidade(1)).toBe('1 avaliação')
    expect(textoDaQuantidade(32)).toBe('32 avaliações')
  })

  it('leitura para leitor de tela', () => {
    expect(descricaoDaReputacao(4.3, 12)).toBe('Nota 4,3 de 5, 12 avaliações')
    expect(descricaoDaReputacao(null, 0)).toBe('Ainda sem avaliações')
  })
})

describe('percentuaisDaDistribuicao', () => {
  it('de 5 a 1 estrelas, com as quantidades reais', () => {
    const linhas = percentuaisDaDistribuicao({ 5: 3, 4: 1, 1: 0 }, 4)
    expect(linhas.map((l) => l.nota)).toEqual([5, 4, 3, 2, 1])
    expect(linhas[0]).toEqual({ nota: 5, quantidade: 3, percentual: 75 })
    expect(linhas.reduce((soma, l) => soma + l.quantidade, 0)).toBe(4)
  })

  it('sem avaliações, tudo zero (sem dividir por zero)', () => {
    expect(percentuaisDaDistribuicao({}, 0).every((l) => l.percentual === 0)).toBe(true)
  })
})

describe('validarAvaliacao (antes de enviar)', () => {
  it('exige nota de 1 a 5 e comentário', () => {
    expect(validarAvaliacao({ nota: 0, comentario: '' })).toEqual({
      nota: expect.any(String),
      comentario: expect.any(String),
    })
    expect(validarAvaliacao({ nota: 4, comentario: 'Muito bom' })).toEqual({})
  })

  it('recusa comentário acima do limite', () => {
    expect(validarAvaliacao({ nota: 4, comentario: 'x'.repeat(COMENTARIO_MAXIMO + 1) }).comentario).toBeTruthy()
  })

  it('mesmos limites do servidor', () => {
    expect(COMENTARIO_MAXIMO).toBe(servidor.COMENTARIO_MAXIMO)
  })
})
