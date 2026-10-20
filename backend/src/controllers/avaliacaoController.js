// Controller das avaliações dos negócios (RN-AVAL-01 a 10).
//
// Ler é público, como o resto da vitrine. Avaliar exige conta (cliente ou
// empreendedor de outro negócio); o dono não avalia o próprio negócio e quem
// modera não avalia. Cada pessoa tem uma avaliação por negócio, que pode
// editar ou apagar. A administração remove (com motivo) e pode restaurar; o
// registro removido fica guardado, fora da média e da lista pública.
// O comentário é guardado e exibido como texto puro: a tela escapa tudo o que
// vier, então não há HTML para sanitizar aqui (proteção contra XSS na saída).
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { ehAdmin } from '../middlewares/auth.js';
import { registrarLog } from '../services/auditoria.js';
import {
  COMENTARIO_MAXIMO,
  COMENTARIO_MINIMO,
  NOTA_MAXIMA,
  NOTA_MINIMA,
  ORDENS,
  STATUS_AVALIACAO,
  avaliacaoPublica,
  motivoParaNaoAvaliar,
  resumoDoNegocio,
} from '../services/avaliacoes.js';
import { estaPublicado } from '../services/publicacao.js';
import { erroHttp, parseId } from '../utils/erros.js';
import { resumoPaginacao } from '../utils/paginacao.js';

// Nota inteira de 1 a 5 (RN-AVAL-04): "4", 4.5 ou 6 são recusados aqui, no
// servidor, não só nas estrelas da tela (RN-AVAL-07)
const notaSchema = z
  .number({ error: 'Escolha uma nota de 1 a 5 estrelas' })
  .int('A nota precisa ser um número inteiro de 1 a 5')
  .min(NOTA_MINIMA, 'A nota mínima é 1 estrela')
  .max(NOTA_MAXIMA, 'A nota máxima é 5 estrelas');

const comentarioSchema = z
  .string({ error: 'Escreva um comentário sobre a sua experiência' })
  .trim()
  .min(COMENTARIO_MINIMO, `O comentário precisa ter ao menos ${COMENTARIO_MINIMO} caracteres`)
  .max(COMENTARIO_MAXIMO, `O comentário pode ter até ${COMENTARIO_MAXIMO} caracteres`);

export const avaliacaoSchema = z.object({ nota: notaSchema, comentario: comentarioSchema });

export const denunciaSchema = z.object({
  motivo: z
    .string()
    .trim()
    .max(300, 'O motivo pode ter até 300 caracteres')
    .optional()
    .transform((valor) => valor || null),
});

export const moderacaoSchema = z
  .object({
    acao: z.enum(['remover', 'restaurar'], { error: 'Ação de moderação inválida' }),
    motivo: z.string().trim().max(300, 'O motivo pode ter até 300 caracteres').optional(),
  })
  .refine((dados) => dados.acao !== 'remover' || (dados.motivo && dados.motivo.length >= 3), {
    message: 'Informe o motivo da remoção',
    path: ['motivo'],
  });

const MENSAGENS_SEM_PERMISSAO = {
  LOGIN: 'Entre na sua conta para avaliar',
  DONO: 'Você não pode avaliar o seu próprio negócio',
  ADMIN: 'A administração modera as avaliações e não avalia negócios',
  INDISPONIVEL: 'Este negócio não está recebendo avaliações agora',
};

const POR_PAGINA_PADRAO = 5;
const POR_PAGINA_MAXIMO = 20;

/** pagina, porPagina e ordem da lista pública, com padrões e limites */
export function lerConsultaDaLista(query = {}) {
  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
  const porPagina = query.porPagina === undefined ? POR_PAGINA_PADRAO : Number(query.porPagina);
  // Parâmetro fora do que a lista aceita é dado inválido (422), com o campo apontado
  const invalido = (campo, mensagem) => erroHttp(422, 'Dados inválidos', { [campo]: [mensagem] });
  if (!Number.isInteger(pagina) || pagina < 1) throw invalido('pagina', 'A página deve ser um número inteiro a partir de 1');
  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > POR_PAGINA_MAXIMO) {
    throw invalido('porPagina', `Informe de 1 a ${POR_PAGINA_MAXIMO} avaliações por página`);
  }
  const ordem = query.ordem === undefined ? 'recentes' : String(query.ordem);
  if (!Object.hasOwn(ORDENS, ordem)) {
    throw invalido('ordem', `Use uma destas ordenações: ${Object.keys(ORDENS).join(', ')}`);
  }
  return { pagina, porPagina, ordem };
}

const AUTOR = { select: { nome: true } };

/** Negócio da rota, só com o que as regras usam; 404 se não existe */
async function negocioDaRota(req) {
  const id = parseId(req.params.id);
  const negocio = await prisma.empreendedor.findUnique({
    where: { id },
    select: { id: true, nomeNegocio: true, ativo: true, publicadoAte: true, usuarioId: true },
  });
  if (!negocio) throw erroHttp(404, 'Empreendedor não encontrado');
  return negocio;
}

/** Avaliação da rota; 404 se não existe */
async function avaliacaoDaRota(req) {
  const id = parseId(req.params.id);
  const avaliacao = await prisma.avaliacao.findUnique({
    where: { id },
    include: { empreendedor: { select: { id: true, nomeNegocio: true } } },
  });
  if (!avaliacao) throw erroHttp(404, 'Avaliação não encontrada');
  return avaliacao;
}

// GET /api/empreendedores/:id/avaliacoes?ordem=recentes|maior|menor&pagina=1&porPagina=5
export async function listarAvaliacoes(req, res, next) {
  try {
    const consulta = lerConsultaDaLista(req.query);
    const negocio = await negocioDaRota(req);

    // Negócio fora da vitrine: as avaliações somem junto, menos para o dono e a administração
    const dono = negocio.usuarioId && negocio.usuarioId === req.usuario?.id;
    if (!estaPublicado(negocio) && !dono && !ehAdmin(req.usuario)) {
      throw erroHttp(404, 'Empreendedor não encontrado');
    }

    const onde = { empreendedorId: negocio.id, status: STATUS_AVALIACAO.PUBLICADA };
    const [resumo, lista, minha] = await Promise.all([
      resumoDoNegocio(negocio.id),
      prisma.avaliacao.findMany({
        where: onde,
        orderBy: ORDENS[consulta.ordem],
        skip: (consulta.pagina - 1) * consulta.porPagina,
        take: consulta.porPagina,
        include: { usuario: AUTOR },
      }),
      req.usuario
        ? prisma.avaliacao.findUnique({
            where: { empreendedorId_usuarioId: { empreendedorId: negocio.id, usuarioId: req.usuario.id } },
            include: { usuario: AUTOR },
          })
        : null,
    ]);

    const motivo = motivoParaNaoAvaliar(req.usuario, negocio);
    res.json({
      success: true,
      resumo,
      data: lista.map((avaliacao) => avaliacaoPublica(avaliacao, req.usuario)),
      paginacao: resumoPaginacao(consulta, resumo.total),
      ordem: consulta.ordem,
      // A avaliação de quem está vendo (mesmo removida, para ele saber o motivo)
      minha: minha
        ? {
            ...avaliacaoPublica(minha, req.usuario),
            status: minha.status,
            motivoRemocao: minha.status === STATUS_AVALIACAO.REMOVIDA ? minha.motivoRemocao : null,
          }
        : null,
      permissao: { podeAvaliar: !motivo, motivo, mensagem: motivo ? MENSAGENS_SEM_PERMISSAO[motivo] : null },
    });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/empreendedores/:id/avaliacoes
export async function criarAvaliacao(req, res, next) {
  try {
    const negocio = await negocioDaRota(req);
    const motivo = motivoParaNaoAvaliar(req.usuario, negocio);
    if (motivo) throw erroHttp(motivo === 'LOGIN' ? 401 : 403, MENSAGENS_SEM_PERMISSAO[motivo]);

    const { nota, comentario } = req.body;
    let avaliacao;
    try {
      avaliacao = await prisma.avaliacao.create({
        data: { empreendedorId: negocio.id, usuarioId: req.usuario.id, nota, comentario },
        include: { usuario: AUTOR },
      });
    } catch (erro) {
      // Índice único (negócio, autor): a segunda avaliação nunca entra (RN-AVAL-03)
      if (erro?.code === 'P2002') {
        throw erroHttp(409, 'Você já avaliou este negócio. Edite a sua avaliação, se quiser mudar a nota.');
      }
      throw erro;
    }

    await registrarLog(req, {
      acao: 'CREATE',
      tipoEntidade: 'Avaliacao',
      entidadeId: avaliacao.id,
      descricao: `Avaliação de ${nota} estrela(s) para ${negocio.nomeNegocio}`,
      depois: { empreendedorId: negocio.id, nota },
    });
    res.status(201).json({
      success: true,
      message: 'Avaliação publicada. Obrigado por contar como foi!',
      data: avaliacaoPublica(avaliacao, req.usuario),
      resumo: await resumoDoNegocio(negocio.id),
    });
  } catch (erro) {
    next(erro);
  }
}

// PUT /api/avaliacoes/:id  (só o autor)
export async function atualizarAvaliacao(req, res, next) {
  try {
    const antes = await avaliacaoDaRota(req);
    if (antes.usuarioId !== req.usuario.id) throw erroHttp(403, 'Só quem escreveu a avaliação pode editá-la');
    if (antes.status === STATUS_AVALIACAO.REMOVIDA) {
      throw erroHttp(403, 'Esta avaliação foi removida pela moderação e não pode ser editada');
    }

    const { nota, comentario } = req.body;
    const avaliacao = await prisma.avaliacao.update({
      where: { id: antes.id },
      data: { nota, comentario, editadaEm: new Date() },
      include: { usuario: AUTOR },
    });
    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Avaliacao',
      entidadeId: antes.id,
      descricao: `Avaliação de ${antes.empreendedor.nomeNegocio} editada (${antes.nota} para ${nota} estrela(s))`,
      antes: { nota: antes.nota },
      depois: { nota },
    });
    res.json({
      success: true,
      message: 'Avaliação atualizada',
      data: avaliacaoPublica(avaliacao, req.usuario),
      resumo: await resumoDoNegocio(antes.empreendedorId),
    });
  } catch (erro) {
    next(erro);
  }
}

// DELETE /api/avaliacoes/:id  (só o autor; a administração usa a moderação)
export async function excluirAvaliacao(req, res, next) {
  try {
    const antes = await avaliacaoDaRota(req);
    if (antes.usuarioId !== req.usuario.id) throw erroHttp(403, 'Só quem escreveu a avaliação pode apagá-la');

    await prisma.avaliacao.delete({ where: { id: antes.id } });
    await registrarLog(req, {
      acao: 'DELETE',
      tipoEntidade: 'Avaliacao',
      entidadeId: antes.id,
      descricao: `Avaliação de ${antes.empreendedor.nomeNegocio} apagada pelo autor`,
      antes: { nota: antes.nota, status: antes.status },
    });
    res.json({
      success: true,
      message: 'Avaliação apagada',
      resumo: await resumoDoNegocio(antes.empreendedorId),
    });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/avaliacoes/:id/denuncias  (qualquer conta, uma vez por avaliação)
export async function denunciarAvaliacao(req, res, next) {
  try {
    const avaliacao = await avaliacaoDaRota(req);
    if (avaliacao.status !== STATUS_AVALIACAO.PUBLICADA) throw erroHttp(404, 'Avaliação não encontrada');
    if (avaliacao.usuarioId === req.usuario.id) throw erroHttp(400, 'Você não pode denunciar a sua própria avaliação');

    try {
      await prisma.$transaction([
        prisma.denunciaAvaliacao.create({
          data: { avaliacaoId: avaliacao.id, usuarioId: req.usuario.id, motivo: req.body.motivo },
        }),
        prisma.avaliacao.update({ where: { id: avaliacao.id }, data: { denuncias: { increment: 1 } } }),
      ]);
    } catch (erro) {
      // Denunciar de novo não soma: a resposta é a mesma, sem erro
      if (erro?.code === 'P2002') {
        return res.json({ success: true, message: 'Você já denunciou esta avaliação. A moderação vai analisar.' });
      }
      throw erro;
    }
    res.status(201).json({ success: true, message: 'Denúncia enviada. A moderação vai analisar.' });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/avaliacoes/minhas  (as avaliações de quem está logado, em qualquer negócio)
export async function listarMinhas(req, res, next) {
  try {
    const lista = await prisma.avaliacao.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        usuario: AUTOR,
        empreendedor: { select: { id: true, nomeNegocio: true, categoria: true, emDestaque: true } },
      },
    });
    res.json({
      success: true,
      total: lista.length,
      data: lista.map((avaliacao) => ({
        ...avaliacaoPublica(avaliacao, req.usuario),
        status: avaliacao.status,
        motivoRemocao: avaliacao.status === STATUS_AVALIACAO.REMOVIDA ? avaliacao.motivoRemocao : null,
        negocio: avaliacao.empreendedor,
      })),
    });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/avaliacoes?status=PUBLICADA|REMOVIDA&denunciadas=1&pagina=1&porPagina=20  (administração)
export async function listarParaModeracao(req, res, next) {
  try {
    const pagina = req.query.pagina === undefined ? 1 : Number(req.query.pagina);
    const porPagina = req.query.porPagina === undefined ? 20 : Number(req.query.porPagina);
    if (!Number.isInteger(pagina) || pagina < 1) throw erroHttp(400, 'Página inválida');
    if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 60) {
      throw erroHttp(400, 'Informe de 1 a 60 avaliações por página');
    }
    const status = req.query.status ? String(req.query.status) : undefined;
    if (status && !Object.values(STATUS_AVALIACAO).includes(status)) throw erroHttp(400, 'Situação inválida');

    const onde = {
      ...(status ? { status } : {}),
      ...(req.query.denunciadas === '1' ? { denuncias: { gt: 0 } } : {}),
    };
    const [total, lista] = await Promise.all([
      prisma.avaliacao.count({ where: onde }),
      prisma.avaliacao.findMany({
        where: onde,
        // As mais denunciadas primeiro; depois, as mais novas
        orderBy: [{ denuncias: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        include: {
          usuario: { select: { id: true, nome: true, email: true } },
          empreendedor: { select: { id: true, nomeNegocio: true } },
        },
      }),
    ]);
    res.json({ success: true, data: lista, paginacao: resumoPaginacao({ pagina, porPagina }, total) });
  } catch (erro) {
    next(erro);
  }
}

// PUT /api/avaliacoes/:id/moderacao  (administração: remover com motivo ou restaurar)
export async function moderarAvaliacao(req, res, next) {
  try {
    const antes = await avaliacaoDaRota(req);
    const remover = req.body.acao === 'remover';
    const avaliacao = await prisma.avaliacao.update({
      where: { id: antes.id },
      data: remover
        ? { status: STATUS_AVALIACAO.REMOVIDA, motivoRemocao: req.body.motivo, removidaEm: new Date() }
        : { status: STATUS_AVALIACAO.PUBLICADA, motivoRemocao: null, removidaEm: null },
    });
    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Avaliacao',
      entidadeId: antes.id,
      descricao: remover
        ? `Avaliação de ${antes.empreendedor.nomeNegocio} removida pela moderação: ${req.body.motivo}`
        : `Avaliação de ${antes.empreendedor.nomeNegocio} restaurada pela moderação`,
      antes: { status: antes.status },
      depois: { status: avaliacao.status },
    });
    res.json({
      success: true,
      message: remover ? 'Avaliação removida da vitrine' : 'Avaliação restaurada',
      data: avaliacao,
    });
  } catch (erro) {
    next(erro);
  }
}
