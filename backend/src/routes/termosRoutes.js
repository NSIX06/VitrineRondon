// Documentos legais: versão vigente e conteúdo em markdown
import { Router } from 'express';
import { lerTermo, TIPOS_TERMO, versaoVigente } from '../services/termos.js';

const router = Router();

// GET /api/termos  -> versão vigente e lista de documentos
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      versao: versaoVigente(),
      documentos: Object.entries(TIPOS_TERMO).map(([tipo, def]) => ({ tipo, titulo: def.titulo })),
    },
  });
});

// GET /api/termos/:tipo  -> TERMOS_DE_USO | POLITICA_PRIVACIDADE
router.get('/:tipo', async (req, res, next) => {
  try {
    const termo = await lerTermo(req.params.tipo);
    if (!termo) {
      return res.status(404).json({ success: false, message: 'Documento não encontrado' });
    }
    res.json({ success: true, data: termo });
  } catch (erro) {
    next(erro);
  }
});

export default router;
