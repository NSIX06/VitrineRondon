import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import jwt from 'jsonwebtoken'

// O banco fica de fora; o caminho real (com um provedor simulado) está em
// tests-e2e/teste-google-ui.mjs
vi.mock('../../backend/src/config/prisma.js', () => ({
  default: {
    identidadeExterna: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    usuario: { findUnique: vi.fn(), create: vi.fn() },
    aceiteTermos: { createMany: vi.fn() },
    sessaoEncerrada: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('../../backend/src/services/auditoria.js', async (original) => ({
  ...(await original()),
  registrarLog: vi.fn(),
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const social = await import('../../backend/src/services/loginSocial.js')
const controller = await import('../../backend/src/controllers/loginSocialController.js')

const ambienteOriginal = { ...process.env }
const CLIENTE = 'cliente-de-teste.apps.googleusercontent.com'
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const JWK = { ...publicKey.export({ format: 'jwk' }), kid: 'chave-1', alg: 'RS256', use: 'sig' }

/** id_token como o Google emite, com o que cada teste quiser trocar */
function idToken(trocas = {}, { chave = privateKey, kid = 'chave-1', algoritmo = 'RS256' } = {}) {
  const dados = {
    iss: 'https://accounts.google.com',
    aud: CLIENTE,
    sub: '1098765',
    email: 'Maria@Gmail.com',
    email_verified: true,
    name: 'Maria Souza',
    nonce: 'nonce-1',
    ...trocas,
  }
  return jwt.sign(dados, chave, { algorithm: algoritmo, keyid: kid, expiresIn: trocas.expiresIn ?? 300 })
}

const config = () => social.configuracaoDoProvedor('GOOGLE')

beforeAll(() => {
  process.env.JWT_SECRET = 'segredo-dos-testes-com-tamanho-suficiente'
  process.env.GOOGLE_CLIENT_ID = CLIENTE
  process.env.GOOGLE_CLIENT_SECRET = 'segredo-do-cliente'
  process.env.CORS_ORIGINS = 'https://site.exemplo'
  process.env.NODE_ENV = 'test'
})

afterAll(() => {
  process.env = ambienteOriginal
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.clearAllMocks()
  social.esquecerChaves()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ keys: [JWK] }) }))
  )
})

describe('validarIdToken', () => {
  const validar = (token, nonce = 'nonce-1') => social.validarIdToken(token, { config: config(), nonce })

  it('aceita o token certo e devolve sujeito, e-mail (minúsculo) e nome', async () => {
    expect(await validar(idToken())).toEqual({ sujeito: '1098765', email: 'maria@gmail.com', nome: 'Maria Souza' })
  })

  it('recusa assinatura de outra chave', async () => {
    const outra = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
    await expect(validar(idToken({}, { chave: outra }))).rejects.toThrow(/recusado/)
  })

  it('recusa audiência, emissor e validade errados', async () => {
    await expect(validar(idToken({ aud: 'outro-app' }))).rejects.toThrow()
    await expect(validar(idToken({ iss: 'https://falso.exemplo' }))).rejects.toThrow()
    await expect(validar(idToken({ expiresIn: -120 }))).rejects.toThrow()
  })

  it('recusa nonce diferente (resposta reaproveitada)', async () => {
    await expect(validar(idToken(), 'outro-nonce')).rejects.toThrow(/nonce/)
  })

  it('recusa e-mail não verificado', async () => {
    await expect(validar(idToken({ email_verified: false }))).rejects.toThrow(/e-mail/)
  })

  it('recusa token HS256 (confusão de algoritmo) e chave desconhecida', async () => {
    await expect(validar(idToken({}, { chave: 'segredo', algoritmo: 'HS256' }))).rejects.toThrow(/algoritmo/)
    await expect(validar(idToken({}, { kid: 'chave-que-nao-existe' }))).rejects.toThrow(/chave/)
  })

  it('chave nova do provedor: busca a lista de novo uma vez', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [JWK] }) })
    expect((await validar(idToken())).sujeito).toBe('1098765')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('tokens temporários e destino', () => {
  it('o código de troca não serve como token de sessão', () => {
    const codigo = social.assinarTemporario({ tipo: 'troca', sub: 5 }, 60)
    expect(() => jwt.verify(codigo, process.env.JWT_SECRET)).toThrow()
    expect(social.lerTemporario(codigo, 'troca')).toMatchObject({ sub: 5 })
    expect(social.lerTemporario(codigo, 'vinculo')).toBeNull()
  })

  it('destino só aceita caminhos do próprio site', () => {
    expect(social.destinoSeguro('/empreendedores/3#avaliacoes')).toBe('/empreendedores/3#avaliacoes')
    for (const ruim of ['//mal.exemplo', 'https://mal.exemplo', '/\\mal.exemplo', 'javascript:alert(1)', '', null]) {
      expect(social.destinoSeguro(ruim)).toBe('/')
    }
  })
})

describe('resolverIdentidade', () => {
  const req = { headers: {}, ip: '1.1.1.1' }
  const perfil = { provedor: 'GOOGLE', sujeito: '1098765', email: 'maria@gmail.com', nome: 'Maria Souza' }
  const CONTA = { id: 9, nome: 'Maria Souza', email: 'maria@gmail.com', perfil: 'COMUM', ativo: true }

  beforeEach(() => {
    prisma.$transaction.mockImplementation((funcao) => funcao(prisma))
  })

  it('login recorrente: recupera a mesma conta pelo vínculo', async () => {
    prisma.identidadeExterna.findUnique.mockResolvedValue({ id: 1, usuario: { ...CONTA, perfil: 'EMPREENDEDOR' } })
    const resultado = await social.resolverIdentidade(req, perfil)
    expect(resultado).toMatchObject({ novo: false, usuario: { id: 9, perfil: 'EMPREENDEDOR' } })
    expect(prisma.usuario.create).not.toHaveBeenCalled()
  })

  it('e-mail de conta existente sem vínculo: pede vínculo, não liga sozinho', async () => {
    prisma.identidadeExterna.findUnique.mockResolvedValue(null)
    prisma.usuario.findUnique.mockResolvedValue({ id: 3 })
    expect(await social.resolverIdentidade(req, perfil)).toEqual({ vincular: true })
    expect(prisma.identidadeExterna.create).not.toHaveBeenCalled()
  })

  it('primeiro login: cria conta COMUM sem senha, o vínculo e o aceite', async () => {
    prisma.identidadeExterna.findUnique.mockResolvedValue(null)
    prisma.usuario.findUnique.mockResolvedValue(null)
    prisma.usuario.create.mockResolvedValue(CONTA)
    const resultado = await social.resolverIdentidade(req, perfil)
    expect(resultado).toMatchObject({ novo: true, usuario: { id: 9 } })
    expect(prisma.usuario.create.mock.calls[0][0].data).toEqual({
      nome: 'Maria Souza',
      email: 'maria@gmail.com',
      telefone: null,
      senhaHash: null,
      perfil: 'COMUM',
    })
    expect(prisma.identidadeExterna.create.mock.calls[0][0].data).toMatchObject({ usuarioId: 9, provedor: 'GOOGLE', sujeito: '1098765' })
    expect(prisma.aceiteTermos.createMany).toHaveBeenCalled()
  })

  it('dois primeiros logins ao mesmo tempo: o segundo recupera a conta do primeiro', async () => {
    prisma.identidadeExterna.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, usuario: CONTA })
    prisma.usuario.findUnique.mockResolvedValue(null)
    prisma.$transaction.mockRejectedValue(Object.assign(new Error('único'), { code: 'P2002' }))
    expect(await social.resolverIdentidade(req, perfil)).toMatchObject({ novo: false, usuario: { id: 9 } })
  })
})

describe('controller do fluxo', () => {
  /** Resposta falsa do Express que guarda redirecionamento, cookie e JSON */
  function resposta() {
    const saida = { codigo: 200, url: null, cookies: {}, corpo: null }
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
      redirect(codigo, url) {
        saida.codigo = codigo
        saida.url = url
      },
      cookie(nome, valor, opcoes) {
        saida.cookies[nome] = { valor, opcoes }
      },
      clearCookie(nome) {
        saida.cookies[nome] = { apagado: true }
      },
    }
  }
  const req = (query = {}, cookie = '') => ({
    query,
    headers: { cookie },
    protocol: 'http',
    get: () => 'localhost:3001',
    ip: '1.1.1.1',
    body: {},
  })

  it('iniciar: PKCE S256, state e nonce, e cookie httpOnly com o estado', () => {
    const res = resposta()
    controller.iniciarGoogle(req({ destino: '/empreendedores/3#avaliacoes', origem: 'https://site.exemplo' }), res)
    const url = new URL(res.saida.url)
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('scope')).toBe('openid email profile')
    expect(url.searchParams.get('state')).toBeTruthy()
    expect(url.searchParams.get('nonce')).toBeTruthy()
    const cookie = res.saida.cookies.vl_login_social
    expect(cookie.opcoes).toMatchObject({ httpOnly: true, sameSite: 'lax' })
    const estado = social.lerTemporario(cookie.valor, 'estado')
    expect(estado).toMatchObject({ destino: '/empreendedores/3#avaliacoes', origem: 'https://site.exemplo' })
    expect(estado.estado).toBe(url.searchParams.get('state'))
  })

  it('iniciar: origem fora da lista volta para a origem permitida, nunca para a pedida', () => {
    const res = resposta()
    controller.iniciarGoogle(req({ origem: 'https://mal.exemplo' }), res)
    const estado = social.lerTemporario(res.saida.cookies.vl_login_social.valor, 'estado')
    expect(estado.origem).toBe('https://site.exemplo')
  })

  it('retorno: state diferente do cookie é recusado (CSRF)', async () => {
    const cookie = social.assinarTemporario({ tipo: 'estado', estado: 'A', nonce: 'n', verificador: 'v', destino: '/', origem: 'https://site.exemplo' }, 600)
    const res = resposta()
    await controller.retornoGoogle(req({ state: 'B', code: 'x' }, `vl_login_social=${cookie}`), res, () => {})
    expect(res.saida.url).toBe('https://site.exemplo/entrar/google#erro=expirado')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('retorno: login cancelado no Google', async () => {
    const cookie = social.assinarTemporario({ tipo: 'estado', estado: 'A', nonce: 'n', verificador: 'v', destino: '/', origem: 'https://site.exemplo' }, 600)
    const res = resposta()
    await controller.retornoGoogle(req({ error: 'access_denied', state: 'A' }, `vl_login_social=${cookie}`), res, () => {})
    expect(res.saida.url).toBe('https://site.exemplo/entrar/google#erro=cancelado')
  })

  it('sessão: o código vale uma vez só', async () => {
    const codigo = social.assinarTemporario({ tipo: 'troca', sub: 9 }, 60)
    prisma.usuario.findUnique.mockResolvedValue({ id: 9, nome: 'Maria', email: 'm@x', perfil: 'COMUM', ativo: true, empreendedor: null })
    prisma.sessaoEncerrada.create.mockResolvedValueOnce({}).mockRejectedValueOnce(Object.assign(new Error('único'), { code: 'P2002' }))

    const primeira = resposta()
    await controller.sessaoGoogle({ body: { codigo } }, primeira, () => {})
    expect(primeira.saida.corpo.data.token).toBeTruthy()
    expect(primeira.saida.corpo.data.usuario).toMatchObject({ id: 9, perfil: 'COMUM' })

    const segunda = resposta()
    await controller.sessaoGoogle({ body: { codigo } }, segunda, () => {})
    expect(segunda.saida.codigo).toBe(401)
  })

  it('vincular: senha errada não liga nada', async () => {
    const vinculo = social.assinarTemporario({ tipo: 'vinculo', provedor: 'GOOGLE', sujeito: 's', email: 'm@x', destino: '/' }, 600)
    prisma.usuario.findUnique.mockResolvedValue({ id: 3, senhaHash: '$2a$10$abcdefghijklmnopqrstuuK3k1gL6jWZ3o1Ux0r1lC2g1jC6pPzG', ativo: true })
    const res = resposta()
    await controller.vincularGoogle({ body: { vinculo, senha: 'errada' }, headers: {}, ip: '1.1.1.1' }, res, () => {})
    expect(res.saida.codigo).toBe(401)
    expect(prisma.identidadeExterna.create).not.toHaveBeenCalled()
  })

  it('vincular: conta só do Google (sem senha) também é recusada', async () => {
    const vinculo = social.assinarTemporario({ tipo: 'vinculo', provedor: 'GOOGLE', sujeito: 's', email: 'm@x', destino: '/' }, 600)
    prisma.usuario.findUnique.mockResolvedValue({ id: 3, senhaHash: null, ativo: true })
    const res = resposta()
    await controller.vincularGoogle({ body: { vinculo, senha: 'qualquer' }, headers: {}, ip: '1.1.1.1' }, res, () => {})
    expect(res.saida.codigo).toBe(401)
  })
})
