// Controller de Auditoria — somente leitura, exclusivo do administrador.
// Consultar logs não altera nada e por isso não gera novos logs: registrar
// cada consulta encheria a tabela e esconderia os eventos que importam.
import { z } from 'zod';
import prisma from '../config/prisma.js';

const POR_PAGINA_PADRAO = 20;
const POR_PAGINA_MAXIMO = 100;

const filtrosSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(POR_PAGINA_MAXIMO).default(POR_PAGINA_PADRAO),
  acao: z.string().trim().max(50).optional(),
  tipoEntidade: z.string().trim().max(50).optional(),
  status: z.enum(['SUCESSO', 'ERRO']).optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  // Datas no formato aaaa-mm-dd (o campo date do HTML)
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida').optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida').optional(),
  busca: z.string().trim().max(150).optional(),
});

/** Remove chaves vazias antes de validar: ?acao=&status= não é filtro */
function limparQuery(query) {
  const saida = {};
  for (const [chave, valor] of Object.entries(query)) {
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      saida[chave] = valor;
    }
  }
  return saida;
}

/** Monta o `where` do Prisma a partir dos filtros já validados */
function montarWhere(filtros) {
  const where = {};
  if (filtros.acao) where.acao = filtros.acao;
  if (filtros.tipoEntidade) where.tipoEntidade = filtros.tipoEntidade;
  if (filtros.status) where.status = filtros.status;
  if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;

  // O período é inclusivo nas duas pontas: "ate" cobre o dia inteiro
  if (filtros.de || filtros.ate) {
    where.criadoEm = {};
    if (filtros.de) where.criadoEm.gte = new Date(`${filtros.de}T00:00:00`);
    if (filtros.ate) where.criadoEm.lte = new Date(`${filtros.ate}T23:59:59.999`);
  }

  if (filtros.busca) {
    where.OR = [
      { descricao: { contains: filtros.busca } },
      { usuarioNome: { contains: filtros.busca } },
      { acao: { contains: filtros.busca } },
    ];
  }
  return where;
}

// Campos da listagem: sem valoresAntes/valoresDepois, que só aparecem no detalhe
const camposDaLista = {
  id: true,
  usuarioId: true,
  usuarioNome: true,
  acao: true,
  tipoEntidade: true,
  entidadeId: true,
  descricao: true,
  ip: true,
  status: true,
  erroMensagem: true,
  criadoEm: true,
};

// GET /api/auditoria
export async function listarLogs(req, res, next) {
  try {
    const filtros = filtrosSchema.parse(limparQuery(req.query));
    const where = montarWhere(filtros);

    const [total, logs] = await Promise.all([
      prisma.logAuditoria.count({ where }),
      prisma.logAuditoria.findMany({
        where,
        select: camposDaLista,
        orderBy: { criadoEm: 'desc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
    ]);

    res.json({
      success: true,
      data: logs,
      paginacao: {
        pagina: filtros.pagina,
        porPagina: filtros.porPagina,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / filtros.porPagina)),
      },
    });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/auditoria/opcoes
// Valores que existem de fato na tabela, para montar os filtros da tela.
export async function opcoesAuditoria(req, res, next) {
  try {
    const [acoes, entidades, statusPossiveis, usuarios, totalGeral, erros] = await Promise.all([
      prisma.logAuditoria.groupBy({ by: ['acao'], _count: { acao: true }, orderBy: { acao: 'asc' } }),
      prisma.logAuditoria.groupBy({ by: ['tipoEntidade'], _count: { tipoEntidade: true } }),
      prisma.logAuditoria.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.usuario.findMany({
        select: { id: true, nome: true, perfil: true },
        orderBy: { nome: 'asc' },
      }),
      prisma.logAuditoria.count(),
      prisma.logAuditoria.count({ where: { status: 'ERRO' } }),
    ]);

    res.json({
      success: true,
      data: {
        acoes: acoes.map((a) => ({ valor: a.acao, total: a._count.acao })),
        entidades: entidades
          .filter((e) => e.tipoEntidade)
          .map((e) => ({ valor: e.tipoEntidade, total: e._count.tipoEntidade }))
          .sort((a, b) => a.valor.localeCompare(b.valor)),
        status: statusPossiveis.map((s) => ({ valor: s.status, total: s._count.status })),
        usuarios,
        resumo: { total: totalGeral, erros },
      },
    });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/auditoria/:id
export async function buscarLog(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const log = await prisma.logAuditoria.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nome: true, email: true, perfil: true } },
      },
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Registro de auditoria não encontrado' });
    }

    res.json({ success: true, data: log });
  } catch (erro) {
    next(erro);
  }
}
