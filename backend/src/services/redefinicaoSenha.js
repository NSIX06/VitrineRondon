// Código do link de "esqueci a senha"
import crypto from 'node:crypto';

/** Por quanto tempo o link vale */
export const VALIDADE_MINUTOS = 30;

/** Intervalo mínimo entre dois e-mails para a mesma conta (evita encher a caixa de alguém) */
export const INTERVALO_MINIMO_MINUTOS = 2;

/** Código aleatório que vai no link (32 bytes, seguro para URL) */
export function gerarCodigo() {
  return crypto.randomBytes(32).toString('base64url');
}

/** O banco guarda só o SHA-256 do código: quem lê a tabela não consegue usar o link */
export function hashDoCodigo(codigo) {
  return crypto.createHash('sha256').update(String(codigo)).digest('hex');
}

/** Formato de um código gerado aqui (evita ir ao banco com lixo) */
export const codigoValido = (codigo) => typeof codigo === 'string' && /^[A-Za-z0-9_-]{43}$/.test(codigo);

/** Link enviado por e-mail */
export function linkDeRedefinicao(codigo, env = process.env) {
  const site = (env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${site}/redefinir-senha?codigo=${codigo}`;
}

/** Situação de um pedido guardado: 'valido', 'usado' ou 'expirado' */
export function situacaoDoPedido(pedido, agora = new Date()) {
  if (!pedido) return 'invalido';
  if (pedido.usadoEm) return 'usado';
  if (pedido.expiraEm <= agora) return 'expirado';
  return 'valido';
}
