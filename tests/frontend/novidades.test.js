import { describe, it, expect } from 'vitest'
import { DIAS_DE_NOVIDADE, ehNovidade } from '../../frontend/src/services/novidades.js'

const AGORA = new Date('2026-10-08T12:00:00Z')
const diasAtras = (n) => new Date(AGORA.getTime() - n * 86400000)

describe('ehNovidade', () => {
  it('negócio que entrou na vitrine há poucos dias é novidade', () => {
    expect(ehNovidade(diasAtras(6), AGORA)).toBe(true)
    expect(ehNovidade(diasAtras(0), AGORA)).toBe(true)
  })

  it(`depois de ${DIAS_DE_NOVIDADE} dias deixa de ser`, () => {
    expect(ehNovidade(diasAtras(DIAS_DE_NOVIDADE - 1), AGORA)).toBe(true)
    expect(ehNovidade(diasAtras(DIAS_DE_NOVIDADE), AGORA)).toBe(false)
    expect(ehNovidade(diasAtras(150), AGORA)).toBe(false)
  })

  it('sem data (nunca publicado), data inválida ou no futuro não é novidade', () => {
    expect(ehNovidade(null, AGORA)).toBe(false)
    expect(ehNovidade('não é data', AGORA)).toBe(false)
    expect(ehNovidade(diasAtras(-2), AGORA)).toBe(false)
  })

  it('aceita a data em texto, como vem do JSON da API', () => {
    expect(ehNovidade(diasAtras(3).toISOString(), AGORA)).toBe(true)
  })
})
