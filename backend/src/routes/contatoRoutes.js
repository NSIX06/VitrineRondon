// Rotas de Contatos
// Enviar mensagem é público; ler e gerenciar é da administração,
// porque as mensagens contêm dados pessoais de quem escreveu.
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import {
  listarContatos,
  criarContato,
  marcarComoLido,
  excluirContato,
  criarContatoSchema,
} from '../controllers/contatoController.js';

const router = Router();

const somenteAdmin = [autenticar, exigirPerfil(PERFIS.ADMIN)];

router.post('/', validateBody(criarContatoSchema), criarContato);
router.get('/', ...somenteAdmin, listarContatos);
router.patch('/:id/lido', ...somenteAdmin, marcarComoLido);
router.delete('/:id', ...somenteAdmin, excluirContato);

export default router;
