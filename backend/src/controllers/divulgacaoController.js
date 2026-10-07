// Controller de divulgações nas redes oficiais (só registro, sem integração).
// Não há cota de posts: a administração registra o que entrou no calendário
// editorial, e só para negócios com plano de divulgação e consentimento dado.
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { registrarLog, diferencas } from '../services/auditoria.js';
import { negocioDoUsuario } from '../services/assinaturas.js';
import { erroHttp, parseId } from '../utils/erros.js';

export const TIPOS_DIVULGACAO = ['NEGOCIO', 'PRODUTO', 'SERVICO', 'CAMPANHA', 'INSTITUCIONAL'];
export const STATUS_DIVULGACAO = ['PLANEJADA', 'PUBLICADA', 'CANCELADA'];

const divulgacaoBase = z.object({
  empreendedorId: z.coerce.number().int().positive(),
  tipo: z.enum(TIPOS_DIVULGACAO, { error: 'Tipo de divulgação inválido' }),
  titulo: z.string({ error: 'Informe o título' }).trim().min(3, 'O título precisa de ao menos 3 caracteres').max(150),
  canal: z.string().trim().max(40).optional().nullable(),
  status: z.enum(STATUS_DIVULGACAO).optional(),
  publicadaEm: z.coerce.date().optional().nullable(),
  link: z.url({ protocol: /^https?$/, error: 'Link inválido' }).max(500).optional().nullable(),
  alcance: z.coerce.number().int().min(0).optional().nullable(),
});
export const criarDivulgacaoSchema = divulgacaoBase;
// Na edição a divulgação não muda de negócio
export const atualizarDivulgacaoSchema = divulgacaoBase.omit({ empreendedorId: true }).partial();

const campos = {
  id: true,
  empreendedorId: true,
  tipo: true,
  titulo: true,
  canal: true,
  status: true,
  publicadaEm: true,
  link: true,
  alcance: true,
  createdAt: true,
};

/** Publicada precisa de data; se não veio, é agora */
export function comDataDePublicacao(dados, antes) {
  const status = dados.status ?? antes?.status;
  if (status === 'PUBLICADA' && !dados.publicadaEm && !antes?.publicadaEm) return { ...dados, publicadaEm: new Date() };
  return dados;
}

// GET /api/divulgacoes?empreendedorId=  (admin)
export async function listarDivulgacoes(req, res, next) {
  try {
    const where = req.query.empreendedorId ? { empreendedorId: parseId(req.query.empreendedorId) } : {};
    const divulgacoes = await prisma.divulgacao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { ...campos, empreendedor: { select: { nomeNegocio: true } } },
    });
    res.json({ success: true, total: divulgacoes.length, data: divulgacoes });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/divulgacoes/minhas  (empreendedor)
export async function minhasDivulgacoes(req, res, next) {
  try {
    const negocio = await negocioDoUsuario(req.usuario);
    const divulgacoes = await prisma.divulgacao.findMany({
      where: { empreendedorId: negocio.id, status: { not: 'CANCELADA' } },
      orderBy: { createdAt: 'desc' },
      select: campos,
    });
    res.json({ success: true, total: divulgacoes.length, data: divulgacoes });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/divulgacoes  (admin)
export async function criarDivulgacao(req, res, next) {
  try {
    const negocio = await prisma.empreendedor.findUnique({
      where: { id: req.body.empreendedorId },
      select: { id: true, nomeNegocio: true, planoAtual: true, autorizaDivulgacao: true },
    });
    if (!negocio) throw erroHttp(404, 'Empreendedor não encontrado');
    const plano =
      negocio.planoAtual === 'NENHUM' ? null : await prisma.plano.findUnique({ where: { nome: negocio.planoAtual } });
    if (!plano?.divulgacao) throw erroHttp(409, 'O plano atual deste negócio não inclui divulgação nas redes');
    if (!negocio.autorizaDivulgacao) {
      throw erroHttp(409, 'O empreendedor ainda não autorizou o uso das informações e imagens na divulgação');
    }

    const divulgacao = await prisma.divulgacao.create({ data: comDataDePublicacao(req.body), select: campos });
    await registrarLog(req, {
      acao: 'CREATE',
      tipoEntidade: 'Divulgacao',
      entidadeId: divulgacao.id,
      descricao: `Divulgação registrada para ${negocio.nomeNegocio}: ${divulgacao.titulo}`,
      depois: req.body,
    });
    res.status(201).json({ success: true, message: 'Divulgação registrada', data: divulgacao });
  } catch (erro) {
    next(erro);
  }
}

// PUT /api/divulgacoes/:id  (admin)
export async function atualizarDivulgacao(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await prisma.divulgacao.findUnique({ where: { id }, select: campos });
    if (!antes) throw erroHttp(404, 'Divulgação não encontrada');
    const divulgacao = await prisma.divulgacao.update({
      where: { id },
      data: comDataDePublicacao(req.body, antes),
      select: campos,
    });
    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Divulgacao',
      entidadeId: id,
      descricao: `Divulgação atualizada: ${divulgacao.titulo}`,
      ...diferencas(antes, divulgacao),
    });
    res.json({ success: true, message: 'Divulgação atualizada', data: divulgacao });
  } catch (erro) {
    next(erro);
  }
}

// DELETE /api/divulgacoes/:id  (admin)
export async function excluirDivulgacao(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await prisma.divulgacao.findUnique({ where: { id }, select: campos });
    if (!antes) throw erroHttp(404, 'Divulgação não encontrada');
    await prisma.divulgacao.delete({ where: { id } });
    await registrarLog(req, {
      acao: 'DELETE',
      tipoEntidade: 'Divulgacao',
      entidadeId: id,
      descricao: `Divulgação excluída: ${antes.titulo}`,
      antes,
    });
    res.json({ success: true, message: 'Divulgação excluída' });
  } catch (erro) {
    next(erro);
  }
}
