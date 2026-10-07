// Rotas de métricas
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar } from '../middlewares/auth.js';
import { limiteMetricas } from '../middlewares/rateLimit.js';
import { desempenhoDoMeuNegocio, eventoSchema, registrarEventoPublico } from '../controllers/metricaController.js';

const router = Router();

router.post('/', limiteMetricas, validateBody(eventoSchema), registrarEventoPublico);
router.get('/meu-negocio', autenticar, desempenhoDoMeuNegocio);

export default router;
