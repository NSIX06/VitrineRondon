import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

// "Teste não é só o caminho feliz": os cenários da aula passando pela API de
// verdade (rota -> limite -> autenticação -> permissão -> validação -> regra
// -> resposta). Só o banco é simulado; o servidor Express sobe numa porta livre.

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: {
    usuario: { findUnique: vi.fn() },
    sessaoEncerrada: { findUnique: vi.fn() },
    produto: { findUnique: vi.fn() },
    empreendedor: { findUnique: vi.fn() },
    contato: { create: vi.fn() },
    logAuditoria: { create: vi.fn() },
  },
}))

process.env.JWT_SECRET = 'segredo-so-para-os-testes-de-cenario'

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { default: app } = await import('../../backend/src/app.js')
const { gerarToken } = await import('../../backend/src/middlewares/auth.js')

let servidor
let base
beforeAll(async () => {
  servidor = app.listen(0)
  await new Promise((pronto) => servidor.once('listening', pronto))
  base = `http://127.0.0.1:${servidor.address().port}/api`
})
afterAll(() => new Promise((pronto) => servidor.close(pronto)))

const CONTAS = {
  maria: { id: 10, nome: 'Maria', email: 'maria@exemplo.com', perfil: 'EMPREENDEDOR', ativo: true, senhaAlteradaEm: null },
  admin: { id: 1, nome: 'Admin', email: 'admin@exemplo.com', perfil: 'ADMIN', ativo: true, senhaAlteradaEm: null },
}
const tokenDe = (conta) => gerarToken(conta)

const NO_FUTURO = new Date(Date.now() + 30 * 86400000)
const PRODUTO = {
  id: 105,
  nome: 'Tapete de crochê',
  preco: 120,
  disponivel: true,
  empreendedor: { id: 3, usuarioId: 10, ativo: true, publicadoAte: NO_FUTURO, horarios: [] },
}

async function chamar(metodo, caminho, { corpo, token, cru } = {}) {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: {
      ...(corpo !== undefined || cru ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cru ?? (corpo !== undefined ? JSON.stringify(corpo) : undefined),
  })
  return { status: resposta.status, corpo: await resposta.json().catch(() => null) }
}

beforeEach(() => {
  prisma.usuario.findUnique.mockImplementation(async ({ where }) =>
    Object.values(CONTAS).find((conta) => conta.id === where.id) ?? null
  )
  prisma.sessaoEncerrada.findUnique.mockResolvedValue(null)
  prisma.produto.findUnique.mockImplementation(async ({ where }) => (where.id === PRODUTO.id ? structuredClone(PRODUTO) : null))
  prisma.contato.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }))
  prisma.logAuditoria.create.mockResolvedValue({})
})

describe('produto existente / inexistente', () => {
  it('GET /produtos/105 existente: 200 com o recurso', async () => {
    const { status, corpo } = await chamar('GET', '/produtos/105')
    expect(status).toBe(200)
    expect(corpo).toMatchObject({ success: true, data: { id: 105, nome: 'Tapete de crochê' } })
  })

  it('GET /produtos/999 inexistente: 404 com mensagem, sem dados', async () => {
    const { status, corpo } = await chamar('GET', '/produtos/999')
    expect(status).toBe(404)
    expect(corpo).toEqual({ success: false, message: 'Produto não encontrado' })
  })

  it('GET /produtos/abc com ID que não é número: 400', async () => {
    const { status, corpo } = await chamar('GET', '/produtos/abc')
    expect(status).toBe(400)
    expect(corpo.success).toBe(false)
  })

  it('rota que não existe: 404 sem repetir o endereço pedido', async () => {
    const { status, corpo } = await chamar('GET', '/produtosss/<script>')
    expect(status).toBe(404)
    expect(JSON.stringify(corpo)).not.toContain('script')
  })
})

describe('dados inválidos', () => {
  it('POST /contatos com nome vazio: 422 com { message, errors: { campo: [...] } }', async () => {
    const { status, corpo } = await chamar('POST', '/contatos', { corpo: { nome: '', email: 'x', mensagem: '' } })
    expect(status).toBe(422)
    expect(corpo.message).toBe('Dados inválidos')
    expect(Object.keys(corpo.errors)).toEqual(expect.arrayContaining(['nome', 'email', 'mensagem']))
    for (const mensagens of Object.values(corpo.errors)) expect(mensagens).toEqual(expect.arrayContaining([expect.any(String)]))
    expect(prisma.contato.create).not.toHaveBeenCalled()
  })

  it('POST /produtos com preço negativo (logado): 422 apontando o preço, sem gravar nada', async () => {
    const { status, corpo } = await chamar('POST', '/produtos', {
      token: tokenDe(CONTAS.maria),
      corpo: { nome: '', preco: -500, empreendedorId: 3 },
    })
    expect(status).toBe(422)
    expect(corpo.errors).toHaveProperty('preco')
    expect(corpo.errors).toHaveProperty('nome')
    expect(prisma.empreendedor.findUnique).not.toHaveBeenCalled()
  })

  it('JSON malformado: 400 (nem dá para ler)', async () => {
    const { status } = await chamar('POST', '/contatos', { cru: '{"nome": ' })
    expect(status).toBe(400)
  })

  it('paginação fora da faixa: 422 apontando o parâmetro', async () => {
    const { status, corpo } = await chamar('GET', '/produtos?porPagina=999')
    expect(status).toBe(422)
    expect(corpo.errors).toHaveProperty('porPagina')
  })

  it('dados válidos: 201 Created com o recurso criado', async () => {
    const { status, corpo } = await chamar('POST', '/contatos', {
      corpo: { nome: 'Joana Teste', email: 'joana@exemplo.com', mensagem: 'Quero anunciar minha banca de pastel.' },
    })
    expect(status).toBe(201)
    expect(corpo.success).toBe(true)
  })
})

describe('sem autorização', () => {
  it('POST /produtos sem token: 401, antes de olhar os dados', async () => {
    const { status } = await chamar('POST', '/produtos', { corpo: { nome: '', preco: -500 } })
    expect(status).toBe(401)
  })

  it('token adulterado: 401', async () => {
    const token = tokenDe(CONTAS.maria).slice(0, -3) + 'abc'
    const { status } = await chamar('GET', '/auth/me', { token })
    expect(status).toBe(401)
  })

  it('sessão encerrada pelo Sair: o token deixa de valer (401)', async () => {
    prisma.sessaoEncerrada.findUnique.mockResolvedValue({ jti: 'qualquer' })
    const { status } = await chamar('GET', '/auth/me', { token: tokenDe(CONTAS.maria) })
    expect(status).toBe(401)
  })

  it('empreendedor numa rota só da administração: 403', async () => {
    const { status } = await chamar('GET', '/contatos', { token: tokenDe(CONTAS.maria) })
    expect(status).toBe(403)
  })

  it('o perfil vem do banco, não do token: conta rebaixada perde o acesso de admin', async () => {
    const token = tokenDe(CONTAS.admin)
    prisma.usuario.findUnique.mockResolvedValue({ ...CONTAS.admin, perfil: 'COMUM' })
    const { status } = await chamar('GET', '/contatos', { token })
    expect(status).toBe(403)
  })
})

describe('cabeçalhos de segurança', () => {
  it('as respostas da API saem com CSP fechada, nosniff e sem identificar o servidor', async () => {
    const resposta = await fetch(`${base}/produtos/105`)
    expect(resposta.headers.get('content-security-policy')).toContain("default-src 'none'")
    expect(resposta.headers.get('x-content-type-options')).toBe('nosniff')
    expect(resposta.headers.get('x-powered-by')).toBeNull()
  })

  it('a documentação abre só o necessário para a tela do Swagger', async () => {
    const resposta = await fetch(`${base}/docs`)
    expect(resposta.status).toBe(200)
    const csp = resposta.headers.get('content-security-policy')
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('o contrato em JSON está publicado em /docs/openapi.json', async () => {
    const resposta = await fetch(`${base}/docs/openapi.json`)
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).openapi).toBe('3.0.3')
  })
})
