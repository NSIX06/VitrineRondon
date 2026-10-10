import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: {
    empreendedor: { findUnique: vi.fn() },
    produto: {
      findUnique: vi.fn(),
      create: vi.fn(async ({ data }) => ({ id: 9, ...data })),
      update: vi.fn(async ({ data }) => ({ id: 9, ...data })),
      delete: vi.fn(async () => ({})),
      count: vi.fn(async () => 0),
    },
  },
}))
vi.mock('../../backend/src/services/auditoria.js', async (original) => ({
  ...(await original()),
  registrarLog: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../backend/src/services/imagens.js', async (original) => ({
  ...(await original()),
  apagarSeOrfa: vi.fn(() => Promise.resolve()),
  apagarSeTrocou: vi.fn(() => Promise.resolve()),
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { criarProduto, atualizarProduto, excluirProduto } = await import('../../backend/src/controllers/produtoController.js')

const DONO = { id: 5, perfil: 'EMPREENDEDOR' }
const ADMIN = { id: 1, perfil: 'ADMIN' }
const amanha = new Date(Date.now() + 86_400_000)
const ontem = new Date(Date.now() - 86_400_000)
const negocio = (publicadoAte) => ({ id: 3, usuarioId: DONO.id, nomeNegocio: 'Doces da Lu', ativo: true, publicadoAte })
const item = { nome: 'Bolo', preco: 30, tipo: 'produto', empreendedorId: 3 }

const resposta = () => {
  const saida = { codigo: 200, corpo: null }
  return { saida, status(c) { saida.codigo = c; return this }, json(c) { saida.corpo = c; return this } }
}
async function chamar(acao, req) {
  const res = resposta()
  const next = vi.fn()
  await acao(req, res, next)
  return { res: res.saida, erro: next.mock.calls[0]?.[0] }
}

beforeEach(() => vi.clearAllMocks())

describe('catálogo só com o plano em vigor', () => {
  it('sem plano pago, o dono não cria item', async () => {
    prisma.empreendedor.findUnique.mockResolvedValue(negocio(null))
    const { erro } = await chamar(criarProduto, { usuario: DONO, body: item })
    expect(erro).toMatchObject({ status: 403, message: expect.stringMatching(/plano/) })
    expect(prisma.produto.create).not.toHaveBeenCalled()
  })

  it('com o plano vencido, também não', async () => {
    prisma.empreendedor.findUnique.mockResolvedValue(negocio(ontem))
    const { erro } = await chamar(criarProduto, { usuario: DONO, body: item })
    expect(erro?.status).toBe(403)
  })

  it('com o plano em vigor, cria', async () => {
    prisma.empreendedor.findUnique.mockResolvedValue(negocio(amanha))
    const { res, erro } = await chamar(criarProduto, { usuario: DONO, body: item })
    expect(erro).toBeUndefined()
    expect(res.codigo).toBe(201)
  })

  it('a administração cria mesmo sem plano', async () => {
    prisma.empreendedor.findUnique.mockResolvedValue(negocio(null))
    const { res } = await chamar(criarProduto, { usuario: ADMIN, body: item })
    expect(res.codigo).toBe(201)
  })

  it('sem plano, o dono não edita, mas ainda pode excluir', async () => {
    prisma.produto.findUnique.mockResolvedValue({ id: 9, imagem: null, empreendedor: negocio(null) })
    const edicao = await chamar(atualizarProduto, { usuario: DONO, params: { id: '9' }, body: { nome: 'Bolo novo' } })
    expect(edicao.erro?.status).toBe(403)
    expect(prisma.produto.update).not.toHaveBeenCalled()

    const exclusao = await chamar(excluirProduto, { usuario: DONO, params: { id: '9' } })
    expect(exclusao.erro).toBeUndefined()
    expect(prisma.produto.delete).toHaveBeenCalled()
  })
})
