import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js'
import { erroHttp, MENSAGEM_GENERICA } from '../../backend/src/utils/erros.js'

/** Chama o middleware e devolve o que ele respondeu */
function responder(erro, req = { method: 'GET', originalUrl: '/api/teste' }) {
  const resultado = { codigo: 0, corpo: null }
  const res = {
    status(codigo) {
      resultado.codigo = codigo
      return this
    },
    json(corpo) {
      resultado.corpo = corpo
      return this
    },
  }
  errorHandler(erro, req, res, () => {})
  return resultado
}

const prismaErro = (codigo) =>
  new Prisma.PrismaClientKnownRequestError('mensagem interna do driver', {
    code: codigo,
    clientVersion: '6.0.0',
  })

let logDoServidor

beforeEach(() => {
  logDoServidor = vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('validação (Zod)', () => {
  it('responde 400 apontando o campo que falhou', () => {
    const erro = new ZodError([{ code: 'custom', path: ['email'], message: 'E-mail inválido' }])
    const { codigo, corpo } = responder(erro)
    expect(codigo).toBe(400)
    expect(corpo.message).toBe('Dados inválidos')
    expect(corpo.errors).toEqual([{ campo: 'email', mensagem: 'E-mail inválido' }])
  })

  it('usa "body" quando o erro não aponta um campo', () => {
    const erro = new ZodError([{ code: 'custom', path: [], message: 'Corpo inválido' }])
    expect(responder(erro).corpo.errors[0].campo).toBe('body')
  })

  it('descreve caminhos aninhados como conta.email', () => {
    const erro = new ZodError([{ code: 'custom', path: ['conta', 'email'], message: 'E-mail inválido' }])
    expect(responder(erro).corpo.errors[0].campo).toBe('conta.email')
  })
})

describe('erros conhecidos do banco', () => {
  it.each([
    ['P2025', 404, /não encontrado/i],
    ['P2002', 409, /já existe/i],
    ['P2003', 400, /referência inválida/i],
  ])('traduz %s em %i', (codigo, esperado, texto) => {
    const { codigo: status, corpo } = responder(prismaErro(codigo))
    expect(status).toBe(esperado)
    expect(corpo.message).toMatch(texto)
    expect(corpo.message).not.toMatch(/driver|prisma/i)
  })

  it.each(['P1001', 'P1002', 'P1008', 'P1017'])('banco inalcançável (%s) vira 503, não 500', (codigo) => {
    const { codigo: status, corpo } = responder(prismaErro(codigo))
    expect(status).toBe(503)
    expect(corpo.message).toMatch(/indisponível/i)
    expect(corpo.message).not.toMatch(/localhost|3306|database/i)
  })

  it('falha ao iniciar a conexão também vira 503', () => {
    const erro = new Prisma.PrismaClientInitializationError("Can't reach database server at `localhost:3306`", '6.0.0')
    expect(responder(erro).codigo).toBe(503)
  })

  it('código de banco que não mapeamos vira 500 genérico', () => {
    const { codigo, corpo } = responder(prismaErro('P2010'))
    expect(codigo).toBe(500)
    expect(corpo.message).toBe(MENSAGEM_GENERICA)
  })
})

describe('corpo da requisição', () => {
  it('avisa sobre JSON malformado', () => {
    const { codigo, corpo } = responder({ type: 'entity.parse.failed' })
    expect(codigo).toBe(400)
    expect(corpo.message).toMatch(/JSON inválido/i)
  })

  it('avisa quando o corpo passa do limite', () => {
    const { codigo, corpo } = responder({ type: 'entity.too.large' })
    expect(codigo).toBe(413)
    expect(corpo.message).toMatch(/muito grande/i)
  })
})

describe('mensagem que chega ao cliente', () => {
  it('repassa o texto de erros criados por erroHttp', () => {
    const { codigo, corpo } = responder(erroHttp(403, 'Você só pode alterar o seu próprio negócio'))
    expect(codigo).toBe(403)
    expect(corpo.message).toBe('Você só pode alterar o seu próprio negócio')
  })

  it('troca o texto de erro de biblioteca que trouxe status próprio', () => {
    const deBiblioteca = new Error('Invalid `prisma.usuario.findMany()` invocation in /app/src/x.js:31')
    deBiblioteca.status = 400
    const { codigo, corpo } = responder(deBiblioteca)
    expect(codigo).toBe(400)
    expect(corpo.message).toBe('Requisição inválida')
    expect(corpo.message).not.toMatch(/prisma|\.js/i)
  })

  it('não confia nem em status 5xx trazido pelo erro', () => {
    const erro = new Error('connect ECONNREFUSED 127.0.0.1:3306')
    erro.status = 503
    const { codigo, corpo } = responder(erro)
    expect(codigo).toBe(500)
    expect(corpo.message).toBe(MENSAGEM_GENERICA)
  })

  it('falha inesperada vira 500 sem detalhe nenhum', () => {
    const { codigo, corpo } = responder(new Error('connect ECONNREFUSED 127.0.0.1:3306'))
    expect(codigo).toBe(500)
    expect(corpo).toEqual({ success: false, message: MENSAGEM_GENERICA })
  })

  it('nunca devolve pilha de chamadas', () => {
    const erro = new Error('quebrou')
    erro.stack = 'Error: quebrou\n    at Object.<anonymous> (/app/src/controllers/x.js:10:15)'
    const texto = JSON.stringify(responder(erro).corpo)
    expect(texto).not.toMatch(/\bat \b/)
    expect(texto).not.toMatch(/\.js:\d+/)
  })
})

describe('log do servidor', () => {
  it('guarda o erro inteiro, com a rota que falhou', () => {
    responder(new Error('ECONNREFUSED'), { method: 'POST', originalUrl: '/api/produtos' })
    const registrado = logDoServidor.mock.calls.flat().map(String).join(' ')
    expect(registrado).toMatch('POST /api/produtos')
    expect(registrado).toMatch('ECONNREFUSED')
  })

  it('também registra erro de biblioteca cuja mensagem foi escondida', () => {
    const erro = new Error('detalhe interno')
    erro.status = 400
    responder(erro)
    expect(logDoServidor).toHaveBeenCalled()
  })

  it('não polui o log com erro de validação, que é culpa do preenchimento', () => {
    responder(new ZodError([{ code: 'custom', path: ['nome'], message: 'Obrigatório' }]))
    expect(logDoServidor).not.toHaveBeenCalled()
  })
})
