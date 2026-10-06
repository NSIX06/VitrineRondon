import { describe, it, expect, vi, beforeEach } from 'vitest'

// O banco fica de fora: aqui interessa o que o controller pede ao Prisma e o
// que responde. O caminho real até o MySQL está na coleção do Postman.
vi.mock('../../backend/src/config/prisma.js', () => ({
  default: {
    perguntaFrequente: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))
vi.mock('../../backend/src/services/auditoria.js', async (original) => ({
  ...(await original()),
  registrarLog: vi.fn(),
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { registrarLog } = await import('../../backend/src/services/auditoria.js')
const {
  criarFaqSchema,
  atualizarFaqSchema,
  listarFaqPublico,
  listarFaqCompleto,
  criarFaq,
  atualizarFaq,
  excluirFaq,
} = await import('../../backend/src/controllers/faqController.js')

const PERGUNTA = {
  id: 7,
  pergunta: 'Quanto custa anunciar?',
  resposta: 'Nada.',
  categoria: 'Para quem vende',
  ordem: 1,
  ativo: true,
  createdAt: new Date('2026-09-27T10:00:00Z'),
  updatedAt: new Date('2026-09-27T10:00:00Z'),
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
  await handler({ params: {}, body: {}, headers: {}, ...req }, res, (erro) => {
    saida.erro = erro
  })
  return saida
}

beforeEach(() => {
  for (const funcao of Object.values(prisma.perguntaFrequente)) funcao.mockReset()
  registrarLog.mockReset()
})

describe('validação da pergunta', () => {
  const valida = { pergunta: 'Quanto custa?', resposta: 'Nada.' }
  const mensagens = (dados, schema = criarFaqSchema) =>
    schema.safeParse(dados).error?.issues.map((i) => i.message) ?? []

  it('aceita pergunta e resposta', () => {
    expect(criarFaqSchema.safeParse(valida).success).toBe(true)
  })

  it.each([
    ['vazia', ''],
    ['só com espaços', '    '],
  ])('recusa pergunta %s', (_rotulo, pergunta) => {
    expect(mensagens({ ...valida, pergunta })).toContain('A pergunta é obrigatória')
  })

  it('recusa pergunta ausente', () => {
    expect(mensagens({ resposta: 'Nada.' })).toContain('A pergunta é obrigatória')
  })

  it('aceita exatamente 300 caracteres', () => {
    expect(criarFaqSchema.safeParse({ ...valida, pergunta: 'a'.repeat(300) }).success).toBe(true)
  })

  it('recusa pergunta com mais de 300 caracteres', () => {
    expect(mensagens({ ...valida, pergunta: 'a'.repeat(301) })).toContain('A pergunta pode ter até 300 caracteres')
  })

  it('recusa resposta vazia', () => {
    expect(mensagens({ ...valida, resposta: '' })).toContain('A resposta é obrigatória')
  })

  it('recusa categoria com mais de 80 caracteres', () => {
    expect(mensagens({ ...valida, categoria: 'a'.repeat(81) })).toContain('A categoria pode ter até 80 caracteres')
  })

  it('guarda categoria em branco como ausente', () => {
    expect(criarFaqSchema.parse({ ...valida, categoria: '' }).categoria).toBeNull()
  })

  it.each([[-1], [1.5], ['abc'], [10000]])('recusa a ordem %s', (ordem) => {
    expect(criarFaqSchema.safeParse({ ...valida, ordem }).success).toBe(false)
  })

  it('no cadastro, assume ordem 0 e pergunta visível', () => {
    const dados = criarFaqSchema.parse(valida)
    expect(dados.ordem).toBe(0)
    expect(dados.ativo).toBe(true)
  })

  it('na edição parcial, não reativa nem reordena quem não mandou esses campos', () => {
    // Com .default() na base, o .partial() do Zod 4 reaplicaria ordem 0 e
    // ativo true em toda edição que mexesse só no texto
    const dados = atualizarFaqSchema.parse({ resposta: 'Nova resposta' })
    expect(dados).toEqual({ resposta: 'Nova resposta' })
  })

  it('descarta campos que não são da pergunta', () => {
    const dados = criarFaqSchema.parse({ ...valida, id: 99, createdAt: '2020-01-01' })
    expect(dados.id).toBeUndefined()
    expect(dados.createdAt).toBeUndefined()
  })
})

describe('listagem pública', () => {
  it('pede ao banco só as perguntas ativas', async () => {
    prisma.perguntaFrequente.findMany.mockResolvedValue([])
    await chamar(listarFaqPublico)
    expect(prisma.perguntaFrequente.findMany.mock.calls[0][0].where).toEqual({ ativo: true })
  })

  it('ordena pela ordem e, no empate, pela pergunta', async () => {
    prisma.perguntaFrequente.findMany.mockResolvedValue([])
    await chamar(listarFaqPublico)
    expect(prisma.perguntaFrequente.findMany.mock.calls[0][0].orderBy).toEqual([
      { ordem: 'asc' },
      { pergunta: 'asc' },
    ])
  })

  it('não expõe a situação nem as datas internas', async () => {
    prisma.perguntaFrequente.findMany.mockResolvedValue([])
    await chamar(listarFaqPublico)
    const campos = Object.keys(prisma.perguntaFrequente.findMany.mock.calls[0][0].select)
    expect(campos).not.toContain('ativo')
    expect(campos).not.toContain('createdAt')
  })

  it('devolve as perguntas no formato da API', async () => {
    prisma.perguntaFrequente.findMany.mockResolvedValue([PERGUNTA])
    const { corpo } = await chamar(listarFaqPublico)
    expect(corpo).toMatchObject({ success: true, total: 1, data: [PERGUNTA] })
  })
})

describe('listagem da administração', () => {
  it('traz ativas e inativas', async () => {
    prisma.perguntaFrequente.findMany.mockResolvedValue([])
    await chamar(listarFaqCompleto)
    expect(prisma.perguntaFrequente.findMany.mock.calls[0][0].where).toBeUndefined()
  })
})

describe('criação', () => {
  it('responde 201 com o id gerado pelo banco', async () => {
    prisma.perguntaFrequente.create.mockResolvedValue(PERGUNTA)
    const { codigo, corpo } = await chamar(criarFaq, { body: { pergunta: 'x', resposta: 'y' } })
    expect(codigo).toBe(201)
    expect(corpo.data.id).toBe(7)
  })

  it('registra a criação na auditoria', async () => {
    prisma.perguntaFrequente.create.mockResolvedValue(PERGUNTA)
    await chamar(criarFaq, { body: { pergunta: 'x', resposta: 'y' } })
    expect(registrarLog.mock.calls[0][1]).toMatchObject({
      acao: 'CREATE',
      tipoEntidade: 'PerguntaFrequente',
      entidadeId: 7,
    })
  })
})

describe('edição', () => {
  it('grava os campos enviados e devolve a pergunta atualizada', async () => {
    const atualizada = { ...PERGUNTA, pergunta: 'Nova?', updatedAt: new Date('2026-09-27T11:00:00Z') }
    prisma.perguntaFrequente.findUnique.mockResolvedValue(PERGUNTA)
    prisma.perguntaFrequente.update.mockResolvedValue(atualizada)
    const { corpo } = await chamar(atualizarFaq, { params: { id: '7' }, body: { pergunta: 'Nova?' } })
    expect(prisma.perguntaFrequente.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { pergunta: 'Nova?' } })
    expect(corpo.data.pergunta).toBe('Nova?')
  })

  it('registra na auditoria só o que mudou', async () => {
    prisma.perguntaFrequente.findUnique.mockResolvedValue(PERGUNTA)
    prisma.perguntaFrequente.update.mockResolvedValue({ ...PERGUNTA, ativo: false })
    await chamar(atualizarFaq, { params: { id: '7' }, body: { ativo: false } })
    const { antes, depois } = registrarLog.mock.calls[0][1]
    expect(antes).toEqual({ ativo: true })
    expect(depois).toEqual({ ativo: false })
  })

  it('responde 404 para pergunta que não existe', async () => {
    prisma.perguntaFrequente.findUnique.mockResolvedValue(null)
    const { erro } = await chamar(atualizarFaq, { params: { id: '999' }, body: { pergunta: 'x' } })
    expect(erro.status).toBe(404)
    expect(prisma.perguntaFrequente.update).not.toHaveBeenCalled()
  })

  it('recusa id que não é número', async () => {
    const { erro } = await chamar(atualizarFaq, { params: { id: 'abc' } })
    expect(erro.status).toBe(400)
  })
})

describe('exclusão', () => {
  it('apaga a pergunta e registra o que foi apagado', async () => {
    prisma.perguntaFrequente.findUnique.mockResolvedValue(PERGUNTA)
    const { corpo } = await chamar(excluirFaq, { params: { id: '7' } })
    expect(prisma.perguntaFrequente.delete).toHaveBeenCalledWith({ where: { id: 7 } })
    expect(corpo.success).toBe(true)
    expect(registrarLog.mock.calls[0][1]).toMatchObject({ acao: 'DELETE', entidadeId: 7 })
  })

  it('responde 404 sem tentar apagar o que não existe', async () => {
    prisma.perguntaFrequente.findUnique.mockResolvedValue(null)
    const { erro } = await chamar(excluirFaq, { params: { id: '999' } })
    expect(erro.status).toBe(404)
    expect(prisma.perguntaFrequente.delete).not.toHaveBeenCalled()
  })
})
