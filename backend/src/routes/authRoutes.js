// Rotas de autenticação e cadastro
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar } from '../middlewares/auth.js';
import { limiteCadastro, limiteConferencia, limiteLogin, limiteRecuperacao } from '../middlewares/rateLimit.js';
import {
  registrarComum,
  registrarEmpreendedor,
  login,
  logout,
  me,
  registrarComumSchema,
  registrarEmpreendedorSchema,
  conferirConta,
  conferirContaSchema,
  loginSchema,
  esqueciSenha,
  verificarRedefinicao,
  redefinirSenha,
  esqueciSenhaSchema,
  codigoRedefinicaoSchema,
  redefinirSenhaSchema,
} from '../controllers/authController.js';
import {
  listarProvedores,
  iniciarGoogle,
  retornoGoogle,
  sessaoGoogle,
  vincularGoogle,
  codigoSchema,
  vinculoSchema,
} from '../controllers/loginSocialController.js';

const router = Router();

router.post('/registrar', limiteCadastro, limiteLogin, validateBody(registrarComumSchema), registrarComum);
router.post('/registrar-empreendedor', limiteCadastro, limiteLogin, validateBody(registrarEmpreendedorSchema), registrarEmpreendedor);
router.post('/conferir-conta', limiteConferencia, validateBody(conferirContaSchema), conferirConta);
router.post('/login', limiteLogin, validateBody(loginSchema), login);

// Login com Google (cliente que avalia): ver controllers/loginSocialController.js
router.get('/provedores', listarProvedores);
router.get('/google/iniciar', iniciarGoogle);
router.get('/google/retorno', retornoGoogle);
router.post('/google/sessao', limiteLogin, validateBody(codigoSchema), sessaoGoogle);
// Pede a senha da conta existente: mesmo limite do login contra força bruta
router.post('/google/vincular', limiteLogin, validateBody(vinculoSchema), vincularGoogle);
router.post('/esqueci-senha', limiteRecuperacao, validateBody(esqueciSenhaSchema), esqueciSenha);
router.post('/redefinir-senha/verificar', limiteLogin, validateBody(codigoRedefinicaoSchema), verificarRedefinicao);
router.post('/redefinir-senha', limiteLogin, validateBody(redefinirSenhaSchema), redefinirSenha);
router.post('/logout', autenticar, logout);
router.get('/me', autenticar, me);

export default router;
