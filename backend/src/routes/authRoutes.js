// Rotas de autenticação e cadastro
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar } from '../middlewares/auth.js';
import { limiteCadastro, limiteLogin, limiteRecuperacao } from '../middlewares/rateLimit.js';
import {
  registrarComum,
  registrarEmpreendedor,
  login,
  logout,
  me,
  registrarComumSchema,
  registrarEmpreendedorSchema,
  loginSchema,
  esqueciSenha,
  verificarRedefinicao,
  redefinirSenha,
  esqueciSenhaSchema,
  codigoRedefinicaoSchema,
  redefinirSenhaSchema,
} from '../controllers/authController.js';

const router = Router();

router.post('/registrar', limiteCadastro, limiteLogin, validateBody(registrarComumSchema), registrarComum);
router.post('/registrar-empreendedor', limiteCadastro, limiteLogin, validateBody(registrarEmpreendedorSchema), registrarEmpreendedor);
router.post('/login', limiteLogin, validateBody(loginSchema), login);
router.post('/esqueci-senha', limiteRecuperacao, validateBody(esqueciSenhaSchema), esqueciSenha);
router.post('/redefinir-senha/verificar', limiteLogin, validateBody(codigoRedefinicaoSchema), verificarRedefinicao);
router.post('/redefinir-senha', limiteLogin, validateBody(redefinirSenhaSchema), redefinirSenha);
router.post('/logout', autenticar, logout);
router.get('/me', autenticar, me);

export default router;
