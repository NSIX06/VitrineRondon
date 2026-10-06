// Controller da central de ajuda (perguntas frequentes)
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { registrarLog, diferencas } from '../services/auditoria.js';
import { erroHttp, parseId } from '../utils/erros.js';

// A resposta é guardada e exibida como texto puro: a tela escapa tudo o que
// vier, então não há HTML para sanitizar aqui
const faqSchema = z.object({
  pergunta: z
    .string({ error: 'A pergunta é obrigatória' })
    .trim()
    .min(1, 'A pergunta é obrigatória')
    .max(300, 'A pergunta pode ter até 300 caracteres'),
  resposta: z
    .string({ error: 'A resposta é obrigatória' })
    .trim()
    .min(1, 'A resposta é obrigatória')
    .max(5000, 'A resposta pode ter até 5000 caracteres'),
  categoria: z
    .string()
    .trim()
    .max(80, 'A categoria pode ter até 80 caracteres')
    .nullable()
    .optional()
    .transform((valor) => valor || null),
  ordem: z.coerce
    .number({ error: 'A ordem precisa ser um número' })
    .int('A ordem precisa ser um número inteiro')
    .min(0, 'A ordem não pode ser negativa')
    .max(9999, 'A ordem pode ir até 9999'),
  ativo: z.boolean({ error: 'Informe se a pergunta fica visível' }),
});

// Os padrões ficam só no cadastro: com .default() na base, o .partial() do
// Zod 4 reativaria e reordenaria a pergunta em toda edição parcial
export const criarFaqSchema = faqSchema.extend({
  ordem: faqSchema.shape.ordem.default(0),
  ativo: faqSchema.shape.ativo.default(true),
});
export const atualizarFaqSchema = faqSchema.partial();

// Ordem manual primeiro; empate resolvido pela pergunta, em ordem alfabética
const ordenacao = [{ ordem: 'asc' }, { pergunta: 'asc' }];

/** Primeiros caracteres da pergunta, para a descrição da auditoria */
const resumo = (pergunta) => (pergunta.length > 60 ? `${pergunta.slice(0, 57)}...` : pergunta);

// GET /api/faq  (público: só as perguntas ativas)
export async function listarFaqPublico(req, res, next) {
  try {
    const perguntas = await prisma.perguntaFrequente.findMany({
      where: { ativo: true },
      orderBy: ordenacao,
      select: { id: true, pergunta: true, resposta: true, categoria: true, ordem: true },
    });
    res.json({ success: true, total: perguntas.length, data: perguntas });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/faq/todas  (administração: ativas e inativas)
export async function listarFaqCompleto(req, res, next) {
  try {
    const perguntas = await prisma.perguntaFrequente.findMany({ orderBy: ordenacao });
    res.json({ success: true, total: perguntas.length, data: perguntas });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/faq  (administração)
export async function criarFaq(req, res, next) {
  try {
    const pergunta = await prisma.perguntaFrequente.create({ data: req.body });
    await registrarLog(req, {
      acao: 'CREATE',
      tipoEntidade: 'PerguntaFrequente',
      entidadeId: pergunta.id,
      descricao: `Pergunta frequente criada: ${resumo(pergunta.pergunta)}`,
      depois: req.body,
    });
    res.status(201).json({ success: true, message: 'Pergunta criada com sucesso', data: pergunta });
  } catch (erro) {
    next(erro);
  }
}

// PUT /api/faq/:id  (administração)
export async function atualizarFaq(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await prisma.perguntaFrequente.findUnique({ where: { id } });
    if (!antes) throw erroHttp(404, 'Pergunta não encontrada');

    const pergunta = await prisma.perguntaFrequente.update({ where: { id }, data: req.body });
    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'PerguntaFrequente',
      entidadeId: id,
      descricao: `Pergunta frequente atualizada: ${resumo(pergunta.pergunta)}`,
      ...diferencas(antes, pergunta),
    });
    res.json({ success: true, message: 'Pergunta atualizada com sucesso', data: pergunta });
  } catch (erro) {
    next(erro);
  }
}

// DELETE /api/faq/:id  (administração)
export async function excluirFaq(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await prisma.perguntaFrequente.findUnique({ where: { id } });
    if (!antes) throw erroHttp(404, 'Pergunta não encontrada');

    await prisma.perguntaFrequente.delete({ where: { id } });
    await registrarLog(req, {
      acao: 'DELETE',
      tipoEntidade: 'PerguntaFrequente',
      entidadeId: id,
      descricao: `Pergunta frequente excluída: ${resumo(antes.pergunta)}`,
      antes: { pergunta: antes.pergunta, categoria: antes.categoria, ativo: antes.ativo },
    });
    res.json({ success: true, message: 'Pergunta excluída com sucesso' });
  } catch (erro) {
    next(erro);
  }
}
