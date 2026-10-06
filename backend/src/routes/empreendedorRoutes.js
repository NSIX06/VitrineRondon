// Rotas de Empreendedores
// Leitura é pública; escrita exige login, e cada um só mexe no que é seu.
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import {
  listarEmpreendedores,
  buscarEmpreendedor,
  criarEmpreendedor,
  atualizarEmpreendedor,
  excluirEmpreendedor,
  meuNegocio,
  criarMeuNegocio,
  criarEmpreendedorSchema,
  atualizarEmpreendedorSchema,
} from '../controllers/empreendedorController.js';

const router = Router();

// /meu precisa vir antes de /:id para não ser capturado como id
router.get('/meu', autenticar, meuNegocio);
router.post('/meu', autenticar, validateBody(criarEmpreendedorSchema), criarMeuNegocio);

router.get('/', listarEmpreendedores);
router.get('/:id', buscarEmpreendedor);

// Cadastro avulso e exclusão são da administração
router.post('/', autenticar, exigirPerfil(PERFIS.ADMIN), validateBody(criarEmpreendedorSchema), criarEmpreendedor);
router.delete('/:id', autenticar, exigirPerfil(PERFIS.ADMIN), excluirEmpreendedor);

// Edição: admin ou o dono (verificado no controller)
router.put('/:id', autenticar, validateBody(atualizarEmpreendedorSchema), atualizarEmpreendedor);

export default router;
