import { describe, it, expect } from 'vitest'
import { criarContatoSchema } from '../../backend/src/controllers/contatoController.js'
import { situacaoSchema } from '../../backend/src/controllers/usuarioController.js'

const mensagens = (resultado) => resultado.error.issues.map((i) => i.message)

describe('mensagem de contato', () => {
  const MENSAGEM = { nome: 'João', email: 'joao@exemplo.com', mensagem: 'Gostaria de um orçamento.' }
  const enviar = (extra = {}) => criarContatoSchema.safeParse({ ...MENSAGEM, ...extra })

  it('aceita o mínimo: nome, e-mail e recado', () => {
    expect(enviar().success).toBe(true)
  })

  it('não exige conta nem telefone', () => {
    expect(enviar({ telefone: undefined }).success).toBe(true)
  })

  it.each([
    ['nome curto', { nome: 'J' }, 'Nome deve ter ao menos 2 caracteres'],
    ['e-mail inválido', { email: 'joao' }, 'E-mail inválido'],
    ['recado curto', { mensagem: 'oi' }, 'Mensagem deve ter ao menos 5 caracteres'],
  ])('recusa %s', (_rotulo, campo, esperado) => {
    expect(mensagens(enviar(campo))).toContain(esperado)
  })

  it('recusa recado gigante, que encheria a tabela', () => {
    expect(enviar({ mensagem: 'a'.repeat(5001) }).success).toBe(false)
  })

  it('aceita mensagem endereçada a um negócio', () => {
    expect(enviar({ empreendedorId: '4' }).data.empreendedorId).toBe(4)
  })

  it('aceita mensagem geral, sem destinatário', () => {
    expect(enviar({ empreendedorId: null }).success).toBe(true)
  })

  it('não deixa marcar o próprio recado como lido', () => {
    // "lido" é da administração; quem envia não decide isso
    expect(enviar({ lido: true }).data.lido).toBeUndefined()
  })
})

describe('situação da conta (moderação)', () => {
  it('exige dizer se a conta fica ativa ou inativa', () => {
    expect(mensagens(situacaoSchema.safeParse({}))).toContain('Informe se a conta fica ativa ou inativa')
  })

  it('aceita desativar com motivo registrado', () => {
    const { success, data } = situacaoSchema.safeParse({ ativo: false, motivo: 'Anúncio falso' })
    expect(success).toBe(true)
    expect(data.motivo).toBe('Anúncio falso')
  })

  it('aceita reativar sem motivo', () => {
    expect(situacaoSchema.safeParse({ ativo: true }).success).toBe(true)
  })

  it('não aceita "false" como texto, que seria verdadeiro por engano', () => {
    expect(situacaoSchema.safeParse({ ativo: 'false' }).success).toBe(false)
  })

  it('corta motivo acima do limite da coluna', () => {
    expect(situacaoSchema.safeParse({ ativo: false, motivo: 'a'.repeat(301) }).success).toBe(false)
  })

  it('não permite trocar o perfil por aqui', () => {
    const { data } = situacaoSchema.safeParse({ ativo: true, perfil: 'ADMIN' })
    expect(data.perfil).toBeUndefined()
  })
})
