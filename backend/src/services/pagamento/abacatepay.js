// Provedor AbacatePay (API v2). Documentação: https://docs.abacatepay.com
//
// Como a assinatura funciona lá:
//   produto com cycle MONTHLY -> POST /subscriptions/create devolve um
//   checkout (bill_...) -> o cliente paga -> nasce a assinatura (subs_...)
//   -> webhooks subscription.* a cada ciclo.
//
// Segurança: fora de produção só aceita chave de teste (abc_dev_...). Uma
// chave de produção cobra de verdade e só passa com
// ABACATEPAY_PERMITIR_PRODUCAO=true, ligado de propósito.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { EVENTOS } from './eventos.js';

const URL_PADRAO = 'https://api.abacatepay.com/v2';
const TEMPO_LIMITE_MS = 15_000;

// Chave pública da AbacatePay para conferir o X-Webhook-Signature (HMAC-SHA256
// do corpo cru, em base64). É pública por definição: está na documentação.
// https://docs.abacatepay.com/pages/webhooks
const CHAVE_PUBLICA_WEBHOOK =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

/** Erro do gateway: o detalhe vai para o log; o cliente recebe a mensagem genérica */
class ErroGateway extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.name = 'ErroGateway';
    this.status = 502;
    this.statusGateway = status;
  }
}

export function modoTeste() {
  return (process.env.ABACATEPAY_API_KEY || '').startsWith('abc_dev_');
}

function chave() {
  const valor = process.env.ABACATEPAY_API_KEY;
  if (!valor) throw new ErroGateway('ABACATEPAY_API_KEY não definida no .env');
  if (!modoTeste() && process.env.ABACATEPAY_PERMITIR_PRODUCAO !== 'true') {
    throw new ErroGateway(
      'Chave do AbacatePay não é de teste (abc_dev_). Para cobrar de verdade, defina ABACATEPAY_PERMITIR_PRODUCAO=true'
    );
  }
  return valor;
}

async function chamar(metodo, caminho, { corpo, query } = {}) {
  const base = (process.env.ABACATEPAY_BASE_URL || URL_PADRAO).replace(/\/$/, '');
  const url = new URL(base + caminho);
  for (const [nome, valor] of Object.entries(query || {})) {
    if (valor !== undefined && valor !== null) url.searchParams.set(nome, String(valor));
  }
  let resposta;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${chave()}`,
        Accept: 'application/json',
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch (falha) {
    if (falha instanceof ErroGateway) throw falha;
    throw new ErroGateway(`AbacatePay ${metodo} ${caminho} sem resposta: ${falha.message}`);
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok || dados?.success === false || dados?.error) {
    const motivo = typeof dados?.error === 'string' ? dados.error : JSON.stringify(dados?.error ?? null);
    throw new ErroGateway(`AbacatePay ${metodo} ${caminho} respondeu ${resposta.status}: ${motivo}`, resposta.status);
  }
  return dados?.data;
}

/** Webhooks cadastrados na conta (usado por scripts/abacatepay-webhook.js) */
export async function listarWebhooks() {
  const dados = await chamar('GET', '/webhooks/list');
  return Array.isArray(dados) ? dados : dados?.items || [];
}

/** Cadastra um webhook. O segredo volta na URL de cada aviso (?webhookSecret=) */
export function criarWebhook({ nome, endpoint, segredo, eventos }) {
  return chamar('POST', '/webhooks/create', { corpo: { name: nome, endpoint, secret: segredo, events: eventos } });
}

/** Identificador estável do plano no catálogo do gateway (muda se o preço mudar) */
function referenciaProduto(plano) {
  return `vitrinerondon-${plano.nome.toLowerCase()}-${plano.precoCentavos}`;
}

/**
 * Produto mensal correspondente ao plano. Se já existe um com a mesma
 * referência (ex.: o banco foi recriado), reaproveita em vez de duplicar.
 */
export async function garantirProduto(plano) {
  if (plano.gatewayProdutoId) return plano.gatewayProdutoId;
  const externalId = referenciaProduto(plano);
  try {
    const criado = await chamar('POST', '/products/create', {
      corpo: {
        externalId,
        name: plano.titulo,
        description: plano.chamada || undefined,
        price: plano.precoCentavos,
        currency: 'BRL',
        cycle: plano.ciclo || 'MONTHLY',
      },
    });
    return criado.id;
  } catch (erro) {
    // Referência já usada: procura o produto existente
    let depois;
    for (let pagina = 0; pagina < 10; pagina++) {
      const lista = await chamar('GET', '/products/list', { query: { limit: 100, after: depois } });
      const itens = Array.isArray(lista) ? lista : lista?.items || [];
      const achado = itens.find((p) => p.externalId === externalId);
      if (achado) return achado.id;
      depois = itens.at(-1)?.id;
      if (!depois || itens.length < 100) break;
    }
    throw erro;
  }
}

export async function criarCheckoutAssinatura({ produtoId, referencia, urlRetorno, urlConclusao }) {
  const checkout = await chamar('POST', '/subscriptions/create', {
    corpo: {
      items: [{ id: produtoId, quantity: 1 }],
      externalId: referencia,
      returnUrl: urlRetorno,
      completionUrl: urlConclusao,
      methods: ['CARD'],
    },
  });
  return { checkoutId: checkout.id, url: checkout.url };
}

/** Traduz o status de uma assinatura do gateway para o evento normalizado */
function eventoDaAssinatura(assinatura, checkoutId) {
  if (!assinatura) return null;
  const base = { checkoutId: assinatura.checkoutId || checkoutId || null, assinaturaId: assinatura.id, eventoId: null };
  if (assinatura.status === 'ACTIVE') return { ...base, tipo: EVENTOS.ATIVADA };
  if (assinatura.status === 'CANCELLED') return { ...base, tipo: EVENTOS.CANCELADA };
  return null;
}

/**
 * Conciliação: pergunta ao gateway se o checkout já virou assinatura. É o que
 * ativa a assinatura no localhost, onde o webhook (que exige HTTPS público)
 * não chega.
 */
export async function consultarPorCheckout(checkoutId) {
  if (!checkoutId) return null;
  const lista = await chamar('GET', '/subscriptions/list', { query: { checkoutId } });
  const itens = Array.isArray(lista) ? lista : lista?.items || [];
  return eventoDaAssinatura(itens[0], checkoutId);
}

export async function cancelarAssinatura(assinaturaId) {
  if (!assinaturaId) return;
  await chamar('POST', '/subscriptions/cancel', { corpo: { id: assinaturaId } });
}

function iguais(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Autenticidade do webhook, as duas checagens da documentação:
 * - o segredo cadastrado no webhook chega em ?webhookSecret= (prova a origem);
 * - o X-Webhook-Signature é o HMAC do corpo cru (prova que não foi alterado).
 */
export function webhookAutentico({ segredo, assinatura, corpoCru }) {
  const esperado = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!esperado || !iguais(segredo, esperado)) return false;
  if (!assinatura || !Buffer.isBuffer(corpoCru)) return false;
  const calculada = createHmac('sha256', CHAVE_PUBLICA_WEBHOOK).update(corpoCru).digest('base64');
  return iguais(calculada, assinatura);
}

/** Webhook v2 -> evento normalizado */
/** Eventos de assinatura do AbacatePay e o que cada um significa aqui */
export const EVENTOS_DO_WEBHOOK = Object.freeze({
  'subscription.completed': EVENTOS.ATIVADA,
  'subscription.renewed': EVENTOS.RENOVADA,
  'subscription.payment_failed': EVENTOS.FALHOU,
  'subscription.cancelled': EVENTOS.CANCELADA,
});

export function interpretarWebhook(corpo) {
  const dados = corpo?.data || {};
  const base = {
    eventoId: corpo?.id || null,
    checkoutId: dados.checkout?.id || dados.subscription?.checkoutId || null,
    assinaturaId: dados.subscription?.id || null,
  };
  return { ...base, tipo: EVENTOS_DO_WEBHOOK[corpo?.event] ?? EVENTOS.IGNORADO };
}
