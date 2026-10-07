// Controller de métricas (estatísticas do painel do empreendedor)
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { TIPOS_PUBLICOS, registrarEvento, resumoDesempenho } from '../services/metricas.js';
import { negocioDoUsuario } from '../services/assinaturas.js';
import { planoEmVigor } from '../services/publicacao.js';

export const eventoSchema = z.object({
  empreendedorId: z.coerce.number().int().positive(),
  tipo: z.enum(TIPOS_PUBLICOS, { error: 'Tipo de evento desconhecido' }),
  produtoId: z.coerce.number().int().positive().optional(),
});

// POST /api/metricas  (público, chamado pelo site; responde 204 sempre que válido)
export async function registrarEventoPublico(req, res, next) {
  try {
    await registrarEvento(req, req.body);
    // Não diz se contou ou não: quem tenta inflar números não aprende a regra
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
}

// GET /api/metricas/meu-negocio?dias=30
export async function desempenhoDoMeuNegocio(req, res, next) {
  try {
    const negocio = await negocioDoUsuario(req.usuario);
    const nomePlano = planoEmVigor(negocio);
    const plano = nomePlano === 'NENHUM' ? null : await prisma.plano.findUnique({ where: { nome: nomePlano } });

    // Estatísticas são benefício dos planos: sem plano, o painel convida a assinar
    if (!plano) {
      return res.json({ success: true, data: { disponivel: false, plano: 'NENHUM' } });
    }
    const dias = Math.min(Math.max(Number.parseInt(req.query.dias, 10) || 30, 7), 90);
    const resumo = await resumoDesempenho(negocio.id, { dias, ampliado: plano.metricasAmpliadas });
    res.json({ success: true, data: { disponivel: true, plano: plano.nome, ...resumo } });
  } catch (erro) {
    next(erro);
  }
}
