import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: {
    usuario: { findUnique: vi.fn(), update: vi.fn() },
    redefinicaoSenha: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((operacoes) => Promise.all(operacoes)),
  },
}))
vi.mock('../../backend/src/services/auditoria.js', () => ({
  registrarLog: vi.fn(),
  contextoDaRequisicao: vi.fn(() => ({})),
}))
vi.mock('../../backend/src/services/email.js', async (original) => ({
  ...(await original()),
  enviarEmail: vi.fn(() => Promise.resolve({ enviado: true })),
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { enviarEmail } = await import('../../backend/src/services/email.js')
const servico = await import('../../backend/src/services/redefinicaoSenha.js')
const { esqueciSenha, verificarRedefinicao, redefinirSenha, redefinirSenhaSchema, esqueciSenhaSchema } =
  await import('../../backend/src/controllers/authController.js')

const ANA = { id: 4, nome: 'Ana Souza', email: 'ana@exemplo.com', ativo: true }
const CODIGO = servico.gerarCodigo()
const futuro = () => new Date(Date.now() + 10 * 60_000)

function resposta() {
  const saida = { codigo: 200, corpo: null }
  return {
    saida,
    status(codigo) {
      saida.codigo = codigo
      return this
    },
    json(corpo) {
      saida.corpo = corpo
      return this
    },
  }
}

/** Espera as tarefas que rodam depois da resposta (o envio do e-mail) */
const terminarFila = () => new Promise((resolver) => setTimeout(resolver, 0))

beforeEach(() => {
  vi.clearAllMocks()
  prisma.redefinicaoSenha.findFirst.mockResolvedValue(null)
})

describe('código do link', () => {
  it('é aleatório, tem formato de URL e o banco guarda só o hash', () => {
    const outro = servico.gerarCodigo()
    expect(CODIGO).not.toBe(outro)
    expect(servico.codigoValido(CODIGO)).toBe(true)
    expect(servico.hashDoCodigo(CODIGO)).toMatch(/^[0-9a-f]{64}$/)
    expect(servico.hashDoCodigo(CODIGO)).not.toContain(CODIGO)
  })

  it('recusa código fora do formato', () => {
    for (const ruim of ['', 'abc', `${CODIGO}x`, 'a'.repeat(42) + '!', null, 123]) {
      expect(servico.codigoValido(ruim)).toBe(false)
    }
  })

  it('o link usa o endereço do site', () => {
    expect(servico.linkDeRedefinicao('abc', { APP_URL: 'https://vitrine.com.br/' })).toBe(
      'https://vitrine.com.br/redefinir-senha?codigo=abc'
    )
  })

  it('situação: válido, usado ou expirado', () => {
    const agora = new Date()
    expect(servico.situacaoDoPedido(null)).toBe('invalido')
    expect(servico.situacaoDoPedido({ usadoEm: agora, expiraEm: futuro() })).toBe('usado')
    expect(servico.situacaoDoPedido({ usadoEm: null, expiraEm: new Date(agora - 1000) }, agora)).toBe('expirado')
    expect(servico.situacaoDoPedido({ usadoEm: null, expiraEm: futuro() }, agora)).toBe('valido')
  })
})

describe('POST /auth/esqueci-senha', () => {
  it('mesma resposta exista a conta ou não', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce(ANA)
    const comConta = resposta()
    await esqueciSenha({ body: { email: ANA.email } }, comConta, vi.fn())

    prisma.usuario.findUnique.mockResolvedValueOnce(null)
    const semConta = resposta()
    await esqueciSenha({ body: { email: 'ninguem@exemplo.com' } }, semConta, vi.fn())

    expect(comConta.saida).toEqual(semConta.saida)
    expect(comConta.saida.corpo.success).toBe(true)
  })

  it('com conta ativa: grava só o hash, derruba links anteriores e manda o e-mail com o link', async () => {
    prisma.usuario.findUnique.mockResolvedValue(ANA)
    await esqueciSenha({ body: { email: ANA.email } }, resposta(), vi.fn())
    await terminarFila()

    expect(prisma.redefinicaoSenha.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: ANA.id, usadoEm: null },
      data: { usadoEm: expect.any(Date) },
    })
    const gravado = prisma.redefinicaoSenha.create.mock.calls[0][0].data
    expect(gravado.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    const minutos = (gravado.expiraEm - Date.now()) / 60_000
    expect(minutos).toBeGreaterThan(29)
    expect(minutos).toBeLessThanOrEqual(30)

    const email = enviarEmail.mock.calls[0][0]
    expect(email.para).toBe(ANA.email)
    const codigoNoLink = email.texto.match(/codigo=([A-Za-z0-9_-]+)/)[1]
    expect(servico.hashDoCodigo(codigoNoLink)).toBe(gravado.tokenHash)
  })

  it('sem conta, conta desativada ou pedido repetido em menos de 2 minutos: não manda e-mail', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce(null)
    await esqueciSenha({ body: { email: 'x@y.com' } }, resposta(), vi.fn())
    prisma.usuario.findUnique.mockResolvedValueOnce({ ...ANA, ativo: false })
    await esqueciSenha({ body: { email: ANA.email } }, resposta(), vi.fn())
    prisma.usuario.findUnique.mockResolvedValueOnce(ANA)
    prisma.redefinicaoSenha.findFirst.mockResolvedValueOnce({ id: 9 })
    await esqueciSenha({ body: { email: ANA.email } }, resposta(), vi.fn())
    await terminarFila()
    expect(enviarEmail).not.toHaveBeenCalled()
    expect(prisma.redefinicaoSenha.create).not.toHaveBeenCalled()
  })

  it('valida o e-mail', () => {
    expect(esqueciSenhaSchema.safeParse({ email: 'nao-e-email' }).success).toBe(false)
    expect(esqueciSenhaSchema.parse({ email: ' Ana@Exemplo.com ' }).email).toBe('ana@exemplo.com')
  })
})

describe('redefinir a senha', () => {
  const pedido = (extra = {}) => ({ id: 7, usuarioId: ANA.id, usadoEm: null, expiraEm: futuro(), usuario: ANA, ...extra })

  it('verificar: 410 com o motivo quando o link venceu, foi usado ou não existe', async () => {
    for (const [registro, motivo] of [
      [null, 'invalido'],
      [pedido({ usadoEm: new Date() }), 'usado'],
      [pedido({ expiraEm: new Date(Date.now() - 1000) }), 'expirado'],
      [pedido({ usuario: { ...ANA, ativo: false } }), 'invalido'],
    ]) {
      prisma.redefinicaoSenha.findUnique.mockResolvedValueOnce(registro)
      const res = resposta()
      await verificarRedefinicao({ body: { codigo: CODIGO } }, res, vi.fn())
      expect(res.saida.codigo).toBe(410)
      expect(res.saida.corpo.motivo).toBe(motivo)
    }
  })

  it('verificar procura pelo hash, não pelo código', async () => {
    prisma.redefinicaoSenha.findUnique.mockResolvedValueOnce(pedido())
    const res = resposta()
    await verificarRedefinicao({ body: { codigo: CODIGO } }, res, vi.fn())
    expect(res.saida.corpo.data.valido).toBe(true)
    expect(prisma.redefinicaoSenha.findUnique.mock.calls[0][0].where).toEqual({ tokenHash: servico.hashDoCodigo(CODIGO) })
  })

  it('troca a senha, marca o link como usado e registra a data da troca', async () => {
    prisma.redefinicaoSenha.findUnique.mockResolvedValueOnce(pedido())
    const res = resposta()
    await redefinirSenha({ body: { codigo: CODIGO, senha: 'NovaSenha1', confirmacaoSenha: 'NovaSenha1' } }, res, vi.fn())
    expect(res.saida.codigo).toBe(200)
    expect(prisma.redefinicaoSenha.update).toHaveBeenCalledWith({
      where: { id: 7, usadoEm: null },
      data: { usadoEm: expect.any(Date) },
    })
    const dados = prisma.usuario.update.mock.calls[0][0].data
    expect(dados.senhaHash).toMatch(/^\$2[aby]\$/)
    expect(dados.senhaAlteradaEm).toBeInstanceOf(Date)
  })

  it('link usado não troca a senha', async () => {
    prisma.redefinicaoSenha.findUnique.mockResolvedValueOnce(pedido({ usadoEm: new Date() }))
    const res = resposta()
    await redefinirSenha({ body: { codigo: CODIGO, senha: 'NovaSenha1', confirmacaoSenha: 'NovaSenha1' } }, res, vi.fn())
    expect(res.saida.codigo).toBe(410)
    expect(prisma.usuario.update).not.toHaveBeenCalled()
  })

  it('a senha nova segue as mesmas regras do cadastro', () => {
    const tentar = (senha, confirmacaoSenha = senha) =>
      redefinirSenhaSchema.safeParse({ codigo: CODIGO, senha, confirmacaoSenha }).success
    expect(tentar('curta1')).toBe(false)
    expect(tentar('semnumeros')).toBe(false)
    expect(tentar('12345678')).toBe(false)
    expect(tentar('Valida123', 'Outra123')).toBe(false)
    expect(tentar('Valida123')).toBe(true)
    expect(redefinirSenhaSchema.safeParse({ codigo: 'curto', senha: 'Valida123', confirmacaoSenha: 'Valida123' }).success).toBe(false)
  })
})
