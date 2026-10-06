import { describe, it, expect } from 'vitest'
import { lerOrigens, origemPermitida } from '../../backend/src/utils/origens.js'

describe('lerOrigens', () => {
  it('separa a lista por vírgula e tira espaços', () => {
    expect(lerOrigens(' https://vitrine.com.br , https://www.vitrine.com.br ')).toEqual([
      'https://vitrine.com.br',
      'https://www.vitrine.com.br',
    ])
  })

  it('lista vazia quando a variável não existe', () => {
    expect(lerOrigens(undefined)).toEqual([])
    expect(lerOrigens('')).toEqual([])
  })
})

describe('em desenvolvimento, sem lista', () => {
  it.each([
    'http://localhost:5173',
    // O Vite pula para a próxima porta quando a 5173 está ocupada
    'http://localhost:5174',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://[::1]:5173',
  ])('aceita a própria máquina: %s', (origem) => {
    expect(origemPermitida(origem)).toBe(true)
  })

  it.each([
    'http://192.168.15.11:5173',
    'https://site-malicioso.example',
    'http://localhost.site-malicioso.example:5173',
    'http://localhost:5173.site-malicioso.example',
    'http://localhost',
    'null',
  ])('recusa o que não é a própria máquina: %s', (origem) => {
    expect(origemPermitida(origem)).toBe(false)
  })
})

describe('em produção', () => {
  it('sem lista, recusa tudo, inclusive localhost', () => {
    // Esquecer de configurar fecha a API em vez de abri-la
    expect(origemPermitida('http://localhost:5173', { producao: true })).toBe(false)
  })

  it('com lista, aceita só o que está nela', () => {
    const lista = ['https://vitrine.com.br']
    expect(origemPermitida('https://vitrine.com.br', { lista, producao: true })).toBe(true)
    expect(origemPermitida('https://outro.com.br', { lista, producao: true })).toBe(false)
    expect(origemPermitida('http://localhost:5173', { lista, producao: true })).toBe(false)
  })
})

describe('lista explícita em desenvolvimento', () => {
  it('vale só a lista, sem a liberação automática da máquina local', () => {
    const lista = ['http://localhost:3000']
    expect(origemPermitida('http://localhost:3000', { lista })).toBe(true)
    expect(origemPermitida('http://localhost:5173', { lista })).toBe(false)
  })
})
