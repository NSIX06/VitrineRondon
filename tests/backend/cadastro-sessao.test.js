import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Banco de mentira com transação de verdade: o que foi criado dentro dela só
// vale se a função terminar sem erro; se lançar, tudo é descartado.
const gravado = []
vi.mock('../../backend/src/config/prisma.js', () => {
  let proximoId = 1
  const criarTx = (pendente) => ({
    usuario: {
      create: async ({ data }) => {
        const usuario = { id: proximoId++, nome: data.nome, email: data.email, telefone: data.telefone, perfil: data.perfil, ativo: true }
        pendente.push(['usuario', usuario])
        return usuario
      },
    },
    empreendedor: {
      create: async ({ data }) => {
        const empreendedor = { id: proximoId++, nomeNegocio: data.nomeNegocio, usuarioId: data.usuarioId }
        pendente.push(['empreendedor', empreendedor])
        return empreendedor
      },
    },
    aceiteTermos: { createMany: async ({ data }) => pendente.push(['aceites', data.length]) },
  })
  return {
    default: {
      $transaction: async (fn) => {
        const pendente = []
        const resultado = await fn(criarTx(pendente))
        gravado.push(...pendente)
        return resultado
      },
    },
  }
})
vi.mock('../../backend/src/services/auditoria.js', async (original) => ({
  ...(await original()),
  registrarLog: vi.fn(() => Promise.resolve()),
}))

const { registrarEmpreendedor, registrarComum } = await import('../../backend/src/controllers/authController.js')

const resposta = () => {
  const saida = { codigo: 200, corpo: null }
  return { saida, status(c) { saida.codigo = c; return this }, json(c) { saida.corpo = c; return this } }
}
const conta = { nome: 'Lu Doces', email: 'lu@exemplo.com.br', telefone: '66991234567', senha: 'Feira2026xyz' }
const pedidoEmpreendedor = () => ({
  body: { conta, negocio: { nomeNegocio: 'Doces da Lu', responsavel: 'Lu', categoria: 'Alimentação', cidade: 'Rondonópolis', estado: 'MT', whatsapp: '66991234567', horarios: [] }, aceites: {} },
  headers: {},
  get: () => '',
  ip: '127.0.0.1',
})

let segredoOriginal
beforeEach(() => {
  gravado.length = 0
  segredoOriginal = process.env.JWT_SECRET
  process.env.JWT_SECRET = 'segredo-de-teste'
})
afterEach(() => {
  process.env.JWT_SECRET = segredoOriginal
})

describe('cadastro só grava se a sessão puder ser aberta', () => {
  it('com a chave de sessão, grava conta, negócio e aceites e devolve o token', async () => {
    const res = resposta()
    const next = vi.fn()
    await registrarEmpreendedor(pedidoEmpreendedor(), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.saida.codigo).toBe(201)
    expect(res.saida.corpo.data.token).toMatch(/^ey/)
    expect(gravado.map(([tipo]) => tipo)).toEqual(['usuario', 'empreendedor', 'aceites'])
  })

  it('sem JWT_SECRET, não deixa conta criada (a nova tentativa não vira "e-mail já cadastrado")', async () => {
    delete process.env.JWT_SECRET
    const res = resposta()
    const next = vi.fn()
    await registrarEmpreendedor(pedidoEmpreendedor(), res, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/JWT_SECRET/) }))
    expect(gravado).toEqual([])
  })

  it('o cadastro de usuário comum segue a mesma regra', async () => {
    delete process.env.JWT_SECRET
    const next = vi.fn()
    await registrarComum({ body: conta, headers: {}, get: () => '', ip: '127.0.0.1' }, resposta(), next)
    expect(next).toHaveBeenCalled()
    expect(gravado).toEqual([])
  })
})
