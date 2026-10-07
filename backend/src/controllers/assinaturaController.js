// Controller de planos e assinaturas.
// O empreendedor só enxerga e mexe na assinatura do próprio negócio, que é
// achado pela conta logada (nunca por um id vindo da requisição).
import { z } from 'zod';
import prisma from '../config/prisma.js';
import {
  STATUS,
  aplicarEvento,
  assinaturaAtual,
  cancelarAssinaturaDoNegocio,
  conciliarPendentes,
  iniciarAssinatura,
  listarPlanos,
  negocioDoUsuario,
  trocaPendente,
} from '../services/assinaturas.js';
import { EVENTOS, provedorPagamento } from '../services/pagamento/index.js';
import { erroHttp, parseId } from '../utils/erros.js';

export const escolherPlanoSchema = z.object({
  plano: z.string({ error: 'Escolha um plano' }).trim().min(1, 'Escolha um plano').max(30),
});

const producao = () => process.env.NODE_ENV === 'production';

/** Plano como a página de planos precisa: benefícios em lista */
function formatarPlano(plano) {
  return {
    nome: plano.nome,
    titulo: plano.titulo,
    chamada: plano.chamada,
    beneficios: (plano.descricao || '').split('\n').map((b) => b.trim()).filter(Boolean),
    precoCentavos: plano.precoCentavos,
    ciclo: plano.ciclo,
    destaque: plano.destaque,
    metricasAmpliadas: plano.metricasAmpliadas,
    divulgacao: plano.divulgacao,
  };
}

/** Assinatura para o painel. Ids do gateway ficam de fora. */
function formatarAssinatura(assinatura) {
  if (!assinatura) return null;
  return {
    id: assinatura.id,
    status: assinatura.status,
    plano: formatarPlano(assinatura.plano),
    inicioEm: assinatura.inicioEm,
    proximaCobranca: assinatura.status === STATUS.ATIVA ? assinatura.proximaCobranca : null,
    canceladaEm: assinatura.canceladaEm,
    criadoEm: assinatura.criadoEm,
    // O link do checkout só serve enquanto ele não foi pago
    checkoutUrl: assinatura.status === STATUS.PENDENTE ? assinatura.checkoutUrl : null,
  };
}

function modoTeste() {
  try {
    return provedorPagamento().modoTeste();
  } catch {
    return true;
  }
}

// GET /api/planos  (público)
export async function listarPlanosPublico(req, res, next) {
  try {
    const planos = await listarPlanos();
    res.json({ success: true, data: planos.map(formatarPlano), modoTeste: modoTeste() });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/assinaturas/minha
export async function minhaAssinatura(req, res, next) {
  try {
    const negocio = await negocioDoUsuario(req.usuario);
    // Voltando do checkout: confirma no gateway antes de responder (inclusive
    // o checkout de uma troca de plano, que fica ao lado da assinatura ATIVA)
    await conciliarPendentes(req, negocio.id);
    const atual = await assinaturaAtual(negocio.id);
    const troca = await trocaPendente(negocio.id);
    const negocioAtualizado = await prisma.empreendedor.findUnique({
      where: { id: negocio.id },
      select: { planoAtual: true, emDestaque: true },
    });
    res.json({
      success: true,
      data: {
        assinatura: formatarAssinatura(atual),
        trocaPendente: formatarAssinatura(troca),
        negocio: negocioAtualizado,
        modoTeste: modoTeste(),
      },
    });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/assinaturas  { plano }
export async function assinar(req, res, next) {
  try {
    const negocio = await negocioDoUsuario(req.usuario);
    const assinatura = await iniciarAssinatura(req, negocio.id, req.body.plano);
    res.status(201).json({
      success: true,
      message: 'Checkout criado. Conclua o pagamento para ativar o plano',
      data: formatarAssinatura(assinatura),
    });
  } catch (erro) {
    next(erro);
  }
}

// PUT /api/assinaturas/minha  { plano }  -> troca de plano
export async function trocarPlano(req, res, next) {
  try {
    const negocio = await negocioDoUsuario(req.usuario);
    const atual = await assinaturaAtual(negocio.id);
    if (![STATUS.ATIVA, STATUS.INADIMPLENTE].includes(atual?.status)) {
      throw erroHttp(409, 'Você ainda não tem um plano ativo. Escolha um plano para assinar');
    }
    const assinatura = await iniciarAssinatura(req, negocio.id, req.body.plano);
    res.json({
      success: true,
      message: 'Checkout do novo plano criado. O plano atual segue até o pagamento ser confirmado',
      data: formatarAssinatura(assinatura),
    });
  } catch (erro) {
    next(erro);
  }
}

// DELETE /api/assinaturas/minha
export async function cancelarMinha(req, res, next) {
  try {
    const negocio = await negocioDoUsuario(req.usuario);
    const assinatura = await cancelarAssinaturaDoNegocio(req, negocio.id);
    res.json({
      success: true,
      message: 'Assinatura cancelada. Seu negócio continua na vitrine, sem os benefícios do plano',
      data: formatarAssinatura(assinatura),
    });
  } catch (erro) {
    next(erro);
  }
}

/**
 * POST /api/assinaturas/:id/simular-aprovacao | simular-falha  (admin, fora de produção)
 * Dispara o mesmo tratamento de um webhook, para a demonstração funcionar no
 * localhost sem túnel. Em produção a rota simplesmente não existe (404).
 */
function simular(tipo) {
  return async (req, res, next) => {
    try {
      if (producao()) throw erroHttp(404, 'Rota não encontrada');
      const id = parseId(req.params.id);
      const assinatura = await prisma.assinatura.findUnique({ where: { id } });
      if (!assinatura) throw erroHttp(404, 'Assinatura não encontrada');
      const resultado = await aplicarEvento(
        req,
        { tipo, assinaturaId: assinatura.gatewayAssinaturaId, checkoutId: assinatura.gatewayCheckoutId },
        'SIMULACAO'
      );
      const atualizada = await prisma.assinatura.findUnique({ where: { id }, include: { plano: true } });
      res.json({
        success: true,
        message: resultado?.mudou ? 'Evento simulado aplicado' : 'Nada mudou: a assinatura já estava nesse estado',
        data: formatarAssinatura(atualizada),
      });
    } catch (erro) {
      next(erro);
    }
  };
}
export const simularAprovacao = simular(EVENTOS.ATIVADA);
export const simularFalha = simular(EVENTOS.FALHOU);

/**
 * POST /api/webhooks/abacatepay  (chamado pelo gateway)
 * Responde 401 a qualquer chamada que não prove a origem. Erro ao processar
 * vira 500 para o gateway tentar de novo (o tratamento é idempotente).
 */
export async function receberWebhook(req, res) {
  const provedor = provedorPagamento();
  const autentico = provedor.webhookAutentico({
    segredo: req.query.webhookSecret,
    assinatura: req.get('x-webhook-signature'),
    corpoCru: req.body,
  });
  if (!autentico) {
    console.warn('Webhook recusado: segredo ou assinatura inválidos');
    return res.status(401).json({ success: false, message: 'Não autorizado' });
  }

  let corpo;
  try {
    corpo = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Corpo inválido' });
  }

  try {
    const evento = provedor.interpretarWebhook(corpo);
    const resultado = await aplicarEvento(req, evento, `WEBHOOK ${corpo.event}`);
    if (evento.tipo !== EVENTOS.IGNORADO && !resultado) {
      console.warn(`Webhook ${corpo.event} (${corpo.id}) sem assinatura correspondente`);
    }
    return res.json({ success: true });
  } catch (erro) {
    console.error('Falha ao processar webhook do AbacatePay:', erro);
    return res.status(500).json({ success: false, message: 'Erro ao processar' });
  }
}
