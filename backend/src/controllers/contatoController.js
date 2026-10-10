// Controller de Contatos (mensagens enviadas pela comunidade)
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { registrarLog } from '../services/auditoria.js';
import { parseId } from '../utils/erros.js';

export const criarContatoSchema = z.object({
  nome: z.string({ error: 'Nome é obrigatório' }).trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(150),
  email: z.string({ error: 'E-mail é obrigatório' }).trim().email('E-mail inválido').max(150),
  telefone: z.string().trim().max(30).optional().nullable(),
  mensagem: z
    .string({ error: 'Mensagem é obrigatória' })
    .trim()
    .min(5, 'Mensagem deve ter ao menos 5 caracteres')
    .max(5000),
  // Sem destinatário: a central de ajuda fala só com a equipe do VitrineRondon.
  // Com um negócio, o contato é direto pelo WhatsApp dele. Um empreendedorId
  // enviado é descartado pelo Zod, como qualquer campo desconhecido.
});

// GET /api/contatos  (somente administração: as mensagens têm dados pessoais)
export async function listarContatos(req, res, next) {
  try {
    const contatos = await prisma.contato.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        empreendedor: { select: { id: true, nomeNegocio: true } },
      },
    });
    res.json({ success: true, total: contatos.length, data: contatos });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/contatos  (público)
export async function criarContato(req, res, next) {
  try {
    // Sempre para a equipe: nenhum destinatário vem do corpo da requisição
    const { nome, email, telefone, mensagem } = req.body;
    const contato = await prisma.contato.create({ data: { nome, email, telefone, mensagem } });
    await registrarLog(req, {
      acao: 'CREATE',
      tipoEntidade: 'Contato',
      entidadeId: contato.id,
      // Só o essencial: a mensagem em si não vai para o log de auditoria
      descricao: `Mensagem recebida de ${contato.nome}`,
      depois: { nome: contato.nome },
    });
    res.status(201).json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: contato,
    });
  } catch (erro) {
    next(erro);
  }
}

// PATCH /api/contatos/:id/lido  (administração)
export async function marcarComoLido(req, res, next) {
  try {
    const id = parseId(req.params.id);
    // Permite marcar como lida (padrão) ou desmarcar enviando { "lido": false }
    const lido = typeof req.body?.lido === 'boolean' ? req.body.lido : true;

    const contato = await prisma.contato.update({ where: { id }, data: { lido } });

    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Contato',
      entidadeId: id,
      descricao: `Mensagem de ${contato.nome} marcada como ${lido ? 'lida' : 'não lida'}`,
      antes: { lido: !lido },
      depois: { lido },
    });

    res.json({
      success: true,
      message: lido ? 'Mensagem marcada como lida' : 'Mensagem marcada como não lida',
      data: contato,
    });
  } catch (erro) {
    next(erro);
  }
}

// DELETE /api/contatos/:id  (administração)
export async function excluirContato(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await prisma.contato.findUnique({ where: { id } });
    if (!antes) {
      return res.status(404).json({ success: false, message: 'Registro não encontrado' });
    }

    await prisma.contato.delete({ where: { id } });

    await registrarLog(req, {
      acao: 'DELETE',
      tipoEntidade: 'Contato',
      entidadeId: id,
      descricao: `Mensagem de ${antes.nome} excluída`,
      antes: { nome: antes.nome, lido: antes.lido, empreendedorId: antes.empreendedorId },
    });

    res.json({ success: true, message: 'Mensagem excluída com sucesso' });
  } catch (erro) {
    next(erro);
  }
}
