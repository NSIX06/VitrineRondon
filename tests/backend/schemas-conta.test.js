import { describe, it, expect } from 'vitest'
import {
  registrarComumSchema,
  registrarEmpreendedorSchema,
  loginSchema,
} from '../../backend/src/controllers/authController.js'

const ACEITES = { termosDeUso: true, politicaPrivacidade: true }
const CONTA = {
  nome: 'Ana Souza',
  email: 'Ana@Exemplo.com',
  telefone: '(66) 99123-4567',
  senha: 'Senha123',
  confirmacaoSenha: 'Senha123',
}
const NEGOCIO = {
  nomeNegocio: 'Ateliê Fio & Arte',
  responsavel: 'Ana Souza',
  categoria: 'Artesanato',
  cidade: 'Rondonópolis',
  whatsapp: '66991234567',
}

const cadastrar = (extra = {}) => registrarComumSchema.safeParse({ ...CONTA, aceites: ACEITES, ...extra })
const mensagens = (resultado) => resultado.error.issues.map((i) => i.message)

describe('conta', () => {
  it('aceita um cadastro completo', () => {
    expect(cadastrar().success).toBe(true)
  })

  it('guarda o e-mail em minúsculas, para não duplicar conta', () => {
    expect(cadastrar().data.email).toBe('ana@exemplo.com')
  })

  it('recusa e-mail malformado', () => {
    expect(mensagens(cadastrar({ email: 'ana@' }))).toContain('E-mail inválido')
  })

  it('recusa nome de uma letra', () => {
    expect(mensagens(cadastrar({ nome: 'A' }))).toContain('Informe seu nome')
  })
})

describe('senha', () => {
  it.each([
    ['curta demais', 'Abc123', 'A senha deve ter ao menos 8 caracteres'],
    ['sem número', 'SenhaSegura', 'A senha deve conter números'],
    ['sem letra', '12345678', 'A senha deve conter letras'],
  ])('recusa senha %s', (_rotulo, senha, esperado) => {
    expect(mensagens(cadastrar({ senha, confirmacaoSenha: senha }))).toContain(esperado)
  })

  it('recusa senha acima do limite do bcrypt', () => {
    const longa = `${'a1'.repeat(40)}`
    expect(mensagens(cadastrar({ senha: longa, confirmacaoSenha: longa }))[0]).toContain('no máximo 72')
  })

  it('exige que a confirmação seja igual, apontando o campo certo', () => {
    const resultado = cadastrar({ confirmacaoSenha: 'Outra123' })
    expect(mensagens(resultado)).toContain('As senhas não conferem')
    expect(resultado.error.issues[0].path).toEqual(['confirmacaoSenha'])
  })
})

describe('telefone', () => {
  it.each(['(66) 99123-4567', '66 99123 4567', '5566991234567'])('aceita %s', (telefone) => {
    expect(cadastrar({ telefone }).success).toBe(true)
  })

  it('guarda só os dígitos', () => {
    expect(cadastrar({ telefone: '(66) 99123-4567' }).data.telefone).toBe('66991234567')
  })

  it.each(['996', '9912345678901234'])('recusa %s', (telefone) => {
    expect(mensagens(cadastrar({ telefone }))).toContain('Telefone deve ter DDD e número')
  })
})

describe('aceite dos documentos legais', () => {
  it('exige os dois aceites', () => {
    expect(cadastrar({ aceites: { termosDeUso: true, politicaPrivacidade: false } }).success).toBe(false)
    expect(cadastrar({ aceites: { termosDeUso: false, politicaPrivacidade: true } }).success).toBe(false)
  })

  it('recusa cadastro sem o bloco de aceites', () => {
    const semAceites = { ...CONTA }
    expect(registrarComumSchema.safeParse(semAceites).success).toBe(false)
  })

  it('explica qual documento falta', () => {
    const resultado = cadastrar({ aceites: { termosDeUso: false, politicaPrivacidade: true } })
    expect(mensagens(resultado)).toContain('É preciso aceitar os Termos de Uso')
  })

  it('não aceita a string "true" no lugar do aceite', () => {
    expect(cadastrar({ aceites: { termosDeUso: 'true', politicaPrivacidade: true } }).success).toBe(false)
  })
})

describe('cadastro de empreendedor', () => {
  const corpo = (extra = {}) =>
    registrarEmpreendedorSchema.safeParse({ conta: CONTA, negocio: NEGOCIO, aceites: ACEITES, ...extra })

  it('aceita conta e negócio na mesma requisição', () => {
    expect(corpo().success).toBe(true)
  })

  it('exige as três partes', () => {
    expect(registrarEmpreendedorSchema.safeParse({ conta: CONTA, aceites: ACEITES }).success).toBe(false)
  })

  it('aponta o campo com o caminho completo, para a tela marcar o certo', () => {
    const resultado = corpo({ conta: { ...CONTA, email: 'invalido' } })
    expect(resultado.error.issues[0].path).toEqual(['conta', 'email'])
  })

  it('valida o negócio com as mesmas regras do cadastro avulso', () => {
    expect(corpo({ negocio: { ...NEGOCIO, categoria: 'Geral' } }).success).toBe(false)
  })

  it('ninguém escolhe o próprio perfil no cadastro', () => {
    const { data } = corpo({ conta: { ...CONTA, perfil: 'ADMIN' } })
    expect(data.conta.perfil).toBeUndefined()
  })
})

describe('login', () => {
  it('aceita e-mail e senha', () => {
    expect(loginSchema.safeParse({ email: 'ana@exemplo.com', senha: 'Senha123' }).success).toBe(true)
  })

  it('normaliza o e-mail digitado com maiúsculas', () => {
    expect(loginSchema.parse({ email: ' Ana@Exemplo.com ', senha: 'x' }).email).toBe('ana@exemplo.com')
  })

  it('não repete as regras de força da senha no login', () => {
    // Quem cadastrou antes de a regra mudar ainda precisa conseguir entrar
    expect(loginSchema.safeParse({ email: 'ana@exemplo.com', senha: '123' }).success).toBe(true)
  })

  it('recusa senha vazia', () => {
    expect(loginSchema.safeParse({ email: 'ana@exemplo.com', senha: '' }).success).toBe(false)
  })
})
