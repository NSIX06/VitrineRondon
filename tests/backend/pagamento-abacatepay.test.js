import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'
import * as abacatepay from '../../backend/src/services/pagamento/abacatepay.js'
import { EVENTOS } from '../../backend/src/services/pagamento/eventos.js'

// Chave pública da documentação do AbacatePay, a mesma do provedor
const CHAVE_PUBLICA =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'
const assinar = (corpo) => createHmac('sha256', CHAVE_PUBLICA).update(corpo).digest('base64')

const PLANO = { nome: 'DESTAQUE', titulo: 'VitrineRondon Destaque', chamada: 'x', precoCentavos: 7500, ciclo: 'MONTHLY', gatewayProdutoId: null }

/** fetch falso: responde em ordem, e guarda o que recebeu */
function apiFalsa(...respostas) {
  const chamada = vi.fn()
  for (const [dados, status = 200] of respostas) {
    chamada.mockResolvedValueOnce(new Response(JSON.stringify(dados), { status }))
  }
  vi.stubGlobal('fetch', chamada)
  return chamada
}

beforeEach(() => {
  vi.stubEnv('ABACATEPAY_API_KEY', 'abc_dev_chave_de_teste')
  vi.stubEnv('ABACATEPAY_WEBHOOK_SECRET', 'segredo-do-webhook')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('chave de API', () => {
  it('reconhece a chave de teste pelo prefixo abc_dev_', () => {
    expect(abacatepay.modoTeste()).toBe(true)
    vi.stubEnv('ABACATEPAY_API_KEY', 'abc_prod_qualquer')
    expect(abacatepay.modoTeste()).toBe(false)
  })

  it('recusa chave de produção sem a liberação explícita (nada é cobrado por engano)', async () => {
    vi.stubEnv('ABACATEPAY_API_KEY', 'abc_prod_qualquer')
    const chamada = apiFalsa([{ data: {} }])
    await expect(abacatepay.cancelarAssinatura('subs_1')).rejects.toThrow(/não é de teste/)
    expect(chamada).not.toHaveBeenCalled()
  })

  it('aceita chave de produção só com ABACATEPAY_PERMITIR_PRODUCAO=true', async () => {
    vi.stubEnv('ABACATEPAY_API_KEY', 'abc_prod_qualquer')
    vi.stubEnv('ABACATEPAY_PERMITIR_PRODUCAO', 'true')
    apiFalsa([{ success: true, data: { id: 'subs_1', status: 'CANCELLED' } }])
    await expect(abacatepay.cancelarAssinatura('subs_1')).resolves.toBeUndefined()
  })

  it('falha sem chave configurada, sem chamar a rede', async () => {
    vi.stubEnv('ABACATEPAY_API_KEY', '')
    const chamada = apiFalsa([{ data: {} }])
    await expect(abacatepay.consultarPorCheckout('bill_1')).rejects.toThrow(/ABACATEPAY_API_KEY/)
    expect(chamada).not.toHaveBeenCalled()
  })
})

describe('garantirProduto', () => {
  it('reaproveita o produto já ligado ao plano, sem chamar o gateway', async () => {
    const chamada = apiFalsa()
    expect(await abacatepay.garantirProduto({ ...PLANO, gatewayProdutoId: 'prod_ja' })).toBe('prod_ja')
    expect(chamada).not.toHaveBeenCalled()
  })

  it('cria produto mensal em centavos, com referência estável', async () => {
    const chamada = apiFalsa([{ success: true, data: { id: 'prod_novo' } }])
    expect(await abacatepay.garantirProduto(PLANO)).toBe('prod_novo')
    const [url, opcoes] = chamada.mock.calls[0]
    expect(String(url)).toBe('https://api.abacatepay.com/v2/products/create')
    expect(opcoes.headers.Authorization).toBe('Bearer abc_dev_chave_de_teste')
    expect(JSON.parse(opcoes.body)).toMatchObject({
      externalId: 'vitrinerondon-destaque-7500',
      price: 7500,
      currency: 'BRL',
      cycle: 'MONTHLY',
    })
  })

  it('se a referência já existe no gateway (banco recriado), acha o produto em vez de duplicar', async () => {
    apiFalsa(
      [{ success: false, error: 'externalId already exists' }, 400],
      [{ success: true, data: [{ id: 'prod_outro', externalId: 'x' }, { id: 'prod_antigo', externalId: 'vitrinerondon-destaque-7500' }] }]
    )
    expect(await abacatepay.garantirProduto(PLANO)).toBe('prod_antigo')
  })
})

describe('criarCheckoutAssinatura', () => {
  it('pede um checkout de assinatura com um item, cartão e as URLs de volta', async () => {
    const chamada = apiFalsa([{ success: true, data: { id: 'bill_1', url: 'https://app.abacatepay.com/pay/bill_1' } }])
    const checkout = await abacatepay.criarCheckoutAssinatura({
      produtoId: 'prod_1',
      referencia: 'assinatura-9',
      urlRetorno: 'http://site/planos',
      urlConclusao: 'http://site/meu-negocio',
    })
    expect(checkout).toEqual({ checkoutId: 'bill_1', url: 'https://app.abacatepay.com/pay/bill_1' })
    const [url, opcoes] = chamada.mock.calls[0]
    expect(String(url)).toBe('https://api.abacatepay.com/v2/subscriptions/create')
    expect(JSON.parse(opcoes.body)).toEqual({
      items: [{ id: 'prod_1', quantity: 1 }],
      externalId: 'assinatura-9',
      returnUrl: 'http://site/planos',
      completionUrl: 'http://site/meu-negocio',
      methods: ['CARD'],
    })
  })

  it('erro do gateway vira ErroGateway com status 502 (mensagem genérica para o cliente)', async () => {
    apiFalsa([{ success: false, error: 'Insufficient permissions' }, 401])
    const erro = await abacatepay.criarCheckoutAssinatura({ produtoId: 'p' }).catch((e) => e)
    expect(erro.name).toBe('ErroGateway')
    expect(erro.status).toBe(502)
    expect(erro.publico).toBeUndefined()
  })
})

describe('consultarPorCheckout (conciliação)', () => {
  it('assinatura ACTIVE vira evento ATIVADA com o id subs_', async () => {
    const chamada = apiFalsa([{ success: true, data: [{ id: 'subs_1', status: 'ACTIVE', checkoutId: 'bill_1' }] }])
    expect(await abacatepay.consultarPorCheckout('bill_1')).toMatchObject({
      tipo: EVENTOS.ATIVADA,
      assinaturaId: 'subs_1',
      checkoutId: 'bill_1',
    })
    expect(String(chamada.mock.calls[0][0])).toContain('/subscriptions/list?checkoutId=bill_1')
  })

  it('checkout ainda não pago (lista vazia) não gera evento', async () => {
    apiFalsa([{ success: true, data: [] }])
    expect(await abacatepay.consultarPorCheckout('bill_1')).toBeNull()
  })

  it('assinatura CANCELLED vira evento CANCELADA', async () => {
    apiFalsa([{ success: true, data: [{ id: 'subs_1', status: 'CANCELLED' }] }])
    expect((await abacatepay.consultarPorCheckout('bill_1')).tipo).toBe(EVENTOS.CANCELADA)
  })
})

describe('webhookAutentico', () => {
  const corpo = Buffer.from(JSON.stringify({ id: 'log_1', event: 'subscription.completed' }))

  it('aceita segredo certo e HMAC do corpo cru', () => {
    expect(abacatepay.webhookAutentico({ segredo: 'segredo-do-webhook', assinatura: assinar(corpo), corpoCru: corpo })).toBe(true)
  })

  it.each([
    ['segredo errado', { segredo: 'outro' }],
    ['sem segredo', { segredo: undefined }],
    ['sem assinatura', { assinatura: undefined }],
    ['assinatura de outro corpo', { assinatura: assinar(Buffer.from('{}')) }],
    ['corpo já convertido em objeto', { corpoCru: { id: 'log_1' } }],
  ])('recusa %s', (_, troca) => {
    const base = { segredo: 'segredo-do-webhook', assinatura: assinar(corpo), corpoCru: corpo }
    expect(abacatepay.webhookAutentico({ ...base, ...troca })).toBe(false)
  })

  it('recusa tudo se o segredo não estiver configurado no servidor', () => {
    vi.stubEnv('ABACATEPAY_WEBHOOK_SECRET', '')
    expect(abacatepay.webhookAutentico({ segredo: '', assinatura: assinar(corpo), corpoCru: corpo })).toBe(false)
  })
})

describe('interpretarWebhook', () => {
  const evento = (event, data = {}) => ({ id: 'log_9', event, data })

  it.each([
    ['subscription.completed', EVENTOS.ATIVADA],
    ['subscription.renewed', EVENTOS.RENOVADA],
    ['subscription.payment_failed', EVENTOS.FALHOU],
    ['subscription.cancelled', EVENTOS.CANCELADA],
    ['checkout.completed', EVENTOS.IGNORADO],
    ['payout.completed', EVENTOS.IGNORADO],
  ])('%s -> %s', (nome, tipo) => {
    expect(abacatepay.interpretarWebhook(evento(nome)).tipo).toBe(tipo)
  })

  it('leva os ids do gateway para achar a assinatura local', () => {
    const lido = abacatepay.interpretarWebhook(
      evento('subscription.completed', { subscription: { id: 'subs_1' }, checkout: { id: 'bill_1' } })
    )
    expect(lido).toEqual({ tipo: EVENTOS.ATIVADA, eventoId: 'log_9', assinaturaId: 'subs_1', checkoutId: 'bill_1' })
  })
})
