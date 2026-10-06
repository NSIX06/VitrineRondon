// Controller de Configurações do site — hoje só o banner da página inicial.
// Leitura pública (a Home precisa dela para qualquer visitante); escrita só
// da administração, com registro na auditoria.
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { registrarLog } from '../services/auditoria.js';

const CHAVE_BANNER = 'banner_home';

// Sem imagem definida, a Home mostra a foto do item mais recente da vitrine
const BANNER_VAZIO = { imagemUrl: null, legenda: null };

export const bannerSchema = z.object({
  imagemUrl: z
    .url({ error: 'Informe o endereço completo da imagem, começando com http:// ou https://' })
    .max(500)
    .nullable(),
  legenda: z.string().trim().max(120, 'A legenda pode ter até 120 caracteres').nullable().optional(),
});

/** Lê o banner guardado; valor corrompido ou ausente vira "sem banner" */
async function lerBanner() {
  const registro = await prisma.configuracao.findUnique({ where: { chave: CHAVE_BANNER } });
  if (!registro?.valor) return { ...BANNER_VAZIO, atualizadoEm: null };
  try {
    const valor = JSON.parse(registro.valor);
    return {
      imagemUrl: valor.imagemUrl ?? null,
      legenda: valor.legenda ?? null,
      atualizadoEm: registro.updatedAt,
    };
  } catch {
    return { ...BANNER_VAZIO, atualizadoEm: null };
  }
}

// GET /api/configuracoes/banner
export async function obterBanner(req, res, next) {
  try {
    res.json({ success: true, data: await lerBanner() });
  } catch (erro) {
    next(erro);
  }
}

// PUT /api/configuracoes/banner  -> só administrador
export async function salvarBanner(req, res, next) {
  try {
    const antes = await lerBanner();
    // Legenda vazia vira null; sem imagem, a legenda também não faz sentido
    const imagemUrl = req.body.imagemUrl ?? null;
    const legenda = imagemUrl ? req.body.legenda?.trim() || null : null;
    const depois = { imagemUrl, legenda };

    await prisma.configuracao.upsert({
      where: { chave: CHAVE_BANNER },
      create: { chave: CHAVE_BANNER, valor: JSON.stringify(depois) },
      update: { valor: JSON.stringify(depois) },
    });

    await registrarLog(req, {
      acao: 'UPDATE',
      tipoEntidade: 'Configuracao',
      descricao: imagemUrl
        ? 'Banner da página inicial trocado pela administração'
        : 'Banner da página inicial removido: volta a mostrar o item mais recente',
      antes: { imagemUrl: antes.imagemUrl, legenda: antes.legenda },
      depois,
    });

    res.json({
      success: true,
      message: imagemUrl ? 'Banner atualizado' : 'Banner removido',
      data: await lerBanner(),
    });
  } catch (erro) {
    next(erro);
  }
}
