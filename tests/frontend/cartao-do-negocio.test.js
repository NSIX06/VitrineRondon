import { describe, it, expect } from 'vitest'
import { localDoNegocio, textoDosItens } from '../../frontend/src/services/cartaoDoNegocio.js'

describe('localDoNegocio (linha do responsável no cartão)', () => {
  it('bairro e cidade, quando os dois existem', () => {
    expect(localDoNegocio({ bairro: 'Vila Aurora', cidade: 'Rondonópolis' })).toBe('Vila Aurora, Rondonópolis')
  })

  it('só o que foi cadastrado, sem vírgula sobrando', () => {
    expect(localDoNegocio({ cidade: 'Rondonópolis' })).toBe('Rondonópolis')
    expect(localDoNegocio({ bairro: 'Centro', cidade: '  ' })).toBe('Centro')
  })

  it('sem localização: texto vazio (o cartão mostra só o responsável)', () => {
    expect(localDoNegocio({})).toBe('')
    expect(localDoNegocio({ bairro: null, cidade: undefined })).toBe('')
    expect(localDoNegocio()).toBe('')
  })
})

describe('textoDosItens', () => {
  it('zero vira "Nenhum item cadastrado", nunca "0 itens"', () => {
    expect(textoDosItens(0)).toBe('Nenhum item cadastrado')
  })

  it('singular e plural', () => {
    expect(textoDosItens(1)).toBe('1 item na vitrine')
    expect(textoDosItens(8)).toBe('8 itens na vitrine')
  })
})
