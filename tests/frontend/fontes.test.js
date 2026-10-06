import { describe, it, expect } from 'vitest'
import { FONTES, LISTA_FONTES, CREDITO_BANDEIRA } from '../../frontend/src/services/fontes.js'

// O projeto não inventa número nem notícia: tudo o que a interface afirma
// aponta para a matéria de onde veio. Estes testes guardam essa regra.
describe('fontes do conteúdo', () => {
  it('a lista é a mesma coisa que o mapa de fontes', () => {
    expect(LISTA_FONTES).toHaveLength(Object.keys(FONTES).length)
  })

  it.each(Object.keys(FONTES))('a fonte %s está completa', (chave) => {
    const fonte = FONTES[chave]
    expect(fonte.titulo?.length).toBeGreaterThan(10)
    expect(fonte.veiculo?.length).toBeGreaterThan(2)
    expect(fonte.data?.length).toBeGreaterThan(3)
  })

  it.each(Object.keys(FONTES))('a fonte %s tem endereço acessível', (chave) => {
    expect(() => new URL(FONTES[chave].url)).not.toThrow()
    expect(FONTES[chave].url).toMatch(/^https:\/\//)
  })

  it('cada fonte se identifica com a própria chave', () => {
    for (const [chave, fonte] of Object.entries(FONTES)) expect(fonte.id).toBe(chave)
  })

  it('nenhuma fonte aponta para o mesmo endereço de outra', () => {
    const enderecos = LISTA_FONTES.map((f) => f.url)
    expect(new Set(enderecos).size).toBe(enderecos.length)
  })
})

describe('crédito da imagem', () => {
  it('diz autor, licença e de onde veio', () => {
    expect(CREDITO_BANDEIRA.autor).toBeTruthy()
    expect(CREDITO_BANDEIRA.licenca).toBeTruthy()
    expect(CREDITO_BANDEIRA.url).toMatch(/^https:\/\//)
  })
})
