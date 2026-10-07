import { describe, it, expect, vi, afterEach } from 'vitest'
import { BASE_URL, definirToken } from '../../frontend/src/services/api.js'
import { METRICAS, registrarMetrica } from '../../frontend/src/services/metricas.js'
import { STATUS_ASSINATURA, porCiclo, precoEmReais } from '../../frontend/src/services/planos.js'

/** localStorage de mentira, já que o teste não roda no navegador */
function armazenamentoFalso() {
  const dados = new Map()
  return {
    getItem: (c) => (dados.has(c) ? dados.get(c) : null),
    setItem: (c, v) => dados.set(c, String(v)),
    removeItem: (c) => dados.delete(c),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('planos', () => {
  it('preço vem em centavos e sai em reais', () => {
    expect(precoEmReais(5000).replace(/\s/g, ' ')).toBe('R$ 50,00')
    expect(precoEmReais(7500).replace(/\s/g, ' ')).toBe('R$ 75,00')
  })

  it('ciclo do gateway vira texto em português', () => {
    expect(porCiclo('MONTHLY')).toBe('por mês')
    expect(porCiclo('ANNUALLY')).toBe('por ano')
    expect(porCiclo(undefined)).toBe('por mês')
  })

  it('cada status da assinatura tem rótulo e etiqueta', () => {
    for (const status of ['PENDENTE', 'ATIVA', 'INADIMPLENTE', 'CANCELADA']) {
      expect(STATUS_ASSINATURA[status]).toEqual({ rotulo: expect.any(String), variante: expect.any(String) })
    }
  })
})

describe('registrarMetrica', () => {
  it('envia o evento com keepalive (o clique pode sair da página) e sem esperar resposta', () => {
    vi.stubGlobal('localStorage', armazenamentoFalso())
    const chamada = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', chamada)

    registrarMetrica(7, METRICAS.CLIQUE_WHATSAPP)

    const [url, opcoes] = chamada.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/metricas`)
    expect(opcoes.keepalive).toBe(true)
    expect(JSON.parse(opcoes.body)).toEqual({ empreendedorId: 7, tipo: 'CLIQUE_WHATSAPP' })
    expect(opcoes.headers).not.toHaveProperty('Authorization')
  })

  it('manda o token quando há sessão, para o servidor não contar o próprio dono', () => {
    vi.stubGlobal('localStorage', armazenamentoFalso())
    definirToken('token-do-dono')
    const chamada = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', chamada)

    registrarMetrica(7, METRICAS.VISUALIZACAO_PRODUTO, 5)

    const [, opcoes] = chamada.mock.calls[0]
    expect(opcoes.headers.Authorization).toBe('Bearer token-do-dono')
    expect(JSON.parse(opcoes.body).produtoId).toBe(5)
    definirToken(null)
  })

  it('falha de rede nunca vira erro na página', async () => {
    vi.stubGlobal('localStorage', armazenamentoFalso())
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')))
    expect(() => registrarMetrica(7, METRICAS.VISUALIZACAO_PERFIL)).not.toThrow()
    await new Promise((r) => setTimeout(r, 0))
  })

  it('sem negócio ou sem tipo, não envia nada', () => {
    const chamada = vi.fn()
    vi.stubGlobal('fetch', chamada)
    registrarMetrica(null, METRICAS.VISUALIZACAO_PERFIL)
    registrarMetrica(7, undefined)
    expect(chamada).not.toHaveBeenCalled()
  })
})
