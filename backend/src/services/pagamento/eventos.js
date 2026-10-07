// Tipos de evento de assinatura, iguais para qualquer gateway. O provedor
// traduz o que o gateway manda para um destes; o serviço de assinaturas só
// conhece estes.
export const EVENTOS = Object.freeze({
  ATIVADA: 'ATIVADA', // primeiro pagamento confirmado
  RENOVADA: 'RENOVADA', // cobrança do ciclo paga
  FALHOU: 'FALHOU', // cobrança do ciclo recusada
  CANCELADA: 'CANCELADA', // cancelada no gateway (pelo cliente, por nós ou por falta de pagamento)
  IGNORADO: 'IGNORADO', // evento que não muda assinatura
});
