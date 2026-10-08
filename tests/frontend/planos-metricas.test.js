import { describe, it, expect, vi, afterEach } from 'vitest'
import { BASE_URL, definirToken } from '../../frontend/src/services/api.js'
import { METRICAS, registrarMetrica } from '../../frontend/src/services/metricas.js'
import { STATUS_ASSINATURA, economiaAnual, equivalenteMensal, nomeDoPlano, porCiclo, precoEmReais } from '../../frontend/src/services/planos.js'

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

describe('planos anuais', () => {
  const PLANOS = [
    { nome: 'ESSENCIAL', titulo: 'VitrineRondon Essencial', precoCentavos: 5000, ciclo: 'MONTHLY', destaque: false, divulgacao: false, metricasAmpliadas: false },
    { nome: 'DESTAQUE', titulo: 'VitrineRondon Destaque', precoCentavos: 7500, ciclo: 'MONTHLY', destaque: true, divulgacao: true, metricasAmpliadas: true },
    { nome: 'ESSENCIAL_ANUAL', titulo: 'VitrineRondon Essencial Anual', precoCentavos: 50000, ciclo: 'ANNUALLY', destaque: false, divulgacao: false, metricasAmpliadas: false },
    { nome: 'DESTAQUE_ANUAL', titulo: 'VitrineRondon Destaque Anual', precoCentavos: 75000, ciclo: 'ANNUALLY', destaque: true, divulgacao: true, metricasAmpliadas: true },
  ]

  it('o nome do cartão não repete a marca nem o "Anual"', () => {
    expect(nomeDoPlano(PLANOS[3])).toBe('Destaque')
    expect(nomeDoPlano(PLANOS[0])).toBe('Essencial')
  })

  it('o anual é comparado com o mensal de mesmos recursos', () => {
    expect(equivalenteMensal(PLANOS[3], PLANOS).nome).toBe('DESTAQUE')
    expect(equivalenteMensal(PLANOS[2], PLANOS).nome).toBe('ESSENCIAL')
  })

  it('economia do anual: 12 meses do mensal menos o preço do ano, em meses de presente', () => {
    expect(economiaAnual(PLANOS[2], PLANOS)).toEqual({ centavos: 10000, meses: 2, mensalCentavos: 5000 })
    expect(economiaAnual(PLANOS[3], PLANOS)).toEqual({ centavos: 15000, meses: 2, mensalCentavos: 7500 })
  })

  it('plano mensal, ou anual sem desconto, não mostra economia', () => {
    expect(economiaAnual(PLANOS[0], PLANOS)).toBeNull()
    expect(economiaAnual({ ...PLANOS[2], precoCentavos: 60000 }, PLANOS)).toBeNull()
  })
})
