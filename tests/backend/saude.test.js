import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: { $queryRaw: vi.fn() },
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { criarVerificacaoDeSaude } = await import('../../backend/src/controllers/saudeController.js')

async function verificar(opcoes) {
  const saida = { codigo: 200, corpo: null }
  const res = {
    status(codigo) {
      saida.codigo = codigo
      return this
    },
    json(corpo) {
      saida.corpo = corpo
      return this
    },
  }
  await criarVerificacaoDeSaude(opcoes)({}, res)
  return saida
}

beforeEach(() => {
  prisma.$queryRaw.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('verificação de saúde', () => {
  it('responde 200 quando o banco responde', async () => {
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }])
    const { codigo, corpo } = await verificar()
    expect(codigo).toBe(200)
    expect(corpo).toMatchObject({ success: true, banco: 'ok' })
  })

  it('consulta o banco de verdade, em vez de só dizer que está no ar', async () => {
    prisma.$queryRaw.mockResolvedValue([])
    await verificar()
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('responde 503 quando o banco está fora do ar', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("Can't reach database server at `localhost:3306`"))
    const { codigo, corpo } = await verificar()
    expect(codigo).toBe(503)
    expect(corpo).toMatchObject({ success: false, banco: 'indisponivel' })
  })

  it('não conta ao cliente onde o banco fica', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("Can't reach database server at `localhost:3306`"))
    const { corpo } = await verificar()
    expect(JSON.stringify(corpo)).not.toMatch(/localhost|3306|reach/)
  })

  it('desiste e responde 503 quando o banco trava sem responder', async () => {
    prisma.$queryRaw.mockReturnValue(new Promise(() => {}))
    const inicio = Date.now()
    const { codigo } = await verificar({ limiteMs: 50 })
    expect(codigo).toBe(503)
    expect(Date.now() - inicio).toBeLessThan(1000)
  })
})
