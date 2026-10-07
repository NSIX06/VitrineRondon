import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: {
    empreendedor: { findUnique: vi.fn() },
    plano: { findUnique: vi.fn() },
    divulgacao: { create: vi.fn() },
  },
}))
vi.mock('../../backend/src/services/auditoria.js', async (original) => ({ ...(await original()), registrarLog: vi.fn() }))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { registrarLog } = await import('../../backend/src/services/auditoria.js')
const {
  criarDivulgacao,
  criarDivulgacaoSchema,
  atualizarDivulgacaoSchema,
  comDataDePublicacao,
  TIPOS_DIVULGACAO,
  STATUS_DIVULGACAO,
} = await import('../../backend/src/controllers/divulgacaoController.js')
const telas = await import('../../frontend/src/services/divulgacoes.js')

const DADOS = { empreendedorId: 7, tipo: 'NEGOCIO', titulo: 'No feed da semana', canal: 'Instagram' }
const resposta = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() })
const NEGOCIO = {
  id: 7,
  nomeNegocio: 'Silva',
  ativo: true,
  planoAtual: 'DESTAQUE',
  publicadoAte: new Date(Date.now() + 30 * 86400000),
  autorizaDivulgacao: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.empreendedor.findUnique.mockResolvedValue(NEGOCIO)
  prisma.plano.findUnique.mockResolvedValue({ nome: 'DESTAQUE', divulgacao: true })
  prisma.divulgacao.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }))
})

describe('schemas', () => {
  it('aceita o registro mínimo', () => {
    expect(criarDivulgacaoSchema.safeParse(DADOS).success).toBe(true)
  })

  it('recusa tipo fora da lista, título curto, alcance negativo e link que não é http', () => {
    expect(criarDivulgacaoSchema.safeParse({ ...DADOS, tipo: 'ANUNCIO_PAGO' }).success).toBe(false)
    expect(criarDivulgacaoSchema.safeParse({ ...DADOS, titulo: 'x' }).success).toBe(false)
    expect(criarDivulgacaoSchema.safeParse({ ...DADOS, alcance: -5 }).success).toBe(false)
    expect(criarDivulgacaoSchema.safeParse({ ...DADOS, link: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('na edição a divulgação não muda de negócio', () => {
    expect(atualizarDivulgacaoSchema.parse({ empreendedorId: 99, titulo: 'Outro título' })).not.toHaveProperty('empreendedorId')
  })
})

describe('comDataDePublicacao', () => {
  it('publicada sem data ganha a data de agora; planejada não', () => {
    expect(comDataDePublicacao({ status: 'PUBLICADA' }).publicadaEm).toBeInstanceOf(Date)
    expect(comDataDePublicacao({ status: 'PLANEJADA' })).not.toHaveProperty('publicadaEm')
  })

  it('não sobrescreve a data que já existia', () => {
    const antes = { status: 'PUBLICADA', publicadaEm: new Date('2026-01-01') }
    expect(comDataDePublicacao({ alcance: 10 }, antes)).toEqual({ alcance: 10 })
  })
})

describe('criarDivulgacao', () => {
  it('registra para negócio com plano de divulgação e consentimento, com auditoria', async () => {
    const res = resposta()
    const next = vi.fn()
    await criarDivulgacao({ body: DADOS }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(201)
    expect(registrarLog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tipoEntidade: 'Divulgacao' }))
  })

  it('recusa sem o consentimento do empreendedor', async () => {
    prisma.empreendedor.findUnique.mockResolvedValueOnce({ ...NEGOCIO, autorizaDivulgacao: false })
    const next = vi.fn()
    await criarDivulgacao({ body: DADOS }, resposta(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ status: 409, message: expect.stringContaining('autorizou') })
    expect(prisma.divulgacao.create).not.toHaveBeenCalled()
  })

  it('recusa negócio sem plano, ou com plano que não inclui divulgação', async () => {
    prisma.empreendedor.findUnique.mockResolvedValueOnce({ ...NEGOCIO, planoAtual: 'NENHUM' })
    const next = vi.fn()
    await criarDivulgacao({ body: DADOS }, resposta(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ status: 409 })

    prisma.plano.findUnique.mockResolvedValueOnce({ nome: 'ESSENCIAL', divulgacao: false })
    const next2 = vi.fn()
    await criarDivulgacao({ body: DADOS }, resposta(), next2)
    expect(next2.mock.calls[0][0]).toMatchObject({ status: 409 })
    expect(prisma.divulgacao.create).not.toHaveBeenCalled()
  })

  it('recusa negócio fora da vitrine, mesmo que o plano guardado seja Destaque', async () => {
    prisma.empreendedor.findUnique.mockResolvedValueOnce({ ...NEGOCIO, publicadoAte: new Date(Date.now() - 1000) })
    const next = vi.fn()
    await criarDivulgacao({ body: DADOS }, resposta(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ status: 409, message: expect.stringContaining('publicado') })
    expect(prisma.divulgacao.create).not.toHaveBeenCalled()
  })

  it('negócio inexistente responde 404', async () => {
    prisma.empreendedor.findUnique.mockResolvedValueOnce(null)
    const next = vi.fn()
    await criarDivulgacao({ body: DADOS }, resposta(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ status: 404 })
  })
})

describe('frontend e backend falam dos mesmos valores', () => {
  it('cada tipo e cada status aceitos pela API têm nome na tela, e nenhum a mais', () => {
    expect(Object.keys(telas.TIPOS_DIVULGACAO).sort()).toEqual([...TIPOS_DIVULGACAO].sort())
    expect(Object.keys(telas.STATUS_DIVULGACAO).sort()).toEqual([...STATUS_DIVULGACAO].sort())
  })
})
