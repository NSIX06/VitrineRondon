import { describe, it, expect } from 'vitest'
import { formatarNumero, formatarPreco } from '../../frontend/src/services/formatos.js'
import { errosDoServidor } from '../../frontend/src/services/validacoes.js'

// O Intl separa "R$" do valor com espaço não separável
const semEspacoEspecial = (texto) => texto.replace(/\s/g, ' ')

describe('formatos', () => {
  it('preço em reais no padrão brasileiro', () => {
    expect(semEspacoEspecial(formatarPreco(49.9))).toBe('R$ 49,90')
    expect(semEspacoEspecial(formatarPreco(1500))).toBe('R$ 1.500,00')
  })

  it('número com separador de milhar', () => {
    expect(formatarNumero(1240)).toBe('1.240')
  })

  it('valor ausente vira zero em vez de "NaN"', () => {
    expect(semEspacoEspecial(formatarPreco(undefined))).toBe('R$ 0,00')
    expect(formatarNumero(null)).toBe('0')
  })
})

describe('errosDoServidor', () => {
  it('a lista { campo, mensagem } do servidor vira um mapa por campo', () => {
    const erro = { data: { errors: [{ campo: 'preco', mensagem: 'Preço inválido' }, { campo: 'nome', mensagem: 'Informe o nome' }] } }
    expect(errosDoServidor(erro)).toEqual({ preco: 'Preço inválido', nome: 'Informe o nome' })
  })

  it('tira o grupo do nome do campo quando pedido', () => {
    const erro = {
      data: {
        errors: [
          { campo: 'conta.email', mensagem: 'E-mail já cadastrado' },
          { campo: 'aceites.termosDeUso', mensagem: 'Aceite obrigatório' },
          { campo: 'negocio.nome', mensagem: 'Outro grupo fica como veio' },
        ],
      },
    }
    expect(errosDoServidor(erro, ['conta.', 'aceites.'])).toEqual({
      email: 'E-mail já cadastrado',
      termosDeUso: 'Aceite obrigatório',
      'negocio.nome': 'Outro grupo fica como veio',
    })
  })

  it('erro sem campos (rede, 500) devolve null, e o formulário mostra só a mensagem geral', () => {
    expect(errosDoServidor(new Error('sem rede'))).toBeNull()
    expect(errosDoServidor({ data: { errors: [] } })).toBeNull()
    expect(errosDoServidor(undefined)).toBeNull()
  })
})
