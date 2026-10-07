// Rotas de divulgações nas redes oficiais
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import {
  atualizarDivulgacao,
  atualizarDivulgacaoSchema,
  criarDivulgacao,
  criarDivulgacaoSchema,
  excluirDivulgacao,
  listarDivulgacoes,
  minhasDivulgacoes,
} from '../controllers/divulgacaoController.js';

const router = Router();
const admin = [autenticar, exigirPerfil(PERFIS.ADMIN)];

router.get('/minhas', autenticar, minhasDivulgacoes);
router.get('/', ...admin, listarDivulgacoes);
router.post('/', ...admin, validateBody(criarDivulgacaoSchema), criarDivulgacao);
router.put('/:id', ...admin, validateBody(atualizarDivulgacaoSchema), atualizarDivulgacao);
router.delete('/:id', ...admin, excluirDivulgacao);

export default router;
