import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: { contato: { create: vi.fn(async ({ data }) => ({ id: 1, ...data, empreendedorId: data.empreendedorId ?? null })) } },
}))
vi.mock('../../backend/src/services/auditoria.js', async (original) => ({
  ...(await original()),
  registrarLog: vi.fn(() => Promise.resolve()),
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { criarContato, criarContatoSchema } = await import('../../backend/src/controllers/contatoController.js')

const resposta = () => {
  const saida = { codigo: 200, corpo: null }
  return { saida, status(c) { saida.codigo = c; return this }, json(c) { saida.corpo = c; return this } }
}

beforeEach(() => vi.clearAllMocks())

describe('mensagens da central de ajuda vão só para a equipe', () => {
  const pedido = { nome: 'Ana', email: 'ana@exemplo.com', mensagem: 'Como anuncio meu bolo?', empreendedorId: 7 }

  it('o schema descarta o destinatário', () => {
    expect(criarContatoSchema.parse(pedido)).not.toHaveProperty('empreendedorId')
  })

  it('mesmo chamando a API direto com um destinatário, a mensagem fica para a equipe', async () => {
    const res = resposta()
    await criarContato({ body: pedido, headers: {}, get: () => '', ip: '127.0.0.1' }, res, vi.fn())
    expect(res.saida.codigo).toBe(201)
    expect(prisma.contato.create.mock.calls[0][0].data).not.toHaveProperty('empreendedorId')
    expect(res.saida.corpo.data.empreendedorId).toBeNull()
  })
})
