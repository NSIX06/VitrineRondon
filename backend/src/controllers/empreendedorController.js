// Controller de Empreendedores
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { PERFIS, ehAdmin } from '../middlewares/auth.js';
import { registrarLog, diferencas } from '../services/auditoria.js';
import { horariosSchema, incluirHorarios, comHorariosParaPrisma } from '../services/horarios.js';
import { erroHttp, parseId } from '../utils/erros.js';
import { lerPaginacao, resumoPaginacao } from '../utils/paginacao.js';
import { apagarSeOrfa, apagarSeTrocou, campoImagem } from '../services/imagens.js';
import { registrarImpressoes } from '../services/metricas.js';

// Mesma lista do frontend (services/constantes.js). Validar aqui impede que um
// negócio fique numa categoria sem filtro na vitrine.
export const CATEGORIAS = ['Artesanato', 'Alimentação', 'Serviços', 'Moda', 'Beleza'];

const empreendedorSchema = z.object({
  nomeNegocio: z
    .string({ error: 'Nome do negócio é obrigatório' })
    .trim()
    .min(2, 'Nome do negócio deve ter ao menos 2 caracteres')
    .max(150),
  responsavel: z
    .string({ error: 'Responsável é obrigatório' })
    .trim()
    .min(2, 'Responsável deve ter ao menos 2 caracteres')
    .max(150),
  descricao: z.string().trim().max(2000).optional().nullable(),
  categoria: z.enum(CATEGORIAS, {
    error: `Escolha uma categoria: ${CATEGORIAS.join(', ')}`,
  }),
  cidade: z.string({ error: 'Cidade é obrigatória' }).trim().min(2, 'Cidade é obrigatória').max(100),
  // Localização (todos opcionais)
  endereco: z.string().trim().max(200).optional().nullable(),
  numero: z.string().trim().max(20).optional().nullable(),
  complemento: z.string().trim().max(100).optional().nullable(),
  bairro: z.string().trim().max(100).optional().nullable(),
  estado: z
    .string()
    .trim()
    .length(2, 'Estado deve ter 2 letras (UF)')
    .transform((uf) => uf.toUpperCase()),
  cep: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/, 'CEP deve ter o formato 00000-000')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  exibirEndereco: z.boolean().optional(),
  // Semana inteira de intervalos; sem nenhum, a página mostra "Indisponível"
  horarios: horariosSchema.optional(),
  whatsapp: z
    .string({ error: 'WhatsApp é obrigatório' })
    .trim()
    .min(8, 'WhatsApp é obrigatório')
    .max(30)
    .regex(/^[\d\s()+-]+$/, 'WhatsApp deve conter apenas números e símbolos ( ) + -'),
  instagram: z.string().trim().max(100).optional().nullable(),
  fotoUrl: campoImagem('URL da foto inválida').optional().nullable(),
  ativo: z.boolean().optional(),
  // Consentimento para a divulgação nas redes oficiais (benefício do Destaque).
  // planoAtual e emDestaque não entram aqui: só o serviço de assinaturas os muda.
  autorizaDivulgacao: z.boolean().optional(),
});

// Os valores padrão ficam só no cadastro. No Zod 4, .partial() preserva os
// .default(): se a base tivesse padrões, toda edição parcial que omitisse o
// estado o sobrescreveria com "MT" em silêncio. A categoria não tem padrão:
// quem cadastra escolhe uma da lista.
export const criarEmpreendedorSchema = empreendedorSchema.extend({
  estado: empreendedorSchema.shape.estado.default('MT'),
});
export const atualizarEmpreendedorSchema = empreendedorSchema.partial();

/**
 * Carrega o negócio e garante que quem pede é o dono ou um administrador.
 * Um empreendedor nunca mexe no negócio de outro.
 */
async function carregarComoDono(req, id) {
  const registro = await prisma.empreendedor.findUnique({
    where: { id },
    include: { horarios: incluirHorarios },
  });
  if (!registro) throw erroHttp(404, 'Empreendedor não encontrado');
  const dono = registro.usuarioId && registro.usuarioId === req.usuario?.id;
  if (!ehAdmin(req.usuario) && !dono) {
    throw erroHttp(403, 'Você só pode alterar o seu próprio negócio');
  }
  return registro;
}

// Plano e consentimento são informação comercial do negócio: só o dono e a
// administração veem. O público vê só "emDestaque" (que liga o selo).
const CAMPOS_PRIVADOS = { planoAtual: true, autorizaDivulgacao: true, autorizaDivulgacaoEm: true };

/** O consentimento de divulgação guarda quando foi dado */
function comDataDoConsentimento(dados) {
  if (!('autorizaDivulgacao' in dados)) return dados;
  return { ...dados, autorizaDivulgacaoEm: dados.autorizaDivulgacao ? new Date() : null };
}

/** Embaralha (Fisher-Yates) para a seção de destaques não favorecer sempre os mesmos */
export function embaralhar(lista, aleatorio = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Visitante e usuário comum só enxergam negócios ativos */
function filtroVisibilidade(req) {
  return ehAdmin(req.usuario) ? {} : { ativo: true };
}

// GET /api/empreendedores?categoria=&cidade=&bairro=&busca=
export async function listarEmpreendedores(req, res, next) {
  try {
    const { categoria, cidade, bairro, busca } = req.query;

    const where = { ...filtroVisibilidade(req) };
    if (categoria) where.categoria = categoria;
    if (cidade) where.cidade = { contains: cidade };
    if (bairro) where.bairro = bairro;
    if (busca) {
      where.OR = [
        { nomeNegocio: { contains: busca } },
        { responsavel: { contains: busca } },
        { descricao: { contains: busca } },
      ];
    }

    const paginacao = lerPaginacao(req.query);
    // Destaques primeiro, depois os demais em ordem alfabética. É só ordem:
    // nenhum negócio sai da lista por não ter plano.
    const consulta = {
      where,
      orderBy: [{ emDestaque: 'desc' }, { nomeNegocio: 'asc' }],
      include: { _count: { select: { produtos: true } }, horarios: incluirHorarios },
      ...(ehAdmin(req.usuario) ? {} : { omit: CAMPOS_PRIVADOS }),
    };

    if (!paginacao.ativa) {
      const empreendedores = await prisma.empreendedor.findMany(consulta);
      return res.json({ success: true, total: empreendedores.length, data: empreendedores });
    }

    const [total, empreendedores] = await Promise.all([
      prisma.empreendedor.count({ where }),
      prisma.empreendedor.findMany({ ...consulta, skip: paginacao.skip, take: paginacao.take }),
    ]);
    res.json({ success: true, total, data: empreendedores, paginacao: resumoPaginacao(paginacao, total) });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/empreendedores/destaques?categoria=&limite=
// Seção "Negócios em Destaque": só negócios com plano de destaque ativo, em
// ordem embaralhada a cada consulta (rodízio justo entre os destaques). Cada
// negócio mostrado conta uma impressão em destaque para o painel dele.
export async function listarDestaques(req, res, next) {
  try {
    const limite = Math.min(Math.max(Number.parseInt(req.query.limite, 10) || 6, 1), 12);
    const where = { ativo: true, emDestaque: true };
    if (req.query.categoria) where.categoria = String(req.query.categoria);
    const todos = await prisma.empreendedor.findMany({
      where,
      include: { _count: { select: { produtos: true } } },
      omit: CAMPOS_PRIVADOS,
    });
    const escolhidos = embaralhar(todos).slice(0, limite);
    await registrarImpressoes(req, escolhidos.map((e) => e.id));
    res.json({ success: true, total: escolhidos.length, data: escolhidos });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/empreendedores/meu  -> negócio do usuário autenticado
export async function meuNegocio(req, res, next) {
  try {
    const empreendedor = await prisma.empreendedor.findUnique({
      where: { usuarioId: req.usuario.id },
      include: { produtos: { orderBy: { createdAt: 'desc' } }, horarios: incluirHorarios },
    });
    if (!empreendedor) {
      return res.status(404).json({ success: false, message: 'Você ainda não cadastrou um negócio' });
    }
    res.json({ success: true, data: empreendedor });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/empreendedores/meu  -> o próprio usuário cadastra seu negócio
export async function criarMeuNegocio(req, res, next) {
  try {
    const jaTem = await prisma.empreendedor.findUnique({ where: { usuarioId: req.usuario.id } });
    if (jaTem) {
      return res.status(409).json({ success: false, message: 'Você já tem um negócio cadastrado' });
    }

    // Cadastrar o negócio promove a conta comum a EMPREENDEDOR
    const { empreendedor, perfilAnterior } = await prisma.$transaction(async (tx) => {
      const criado = await tx.empreendedor.create({
        data: { ...comHorariosParaPrisma(comDataDoConsentimento(req.body)), usuarioId: req.usuario.id },
        include: { horarios: incluirHorarios },
      });
      const usuario = await tx.usuario.findUnique({
        where: { id: req.usuario.id },
        select: { perfil: true },
      });
      if (usuario.perfil === PERFIS.COMUM) {
        await tx.usuario.update({
          where: { id: req.usuario.id },
          data: { perfil: PERFIS.EMPREENDEDOR },
        });
      }
      return { empreendedor: criado, perfilAnterior: usuario.perfil };
    });

    await registrarLog(req, {
      acao: 'CREATE',
      tipoEntidade: 'Empreendedor',
      entidadeId: empreendedor.id,
      descricao: `Negócio cadastrado pelo próprio usuário: ${empreendedor.nomeNegocio}`,
      depois: req.body,
    });
    if (perfilAnterior === PERFIS.COMUM) {
      await registrarLog(req, {
        acao: 'UPDATE_PERFIL',
        tipoEntidade: 'Usuario',
        entidadeId: req.usuario.id,
        descricao: 'Perfil alterado para EMPREENDEDOR ao cadastrar o primeiro negócio',
        antes: { perfil: PERFIS.COMUM },
        depois: { perfil: PERFIS.EMPREENDEDOR },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Negócio cadastrado com sucesso',
      data: empreendedor,
      perfilAtualizado: perfilAnterior === PERFIS.COMUM ? PERFIS.EMPREENDEDOR : perfilAnterior,
    });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/empreendedores/:id
export async function buscarEmpreendedor(req, res, next) {
  try {
    const id = parseId(req.params.id);

    const empreendedor = await prisma.empreendedor.findUnique({
      where: { id },
      include: { produtos: { orderBy: { nome: 'asc' } }, horarios: incluirHorarios },
    });

    if (!empreendedor) {
      return res.status(404).json({ success: false, message: 'Empreendedor não encontrado' });
    }

    // Negócio desativado só aparece para o dono e para o admin
    const dono = empreendedor.usuarioId && empreendedor.usuarioId === req.usuario?.id;
    if (!empreendedor.ativo && !ehAdmin(req.usuario) && !dono) {
      return res.status(404).json({ success: false, message: 'Empreendedor não encontrado' });
    }

    // Visitante não vê itens indisponíveis nem o plano do negócio
    if (!ehAdmin(req.usuario) && !dono) {
      empreendedor.produtos = empreendedor.produtos.filter((produto) => produto.disponivel);
      for (const campo of Object.keys(CAMPOS_PRIVADOS)) delete empreendedor[campo];
    }

    res.json({ success: true, data: empreendedor });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/empreendedores  (administração)
export async function criarEmpreendedor(req, res, next) {
  try {
    const empreendedor = await prisma.empreendedor.create({
      data: comHorariosParaPrisma(comDataDoConsentimento(req.body)),
      include: { horarios: incluirHorarios },
    });
    await registrarLog(req, {
      acao: 'CREATE',
      tipoEntidade: 'Empreendedor',
      entidadeId: empreendedor.id,
      descricao: `Empreendedor cadastrado pela administração: ${empreendedor.nomeNegocio}`,
      depois: req.body,
    });
    res.status(201).json({
      success: true,
      message: 'Empreendedor cadastrado com sucesso',
      data: empreendedor,
    });
  } catch (erro) {
    next(erro);
  }
}

// PUT /api/empreendedores/:id  (admin ou dono)
export async function atualizarEmpreendedor(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await carregarComoDono(req, id);

    const empreendedor = await prisma.empreendedor.update({
      where: { id },
      data: comHorariosParaPrisma(comDataDoConsentimento(req.body), { edicao: true }),
      include: { horarios: incluirHorarios },
    });
    if ('fotoUrl' in req.body) await apagarSeTrocou(prisma, antes.fotoUrl, empreendedor.fotoUrl);

    const mudou = diferencas(antes, empreendedor);
    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Empreendedor',
      entidadeId: id,
      descricao: `Negócio atualizado: ${empreendedor.nomeNegocio}`,
      antes: mudou.antes,
      depois: mudou.depois,
    });

    res.json({ success: true, message: 'Empreendedor atualizado com sucesso', data: empreendedor });
  } catch (erro) {
    next(erro);
  }
}

// DELETE /api/empreendedores/:id  (somente administração)
export async function excluirEmpreendedor(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await prisma.empreendedor.findUnique({
      where: { id },
      include: {
        _count: { select: { produtos: true } },
        // As imagens dos itens que saem junto, em cascata, para limpar depois
        produtos: { select: { imagem: true } },
      },
    });
    if (!antes) {
      return res.status(404).json({ success: false, message: 'Empreendedor não encontrado' });
    }

    await prisma.empreendedor.delete({ where: { id } });
    for (const caminho of [antes.fotoUrl, ...antes.produtos.map((p) => p.imagem)]) {
      await apagarSeOrfa(prisma, caminho);
    }

    await registrarLog(req, {
      acao: 'DELETE',
      tipoEntidade: 'Empreendedor',
      entidadeId: id,
      descricao: `Empreendedor excluído: ${antes.nomeNegocio} (${antes._count.produtos} itens removidos em cascata)`,
      antes: { nomeNegocio: antes.nomeNegocio, cidade: antes.cidade, bairro: antes.bairro },
    });

    res.json({ success: true, message: 'Empreendedor excluído com sucesso' });
  } catch (erro) {
    next(erro);
  }
}
