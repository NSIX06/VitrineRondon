// Rotas de Produtos e Serviços
// Leitura é pública; escrita exige login, e o dono só mexe no próprio catálogo.
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar } from '../middlewares/auth.js';
import {
  listarProdutos,
  buscarProduto,
  criarProduto,
  atualizarProduto,
  excluirProduto,
  criarProdutoSchema,
  atualizarProdutoSchema,
} from '../controllers/produtoController.js';

const router = Router();

router.get('/', listarProdutos);
router.get('/:id', buscarProduto);

// A checagem de dono fica no controller (admin ou dono do negócio)
router.post('/', autenticar, validateBody(criarProdutoSchema), criarProduto);
router.put('/:id', autenticar, validateBody(atualizarProdutoSchema), atualizarProduto);
router.delete('/:id', autenticar, excluirProduto);

export default router;
