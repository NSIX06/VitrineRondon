// Rotas das avaliações. Listar e publicar ficam em /empreendedores/:id/avaliacoes
// (avaliacoesDoNegocio, abaixo); aqui ficam as ações sobre uma avaliação já
// publicada. A trava de quem pode o quê fica no controller e nestes
// middlewares, no servidor, não só nos botões da tela.
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import { limiteAvaliacao, limiteDenuncia } from '../middlewares/rateLimit.js';
import {
  listarAvaliacoes,
  criarAvaliacao,
  atualizarAvaliacao,
  excluirAvaliacao,
  denunciarAvaliacao,
  listarParaModeracao,
  moderarAvaliacao,
  avaliacaoSchema,
  denunciaSchema,
  moderacaoSchema,
} from '../controllers/avaliacaoController.js';

const router = Router();
const somenteAdmin = [autenticar, exigirPerfil(PERFIS.ADMIN)];

router.get('/', ...somenteAdmin, listarParaModeracao);
router.put('/:id', autenticar, limiteAvaliacao, validateBody(avaliacaoSchema), atualizarAvaliacao);
router.delete('/:id', autenticar, excluirAvaliacao);
router.post('/:id/denuncias', autenticar, limiteDenuncia, validateBody(denunciaSchema), denunciarAvaliacao);
router.put('/:id/moderacao', ...somenteAdmin, validateBody(moderacaoSchema), moderarAvaliacao);

/** Montado em /empreendedores/:id/avaliacoes */
export const avaliacoesDoNegocio = Router({ mergeParams: true });
avaliacoesDoNegocio.get('/', listarAvaliacoes);
avaliacoesDoNegocio.post('/', autenticar, limiteAvaliacao, validateBody(avaliacaoSchema), criarAvaliacao);

export default router;
