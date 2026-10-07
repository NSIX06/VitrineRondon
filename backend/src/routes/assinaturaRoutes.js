// Rotas de planos e assinaturas
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import {
  assinar,
  cancelarMinha,
  escolherPlanoSchema,
  listarAssinaturas,
  listarPlanosPublico,
  minhaAssinatura,
  simularAprovacao,
  simularFalha,
  trocarPlano,
} from '../controllers/assinaturaController.js';

export const planoRoutes = Router();
planoRoutes.get('/', listarPlanosPublico);

const router = Router();

// "minha" vem antes de "/:id" para não ser lida como id
router.get('/minha', autenticar, minhaAssinatura);
router.put('/minha', autenticar, validateBody(escolherPlanoSchema), trocarPlano);
router.delete('/minha', autenticar, cancelarMinha);
router.post('/', autenticar, validateBody(escolherPlanoSchema), assinar);
router.get('/', autenticar, exigirPerfil(PERFIS.ADMIN), listarAssinaturas);

// Demonstração (admin, e só fora de produção: em produção respondem 404)
router.post('/:id/simular-aprovacao', autenticar, exigirPerfil(PERFIS.ADMIN), simularAprovacao);
router.post('/:id/simular-falha', autenticar, exigirPerfil(PERFIS.ADMIN), simularFalha);

export default router;
