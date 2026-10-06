// Rotas de autenticação e cadastro
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { autenticar } from '../middlewares/auth.js';
import { limiteLogin } from '../middlewares/rateLimit.js';
import {
  registrarComum,
  registrarEmpreendedor,
  login,
  logout,
  me,
  registrarComumSchema,
  registrarEmpreendedorSchema,
  loginSchema,
} from '../controllers/authController.js';

const router = Router();

router.post('/registrar', limiteLogin, validateBody(registrarComumSchema), registrarComum);
router.post('/registrar-empreendedor', limiteLogin, validateBody(registrarEmpreendedorSchema), registrarEmpreendedor);
router.post('/login', limiteLogin, validateBody(loginSchema), login);
router.post('/logout', autenticar, logout);
router.get('/me', autenticar, me);

export default router;
