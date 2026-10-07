// Controller de envio de imagens do computador.
// O corpo da requisição é o próprio arquivo (Content-Type image/...), sem
// multipart: um arquivo por chamada, e quem salva o cadastro depois manda só o
// caminho devolvido aqui.
import { salvarImagem } from '../services/imagens.js';
import { erroHttp } from '../utils/erros.js';

// POST /api/uploads/imagem  -> qualquer usuário logado
export async function enviarImagem(req, res, next) {
  try {
    // express.raw só preenche o corpo quando o tipo está na lista aceita
    if (!Buffer.isBuffer(req.body)) {
      throw erroHttp(415, 'Envie um arquivo JPG, PNG, WebP, GIF ou AVIF');
    }
    const url = await salvarImagem(req.body);
    res.status(201).json({ success: true, message: 'Imagem enviada', data: { url } });
  } catch (erro) {
    next(erro);
  }
}
