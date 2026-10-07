// Controller de Produtos e Serviços
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { ehAdmin } from '../middlewares/auth.js';
import { registrarLog, diferencas } from '../services/auditoria.js';
import { erroHttp, parseId } from '../utils/erros.js';
import { lerPaginacao, resumoPaginacao } from '../utils/paginacao.js';
import { apagarSeOrfa, apagarSeTrocou, campoImagem } from '../services/imagens.js';

const produtoSchema = z.object({
  nome: z.string({ error: 'Nome é obrigatório' }).trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(150),
  descricao: z.string().trim().max(2000).optional().nullable(),
  preco: z.coerce
    .number({ error: 'Preço é obrigatório e deve ser numérico' })
    .positive('Preço deve ser um valor positivo'),
  tipo: z.enum(['produto', 'servico'], { error: 'Tipo deve ser "produto" ou "servico"' }),
  imagem: campoImagem('URL da imagem inválida').optional().nullable(),
  disponivel: z.boolean().optional(),
  empreendedorId: z.coerce
    .number({ error: 'empreendedorId é obrigatório e deve ser numérico' })
    .int('empreendedorId deve ser um inteiro')
    .positive('empreendedorId deve ser positivo'),
});

// O padrão "produto" vale só no cadastro. Com .default() na base, o .partial()
// do Zod 4 o reaplicaria em toda edição que não enviasse o tipo, e um serviço
// editado pela API viraria produto sem ninguém pedir.
export const criarProdutoSchema = produtoSchema.extend({
  tipo: produtoSchema.shape.tipo.default('produto'),
});
// Na edição o item não pode ser transferido para outro negócio
export const atualizarProdutoSchema = produtoSchema.omit({ empreendedorId: true }).partial();

// Campos do empreendedor incluídos nas listagens de produtos
const empreendedorResumo = {
  select: { id: true, nomeNegocio: true, whatsapp: true, cidade: true, bairro: true },
};

/** Id do negócio do usuário autenticado (null se ele não tiver um) */
async function idDoMeuNegocio(req) {
  if (!req.usuario) return null;
  const meu = await prisma.empreendedor.findUnique({
    where: { usuarioId: req.usuario.id },
    select: { id: true },
  });
  return meu?.id ?? null;
}

/** Garante que o item pertence a quem está pedindo (ou que é um admin) */
async function carregarComoDono(req, id) {
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { empreendedor: { select: { id: true, usuarioId: true, nomeNegocio: true } } },
  });
  if (!produto) throw erroHttp(404, 'Produto não encontrado');
  const dono = produto.empreendedor.usuarioId && produto.empreendedor.usuarioId === req.usuario?.id;
  if (!ehAdmin(req.usuario) && !dono) {
    throw erroHttp(403, 'Você só pode alterar itens do seu próprio negócio');
  }
  return produto;
}

// GET /api/produtos?categoria=&tipo=&busca=&empreendedorId=&bairro=
export async function listarProdutos(req, res, next) {
  try {
    const { categoria, tipo, busca, empreendedorId, bairro } = req.query;
    const meuNegocioId = await idDoMeuNegocio(req);

    const where = {};
    if (tipo) where.tipo = tipo;
    if (empreendedorId) where.empreendedorId = Number(empreendedorId);
    if (busca) {
      where.OR = [{ nome: { contains: busca } }, { descricao: { contains: busca } }];
    }

    // categoria e bairro pertencem ao empreendedor, então filtram pela relação
    const filtroEmpreendedor = {};
    if (categoria) filtroEmpreendedor.categoria = categoria;
    if (bairro) filtroEmpreendedor.bairro = bairro;

    // Quem não é admin nem dono só vê itens disponíveis de negócios ativos
    const vendoOProprioNegocio = Boolean(meuNegocioId) && Number(empreendedorId) === meuNegocioId;
    if (!ehAdmin(req.usuario) && !vendoOProprioNegocio) {
      where.disponivel = true;
      filtroEmpreendedor.ativo = true;
    }
    if (Object.keys(filtroEmpreendedor).length > 0) where.empreendedor = filtroEmpreendedor;

    const paginacao = lerPaginacao(req.query);
    const consulta = {
      where,
      orderBy: { createdAt: 'desc' },
      include: { empreendedor: empreendedorResumo },
    };

    if (!paginacao.ativa) {
      const produtos = await prisma.produto.findMany(consulta);
      return res.json({ success: true, total: produtos.length, data: produtos });
    }

    const [total, produtos] = await Promise.all([
      prisma.produto.count({ where }),
      prisma.produto.findMany({ ...consulta, skip: paginacao.skip, take: paginacao.take }),
    ]);
    res.json({ success: true, total, data: produtos, paginacao: resumoPaginacao(paginacao, total) });
  } catch (erro) {
    next(erro);
  }
}

// GET /api/produtos/:id
export async function buscarProduto(req, res, next) {
  try {
    const id = parseId(req.params.id);

    const produto = await prisma.produto.findUnique({
      where: { id },
      include: { empreendedor: true },
    });

    if (!produto) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    // Item indisponível ou de negócio inativo só aparece para o dono e o admin
    const dono = produto.empreendedor.usuarioId && produto.empreendedor.usuarioId === req.usuario?.id;
    const escondido = !produto.disponivel || !produto.empreendedor.ativo;
    if (escondido && !ehAdmin(req.usuario) && !dono) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    res.json({ success: true, data: produto });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/produtos
export async function criarProduto(req, res, next) {
  try {
    const negocio = await prisma.empreendedor.findUnique({
      where: { id: req.body.empreendedorId },
      select: { id: true, usuarioId: true, nomeNegocio: true },
    });
    if (!negocio) {
      return res.status(400).json({
        success: false,
        message: 'Referência inválida: o registro relacionado não existe',
        errors: [{ campo: 'empreendedorId', mensagem: 'Empreendedor não encontrado' }],
      });
    }
    // Empreendedor só publica no próprio negócio
    const dono = negocio.usuarioId && negocio.usuarioId === req.usuario?.id;
    if (!ehAdmin(req.usuario) && !dono) {
      throw erroHttp(403, 'Você só pode publicar no seu próprio negócio');
    }

    const produto = await prisma.produto.create({
      data: req.body,
      include: { empreendedor: empreendedorResumo },
    });

    await registrarLog(req, {
      acao: 'CREATE',
      tipoEntidade: 'Produto',
      entidadeId: produto.id,
      descricao: `Publicação criada: ${produto.nome} (${produto.tipo}) em ${negocio.nomeNegocio}`,
      depois: req.body,
    });

    res.status(201).json({ success: true, message: 'Produto cadastrado com sucesso', data: produto });
  } catch (erro) {
    next(erro);
  }
}

// PUT /api/produtos/:id
export async function atualizarProduto(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await carregarComoDono(req, id);

    const produto = await prisma.produto.update({
      where: { id },
      data: req.body,
      include: { empreendedor: empreendedorResumo },
    });
    if ('imagem' in req.body) await apagarSeTrocou(prisma, antes.imagem, produto.imagem);

    // Compara só os campos do próprio item, sem o objeto do empreendedor
    const { empreendedor: relacaoAntes, ...antesLimpo } = antes;
    const { empreendedor: relacaoDepois, ...depoisLimpo } = produto;
    void relacaoAntes;
    void relacaoDepois;
    const mudou = diferencas(antesLimpo, depoisLimpo);
    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Produto',
      entidadeId: id,
      descricao: `Publicação atualizada: ${produto.nome}`,
      antes: mudou.antes,
      depois: mudou.depois,
    });

    res.json({ success: true, message: 'Produto atualizado com sucesso', data: produto });
  } catch (erro) {
    next(erro);
  }
}

// DELETE /api/produtos/:id
export async function excluirProduto(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const antes = await carregarComoDono(req, id);

    await prisma.produto.delete({ where: { id } });
    await apagarSeOrfa(prisma, antes.imagem);

    await registrarLog(req, {
      acao: 'DELETE',
      tipoEntidade: 'Produto',
      entidadeId: id,
      descricao: `Publicação excluída: ${antes.nome} (${antes.empreendedor.nomeNegocio})`,
      antes: { nome: antes.nome, tipo: antes.tipo, preco: antes.preco, disponivel: antes.disponivel },
    });

    res.json({ success: true, message: 'Produto excluído com sucesso' });
  } catch (erro) {
    next(erro);
  }
}
