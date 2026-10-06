// Rotas da central de ajuda.
// Ler as perguntas ativas é público, como o resto da vitrine: quem tem dúvida
// antes de criar conta é justamente quem mais precisa delas. Criar, editar,
// excluir e ver as inativas é da administração, e a trava fica aqui no
// servidor, não só no botão escondido da tela.
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import {
  listarFaqPublico,
  listarFaqCompleto,
  criarFaq,
  atualizarFaq,
  excluirFaq,
  criarFaqSchema,
  atualizarFaqSchema,
} from '../controllers/faqController.js';

const router = Router();

const somenteAdmin = [autenticar, exigirPerfil(PERFIS.ADMIN)];

router.get('/', listarFaqPublico);
router.get('/todas', ...somenteAdmin, listarFaqCompleto);
router.post('/', ...somenteAdmin, validateBody(criarFaqSchema), criarFaq);
router.put('/:id', ...somenteAdmin, validateBody(atualizarFaqSchema), atualizarFaq);
router.delete('/:id', ...somenteAdmin, excluirFaq);

export default router;
