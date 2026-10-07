// Limites de requisição por IP
import rateLimit from 'express-rate-limit';

const producao = process.env.NODE_ENV === 'production';
const ENDERECOS_LOCAIS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Fora de produção, a própria máquina não entra na conta. As suítes de teste
 * fazem centenas de chamadas de localhost, e o navegador do desenvolvedor
 * (inclusive o modo celular) usa o mesmo endereço: sem isso, uma rodada de
 * testes esgotava a cota e a vitrine inteira respondia "Muitas requisições".
 */
const ignorarMaquinaLocal = (req) => !producao && ENDERECOS_LOCAIS.has(req.ip);

/** Resposta no mesmo formato do resto da API, em vez do texto padrão da lib */
function recusar(mensagem) {
  return (req, res) => {
    res.status(429).json({ success: false, message: mensagem });
  };
}

/**
 * Teto global da API. Folgado de propósito: navegar no catálogo dispara várias
 * chamadas por tela e o objetivo aqui é só cortar abuso automatizado.
 */
export const limitePadrao = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 600,
  skip: ignorarMaquinaLocal,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: recusar('Muitas requisições. Tente novamente em alguns minutos.'),
});

/**
 * Envio de imagens: cada chamada processa um arquivo de até 5 MB, então o teto
 * é bem menor que o geral. Dá para cadastrar um catálogo inteiro numa sentada.
 */
export const limiteUpload = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  skip: ignorarMaquinaLocal,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: recusar('Muitas imagens enviadas em pouco tempo. Aguarde alguns minutos e tente de novo.'),
});

/**
 * Limite apertado para login e cadastro: é o que impede força bruta de senha.
 * Só conta as tentativas que falharam, então quem acerta a senha não é punido.
 */
export const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  skip: ignorarMaquinaLocal,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: recusar('Muitas tentativas de autenticação. Aguarde 15 minutos e tente novamente.'),
});
