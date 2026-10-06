// Rotas de Usuários — área administrativa.
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import { listarUsuarios, alterarSituacao, situacaoSchema } from '../controllers/usuarioController.js';

const router = Router();

router.use(autenticar, exigirPerfil(PERFIS.ADMIN));

router.get('/', listarUsuarios);
router.patch('/:id/situacao', validateBody(situacaoSchema), alterarSituacao);

export default router;
