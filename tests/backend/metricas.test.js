import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../backend/src/config/prisma.js', () => ({
  default: {
    empreendedor: { findUnique: vi.fn() },
    produto: { findFirst: vi.fn(), findMany: vi.fn() },
    metricaDiaria: { upsert: vi.fn(), findMany: vi.fn() },
  },
}))

const { default: prisma } = await import('../../backend/src/config/prisma.js')
const metricas = await import('../../backend/src/services/metricas.js')
const { embaralhar } = await import('../../backend/src/controllers/empreendedorController.js')
const { TIPOS } = metricas

/** Requisição de um visitante (IP e navegador definem a marca anônima) */
const visitante = (ip = '200.1.1.1', usuario = null) => ({ ip, headers: { 'user-agent': 'Navegador' }, usuario })
const NEGOCIO = { id: 7, ativo: true, usuarioId: 70 }

beforeEach(() => {
  vi.clearAllMocks()
  metricas.esquecerVisitantes()
  prisma.empreendedor.findUnique.mockResolvedValue(NEGOCIO)
  prisma.metricaDiaria.upsert.mockResolvedValue({})
})

describe('diaLocal', () => {
  it('usa o dia de Rondonópolis (UTC-4), não o de Greenwich', () => {
    // 02h UTC do dia 8 ainda é 22h do dia 7 em Rondonópolis
    expect(metricas.diaLocal(new Date('2026-10-08T02:00:00Z')).toISOString()).toBe('2026-10-07T00:00:00.000Z')
    expect(metricas.diaLocal(new Date('2026-10-08T05:00:00Z')).toISOString()).toBe('2026-10-08T00:00:00.000Z')
  })
})

describe('primeiraVez (contra contagem inflada)', () => {
  it('o mesmo visitante conta uma vez por evento na janela de 30 minutos', () => {
    const agora = Date.now()
    expect(metricas.primeiraVez(visitante(), 'x', agora)).toBe(true)
    expect(metricas.primeiraVez(visitante(), 'x', agora + 1000)).toBe(false)
    expect(metricas.primeiraVez(visitante(), 'x', agora + metricas.JANELA_MS + 1)).toBe(true)
  })

  it('visitantes diferentes e eventos diferentes contam separados', () => {
    expect(metricas.primeiraVez(visitante('1.1.1.1'), 'x')).toBe(true)
    expect(metricas.primeiraVez(visitante('2.2.2.2'), 'x')).toBe(true)
    expect(metricas.primeiraVez(visitante('1.1.1.1'), 'y')).toBe(true)
  })

  it('trocar o X-Forwarded-For não cria um "visitante novo" (vale o req.ip)', () => {
    const req = (forjado) => ({ ip: '9.9.9.9', headers: { 'x-forwarded-for': forjado, 'user-agent': 'N' } })
    expect(metricas.primeiraVez(req('1.1.1.1'), 'z')).toBe(true)
    expect(metricas.primeiraVez(req('5.5.5.5'), 'z')).toBe(false)
  })
})

describe('registrarEvento', () => {
  it('conta visualização de visitante, somando no dia', async () => {
    expect(await metricas.registrarEvento(visitante(), { empreendedorId: 7, tipo: TIPOS.VISUALIZACAO_PERFIL })).toBe(true)
    const chamada = prisma.metricaDiaria.upsert.mock.calls[0][0]
    expect(chamada.where.empreendedorId_dia_tipo_referenciaId).toMatchObject({ empreendedorId: 7, tipo: 'VISUALIZACAO_PERFIL', referenciaId: 0 })
    expect(chamada.update).toEqual({ quantidade: { increment: 1 } })
    expect(chamada.create.quantidade).toBe(1)
  })

  it('não conta o dono do negócio nem a administração', async () => {
    expect(await metricas.registrarEvento(visitante('1.1.1.1', { id: 70, perfil: 'EMPREENDEDOR' }), { empreendedorId: 7, tipo: TIPOS.CLIQUE_WHATSAPP })).toBe(false)
    expect(await metricas.registrarEvento(visitante('1.1.1.1', { id: 1, perfil: 'ADMIN' }), { empreendedorId: 7, tipo: TIPOS.CLIQUE_WHATSAPP })).toBe(false)
    expect(prisma.metricaDiaria.upsert).not.toHaveBeenCalled()
  })

  it('não conta negócio inativo ou inexistente', async () => {
    prisma.empreendedor.findUnique.mockResolvedValueOnce({ ...NEGOCIO, ativo: false })
    expect(await metricas.registrarEvento(visitante(), { empreendedorId: 7, tipo: TIPOS.VISUALIZACAO_PERFIL })).toBe(false)
    prisma.empreendedor.findUnique.mockResolvedValueOnce(null)
    expect(await metricas.registrarEvento(visitante(), { empreendedorId: 8, tipo: TIPOS.VISUALIZACAO_PERFIL })).toBe(false)
  })

  it('visualização de produto só conta se o produto for daquele negócio', async () => {
    prisma.produto.findFirst.mockResolvedValueOnce(null)
    expect(await metricas.registrarEvento(visitante(), { empreendedorId: 7, tipo: TIPOS.VISUALIZACAO_PRODUTO, produtoId: 99 })).toBe(false)
    prisma.produto.findFirst.mockResolvedValueOnce({ id: 5 })
    expect(await metricas.registrarEvento(visitante(), { empreendedorId: 7, tipo: TIPOS.VISUALIZACAO_PRODUTO, produtoId: 5 })).toBe(true)
    expect(prisma.produto.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 5, empreendedorId: 7 } }))
    expect(prisma.metricaDiaria.upsert.mock.calls[0][0].create.referenciaId).toBe(5)
  })

  it('o site não registra impressão em destaque (é contada pelo servidor)', async () => {
    expect(metricas.TIPOS_PUBLICOS).not.toContain(TIPOS.IMPRESSAO_DESTAQUE)
    expect(await metricas.registrarEvento(visitante(), { empreendedorId: 7, tipo: TIPOS.IMPRESSAO_DESTAQUE })).toBe(false)
  })
})

describe('registrarImpressoes', () => {
  it('conta uma impressão por negócio mostrado, uma vez por visitante', async () => {
    await metricas.registrarImpressoes(visitante(), [1, 2])
    await metricas.registrarImpressoes(visitante(), [1, 2])
    expect(prisma.metricaDiaria.upsert).toHaveBeenCalledTimes(2)
  })

  it('erro ao gravar não derruba a seção de destaques', async () => {
    prisma.metricaDiaria.upsert.mockRejectedValueOnce(new Error('banco fora'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(metricas.registrarImpressoes(visitante(), [1])).resolves.toBeUndefined()
  })
})

describe('resumoDesempenho', () => {
  const hoje = metricas.diaLocal()
  const linhas = [
    { dia: hoje, tipo: TIPOS.VISUALIZACAO_PERFIL, referenciaId: 0, quantidade: 10 },
    { dia: hoje, tipo: TIPOS.CLIQUE_WHATSAPP, referenciaId: 0, quantidade: 3 },
    { dia: hoje, tipo: TIPOS.CLIQUE_ENDERECO, referenciaId: 0, quantidade: 1 },
    { dia: hoje, tipo: TIPOS.VISUALIZACAO_PRODUTO, referenciaId: 5, quantidade: 4 },
    { dia: hoje, tipo: TIPOS.VISUALIZACAO_PRODUTO, referenciaId: 6, quantidade: 9 },
  ]

  it('básico (Essencial): só os totais, com as interações somadas', async () => {
    prisma.metricaDiaria.findMany.mockResolvedValueOnce(linhas)
    const resumo = await metricas.resumoDesempenho(7, { dias: 30 })
    expect(resumo.totais).toMatchObject({ VISUALIZACAO_PERFIL: 10, CLIQUE_WHATSAPP: 3, INTERACOES: 4, VISUALIZACAO_PRODUTO: 13 })
    expect(resumo).not.toHaveProperty('serie')
    expect(resumo.periodo.dias).toBe(30)
  })

  it('ampliado (Destaque): série com todos os dias e produtos mais vistos em ordem', async () => {
    prisma.metricaDiaria.findMany.mockResolvedValueOnce(linhas)
    prisma.produto.findMany.mockResolvedValueOnce([{ id: 5, nome: 'Bolo' }, { id: 6, nome: 'Pão' }])
    const resumo = await metricas.resumoDesempenho(7, { dias: 7, ampliado: true })
    expect(resumo.serie).toHaveLength(7)
    expect(resumo.serie.at(-1)).toMatchObject({ dia: hoje.toISOString().slice(0, 10), VISUALIZACAO_PERFIL: 10 })
    expect(resumo.produtosMaisVistos.map((p) => p.nome)).toEqual(['Pão', 'Bolo'])
    // Só produtos do próprio negócio entram
    expect(prisma.produto.findMany.mock.calls[0][0].where.empreendedorId).toBe(7)
  })
})

describe('embaralhar (rodízio da seção de destaques)', () => {
  it('mantém todos os negócios, só muda a ordem', () => {
    const lista = [1, 2, 3, 4, 5]
    const resultado = embaralhar(lista, () => 0)
    expect([...resultado].sort()).toEqual(lista)
    expect(resultado).not.toEqual(lista)
    expect(lista).toEqual([1, 2, 3, 4, 5]) // não mexe na original
  })
})
