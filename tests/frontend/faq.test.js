import { describe, it, expect } from 'vitest'
import { categoriasDoFaq, filtrarFaq, validarFaq, LIMITES_FAQ } from '../../frontend/src/services/faq.js'

const PERGUNTAS = [
  {
    id: 1,
    categoria: 'Para quem compra',
    pergunta: 'Como combino preço, pagamento e entrega?',
    resposta: 'Direto com o empreendedor, pelo WhatsApp.',
  },
  {
    id: 2,
    categoria: 'Para quem vende',
    pergunta: 'Quanto custa anunciar na VitrineLocal?',
    resposta: 'Nada. O cadastro é gratuito.',
  },
  {
    id: 3,
    categoria: 'Privacidade',
    pergunta: 'Trabalho em casa. Preciso mostrar meu endereço?',
    resposta: 'Não. A página mostra só o bairro.',
  },
  { id: 4, categoria: null, pergunta: 'Sem assunto definido', resposta: 'Resposta qualquer.' },
]

const ids = (lista) => lista.map((p) => p.id)

describe('categoriasDoFaq', () => {
  it('lista cada assunto uma vez, em ordem alfabética', () => {
    expect(categoriasDoFaq(PERGUNTAS)).toEqual(['Para quem compra', 'Para quem vende', 'Privacidade'])
  })

  it('ignora pergunta sem assunto', () => {
    expect(categoriasDoFaq([{ categoria: null }, { categoria: '' }])).toEqual([])
  })

  it('não repete assunto de várias perguntas', () => {
    expect(categoriasDoFaq([{ categoria: 'A' }, { categoria: 'A' }])).toEqual(['A'])
  })
})

describe('filtrarFaq', () => {
  it('sem busca nem assunto, devolve todas', () => {
    expect(ids(filtrarFaq(PERGUNTAS))).toEqual([1, 2, 3, 4])
  })

  it('procura na pergunta', () => {
    expect(ids(filtrarFaq(PERGUNTAS, { busca: 'anunciar' }))).toEqual([2])
  })

  it('procura também na resposta', () => {
    expect(ids(filtrarFaq(PERGUNTAS, { busca: 'whatsapp' }))).toEqual([1])
  })

  it('não diferencia acento: "endereco" encontra "endereço"', () => {
    expect(ids(filtrarFaq(PERGUNTAS, { busca: 'endereco' }))).toEqual([3])
  })

  it('não diferencia maiúsculas', () => {
    expect(ids(filtrarFaq(PERGUNTAS, { busca: 'GRATUITO' }))).toEqual([2])
  })

  it('exige todas as palavras, em qualquer ordem', () => {
    expect(ids(filtrarFaq(PERGUNTAS, { busca: 'bairro casa' }))).toEqual([3])
    expect(ids(filtrarFaq(PERGUNTAS, { busca: 'bairro whatsapp' }))).toEqual([])
  })

  it('filtra pelo assunto', () => {
    expect(ids(filtrarFaq(PERGUNTAS, { categoria: 'Privacidade' }))).toEqual([3])
  })

  it('combina busca e assunto', () => {
    expect(ids(filtrarFaq(PERGUNTAS, { busca: 'nada', categoria: 'Para quem compra' }))).toEqual([])
    expect(ids(filtrarFaq(PERGUNTAS, { busca: 'nada', categoria: 'Para quem vende' }))).toEqual([2])
  })

  it('trata busca só com espaços como busca vazia', () => {
    expect(filtrarFaq(PERGUNTAS, { busca: '   ' })).toHaveLength(4)
  })

  it('devolve lista vazia quando nada bate', () => {
    expect(filtrarFaq(PERGUNTAS, { busca: 'xyzzy' })).toEqual([])
  })

  it('mantém a ordem que veio do servidor', () => {
    expect(ids(filtrarFaq([...PERGUNTAS].reverse(), { busca: 'a' }))).toEqual([4, 3, 2, 1])
  })
})

describe('validarFaq', () => {
  const valida = { pergunta: 'Quanto custa?', resposta: 'Nada.', categoria: '', ordem: '0' }

  it('não reclama de uma pergunta bem preenchida', () => {
    expect(validarFaq(valida)).toEqual({})
  })

  it('cobra a pergunta', () => {
    expect(validarFaq({ ...valida, pergunta: '   ' }).pergunta).toBe('A pergunta é obrigatória')
  })

  it('recusa pergunta com mais de 300 caracteres', () => {
    expect(validarFaq({ ...valida, pergunta: 'a'.repeat(301) }).pergunta).toMatch(/até 300/)
  })

  it('cobra a resposta', () => {
    expect(validarFaq({ ...valida, resposta: '' }).resposta).toBe('A resposta é obrigatória')
  })

  it.each([[''], ['-1'], ['2.5'], ['abc'], ['10000']])('recusa a ordem "%s"', (ordem) => {
    expect(validarFaq({ ...valida, ordem }).ordem).toMatch(/número inteiro/)
  })

  it('usa os mesmos limites do servidor', async () => {
    // Se um lado mudar sozinho, a tela deixa salvar o que a API recusa
    const { criarFaqSchema } = await import('../../backend/src/controllers/faqController.js')
    const base = { pergunta: 'x', resposta: 'y' }
    expect(criarFaqSchema.safeParse({ ...base, pergunta: 'a'.repeat(LIMITES_FAQ.pergunta) }).success).toBe(true)
    expect(criarFaqSchema.safeParse({ ...base, pergunta: 'a'.repeat(LIMITES_FAQ.pergunta + 1) }).success).toBe(false)
    expect(criarFaqSchema.safeParse({ ...base, resposta: 'a'.repeat(LIMITES_FAQ.resposta + 1) }).success).toBe(false)
    expect(criarFaqSchema.safeParse({ ...base, categoria: 'a'.repeat(LIMITES_FAQ.categoria + 1) }).success).toBe(false)
    expect(criarFaqSchema.safeParse({ ...base, ordem: LIMITES_FAQ.ordemMaxima + 1 }).success).toBe(false)
  })
})
