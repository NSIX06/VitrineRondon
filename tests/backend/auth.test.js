import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: { usuario: { findUnique: vi.fn() }, sessaoEncerrada: { findUnique: vi.fn() } },
}))

process.env.JWT_SECRET = 'segredo-de-teste'

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const { PERFIS, gerarToken, autenticar, autenticarOpcional, exigirPerfil, ehAdmin } = await import(
  '../../backend/src/middlewares/auth.js'
)

const ANA = { id: 4, nome: 'Ana', email: 'ana@exemplo.com', perfil: PERFIS.EMPREENDEDOR, ativo: true }

/** Requisição com o cabeçalho Authorization montado */
const comToken = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} })

function resposta() {
  const saida = { codigo: 0, corpo: null }
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

beforeEach(() => {
  prisma.usuario.findUnique.mockReset()
  prisma.usuario.findUnique.mockResolvedValue(ANA)
  prisma.sessaoEncerrada.findUnique.mockReset()
  prisma.sessaoEncerrada.findUnique.mockResolvedValue(null)
})

describe('gerarToken', () => {
  it('guarda só o id e o perfil', () => {
    const conteudo = jwt.verify(gerarToken({ ...ANA, senhaHash: '$2b$10$x' }), process.env.JWT_SECRET)
    expect(conteudo.sub).toBe(4)
    expect(conteudo.perfil).toBe(PERFIS.EMPREENDEDOR)
  })

  it('não leva nome, e-mail nem senha para dentro do token', () => {
    const conteudo = jwt.verify(gerarToken({ ...ANA, senhaHash: '$2b$10$x' }), process.env.JWT_SECRET)
    expect(Object.keys(conteudo).sort()).toEqual(['exp', 'iat', 'jti', 'perfil', 'sub'])
  })

  it('tem prazo de validade', () => {
    const conteudo = jwt.verify(gerarToken(ANA), process.env.JWT_SECRET)
    expect(conteudo.exp).toBeGreaterThan(conteudo.iat)
  })
})

describe('autenticar', () => {
  it('deixa passar com token válido e carrega o usuário do banco', async () => {
    const req = comToken(gerarToken(ANA))
    const seguir = vi.fn()
    await autenticar(req, resposta(), seguir)
    expect(seguir).toHaveBeenCalled()
    expect(req.usuario).toEqual(ANA)
  })

  it('lê o perfil do banco, não o que veio no token', async () => {
    // Quem for rebaixado a COMUM não continua administrador com o token antigo
    const tokenAntigo = gerarToken({ ...ANA, perfil: PERFIS.ADMIN })
    prisma.usuario.findUnique.mockResolvedValue({ ...ANA, perfil: PERFIS.COMUM })
    const req = comToken(tokenAntigo)
    await autenticar(req, resposta(), vi.fn())
    expect(req.usuario.perfil).toBe(PERFIS.COMUM)
  })

  it('recusa a sessão encerrada pelo botão Sair (jti na lista)', async () => {
    const token = gerarToken(ANA)
    const { jti } = jwt.decode(token)
    prisma.sessaoEncerrada.findUnique.mockResolvedValue({ jti })
    const res = resposta()
    const seguir = vi.fn()
    await autenticar(comToken(token), res, seguir)
    expect(res.saida.codigo).toBe(401)
    expect(seguir).not.toHaveBeenCalled()
    expect(prisma.sessaoEncerrada.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { jti } }))
  })

  it('cada login gera um jti diferente e a sessão fica disponível ao logout', async () => {
    const t1 = gerarToken(ANA), t2 = gerarToken(ANA)
    expect(jwt.decode(t1).jti).toBeTruthy()
    expect(jwt.decode(t1).jti).not.toBe(jwt.decode(t2).jti)
    const req = comToken(t1)
    await autenticar(req, resposta(), vi.fn())
    expect(req.usuario.sessao.jti).toBe(jwt.decode(t1).jti)
    expect(Object.keys(req.usuario)).not.toContain('sessao')
  })

  it('recusa token assinado com outro algoritmo (HS512)', async () => {
    const token = jwt.sign({ sub: ANA.id, perfil: ANA.perfil }, 'segredo-de-teste', { algorithm: 'HS512' })
    const res = resposta()
    await autenticar(comToken(token), res, vi.fn())
    expect(res.saida.codigo).toBe(401)
  })

  it('derruba a sessão emitida antes da última troca de senha', async () => {
    const tokenAntigo = jwt.sign({ sub: ANA.id, perfil: ANA.perfil, iat: Math.floor(Date.now() / 1000) - 3600 }, 'segredo-de-teste')
    prisma.usuario.findUnique.mockResolvedValue({ ...ANA, senhaAlteradaEm: new Date() })
    const res = resposta()
    const seguir = vi.fn()
    await autenticar(comToken(tokenAntigo), res, seguir)
    expect(res.saida.codigo).toBe(401)
    expect(seguir).not.toHaveBeenCalled()
  })

  it('a sessão criada depois da troca de senha continua valendo (e não expõe a data)', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ ...ANA, senhaAlteradaEm: new Date(Date.now() - 3600_000) })
    const req = comToken(gerarToken(ANA))
    const seguir = vi.fn()
    await autenticar(req, resposta(), seguir)
    expect(seguir).toHaveBeenCalled()
    expect(req.usuario).toEqual(ANA)
  })

  it('recusa quem não mandou token', async () => {
    const res = resposta()
    const seguir = vi.fn()
    await autenticar(comToken(null), res, seguir)
    expect(res.saida.codigo).toBe(401)
    expect(seguir).not.toHaveBeenCalled()
  })

  it('recusa token assinado com outro segredo', async () => {
    const forjado = jwt.sign({ sub: 1, perfil: PERFIS.ADMIN }, 'outro-segredo')
    const res = resposta()
    await autenticar(comToken(forjado), res, vi.fn())
    expect(res.saida.codigo).toBe(401)
    expect(res.saida.corpo.message).toMatch(/inválida/i)
  })

  it('avisa quando a sessão expirou', async () => {
    const vencido = jwt.sign({ sub: 4, perfil: PERFIS.COMUM }, process.env.JWT_SECRET, { expiresIn: -10 })
    const res = resposta()
    await autenticar(comToken(vencido), res, vi.fn())
    expect(res.saida.codigo).toBe(401)
    expect(res.saida.corpo.message).toMatch(/expirada/i)
  })

  it('recusa token de conta que não existe mais', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null)
    const res = resposta()
    await autenticar(comToken(gerarToken(ANA)), res, vi.fn())
    expect(res.saida.codigo).toBe(401)
  })

  it('bloqueia conta desativada com 403, e não com 401', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ ...ANA, ativo: false })
    const res = resposta()
    await autenticar(comToken(gerarToken(ANA)), res, vi.fn())
    expect(res.saida.codigo).toBe(403)
    expect(res.saida.corpo.message).toMatch(/desativada/i)
  })

  it('não consulta o banco de novo quando a requisição já trouxe o usuário', async () => {
    const seguir = vi.fn()
    await autenticar({ headers: {}, usuario: ANA }, resposta(), seguir)
    expect(seguir).toHaveBeenCalled()
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled()
  })
})

describe('autenticarOpcional', () => {
  it('segue como visitante quando não há token', async () => {
    const req = comToken(null)
    const seguir = vi.fn()
    await autenticarOpcional(req, resposta(), seguir)
    expect(seguir).toHaveBeenCalled()
    expect(req.usuario).toBeUndefined()
  })

  it('identifica quem está navegando quando o token é válido', async () => {
    const req = comToken(gerarToken(ANA))
    await autenticarOpcional(req, resposta(), vi.fn())
    expect(req.usuario).toEqual(ANA)
  })

  it('segue como visitante quando o token não presta, sem responder erro', async () => {
    const req = comToken('token-qualquer')
    const res = resposta()
    const seguir = vi.fn()
    await autenticarOpcional(req, res, seguir)
    expect(req.usuario).toBeUndefined()
    expect(res.saida.codigo).toBe(0)
    expect(seguir).toHaveBeenCalled()
  })

  it('ignora conta desativada', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ ...ANA, ativo: false })
    const req = comToken(gerarToken(ANA))
    await autenticarOpcional(req, resposta(), vi.fn())
    expect(req.usuario).toBeUndefined()
  })
})

describe('exigirPerfil', () => {
  it('deixa passar quem tem o perfil pedido', () => {
    const seguir = vi.fn()
    exigirPerfil(PERFIS.ADMIN)({ usuario: { perfil: PERFIS.ADMIN } }, resposta(), seguir)
    expect(seguir).toHaveBeenCalled()
  })

  it('aceita qualquer um dos perfis informados', () => {
    const seguir = vi.fn()
    exigirPerfil(PERFIS.ADMIN, PERFIS.EMPREENDEDOR)({ usuario: ANA }, resposta(), seguir)
    expect(seguir).toHaveBeenCalled()
  })

  it('responde 403 para perfil sem permissão', () => {
    const res = resposta()
    exigirPerfil(PERFIS.ADMIN)({ usuario: { perfil: PERFIS.COMUM } }, res, vi.fn())
    expect(res.saida.codigo).toBe(403)
  })

  it('responde 401 quando ninguém está autenticado', () => {
    const res = resposta()
    exigirPerfil(PERFIS.ADMIN)({}, res, vi.fn())
    expect(res.saida.codigo).toBe(401)
  })
})

describe('ehAdmin', () => {
  it('reconhece o administrador', () => {
    expect(ehAdmin({ perfil: PERFIS.ADMIN })).toBe(true)
  })

  it.each([[PERFIS.COMUM], [PERFIS.EMPREENDEDOR], ['ADMINISTRADOR'], ['admin']])(
    'recusa o perfil %s',
    (perfil) => {
      expect(ehAdmin({ perfil })).toBe(false)
    }
  )

  it('recusa visitante sem conta', () => {
    expect(ehAdmin(null)).toBe(false)
    expect(ehAdmin(undefined)).toBe(false)
  })
})
