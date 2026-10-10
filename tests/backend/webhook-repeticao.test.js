import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: { eventoWebhook: { findUnique: vi.fn(), create: vi.fn(() => Promise.resolve({})) } },
}))
vi.mock('../../backend/src/services/pagamento/index.js', () => ({
  EVENTOS: { IGNORADO: 'IGNORADO', PAGO: 'PAGO' },
  provedorPagamento: () => ({
    webhookAutentico: () => true,
    interpretarWebhook: (corpo) => ({ tipo: 'PAGO', eventoId: corpo.id }),
  }),
}))
vi.mock('../../backend/src/services/assinaturas.js', async (original) => ({
  ...(await original()),
  aplicarEvento: vi.fn(() => Promise.resolve({ id: 1 })),
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { aplicarEvento } = await import('../../backend/src/services/assinaturas.js')
const { receberWebhook } = await import('../../backend/src/controllers/assinaturaController.js')

const resposta = () => {
  const saida = { codigo: 200, corpo: null }
  return { saida, status(c) { saida.codigo = c; return this }, json(c) { saida.corpo = c; return this } }
}
const aviso = (id) => ({ query: { webhookSecret: 'x' }, get: () => 'assinatura', body: Buffer.from(JSON.stringify({ id, event: 'billing.paid' })) })

beforeEach(() => vi.clearAllMocks())

describe('webhook: aviso repetido', () => {
  it('aplica o aviso novo e registra o id do evento depois de aplicar', async () => {
    prisma.eventoWebhook.findUnique.mockResolvedValue(null)
    const res = resposta()
    await receberWebhook(aviso('evt_1'), res)
    expect(aplicarEvento).toHaveBeenCalledTimes(1)
    expect(prisma.eventoWebhook.create).toHaveBeenCalledWith({ data: { id: 'evt_1' } })
    expect(res.saida.corpo).toEqual({ success: true })
  })

  it('confirma o aviso já processado sem aplicar de novo', async () => {
    prisma.eventoWebhook.findUnique.mockResolvedValue({ id: 'evt_1' })
    const res = resposta()
    await receberWebhook(aviso('evt_1'), res)
    expect(aplicarEvento).not.toHaveBeenCalled()
    expect(res.saida.corpo).toEqual({ success: true, repetido: true })
  })

  it('se aplicar falhar, não registra o id (o gateway pode tentar de novo)', async () => {
    prisma.eventoWebhook.findUnique.mockResolvedValue(null)
    aplicarEvento.mockRejectedValueOnce(new Error('banco fora'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = resposta()
    await receberWebhook(aviso('evt_2'), res)
    expect(res.saida.codigo).toBe(500)
    expect(prisma.eventoWebhook.create).not.toHaveBeenCalled()
  })
})
