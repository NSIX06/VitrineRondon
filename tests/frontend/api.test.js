import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import api, {
  mensagemSegura,
  montarQuery,
  obterToken,
  definirToken,
  lerDoCache,
  limparCache,
  aoPerderSessao,
} from '../../frontend/src/services/api.js'

const BARRA = String.fromCharCode(92)

/** localStorage de mentira, já que o teste não roda no navegador */
function armazenamentoFalso() {
  const dados = new Map()
  globalThis.localStorage = {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
    removeItem: (chave) => dados.delete(chave),
  }
  return dados
}

/** Resposta de mentira do fetch */
const resposta = (corpo, { status = 200, texto } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => texto ?? JSON.stringify(corpo),
})

beforeEach(() => {
  armazenamentoFalso()
  limparCache()
  // Em desenvolvimento o cliente registra o motivo técnico no console; aqui
  // isso só sujaria a saída dos testes
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  delete globalThis.localStorage
  vi.unstubAllGlobals()
})

describe('mensagemSegura', () => {
  it.each([
    ['Dados inválidos', 400],
    ['Você só pode alterar o seu próprio negócio', 403],
    ['Sessão expirada. Faça login novamente', 401],
  ])('mostra a mensagem da nossa API: %s', (mensagem, status) => {
    expect(mensagemSegura(mensagem, status)).toBe(mensagem)
  })

  it.each([
    ['pilha de chamadas', "TypeError: x is null\n    at useAuth (http://localhost:5173/src/contexts/auth.js:18)"],
    ['página HTML de proxy', '<!DOCTYPE html><title>502 Bad Gateway</title>'],
    ['código do sistema', 'connect ECONNREFUSED 127.0.0.1:3306'],
    ['caminho de arquivo', `Invalid invocation in C:${BARRA}app${BARRA}src${BARRA}x.js:31`],
    ['endereço de servidor', 'Falha em http://interno:8080/api'],
  ])('esconde %s', (_rotulo, mensagem) => {
    expect(mensagemSegura(mensagem, 400)).not.toBe(mensagem)
  })

  it('nunca aproveita o texto de uma resposta 5xx', () => {
    // Pode ter vindo de um proxy, e não da nossa API
    expect(mensagemSegura('Erro no servidor de aplicação', 500)).toMatch(/Não foi possível/)
  })

  it('recusa texto longo demais para uma frase de tela', () => {
    expect(mensagemSegura('a'.repeat(200), 400)).toMatch(/Confira os dados/)
  })

  it('tem uma frase própria para cada status comum', () => {
    expect(mensagemSegura(undefined, 401)).toMatch(/login/i)
    expect(mensagemSegura(undefined, 403)).toMatch(/permissão/i)
    expect(mensagemSegura(undefined, 404)).toMatch(/não encontramos/i)
    expect(mensagemSegura(undefined, 429)).toMatch(/tentativas/i)
  })

  it('explica o 503 como indisponibilidade passageira', () => {
    expect(mensagemSegura('qualquer coisa do servidor', 503)).toMatch(/fora do ar por um instante/)
  })

  it('cai no texto genérico em status que não mapeamos', () => {
    expect(mensagemSegura(null, 418)).toMatch(/Não foi possível concluir/)
  })
})

describe('montarQuery', () => {
  it('monta a query a partir dos filtros', () => {
    expect(montarQuery({ categoria: 'Moda', tipo: 'produto' })).toBe('?categoria=Moda&tipo=produto')
  })

  it('ignora filtro vazio, nulo ou ausente', () => {
    expect(montarQuery({ busca: '', categoria: null, tipo: undefined, bairro: 'Centro' })).toBe('?bairro=Centro')
  })

  it('devolve texto vazio quando não há filtro nenhum', () => {
    expect(montarQuery({})).toBe('')
    expect(montarQuery()).toBe('')
  })

  it('escapa acento e espaço', () => {
    expect(montarQuery({ busca: 'pão de queijo' })).toBe('?busca=p%C3%A3o+de+queijo')
  })

  it('mantém o zero, que é um filtro válido', () => {
    expect(montarQuery({ diaSemana: 0 })).toBe('?diaSemana=0')
  })
})

describe('token da sessão', () => {
  it('guarda e lê o token', () => {
    definirToken('abc.123')
    expect(obterToken()).toBe('abc.123')
  })

  it('apaga o token ao sair', () => {
    definirToken('abc.123')
    definirToken(null)
    expect(obterToken()).toBeNull()
  })

  it('funciona sem armazenamento, como na janela anônima', () => {
    delete globalThis.localStorage
    expect(() => definirToken('abc')).not.toThrow()
    expect(obterToken()).toBeNull()
  })
})

describe('cache de leitura', () => {
  it('guarda a resposta de um GET', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ data: [1, 2] })))
    await api.get('/produtos')
    expect(lerDoCache('/produtos')).toEqual({ data: [1, 2] })
  })

  it('guarda cada combinação de filtros à parte', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ data: [] })))
    await api.get('/produtos', { categoria: 'Moda' })
    expect(lerDoCache('/produtos?categoria=Moda')).toBeDefined()
    expect(lerDoCache('/produtos')).toBeUndefined()
  })

  it('esquece tudo depois de uma alteração, para ninguém ver dado velho', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ data: [] })))
    await api.get('/produtos')
    await api.post('/produtos', { nome: 'Novo' })
    expect(lerDoCache('/produtos')).toBeUndefined()
  })

  it('esquece tudo quando a sessão troca', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ data: [] })))
    await api.get('/produtos')
    definirToken('de-outra-conta')
    expect(lerDoCache('/produtos')).toBeUndefined()
  })
})

describe('requisição', () => {
  it('envia o token quando existe', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(resposta({ ok: true }))
    vi.stubGlobal('fetch', fetchFalso)
    definirToken('abc.123')
    await api.get('/auth/me')
    expect(fetchFalso.mock.calls[0][1].headers.Authorization).toBe('Bearer abc.123')
  })

  it('não inventa cabeçalho de sessão para visitante', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(resposta({ ok: true }))
    vi.stubGlobal('fetch', fetchFalso)
    await api.get('/produtos')
    expect(fetchFalso.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('manda o corpo como JSON', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(resposta({ ok: true }))
    vi.stubGlobal('fetch', fetchFalso)
    await api.post('/contatos', { nome: 'Ana' })
    const opcoes = fetchFalso.mock.calls[0][1]
    expect(opcoes.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opcoes.body)).toEqual({ nome: 'Ana' })
  })

  it('aceita resposta sem corpo, como a exclusão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(null, { status: 204, texto: '' })))
    expect(await api.delete('/produtos/1')).toBeNull()
  })

  it('transforma falha de rede em erro com status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(api.get('/produtos')).rejects.toMatchObject({ status: 0 })
  })

  it('a falha de rede não repete o motivo técnico', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(api.get('/produtos')).rejects.toThrow(/conexão/i)
  })

  it('lança erro com o status e o corpo da resposta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(resposta({ success: false, message: 'Dados inválidos' }, { status: 400 }))
    )
    await expect(api.post('/produtos', {})).rejects.toMatchObject({
      status: 400,
      message: 'Dados inválidos',
      data: { success: false, message: 'Dados inválidos' },
    })
  })

  it('não usa como mensagem um corpo que não é JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(resposta(null, { status: 502, texto: '<html><title>502 Bad Gateway</title>' }))
    )
    await expect(api.get('/produtos')).rejects.toThrow(/Não foi possível concluir/)
  })
})

describe('aoPerderSessao', () => {
  it('avisa quem estiver ouvindo quando a sessão cai', async () => {
    const aviso = vi.fn()
    const parar = aoPerderSessao(aviso)
    definirToken('abc.123')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ message: 'Sessão inválida' }, { status: 401 })))
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(aviso).toHaveBeenCalled()
    parar()
  })

  it('não avisa em login recusado, que não é sessão perdida', async () => {
    const aviso = vi.fn()
    const parar = aoPerderSessao(aviso)
    definirToken('abc.123')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ message: 'E-mail ou senha inválidos' }, { status: 401 })))
    await expect(api.post('/auth/login', {})).rejects.toThrow()
    expect(aviso).not.toHaveBeenCalled()
    parar()
  })

  it('não avisa visitante, que nem sessão tinha', async () => {
    const aviso = vi.fn()
    const parar = aoPerderSessao(aviso)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ message: 'Faça login' }, { status: 401 })))
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(aviso).not.toHaveBeenCalled()
    parar()
  })

  it('para de avisar depois de cancelado', async () => {
    const aviso = vi.fn()
    aoPerderSessao(aviso)()
    definirToken('abc.123')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ message: 'Sessão inválida' }, { status: 401 })))
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(aviso).not.toHaveBeenCalled()
  })
})
