import { describe, it, expect, vi, beforeEach } from 'vitest'

// O banco fica de fora: aqui interessa o que o controller pede ao Prisma e o
// que responde. O caminho real até o MySQL está em tests-e2e/teste-avaliacoes-ui.mjs.
vi.mock('../../backend/src/config/prisma.js', () => ({
  default: {
    empreendedor: { findUnique: vi.fn() },
    avaliacao: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    denunciaAvaliacao: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('../../backend/src/services/auditoria.js', async (original) => ({
  ...(await original()),
  registrarLog: vi.fn(),
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { registrarLog } = await import('../../backend/src/services/auditoria.js')
const servico = await import('../../backend/src/services/avaliacoes.js')
const controller = await import('../../backend/src/controllers/avaliacaoController.js')

const NO_FUTURO = new Date(Date.now() + 30 * 86400000)
// Negócio publicado, dono = conta 70
const NEGOCIO = { id: 7, nomeNegocio: 'Ateliê', ativo: true, publicadoAte: NO_FUTURO, usuarioId: 70 }
const CLIENTE = { id: 10, nome: 'Maria Souza', perfil: 'COMUM' }
const DONO = { id: 70, nome: 'Dono', perfil: 'EMPREENDEDOR' }
const ADMIN = { id: 1, nome: 'Admin', perfil: 'ADMIN' }
const AVALIACAO = {
  id: 5,
  empreendedorId: 7,
  usuarioId: 10,
  nota: 4,
  comentario: 'Muito bom',
  status: 'PUBLICADA',
  editadaEm: null,
  createdAt: new Date('2026-10-17T10:00:00Z'),
  usuario: { nome: 'Maria Souza Lima' },
  empreendedor: { id: 7, nomeNegocio: 'Ateliê' },
}

/** Chama um handler e devolve o que ele respondeu ou passou adiante */
async function chamar(handler, req = {}) {
  const saida = { codigo: 200, corpo: null, erro: null }
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
  await handler({ params: {}, query: {}, body: {}, headers: {}, ...req }, res, (erro) => {
    saida.erro = erro
  })
  return saida
}

/** groupBy do Prisma a partir de { nota: quantidade } */
const grupos = (contagem) => Object.entries(contagem).map(([nota, n]) => ({ nota: Number(nota), _count: { _all: n } }))

beforeEach(() => {
  vi.clearAllMocks()
  prisma.empreendedor.findUnique.mockResolvedValue(NEGOCIO)
  prisma.avaliacao.groupBy.mockResolvedValue([])
})

describe('montarResumo (média e distribuição)', () => {
  it('sem avaliações: média nula, nunca zero', () => {
    expect(servico.montarResumo([])).toEqual({ media: null, total: 0, distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  })

  it('média exata com duas casas, sem arredondar para meia estrela', () => {
    // 5+5+4+3 = 17 / 4 = 4,25; 5+4+4 = 13 / 3 = 4,333...
    expect(servico.montarResumo(grupos({ 5: 2, 4: 1, 3: 1 })).media).toBe(4.25)
    expect(servico.montarResumo(grupos({ 5: 1, 4: 2 })).media).toBe(4.33)
  })

  it('a distribuição soma o total', () => {
    const resumo = servico.montarResumo(grupos({ 5: 3, 1: 2 }))
    expect(resumo.total).toBe(5)
    expect(Object.values(resumo.distribuicao).reduce((a, b) => a + b, 0)).toBe(resumo.total)
  })

  it('ignora nota fora de 1 a 5 que viesse do banco', () => {
    expect(servico.montarResumo(grupos({ 0: 4, 6: 1, 5: 1 }))).toMatchObject({ media: 5, total: 1 })
  })

  it('só conta as publicadas (o filtro vai na consulta)', async () => {
    await servico.resumoDoNegocio(7)
    expect(prisma.avaliacao.groupBy.mock.calls[0][0].where).toEqual({ empreendedorId: 7, status: 'PUBLICADA' })
  })
})

describe('resumosDosNegocios (cards da listagem)', () => {
  it('uma consulta para a página inteira, só publicadas, com média e total por negócio', async () => {
    prisma.avaliacao.groupBy.mockResolvedValue([
      { empreendedorId: 7, nota: 5, _count: { _all: 1 } },
      { empreendedorId: 7, nota: 4, _count: { _all: 1 } },
      { empreendedorId: 8, nota: 2, _count: { _all: 3 } },
    ])
    const resumos = await servico.resumosDosNegocios([7, 8, 9])
    expect(prisma.avaliacao.groupBy).toHaveBeenCalledTimes(1)
    expect(prisma.avaliacao.groupBy.mock.calls[0][0].where).toEqual({ empreendedorId: { in: [7, 8, 9] }, status: 'PUBLICADA' })
    expect(resumos).toEqual({ 7: { media: 4.5, total: 2 }, 8: { media: 2, total: 3 }, 9: { media: null, total: 0 } })
  })

  it('lista vazia não consulta o banco', async () => {
    expect(await servico.resumosDosNegocios([])).toEqual({})
    expect(prisma.avaliacao.groupBy).not.toHaveBeenCalled()
  })
})

describe('nomePublico (privacidade do avaliador)', () => {
  it('primeiro nome e inicial do último sobrenome', () => {
    expect(servico.nomePublico('Maria Aparecida Souza')).toBe('Maria S.')
    expect(servico.nomePublico('  joão  ')).toBe('joão')
    expect(servico.nomePublico('')).toBe('Cliente')
  })

  it('a avaliação pública não leva id, e-mail nem telefone do autor', () => {
    const publica = servico.avaliacaoPublica({ ...AVALIACAO, usuario: { nome: 'Maria Souza', email: 'm@x.com' } })
    expect(publica).toEqual({
      id: 5,
      nota: 4,
      comentario: 'Muito bom',
      autor: 'Maria S.',
      criadaEm: AVALIACAO.createdAt,
      editadaEm: null,
      minha: false,
    })
  })
})

describe('motivoParaNaoAvaliar (RN-AVAL-02)', () => {
  it('cliente e empreendedor de outro negócio podem', () => {
    expect(servico.motivoParaNaoAvaliar(CLIENTE, NEGOCIO)).toBeNull()
    expect(servico.motivoParaNaoAvaliar({ id: 80, perfil: 'EMPREENDEDOR' }, NEGOCIO)).toBeNull()
  })

  it('sem conta, o dono, o admin e negócio fora da vitrine não podem', () => {
    expect(servico.motivoParaNaoAvaliar(null, NEGOCIO)).toBe('LOGIN')
    expect(servico.motivoParaNaoAvaliar(DONO, NEGOCIO)).toBe('DONO')
    expect(servico.motivoParaNaoAvaliar(ADMIN, NEGOCIO)).toBe('ADMIN')
    expect(servico.motivoParaNaoAvaliar(CLIENTE, { ...NEGOCIO, publicadoAte: new Date(Date.now() - 1000) })).toBe('INDISPONIVEL')
    expect(servico.motivoParaNaoAvaliar(CLIENTE, { ...NEGOCIO, ativo: false })).toBe('INDISPONIVEL')
  })
})

describe('avaliacaoSchema (RN-AVAL-04 e 07)', () => {
  const valida = (corpo) => controller.avaliacaoSchema.safeParse(corpo).success

  it('aceita nota inteira de 1 a 5 e comentário', () => {
    expect(valida({ nota: 1, comentario: 'Ok!' })).toBe(true)
    expect(valida({ nota: 5, comentario: 'Excelente atendimento' })).toBe(true)
  })

  it('recusa nota menor que 1, maior que 5, fracionada ou em texto', () => {
    for (const nota of [0, 6, -1, 4.5, '5', null]) expect(valida({ nota, comentario: 'Muito bom' })).toBe(false)
  })

  it('recusa comentário vazio, só espaços ou acima de 1000 caracteres', () => {
    expect(valida({ nota: 4 })).toBe(false)
    expect(valida({ nota: 4, comentario: '     ' })).toBe(false)
    expect(valida({ nota: 4, comentario: 'x'.repeat(servico.COMENTARIO_MAXIMO + 1) })).toBe(false)
    expect(valida({ nota: 4, comentario: 'x'.repeat(servico.COMENTARIO_MAXIMO) })).toBe(true)
  })

  it('o corpo não leva média, contagem nem autor: campos extras são descartados', () => {
    const lido = controller.avaliacaoSchema.parse({ nota: 3, comentario: 'Bom', media: 5, usuarioId: 1, status: 'PUBLICADA' })
    expect(lido).toEqual({ nota: 3, comentario: 'Bom' })
  })

  it('remover exige motivo', () => {
    expect(controller.moderacaoSchema.safeParse({ acao: 'remover' }).success).toBe(false)
    expect(controller.moderacaoSchema.safeParse({ acao: 'remover', motivo: 'Ofensiva' }).success).toBe(true)
    expect(controller.moderacaoSchema.safeParse({ acao: 'restaurar' }).success).toBe(true)
    expect(controller.moderacaoSchema.safeParse({ acao: 'apagar' }).success).toBe(false)
  })
})

describe('lerConsultaDaLista', () => {
  it('padrões: página 1, 5 por página, mais recentes', () => {
    expect(controller.lerConsultaDaLista({})).toEqual({ pagina: 1, porPagina: 5, ordem: 'recentes' })
  })

  it('recusa página, tamanho e ordenação inválidos', () => {
    expect(() => controller.lerConsultaDaLista({ pagina: '0' })).toThrow()
    expect(() => controller.lerConsultaDaLista({ porPagina: '50' })).toThrow()
    expect(() => controller.lerConsultaDaLista({ ordem: 'createdAt' })).toThrow()
    expect(() => controller.lerConsultaDaLista({ ordem: '__proto__' })).toThrow()
  })
})

describe('listarAvaliacoes', () => {
  beforeEach(() => {
    prisma.avaliacao.groupBy.mockResolvedValue(grupos({ 5: 1, 4: 1 }))
    prisma.avaliacao.findMany.mockResolvedValue([AVALIACAO])
    prisma.avaliacao.findUnique.mockResolvedValue(null)
  })

  it('pública: só publicadas, na ordem pedida, com resumo e paginação', async () => {
    const saida = await chamar(controller.listarAvaliacoes, { params: { id: '7' }, query: { ordem: 'menor', pagina: '2' } })
    const consulta = prisma.avaliacao.findMany.mock.calls[0][0]
    expect(consulta.where).toEqual({ empreendedorId: 7, status: 'PUBLICADA' })
    expect(consulta.orderBy[0]).toEqual({ nota: 'asc' })
    expect(consulta.skip).toBe(5)
    expect(saida.corpo.resumo).toMatchObject({ media: 4.5, total: 2 })
    expect(saida.corpo.paginacao).toMatchObject({ pagina: 2, total: 2, totalPaginas: 1 })
    expect(saida.corpo.permissao).toMatchObject({ podeAvaliar: false, motivo: 'LOGIN' })
  })

  it('negócio fora da vitrine: 404 para o público', async () => {
    prisma.empreendedor.findUnique.mockResolvedValue({ ...NEGOCIO, publicadoAte: null })
    const saida = await chamar(controller.listarAvaliacoes, { params: { id: '7' } })
    expect(saida.erro?.status).toBe(404)
  })

  it('mostra ao autor a própria avaliação removida, com o motivo', async () => {
    prisma.avaliacao.findUnique.mockResolvedValue({ ...AVALIACAO, status: 'REMOVIDA', motivoRemocao: 'Ofensiva' })
    const saida = await chamar(controller.listarAvaliacoes, { params: { id: '7' }, usuario: CLIENTE })
    expect(saida.corpo.minha).toMatchObject({ status: 'REMOVIDA', motivoRemocao: 'Ofensiva', minha: true })
  })
})

describe('criarAvaliacao', () => {
  beforeEach(() => {
    prisma.avaliacao.create.mockResolvedValue(AVALIACAO)
  })

  it('cria ligada ao negócio e ao autor da sessão (RN-AVAL-01), com auditoria', async () => {
    const saida = await chamar(controller.criarAvaliacao, {
      params: { id: '7' },
      usuario: CLIENTE,
      body: { nota: 4, comentario: 'Muito bom' },
    })
    expect(saida.codigo).toBe(201)
    expect(prisma.avaliacao.create.mock.calls[0][0].data).toEqual({
      empreendedorId: 7,
      usuarioId: 10,
      nota: 4,
      comentario: 'Muito bom',
    })
    expect(registrarLog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ acao: 'CREATE', tipoEntidade: 'Avaliacao' }))
  })

  it('o dono não avalia o próprio negócio (RN-AVAL-08)', async () => {
    const saida = await chamar(controller.criarAvaliacao, { params: { id: '7' }, usuario: DONO, body: { nota: 5, comentario: 'Ótimo' } })
    expect(saida.erro?.status).toBe(403)
    expect(prisma.avaliacao.create).not.toHaveBeenCalled()
  })

  it('a administração não avalia', async () => {
    const saida = await chamar(controller.criarAvaliacao, { params: { id: '7' }, usuario: ADMIN, body: { nota: 5, comentario: 'Ótimo' } })
    expect(saida.erro?.status).toBe(403)
  })

  it('segunda avaliação do mesmo autor: 409 (índice único, RN-AVAL-03)', async () => {
    prisma.avaliacao.create.mockRejectedValue(Object.assign(new Error('único'), { code: 'P2002' }))
    const saida = await chamar(controller.criarAvaliacao, { params: { id: '7' }, usuario: CLIENTE, body: { nota: 5, comentario: 'De novo' } })
    expect(saida.erro?.status).toBe(409)
  })

  it('devolve a reputação já recalculada (RN-AVAL-06)', async () => {
    prisma.avaliacao.groupBy.mockResolvedValue(grupos({ 4: 1 }))
    const saida = await chamar(controller.criarAvaliacao, { params: { id: '7' }, usuario: CLIENTE, body: { nota: 4, comentario: 'Muito bom' } })
    expect(saida.corpo.resumo).toMatchObject({ media: 4, total: 1 })
  })
})

describe('editar, apagar e denunciar', () => {
  beforeEach(() => {
    prisma.avaliacao.findUnique.mockResolvedValue(AVALIACAO)
    prisma.avaliacao.update.mockResolvedValue({ ...AVALIACAO, nota: 5 })
  })

  it('só o autor edita, e a edição marca editadaEm', async () => {
    const outro = await chamar(controller.atualizarAvaliacao, { params: { id: '5' }, usuario: { id: 99 }, body: { nota: 5, comentario: 'x' } })
    expect(outro.erro?.status).toBe(403)
    await chamar(controller.atualizarAvaliacao, { params: { id: '5' }, usuario: CLIENTE, body: { nota: 5, comentario: 'Melhor ainda' } })
    expect(prisma.avaliacao.update.mock.calls[0][0].data).toMatchObject({ nota: 5, comentario: 'Melhor ainda', editadaEm: expect.any(Date) })
  })

  it('avaliação removida pela moderação não pode ser editada', async () => {
    prisma.avaliacao.findUnique.mockResolvedValue({ ...AVALIACAO, status: 'REMOVIDA' })
    const saida = await chamar(controller.atualizarAvaliacao, { params: { id: '5' }, usuario: CLIENTE, body: { nota: 5, comentario: 'x' } })
    expect(saida.erro?.status).toBe(403)
  })

  it('só o autor apaga (nem o dono do negócio)', async () => {
    const dono = await chamar(controller.excluirAvaliacao, { params: { id: '5' }, usuario: DONO })
    expect(dono.erro?.status).toBe(403)
    expect(prisma.avaliacao.delete).not.toHaveBeenCalled()
    await chamar(controller.excluirAvaliacao, { params: { id: '5' }, usuario: CLIENTE })
    expect(prisma.avaliacao.delete).toHaveBeenCalledWith({ where: { id: 5 } })
  })

  it('denúncia: uma por conta, e não vale para a própria', async () => {
    const propria = await chamar(controller.denunciarAvaliacao, { params: { id: '5' }, usuario: CLIENTE, body: {} })
    expect(propria.erro?.status).toBe(400)

    prisma.$transaction.mockResolvedValue([])
    const primeira = await chamar(controller.denunciarAvaliacao, { params: { id: '5' }, usuario: DONO, body: { motivo: null } })
    expect(primeira.codigo).toBe(201)

    prisma.$transaction.mockRejectedValue(Object.assign(new Error('único'), { code: 'P2002' }))
    const repetida = await chamar(controller.denunciarAvaliacao, { params: { id: '5' }, usuario: DONO, body: {} })
    expect(repetida.codigo).toBe(200)
    expect(repetida.erro).toBeNull()
  })
})

describe('moderarAvaliacao (RN-AVAL-09)', () => {
  beforeEach(() => {
    prisma.avaliacao.findUnique.mockResolvedValue(AVALIACAO)
    prisma.avaliacao.update.mockImplementation(({ data }) => Promise.resolve({ ...AVALIACAO, ...data }))
  })

  it('remover guarda o motivo e a data, sem apagar o registro', async () => {
    await chamar(controller.moderarAvaliacao, { params: { id: '5' }, usuario: ADMIN, body: { acao: 'remover', motivo: 'Ofensiva' } })
    expect(prisma.avaliacao.update.mock.calls[0][0].data).toMatchObject({ status: 'REMOVIDA', motivoRemocao: 'Ofensiva', removidaEm: expect.any(Date) })
    expect(prisma.avaliacao.delete).not.toHaveBeenCalled()
    expect(registrarLog).toHaveBeenCalled()
  })

  it('restaurar volta a publicada e limpa o motivo', async () => {
    await chamar(controller.moderarAvaliacao, { params: { id: '5' }, usuario: ADMIN, body: { acao: 'restaurar' } })
    expect(prisma.avaliacao.update.mock.calls[0][0].data).toEqual({ status: 'PUBLICADA', motivoRemocao: null, removidaEm: null })
  })

  it('a moderação nunca muda a nota nem o comentário', async () => {
    await chamar(controller.moderarAvaliacao, { params: { id: '5' }, usuario: ADMIN, body: { acao: 'remover', motivo: 'x', nota: 1 } })
    const dados = prisma.avaliacao.update.mock.calls[0][0].data
    expect(dados).not.toHaveProperty('nota')
    expect(dados).not.toHaveProperty('comentario')
  })
})
