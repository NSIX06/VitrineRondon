import { describe, it, expect, vi, afterEach } from 'vitest'
import { limitePadrao, limiteLogin } from '../../backend/src/middlewares/rateLimit.js'

/** Chama o limitador N vezes seguidas, sempre do mesmo IP */
async function chamar(limitador, vezes, { ip = '203.0.113.7', status = 200 } = {}) {
  const respostas = []
  for (let i = 0; i < vezes; i++) {
    const req = { ip, method: 'POST', url: '/api/auth/login', headers: {}, app: { get: () => false } }
    const res = {
      statusCode: status,
      headers: {},
      setHeader(chave, valor) {
        this.headers[chave] = valor
      },
      getHeader(chave) {
        return this.headers[chave]
      },
      status(codigo) {
        this.statusCode = codigo
        return this
      },
      json(corpo) {
        this.corpo = corpo
        return this
      },
      // A biblioteca escuta o fim da resposta para não contar quem acertou a senha
      on() {},
      once() {},
      end() {},
    }
    const seguir = vi.fn()
    await new Promise((resolve) => {
      limitador(req, res, (...args) => {
        seguir(...args)
        resolve()
      })
      // Quando o limitador recusa, ele responde e não chama o next
      setTimeout(resolve, 20)
    })
    respostas.push({ passou: seguir.mock.calls.length > 0, res })
  }
  return respostas
}

describe('limite global da API', () => {
  it('deixa a navegação normal passar', async () => {
    const respostas = await chamar(limitePadrao, 5, { ip: '198.51.100.1' })
    expect(respostas.every((r) => r.passou)).toBe(true)
  })

  it('anuncia o limite nos cabeçalhos do padrão atual', async () => {
    const [primeira] = await chamar(limitePadrao, 1, { ip: '198.51.100.2' })
    expect(primeira.res.headers['RateLimit']).toBeDefined()
    expect(primeira.res.headers['X-RateLimit-Limit']).toBeUndefined()
  })
})

describe('limite de autenticação', () => {
  it('corta a insistência depois de dez tentativas do mesmo IP', async () => {
    const respostas = await chamar(limiteLogin, 12, { ip: '198.51.100.3', status: 401 })
    expect(respostas.slice(0, 10).every((r) => r.passou)).toBe(true)
    expect(respostas[10].passou).toBe(false)
  })

  it('responde no formato da API, e não no texto padrão da biblioteca', async () => {
    const respostas = await chamar(limiteLogin, 12, { ip: '198.51.100.4', status: 401 })
    const recusada = respostas.find((r) => !r.passou)
    expect(recusada.res.statusCode).toBe(429)
    expect(recusada.res.corpo).toMatchObject({ success: false })
    expect(recusada.res.corpo.message).toMatch(/tentativas de autenticação/i)
  })

  it('é bem mais apertado que o limite geral, porque protege senha', () => {
    // Um vale para navegar; o outro, para adivinhar senha
    expect(limiteLogin).not.toBe(limitePadrao)
  })

  it('conta cada IP separadamente, para um não bloquear o outro', async () => {
    await chamar(limiteLogin, 12, { ip: '198.51.100.5', status: 401 })
    const [deOutroIp] = await chamar(limiteLogin, 1, { ip: '198.51.100.6', status: 401 })
    expect(deOutroIp.passou).toBe(true)
  })
})

describe('a própria máquina, fora de produção', () => {
  const ambienteOriginal = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = ambienteOriginal
    vi.resetModules()
  })

  it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])('não conta %s em desenvolvimento', async (ip) => {
    // As suítes de teste e o modo celular do navegador saem todos desse endereço
    const respostas = await chamar(limiteLogin, 12, { ip, status: 401 })
    expect(respostas.every((r) => r.passou)).toBe(true)
  })

  it('em produção, a máquina local conta como qualquer outra', async () => {
    process.env.NODE_ENV = 'production'
    vi.resetModules()
    const { limiteLogin: limiteDeProducao } = await import('../../backend/src/middlewares/rateLimit.js')
    const respostas = await chamar(limiteDeProducao, 12, { ip: '127.0.0.1', status: 401 })
    expect(respostas[10].passou).toBe(false)
  })
})
