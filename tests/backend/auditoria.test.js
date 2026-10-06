import { describe, it, expect, vi, beforeEach } from 'vitest'

// O banco fica de fora: aqui interessa o que o serviço decide gravar, não a
// gravação em si. O caminho do banco está coberto pela coleção do Postman.
vi.mock('../../backend/src/config/prisma.js', () => ({
  default: { logAuditoria: { create: vi.fn() } },
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { limparSensiveis, diferencas, contextoDaRequisicao, registrarLog } = await import(
  '../../backend/src/services/auditoria.js'
)

const requisicao = (headers = {}, extras = {}) => ({
  headers,
  socket: { remoteAddress: '10.0.0.9' },
  ...extras,
})

beforeEach(() => {
  prisma.logAuditoria.create.mockReset()
})

describe('limparSensiveis', () => {
  it.each(['senha', 'senhaHash', 'senha_hash', 'confirmacaoSenha', 'token', 'authorization', 'refreshToken'])(
    'remove o campo %s',
    (campo) => {
      expect(limparSensiveis({ nome: 'Ana', [campo]: 'valor secreto' })).toEqual({ nome: 'Ana' })
    }
  )

  it('mantém os campos comuns como estavam', () => {
    const entrada = { nome: 'Ana', email: 'ana@exemplo.com', ativo: true }
    expect(limparSensiveis(entrada)).toEqual(entrada)
  })

  it('devolve o valor original quando não é objeto', () => {
    expect(limparSensiveis(null)).toBeNull()
    expect(limparSensiveis('texto')).toBe('texto')
    expect(limparSensiveis(undefined)).toBeUndefined()
  })
})

describe('diferencas', () => {
  it('guarda só os campos que mudaram', () => {
    const { antes, depois } = diferencas(
      { nome: 'Bolo', preco: 10, ativo: true },
      { nome: 'Bolo', preco: 12, ativo: true }
    )
    expect(antes).toEqual({ preco: 10 })
    expect(depois).toEqual({ preco: 12 })
  })

  it('trata campo que apareceu ou sumiu', () => {
    const { antes, depois } = diferencas({ nome: 'Bolo' }, { nome: 'Bolo', descricao: 'de fubá' })
    expect(antes).toEqual({ descricao: null })
    expect(depois).toEqual({ descricao: 'de fubá' })
  })

  it('não deixa senha passar nem quando ela mudou', () => {
    const { antes, depois } = diferencas(
      { email: 'ana@exemplo.com', senhaHash: '$2b$10$antigo' },
      { email: 'ana@exemplo.com', senhaHash: '$2b$10$novo' }
    )
    expect(JSON.stringify({ antes, depois })).not.toMatch(/\$2b\$|senha/i)
  })

  it('devolve os dois lados limpos quando falta um deles', () => {
    expect(diferencas(null, { nome: 'Ana', senha: '123' })).toEqual({
      antes: null,
      depois: { nome: 'Ana' },
    })
  })

  it('não acusa mudança quando nada mudou', () => {
    expect(diferencas({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toEqual({ antes: {}, depois: {} })
  })
})

describe('contextoDaRequisicao', () => {
  it('prefere o primeiro IP de x-forwarded-for, que é o do visitante', () => {
    const { ip } = contextoDaRequisicao(requisicao({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))
    expect(ip).toBe('203.0.113.7')
  })

  it('cai no endereço da conexão quando não há proxy', () => {
    expect(contextoDaRequisicao(requisicao()).ip).toBe('10.0.0.9')
  })

  it('corta valores enormes, que não cabem na coluna', () => {
    const { ip, userAgent } = contextoDaRequisicao(
      requisicao({ 'x-forwarded-for': 'x'.repeat(200), 'user-agent': 'a'.repeat(500) })
    )
    expect(ip).toHaveLength(60)
    expect(userAgent).toHaveLength(300)
  })

  it('devolve nulo quando não há nada, em vez de texto vazio', () => {
    const { ip, userAgent } = contextoDaRequisicao({ headers: {} })
    expect(ip).toBeNull()
    expect(userAgent).toBeNull()
  })
})

describe('registrarLog', () => {
  it('grava a ação com o usuário da requisição', async () => {
    await registrarLog(requisicao({}, { usuario: { id: 3, nome: 'Ana' } }), {
      acao: 'UPDATE',
      tipoEntidade: 'Produto',
      entidadeId: 8,
    })
    const { data } = prisma.logAuditoria.create.mock.calls[0][0]
    expect(data).toMatchObject({ usuarioId: 3, usuarioNome: 'Ana', acao: 'UPDATE', entidadeId: 8 })
    expect(data.status).toBe('SUCESSO')
  })

  it('aceita um usuário informado à parte, para o próprio cadastro', async () => {
    await registrarLog(requisicao(), { acao: 'CADASTRO', usuario: { id: 9, nome: 'Novo' } })
    expect(prisma.logAuditoria.create.mock.calls[0][0].data.usuarioId).toBe(9)
  })

  it('registra visitante sem conta como autor nulo', async () => {
    await registrarLog(requisicao(), { acao: 'CONTATO' })
    const { data } = prisma.logAuditoria.create.mock.calls[0][0]
    expect(data.usuarioId).toBeNull()
    expect(data.usuarioNome).toBeNull()
  })

  it('limpa os valores antes e depois de gravar', async () => {
    await registrarLog(requisicao(), {
      acao: 'UPDATE',
      antes: { email: 'a@b.c', senhaHash: 'segredo' },
      depois: { email: 'novo@b.c', senhaHash: 'outro' },
    })
    const { data } = prisma.logAuditoria.create.mock.calls[0][0]
    expect(data.valoresAntes).toEqual({ email: 'a@b.c' })
    expect(data.valoresDepois).toEqual({ email: 'novo@b.c' })
  })

  it('não derruba a operação principal quando o log falha', async () => {
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => {})
    prisma.logAuditoria.create.mockRejectedValueOnce(new Error('banco fora do ar'))
    await expect(registrarLog(requisicao(), { acao: 'DELETE' })).resolves.toBeUndefined()
    expect(aviso).toHaveBeenCalled()
  })
})
