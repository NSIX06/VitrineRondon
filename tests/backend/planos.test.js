import { describe, it, expect, vi } from 'vitest'
import { PLANOS, semearPlanos } from '../../backend/prisma/planos.js'

const porNome = (nome) => PLANOS.find((p) => p.nome === nome)

describe('PLANOS', () => {
  it('Essencial custa R$ 50,00 e Destaque R$ 75,00, em centavos e por mês', () => {
    expect(porNome('ESSENCIAL')).toMatchObject({ precoCentavos: 5000, ciclo: 'MONTHLY' })
    expect(porNome('DESTAQUE')).toMatchObject({ precoCentavos: 7500, ciclo: 'MONTHLY' })
  })

  it('só o Destaque liga selo, métricas ampliadas e divulgação', () => {
    expect(porNome('ESSENCIAL')).toMatchObject({ destaque: false, metricasAmpliadas: false, divulgacao: false })
    expect(porNome('DESTAQUE')).toMatchObject({ destaque: true, metricasAmpliadas: true, divulgacao: true })
  })

  it('nomes únicos, preços inteiros positivos e uma lista de benefícios', () => {
    expect(new Set(PLANOS.map((p) => p.nome)).size).toBe(PLANOS.length)
    for (const plano of PLANOS) {
      expect(Number.isInteger(plano.precoCentavos) && plano.precoCentavos > 0).toBe(true)
      expect(plano.descricao.split('\n').length).toBeGreaterThan(2)
    }
  })

  // Transparência comercial: os planos oferecem oportunidade de exposição e
  // nunca garantem resultado
  it.each([
    /mais clientes/i,
    /garant/i,
    /primeiro lugar/i,
    /sempre (no|em) (topo|primeiro)/i,
    /\d+\s*(visualiza|clientes|vendas)/i,
  ])('nenhum texto de plano promete resultado (%s)', (proibido) => {
    for (const plano of PLANOS) {
      expect(`${plano.titulo} ${plano.chamada} ${plano.descricao}`).not.toMatch(proibido)
    }
  })
})

describe('semearPlanos', () => {
  it('cria ou atualiza cada plano pelo nome, sem apagar nada', async () => {
    const prisma = { plano: { upsert: vi.fn().mockResolvedValue({}), deleteMany: vi.fn() } }
    expect(await semearPlanos(prisma)).toBe(PLANOS.length)
    expect(prisma.plano.upsert).toHaveBeenCalledTimes(PLANOS.length)
    expect(prisma.plano.upsert.mock.calls[0][0].where).toEqual({ nome: 'ESSENCIAL' })
    expect(prisma.plano.deleteMany).not.toHaveBeenCalled()
  })

  it('não sobrescreve o vínculo com o produto já criado no gateway', async () => {
    const prisma = { plano: { upsert: vi.fn().mockResolvedValue({}) } }
    await semearPlanos(prisma)
    for (const [{ update }] of prisma.plano.upsert.mock.calls) {
      expect(update).not.toHaveProperty('gatewayProdutoId')
    }
  })
})
