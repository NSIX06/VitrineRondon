// Rotas de Configurações do site
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import { obterBanner, salvarBanner, bannerSchema } from '../controllers/configuracaoController.js';

const router = Router();

router.get('/banner', obterBanner);
router.put('/banner', autenticar, exigirPerfil(PERFIS.ADMIN), validateBody(bannerSchema), salvarBanner);

export default router;
