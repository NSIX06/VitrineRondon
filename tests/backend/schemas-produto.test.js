import { describe, it, expect } from 'vitest'
import { criarProdutoSchema, atualizarProdutoSchema } from '../../backend/src/controllers/produtoController.js'

const ITEM = { nome: 'Bolo de fubá', preco: 25.5, tipo: 'produto', empreendedorId: 3 }
const criar = (extra = {}) => criarProdutoSchema.safeParse({ ...ITEM, ...extra })
const mensagens = (resultado) => resultado.error.issues.map((i) => i.message)

describe('cadastro do item', () => {
  it('aceita o mínimo necessário', () => {
    expect(criar().success).toBe(true)
  })

  it.each(['nome', 'preco', 'empreendedorId'])('exige o campo %s', (campo) => {
    const incompleto = { ...ITEM }
    delete incompleto[campo]
    expect(criarProdutoSchema.safeParse(incompleto).success).toBe(false)
  })

  it('assume "produto" quando o tipo não vem', () => {
    const semTipo = { ...ITEM }
    delete semTipo.tipo
    expect(criarProdutoSchema.parse(semTipo).tipo).toBe('produto')
  })

  it('recusa nome de uma letra só', () => {
    expect(mensagens(criar({ nome: 'A' }))).toContain('Nome deve ter ao menos 2 caracteres')
  })
})

describe('preço', () => {
  it('aceita preço como texto, vindo do formulário', () => {
    expect(criar({ preco: '25.50' }).data.preco).toBe(25.5)
  })

  it.each([[0], [-1]])('recusa o preço %i', (preco) => {
    expect(mensagens(criar({ preco }))).toContain('Preço deve ser um valor positivo')
  })

  it('recusa preço que não é número', () => {
    expect(criar({ preco: 'combinar' }).success).toBe(false)
  })
})

describe('tipo', () => {
  it.each(['produto', 'servico'])('aceita %s', (tipo) => {
    expect(criar({ tipo }).success).toBe(true)
  })

  it('recusa tipo fora da lista', () => {
    expect(mensagens(criar({ tipo: 'serviço' }))[0]).toContain('Tipo deve ser')
  })
})

describe('dono do item', () => {
  it('aceita empreendedorId como texto', () => {
    expect(criar({ empreendedorId: '3' }).data.empreendedorId).toBe(3)
  })

  it.each([[0], [-2], [1.5]])('recusa empreendedorId %s', (valor) => {
    expect(criar({ empreendedorId: valor }).success).toBe(false)
  })

  it('a edição não aceita trocar o item de negócio', () => {
    // Sem isso, um empreendedor poderia mover o próprio item para outra loja
    const { data } = atualizarProdutoSchema.safeParse({ nome: 'Bolo', empreendedorId: 99 })
    expect(data.empreendedorId).toBeUndefined()
  })
})

describe('edição parcial', () => {
  it('aceita mudar só o preço', () => {
    const { success, data } = atualizarProdutoSchema.safeParse({ preco: '30' })
    expect(success).toBe(true)
    expect(data).toEqual({ preco: 30 })
  })

  it('não transforma serviço em produto quando o tipo não é enviado', () => {
    // O .default('tipo') vive só no schema de cadastro justamente por isso
    const { data } = atualizarProdutoSchema.safeParse({ nome: 'Corte de cabelo' })
    expect('tipo' in data).toBe(false)
  })

  it('continua validando o campo que foi enviado', () => {
    expect(atualizarProdutoSchema.safeParse({ preco: -5 }).success).toBe(false)
  })

  it('aceita esconder o item da vitrine', () => {
    expect(atualizarProdutoSchema.safeParse({ disponivel: false }).data.disponivel).toBe(false)
  })
})

describe('imagem', () => {
  it('aceita endereço completo', () => {
    expect(criar({ imagem: 'https://exemplo.com/bolo.jpg' }).success).toBe(true)
  })

  it('recusa caminho solto', () => {
    expect(mensagens(criar({ imagem: '/fotos/bolo.jpg' }))).toContain('URL da imagem inválida')
  })

  it('aceita item sem imagem', () => {
    expect(criar({ imagem: null }).success).toBe(true)
  })
})
