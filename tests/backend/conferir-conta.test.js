import { describe, it, expect, vi, beforeEach } from 'vitest'

// Relato de usuário: uma senha que a tela aceitava era recusada só no fim da
// etapa 2, e o cadastro voltava à etapa 1 com "Dados inválidos". Agora a etapa
// 1 é conferida no servidor antes de avançar.
vi.mock('../../backend/src/config/prisma.js', () => ({
  default: { usuario: { findUnique: vi.fn() } },
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { conferirContaSchema, conferirConta } = await import('../../backend/src/controllers/authController.js')

const CONTA = {
  nome: 'Teste Relato',
  email: 'Teste.Relato@Exemplo.com.br',
  telefone: '(66) 99123-4567',
  senha: 'Feira2026xyz',
  confirmacaoSenha: 'Feira2026xyz',
}
const ACEITES = { termosDeUso: true, politicaPrivacidade: true }
const conferir = (conta = {}, aceites = ACEITES) => conferirContaSchema.safeParse({ conta: { ...CONTA, ...conta }, aceites })
const campos = (resultado) => resultado.error.issues.map((i) => i.path.join('.'))

async function chamar(corpo) {
  const saida = { codigo: 200, corpo: null }
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
  const next = vi.fn()
  await conferirConta({ body: corpo }, res, next)
  return { ...saida, next }
}

beforeEach(() => prisma.usuario.findUnique.mockReset())

describe('conferência da etapa 1 do cadastro', () => {
  it('aceita a conta válida, com o telefone só em dígitos e o e-mail em minúsculas', () => {
    const r = conferir()
    expect(r.success).toBe(true)
    expect(r.data.conta.telefone).toBe('66991234567')
    expect(r.data.conta.email).toBe('teste.relato@exemplo.com.br')
  })

  it('recusa a senha comum que a tela deixava passar, apontando o campo', () => {
    const r = conferir({ senha: 'senha123', confirmacaoSenha: 'senha123' })
    expect(r.success).toBe(false)
    expect(campos(r)).toContain('conta.senha')
  })

  it('usa as mesmas regras do cadastro de verdade', () => {
    expect(campos(conferir({ email: 'sem-arroba' }))).toContain('conta.email')
    expect(campos(conferir({ telefone: '123' }))).toContain('conta.telefone')
    expect(campos(conferir({ confirmacaoSenha: 'OutraSenha99' }))).toContain('conta.confirmacaoSenha')
    expect(campos(conferir({}, { termosDeUso: false, politicaPrivacidade: true }))).toContain('aceites.termosDeUso')
  })

  it('e-mail livre: 200, sem gravar nada', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null)
    const { codigo, corpo } = await chamar(conferir().data)
    expect(codigo).toBe(200)
    expect(corpo.success).toBe(true)
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'teste.relato@exemplo.com.br' } })
    )
  })

  it('e-mail que já tem conta: 409 no campo do e-mail', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 7 })
    const { codigo, corpo } = await chamar(conferir().data)
    expect(codigo).toBe(409)
    expect(corpo.errors).toEqual([expect.objectContaining({ campo: 'conta.email' })])
  })
})
