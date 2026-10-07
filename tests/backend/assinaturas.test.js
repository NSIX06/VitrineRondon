import { describe, it, expect, vi, beforeEach } from 'vitest'

// Banco em memória com só o que o serviço de assinaturas consulta. Assim a
// máquina de estados é testada de ponta a ponta, sem MySQL e sem gateway.
const banco = vi.hoisted(() => {
  const estado = { planos: [], assinaturas: [], negocios: [], proximoId: 1 }

  const casa = (registro, where = {}) =>
    Object.entries(where).every(([campo, esperado]) => {
      const valor = registro[campo]
      if (esperado && typeof esperado === 'object' && !(esperado instanceof Date)) {
        if ('not' in esperado) return esperado.not === null ? valor != null : valor !== esperado.not
        if ('in' in esperado) return esperado.in.includes(valor)
      }
      return valor === esperado
    })
  const comPlano = (a, include) => (a && include?.plano ? { ...a, plano: estado.planos.find((p) => p.id === a.planoId) } : a)
  const ordenar = (lista, orderBy) => {
    if (!orderBy) return lista
    const [[campo, direcao]] = Object.entries(orderBy)
    return [...lista].sort((x, y) => ((x[campo] ?? 0) > (y[campo] ?? 0) ? 1 : -1) * (direcao === 'desc' ? -1 : 1))
  }

  const cliente = {
    plano: {
      findFirst: async ({ where }) => estado.planos.find((p) => casa(p, where)) ?? null,
      findMany: async ({ where }) => estado.planos.filter((p) => casa(p, where)),
      update: async ({ where, data }) => Object.assign(estado.planos.find((p) => p.id === where.id), data),
    },
    assinatura: {
      findUnique: async ({ where, include }) => comPlano(estado.assinaturas.find((a) => casa(a, where)) ?? null, include),
      findFirst: async ({ where, include, orderBy }) =>
        comPlano(ordenar(estado.assinaturas.filter((a) => casa(a, where)), orderBy)[0] ?? null, include),
      findMany: async ({ where, include }) => estado.assinaturas.filter((a) => casa(a, where)).map((a) => comPlano(a, include)),
      create: async ({ data }) => {
        const nova = { id: estado.proximoId++, criadoEm: new Date(Date.now() + estado.proximoId), inicioEm: null, gatewayAssinaturaId: null, gatewayCheckoutId: null, canceladaEm: null, ...data }
        estado.assinaturas.push(nova)
        return { ...nova }
      },
      update: async ({ where, data, include }) => comPlano(Object.assign(estado.assinaturas.find((a) => a.id === where.id), data), include),
      updateMany: async ({ where, data }) => {
        const alvo = estado.assinaturas.filter((a) => casa(a, where))
        alvo.forEach((a) => Object.assign(a, data))
        return { count: alvo.length }
      },
    },
    empreendedor: {
      findUnique: async ({ where }) => estado.negocios.find((n) => casa(n, where)) ?? null,
      update: async ({ where, data }) => Object.assign(estado.negocios.find((n) => n.id === where.id), data),
    },
  }
  cliente.$transaction = async (fn) => fn(cliente)
  return { estado, cliente }
})

const provedor = vi.hoisted(() => ({
  garantirProduto: vi.fn(async () => 'prod_1'),
  criarCheckoutAssinatura: vi.fn(async ({ referencia }) => ({ checkoutId: `bill_${referencia}`, url: `https://pay/${referencia}` })),
  consultarPorCheckout: vi.fn(async () => null),
  cancelarAssinatura: vi.fn(async () => {}),
  modoTeste: () => true,
}))

vi.mock('../../backend/src/config/prisma.js', () => ({ default: banco.cliente }))
vi.mock('../../backend/src/services/auditoria.js', () => ({ registrarLog: vi.fn() }))
vi.mock('../../backend/src/services/pagamento/index.js', async () => ({
  EVENTOS: (await import('../../backend/src/services/pagamento/eventos.js')).EVENTOS,
  provedorPagamento: () => provedor,
}))

const servico = await import('../../backend/src/services/assinaturas.js')
const { EVENTOS } = await import('../../backend/src/services/pagamento/eventos.js')
const { registrarLog } = await import('../../backend/src/services/auditoria.js')
const { STATUS } = servico
const REQ = { headers: {}, socket: {} }

const ESSENCIAL = { id: 1, nome: 'ESSENCIAL', titulo: 'Essencial', precoCentavos: 5000, ciclo: 'MONTHLY', destaque: false, ativo: true, gatewayProdutoId: null }
const DESTAQUE = { id: 2, nome: 'DESTAQUE', titulo: 'Destaque', precoCentavos: 7500, ciclo: 'MONTHLY', destaque: true, ativo: true, gatewayProdutoId: null }

beforeEach(() => {
  banco.estado.planos = [{ ...ESSENCIAL }, { ...DESTAQUE }]
  banco.estado.assinaturas = []
  banco.estado.negocios = [{ id: 10, usuarioId: 100, nomeNegocio: 'Silva', planoAtual: 'NENHUM', emDestaque: false }]
  banco.estado.proximoId = 1
  vi.clearAllMocks()
})

const negocio = () => banco.estado.negocios[0]
const assinatura = (id) => banco.estado.assinaturas.find((a) => a.id === id)
/** Assina um plano e confirma o pagamento, como no fluxo real */
async function assinarEPagar(nomePlano, assinaturaId = `subs_${nomePlano}`) {
  const nova = await servico.iniciarAssinatura(REQ, 10, nomePlano)
  await servico.aplicarEvento(REQ, { tipo: EVENTOS.ATIVADA, checkoutId: nova.gatewayCheckoutId, assinaturaId }, 'TESTE')
  return assinatura(nova.id)
}

describe('proximaCobrancaApos', () => {
  it('mensal: mesmo dia do mês seguinte', () => {
    expect(servico.proximaCobrancaApos(new Date(2026, 9, 7), 'MONTHLY')).toEqual(new Date(2026, 10, 7))
  })

  it('31 de janeiro + 1 mês fica no fim de fevereiro, sem pular para março', () => {
    expect(servico.proximaCobrancaApos(new Date(2026, 0, 31), 'MONTHLY')).toEqual(new Date(2026, 1, 28))
  })

  it('outros ciclos: semanal, trimestral e anual', () => {
    expect(servico.proximaCobrancaApos(new Date(2026, 0, 1), 'WEEKLY')).toEqual(new Date(2026, 0, 8))
    expect(servico.proximaCobrancaApos(new Date(2026, 0, 1), 'QUARTERLY')).toEqual(new Date(2026, 3, 1))
    expect(servico.proximaCobrancaApos(new Date(2026, 0, 1), 'ANNUALLY')).toEqual(new Date(2027, 0, 1))
  })
})

describe('iniciarAssinatura', () => {
  it('cria a assinatura PENDENTE com o checkout do gateway e liga o produto ao plano', async () => {
    const nova = await servico.iniciarAssinatura(REQ, 10, 'destaque')
    expect(nova).toMatchObject({ status: STATUS.PENDENTE, gatewayCheckoutId: `bill_assinatura-${nova.id}` })
    expect(nova.checkoutUrl).toMatch(/^https:\/\/pay\//)
    expect(banco.estado.planos[1].gatewayProdutoId).toBe('prod_1')
    // Pendente ainda não dá benefício nenhum
    expect(negocio()).toMatchObject({ planoAtual: 'NENHUM', emDestaque: false })
  })

  it('recusa plano que não existe ou está desativado', async () => {
    await expect(servico.iniciarAssinatura(REQ, 10, 'OURO')).rejects.toMatchObject({ status: 400 })
    banco.estado.planos[1].ativo = false
    await expect(servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')).rejects.toMatchObject({ status: 400 })
  })

  it('recusa assinar de novo o plano que já está ativo', async () => {
    await assinarEPagar('DESTAQUE')
    await expect(servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')).rejects.toMatchObject({ status: 409 })
  })

  it('só um checkout em andamento: o anterior não pago é cancelado', async () => {
    const primeira = await servico.iniciarAssinatura(REQ, 10, 'ESSENCIAL')
    await servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')
    expect(assinatura(primeira.id).status).toBe(STATUS.CANCELADA)
  })

  it('se o gateway falha, não sobra assinatura pendente solta', async () => {
    provedor.criarCheckoutAssinatura.mockRejectedValueOnce(new Error('gateway fora do ar'))
    await expect(servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')).rejects.toThrow('gateway fora do ar')
    expect(banco.estado.assinaturas.every((a) => a.status === STATUS.CANCELADA)).toBe(true)
  })
})

describe('aplicarEvento: a máquina de estados', () => {
  it('pagamento aprovado ativa, liga o destaque e calcula a próxima cobrança', async () => {
    const ativa = await assinarEPagar('DESTAQUE')
    expect(ativa).toMatchObject({ status: STATUS.ATIVA, gatewayAssinaturaId: 'subs_DESTAQUE' })
    expect(ativa.inicioEm).toBeInstanceOf(Date)
    expect(ativa.proximaCobranca > ativa.inicioEm).toBe(true)
    expect(negocio()).toMatchObject({ planoAtual: 'DESTAQUE', emDestaque: true })
    expect(registrarLog).toHaveBeenCalledWith(REQ, expect.objectContaining({ tipoEntidade: 'Assinatura' }))
  })

  it('Essencial ativa o plano, mas não liga o destaque', async () => {
    await assinarEPagar('ESSENCIAL')
    expect(negocio()).toMatchObject({ planoAtual: 'ESSENCIAL', emDestaque: false })
  })

  it('o mesmo evento repetido (o gateway reenvia) não muda nada de novo', async () => {
    const ativa = await assinarEPagar('DESTAQUE')
    const repetido = await servico.aplicarEvento(REQ, { tipo: EVENTOS.ATIVADA, assinaturaId: 'subs_DESTAQUE' }, 'TESTE')
    expect(repetido.mudou).toBe(false)
    expect(assinatura(ativa.id).status).toBe(STATUS.ATIVA)
  })

  it('cobrança recusada: INADIMPLENTE e o destaque sai (o negócio segue na vitrine)', async () => {
    const ativa = await assinarEPagar('DESTAQUE')
    await servico.aplicarEvento(REQ, { tipo: EVENTOS.FALHOU, assinaturaId: 'subs_DESTAQUE' }, 'TESTE')
    expect(assinatura(ativa.id).status).toBe(STATUS.INADIMPLENTE)
    expect(negocio()).toMatchObject({ planoAtual: 'NENHUM', emDestaque: false })
  })

  it('renovação paga depois da falha volta a ATIVA com o destaque', async () => {
    const ativa = await assinarEPagar('DESTAQUE')
    await servico.aplicarEvento(REQ, { tipo: EVENTOS.FALHOU, assinaturaId: 'subs_DESTAQUE' }, 'TESTE')
    await servico.aplicarEvento(REQ, { tipo: EVENTOS.RENOVADA, assinaturaId: 'subs_DESTAQUE' }, 'TESTE')
    expect(assinatura(ativa.id).status).toBe(STATUS.ATIVA)
    expect(negocio().emDestaque).toBe(true)
  })

  it('cancelamento tira o plano; aviso de ativação atrasado não a ressuscita', async () => {
    const ativa = await assinarEPagar('DESTAQUE')
    await servico.aplicarEvento(REQ, { tipo: EVENTOS.CANCELADA, assinaturaId: 'subs_DESTAQUE' }, 'TESTE')
    expect(assinatura(ativa.id).status).toBe(STATUS.CANCELADA)
    expect(negocio()).toMatchObject({ planoAtual: 'NENHUM', emDestaque: false })
    await servico.aplicarEvento(REQ, { tipo: EVENTOS.ATIVADA, assinaturaId: 'subs_DESTAQUE' }, 'TESTE')
    expect(assinatura(ativa.id).status).toBe(STATUS.CANCELADA)
  })

  it('checkout abandonado e pago mesmo assim é ativado: quem pagou recebe o plano', async () => {
    const abandonada = await servico.iniciarAssinatura(REQ, 10, 'ESSENCIAL')
    await servico.iniciarAssinatura(REQ, 10, 'DESTAQUE') // cancela a primeira, ainda não paga
    await servico.aplicarEvento(REQ, { tipo: EVENTOS.ATIVADA, checkoutId: abandonada.gatewayCheckoutId, assinaturaId: 'subs_x' }, 'TESTE')
    expect(assinatura(abandonada.id).status).toBe(STATUS.ATIVA)
  })

  it('evento de assinatura que não é nossa, ou que não muda assinatura, é ignorado', async () => {
    expect(await servico.aplicarEvento(REQ, { tipo: EVENTOS.ATIVADA, assinaturaId: 'subs_de_outro' }, 'TESTE')).toBeNull()
    expect(await servico.aplicarEvento(REQ, { tipo: EVENTOS.IGNORADO }, 'TESTE')).toBeNull()
  })
})

describe('troca de plano', () => {
  it('Essencial -> Destaque: o novo pago substitui o antigo, que é cancelado no gateway', async () => {
    const essencial = await assinarEPagar('ESSENCIAL')
    const nova = await servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')
    // Até pagar o novo, o plano atual continua valendo
    expect(negocio()).toMatchObject({ planoAtual: 'ESSENCIAL', emDestaque: false })
    expect(await servico.trocaPendente(10)).toMatchObject({ id: nova.id, status: STATUS.PENDENTE })

    await servico.aplicarEvento(REQ, { tipo: EVENTOS.ATIVADA, checkoutId: nova.gatewayCheckoutId, assinaturaId: 'subs_novo' }, 'TESTE')
    expect(assinatura(essencial.id).status).toBe(STATUS.CANCELADA)
    expect(assinatura(nova.id).status).toBe(STATUS.ATIVA)
    expect(provedor.cancelarAssinatura).toHaveBeenCalledWith('subs_ESSENCIAL')
    expect(negocio()).toMatchObject({ planoAtual: 'DESTAQUE', emDestaque: true })
  })

  it('Destaque -> Essencial: o destaque sai assim que o Essencial é pago', async () => {
    await assinarEPagar('DESTAQUE')
    await assinarEPagar('ESSENCIAL', 'subs_essencial_2')
    expect(negocio()).toMatchObject({ planoAtual: 'ESSENCIAL', emDestaque: false })
    expect(banco.estado.assinaturas.filter((a) => a.status === STATUS.ATIVA)).toHaveLength(1)
  })

  it('falha ao cancelar a antiga no gateway não desfaz a troca (fica no log)', async () => {
    await assinarEPagar('ESSENCIAL')
    provedor.cancelarAssinatura.mockRejectedValueOnce(new Error('gateway fora do ar'))
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    await assinarEPagar('DESTAQUE')
    expect(negocio().planoAtual).toBe('DESTAQUE')
    expect(erro).toHaveBeenCalled()
  })
})

describe('conciliação (volta do checkout no localhost)', () => {
  it('pendência paga no gateway é ativada ao abrir o painel', async () => {
    const nova = await servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')
    provedor.consultarPorCheckout.mockResolvedValueOnce({ tipo: EVENTOS.ATIVADA, checkoutId: nova.gatewayCheckoutId, assinaturaId: 'subs_c' })
    await servico.conciliarPendentes(REQ, 10)
    expect(assinatura(nova.id).status).toBe(STATUS.ATIVA)
    expect(negocio().emDestaque).toBe(true)
  })

  it('confere também o checkout de uma troca, ao lado da assinatura ativa', async () => {
    await assinarEPagar('ESSENCIAL')
    const troca = await servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')
    provedor.consultarPorCheckout.mockResolvedValueOnce({ tipo: EVENTOS.ATIVADA, checkoutId: troca.gatewayCheckoutId, assinaturaId: 'subs_t' })
    await servico.conciliarPendentes(REQ, 10)
    expect(negocio().planoAtual).toBe('DESTAQUE')
  })

  it('gateway fora do ar não quebra o painel: a pendência continua pendente', async () => {
    const nova = await servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')
    provedor.consultarPorCheckout.mockRejectedValueOnce(new Error('timeout'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(servico.conciliarPendentes(REQ, 10)).resolves.toBeUndefined()
    expect(assinatura(nova.id).status).toBe(STATUS.PENDENTE)
  })
})

describe('cancelamento pelo empreendedor', () => {
  it('cancela no gateway e tira o plano do negócio', async () => {
    const ativa = await assinarEPagar('DESTAQUE')
    await servico.cancelarAssinaturaDoNegocio(REQ, 10)
    expect(provedor.cancelarAssinatura).toHaveBeenCalledWith('subs_DESTAQUE')
    expect(assinatura(ativa.id).status).toBe(STATUS.CANCELADA)
    expect(negocio()).toMatchObject({ planoAtual: 'NENHUM', emDestaque: false })
  })

  it('checkout não pago é só abandonado, sem chamar o gateway', async () => {
    const nova = await servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')
    await servico.cancelarAssinaturaDoNegocio(REQ, 10)
    expect(assinatura(nova.id).status).toBe(STATUS.CANCELADA)
    expect(provedor.cancelarAssinatura).not.toHaveBeenCalled()
  })

  it('sem assinatura para cancelar responde 404', async () => {
    await expect(servico.cancelarAssinaturaDoNegocio(REQ, 10)).rejects.toMatchObject({ status: 404 })
  })
})

describe('negocioDoUsuario', () => {
  it('a assinatura é sempre a do negócio da conta logada', async () => {
    expect(await servico.negocioDoUsuario({ id: 100 })).toMatchObject({ id: 10 })
  })

  it('conta sem negócio não assina', async () => {
    await expect(servico.negocioDoUsuario({ id: 999 })).rejects.toMatchObject({ status: 404 })
  })
})

describe('simulação (controller)', () => {
  it('em produção a rota de simulação não existe (404), mesmo para o admin', async () => {
    const { simularAprovacao } = await import('../../backend/src/controllers/assinaturaController.js')
    vi.stubEnv('NODE_ENV', 'production')
    const next = vi.fn()
    await simularAprovacao({ params: { id: '1' }, usuario: { perfil: 'ADMIN' } }, { json: vi.fn() }, next)
    expect(next.mock.calls[0][0]).toMatchObject({ status: 404 })
    vi.unstubAllEnvs()
  })

  it('fora de produção aplica o mesmo tratamento do webhook', async () => {
    const { simularAprovacao } = await import('../../backend/src/controllers/assinaturaController.js')
    const nova = await servico.iniciarAssinatura(REQ, 10, 'DESTAQUE')
    const res = { json: vi.fn() }
    await simularAprovacao({ ...REQ, params: { id: String(nova.id) } }, res, vi.fn())
    expect(res.json.mock.calls[0][0].data.status).toBe(STATUS.ATIVA)
    expect(negocio().emDestaque).toBe(true)
  })
})
