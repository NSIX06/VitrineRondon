// Controller de Usuários — área administrativa.
// A senha nunca sai daqui: nenhum select inclui senhaHash.
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { PERFIS } from '../middlewares/auth.js';
import { registrarLog } from '../services/auditoria.js';
import { parseId } from '../utils/erros.js';

// Campos públicos do usuário: senhaHash fica de fora de propósito
const camposDoUsuario = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  perfil: true,
  ativo: true,
  createdAt: true,
  empreendedor: { select: { id: true, nomeNegocio: true, ativo: true } },
};

const filtrosSchema = z.object({
  perfil: z.enum([PERFIS.COMUM, PERFIS.EMPREENDEDOR, PERFIS.ADMIN]).optional(),
  ativo: z.enum(['true', 'false']).optional(),
  busca: z.string().trim().max(150).optional(),
});

export const situacaoSchema = z.object({
  ativo: z.boolean({ error: 'Informe se a conta fica ativa ou inativa' }),
  motivo: z.string().trim().max(300).optional(),
});

function limparQuery(query) {
  const saida = {};
  for (const [chave, valor] of Object.entries(query)) {
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') saida[chave] = valor;
  }
  return saida;
}

// GET /api/usuarios
export async function listarUsuarios(req, res, next) {
  try {
    const filtros = filtrosSchema.parse(limparQuery(req.query));

    const where = {};
    if (filtros.perfil) where.perfil = filtros.perfil;
    if (filtros.ativo) where.ativo = filtros.ativo === 'true';
    if (filtros.busca) {
      where.OR = [{ nome: { contains: filtros.busca } }, { email: { contains: filtros.busca } }];
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      select: camposDoUsuario,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: usuarios, total: usuarios.length });
  } catch (erro) {
    next(erro);
  }
}

// PATCH /api/usuarios/:id/situacao  -> ativa ou desativa uma conta
export async function alterarSituacao(req, res, next) {
  try {
    const id = parseId(req.params.id);

    // Um administrador não desativa a própria conta: isso o trancaria para fora
    if (id === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode alterar a situação da sua própria conta',
      });
    }

    const alvo = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, ativo: true, perfil: true },
    });
    if (!alvo) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const { ativo, motivo } = req.body;
    if (alvo.ativo === ativo) {
      return res.status(409).json({
        success: false,
        message: `A conta já está ${ativo ? 'ativa' : 'inativa'}`,
      });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { ativo },
      select: camposDoUsuario,
    });

    await registrarLog(req, {
      acao: ativo ? 'ATIVAR_USUARIO' : 'DESATIVAR_USUARIO',
      tipoEntidade: 'Usuario',
      entidadeId: id,
      descricao: `Conta de ${alvo.nome} ${ativo ? 'reativada' : 'desativada'} pela administração${
        motivo ? `. Motivo: ${motivo}` : ''
      }`,
      antes: { ativo: alvo.ativo },
      depois: { ativo },
    });

    res.json({
      success: true,
      message: `Conta ${ativo ? 'reativada' : 'desativada'} com sucesso`,
      data: usuario,
    });
  } catch (erro) {
    next(erro);
  }
}
