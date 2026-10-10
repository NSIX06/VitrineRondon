// Porta de entrada para o gateway de pagamento.
//
// O resto do sistema fala só com o contrato abaixo, nunca com o AbacatePay
// direto: trocar por Asaas ou Mercado Pago depois é escrever outro arquivo
// nesta pasta com as mesmas funções e apontar PAGAMENTO_PROVEDOR para ele.
//
// Contrato de um provedor:
//   garantirProduto(plano)                    -> id do produto/plano no gateway
//   criarCheckoutAssinatura({ produtoId, referencia, urlRetorno, urlConclusao })
//                                             -> { checkoutId, url }
//   consultarPorCheckout(checkoutId)          -> EVENTO normalizado ou null
//   cancelarAssinatura(assinaturaId)          -> void
//   webhookAutentico({ segredo, assinatura, corpoCru }) -> boolean
//   interpretarWebhook(corpo)                 -> EVENTO normalizado
//   modoTeste()                               -> true se a chave é de sandbox
//
// EVENTO normalizado (o mesmo para webhook, conciliação e simulação):
//   { tipo, checkoutId, assinaturaId, eventoId }
//   tipo: ATIVADA | RENOVADA | FALHOU | CANCELADA | IGNORADO
import * as abacatepay from './abacatepay.js';

export { EVENTOS } from './eventos.js';

const PROVEDORES = { abacatepay };

/** Problema de configuração do provedor atual (chave ausente etc.), ou null */
export function problemaNoPagamento() {
  try {
    return provedorPagamento().problemaNaConfiguracao?.() ?? null;
  } catch (erro) {
    return erro.message;
  }
}

/** Provedor configurado (PAGAMENTO_PROVEDOR, padrão abacatepay) */
export function provedorPagamento() {
  const nome = process.env.PAGAMENTO_PROVEDOR || 'abacatepay';
  const provedor = PROVEDORES[nome];
  if (!provedor) throw new Error(`Provedor de pagamento desconhecido: ${nome}`);
  return provedor;
}
