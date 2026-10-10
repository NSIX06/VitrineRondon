import { describe, it, expect } from 'vitest'
import {
  CATEGORIAS,
  criarEmpreendedorSchema,
  atualizarEmpreendedorSchema,
} from '../../backend/src/controllers/empreendedorController.js'

const NEGOCIO = {
  nomeNegocio: 'Ateliê Fio & Arte',
  responsavel: 'Maria Aparecida Souza',
  categoria: 'Artesanato',
  cidade: 'Rondonópolis',
  estado: 'MT',
  whatsapp: '(66) 99123-4567',
}

const criar = (extra = {}) => criarEmpreendedorSchema.safeParse({ ...NEGOCIO, ...extra })
const mensagens = (resultado) => resultado.error.issues.map((i) => i.message)

describe('cadastro do negócio', () => {
  it('aceita o mínimo necessário', () => {
    expect(criar().success).toBe(true)
  })

  it.each(['nomeNegocio', 'responsavel', 'categoria', 'cidade', 'whatsapp'])(
    'exige o campo %s',
    (campo) => {
      const semCampo = { ...NEGOCIO }
      delete semCampo[campo]
      expect(criarEmpreendedorSchema.safeParse(semCampo).success).toBe(false)
    }
  )

  it('assume MT quando o estado não vem', () => {
    const semEstado = { ...NEGOCIO }
    delete semEstado.estado
    expect(criarEmpreendedorSchema.parse(semEstado).estado).toBe('MT')
  })

  it('guarda a UF em maiúsculas', () => {
    expect(criar({ estado: 'mt' }).data.estado).toBe('MT')
  })

  it('tira espaços das pontas', () => {
    expect(criar({ nomeNegocio: '  Ateliê  ' }).data.nomeNegocio).toBe('Ateliê')
  })
})

describe('categoria', () => {
  it.each(CATEGORIAS)('aceita %s', (categoria) => {
    expect(criar({ categoria }).success).toBe(true)
  })

  it('recusa categoria fora da lista, que ficaria sem filtro na vitrine', () => {
    const resultado = criar({ categoria: 'Geral' })
    expect(resultado.success).toBe(false)
    expect(mensagens(resultado)[0]).toContain('Escolha uma categoria')
  })

  it('a lista é a mesma do frontend', async () => {
    const { CATEGORIAS: doFrontend } = await import('../../frontend/src/services/constantes.js')
    expect(CATEGORIAS).toEqual(doFrontend)
  })
})

describe('localização', () => {
  it('aceita negócio sem endereço nenhum', () => {
    expect(criar({ endereco: null, bairro: null, cep: null }).success).toBe(true)
  })

  it.each(['78700-000', '78700000'])('aceita o CEP %s', (cep) => {
    expect(criar({ cep }).success).toBe(true)
  })

  it('recusa CEP malformado', () => {
    expect(mensagens(criar({ cep: '787-00' }))).toContain('CEP deve ter o formato 00000-000')
  })

  it('trata CEP em branco como ausente', () => {
    expect(criar({ cep: '' }).data.cep).toBeNull()
  })

  it.each([
    ['latitude', 91],
    ['latitude', -91],
    ['longitude', 181],
    ['longitude', -181],
  ])('recusa %s fora do planeta: %i', (campo, valor) => {
    expect(criar({ [campo]: valor }).success).toBe(false)
  })

  it('aceita coordenada como texto, vinda do formulário', () => {
    const { data } = criar({ latitude: '-16.4673', longitude: '-54.6372' })
    expect(data.latitude).toBeCloseTo(-16.4673)
  })

  it('exige UF com duas letras', () => {
    expect(mensagens(criar({ estado: 'Mato Grosso' }))).toContain('Estado deve ter 2 letras (UF)')
  })
})

describe('contato e foto', () => {
  it.each(['(66) 99123-4567', '66991234567', '+55 66 99123-4567'])('aceita o WhatsApp %s', (whatsapp) => {
    expect(criar({ whatsapp }).success).toBe(true)
  })

  it('recusa WhatsApp com letras', () => {
    expect(mensagens(criar({ whatsapp: 'chame no zap' }))[0]).toContain('apenas números')
  })

  it('recusa endereço de foto que não é uma URL', () => {
    expect(mensagens(criar({ fotoUrl: 'foto.png' }))).toContain('URL da foto inválida')
  })

  it.each(['50% 50%', '0% 100%', '100% 0%', '12% 7%'])('aceita o enquadramento %s', (foco) => {
    expect(criar({ fotoFoco: foco, logoFoco: foco }).success).toBe(true)
  })

  // O valor vai direto para o CSS (object-position): só "x% y%" de 0 a 100 passa
  it.each(['101% 50%', '50%', 'center', '50% 50%; background:url(x)', '-1% 0%', '50px 20px'])(
    'recusa enquadramento fora do formato: %s',
    (foco) => {
      expect(criar({ fotoFoco: foco }).success).toBe(false)
    }
  )
})

describe('edição parcial', () => {
  it('aceita mudar um campo só', () => {
    const { success, data } = atualizarEmpreendedorSchema.safeParse({ cidade: 'Cuiabá' })
    expect(success).toBe(true)
    expect(data).toEqual({ cidade: 'Cuiabá' })
  })

  it('não reaplica o estado padrão em quem não mandou estado', () => {
    // No Zod 4 o .partial() preserva os .default(): se a base tivesse padrão,
    // toda edição parcial gravaria "MT" por cima do estado real
    const { data } = atualizarEmpreendedorSchema.safeParse({ cidade: 'Goiânia' })
    expect('estado' in data).toBe(false)
  })

  it('não inventa categoria em quem não mandou categoria', () => {
    // Foi assim que um negócio de Serviços virou "Geral" e sumiu do filtro
    const { data } = atualizarEmpreendedorSchema.safeParse({ nomeNegocio: 'Silva Reparos' })
    expect('categoria' in data).toBe(false)
  })

  it('continua recusando valor inválido no campo enviado', () => {
    expect(atualizarEmpreendedorSchema.safeParse({ categoria: 'Geral' }).success).toBe(false)
  })

  it('aceita corpo vazio, que não muda nada', () => {
    expect(atualizarEmpreendedorSchema.safeParse({}).success).toBe(true)
  })
})

describe('campos que não se mexe pelo corpo da requisição', () => {
  it.each(['id', 'usuarioId', 'createdAt'])('descarta %s', (campo) => {
    const { data } = criar({ [campo]: 99 })
    expect(data[campo]).toBeUndefined()
  })
})
