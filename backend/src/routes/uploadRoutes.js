// Rotas de envio de arquivos
// Qualquer conta logada pode enviar: quem ainda está cadastrando o primeiro
// negócio tem perfil comum e já precisa mandar a foto.
import express, { Router } from 'express';
import { autenticar } from '../middlewares/auth.js';
import { limiteUpload } from '../middlewares/rateLimit.js';
import { enviarImagem } from '../controllers/uploadController.js';
import { TAMANHO_MAXIMO, TIPOS_ACEITOS } from '../services/imagens.js';

const router = Router();

router.post(
  '/imagem',
  autenticar,
  limiteUpload,
  express.raw({ type: TIPOS_ACEITOS, limit: TAMANHO_MAXIMO }),
  enviarImagem
);

export default router;
