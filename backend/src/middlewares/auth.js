// Autenticação por JWT e controle de acesso por perfil
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

export const PERFIS = {
  COMUM: 'COMUM',
  EMPREENDEDOR: 'EMPREENDEDOR',
  ADMIN: 'ADMIN',
};

function segredo() {
  const chave = process.env.JWT_SECRET;
  if (!chave) throw new Error('JWT_SECRET não definido no .env');
  return chave;
}

/**
 * A API consegue abrir sessões? Sem JWT_SECRET, ou com um JWT_EXPIRES_IN que
 * o jsonwebtoken não entende, todo login certo e todo cadastro dão erro 500,
 * enquanto o resto do site funciona. Devolve o problema, ou null.
 */
export function problemaNaSessao() {
  if (!process.env.JWT_SECRET) return 'JWT_SECRET não definido';
  try {
    gerarToken({ id: 0, perfil: PERFIS.COMUM });
    return null;
  } catch (erro) {
    return `token não pôde ser gerado (${erro.message}); confira JWT_EXPIRES_IN`;
  }
}

/**
 * Gera o token de sessão com o mínimo necessário (id e perfil). O jti é o
 * identificador desta sessão: é ele que o logout marca como encerrado.
 */
export function gerarToken(usuario) {
  return jwt.sign({ sub: usuario.id, perfil: usuario.perfil }, segredo(), {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    jwtid: randomUUID(),
  });
}

/** Lê o token do cabeçalho Authorization: Bearer <token> */
function extrairToken(req) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');
  return tipo === 'Bearer' && token ? token : null;
}

/**
 * Confere o token e lê a conta no banco: o perfil e a situação valem os de
 * agora, não os gravados no token. Token inválido ou expirado lança erro.
 */
async function usuarioDoToken(token) {
  // Só HS256: a lista explícita impede trocar o algoritmo pelo cabeçalho do token
  const payload = jwt.verify(token, segredo(), { algorithms: ['HS256'] });
  const [usuario, encerrada] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, senhaAlteradaEm: true },
    }),
    // Sessão encerrada pelo botão Sair: o token deixa de valer antes de expirar
    payload.jti ? prisma.sessaoEncerrada.findUnique({ where: { jti: payload.jti }, select: { jti: true } }) : null,
  ]);
  if (!usuario || encerrada) return null;
  // Senha trocada depois que o token foi emitido: a sessão antiga não vale mais
  // (iat é em segundos; o token criado no mesmo segundo da troca continua válido)
  const { senhaAlteradaEm, ...dados } = usuario;
  if (senhaAlteradaEm && payload.iat < Math.floor(senhaAlteradaEm.getTime() / 1000)) return null;
  // Identificador e validade desta sessão ficam fora do objeto público do usuário
  Object.defineProperty(dados, 'sessao', { value: { jti: payload.jti ?? null, exp: payload.exp }, enumerable: false });
  return dados;
}

/**
 * Carrega o usuário do token, se houver. Não bloqueia a requisição:
 * rotas públicas usam isso para saber quem está navegando (ex.: dono vê o próprio item inativo).
 */
export async function autenticarOpcional(req, res, next) {
  const token = extrairToken(req);
  if (!token) return next();
  try {
    const usuario = await usuarioDoToken(token);
    if (usuario && usuario.ativo) req.usuario = usuario;
  } catch {
    // token inválido ou expirado: segue como visitante
  }
  next();
}

/** Exige usuário autenticado e ativo */
export async function autenticar(req, res, next) {
  // autenticarOpcional já pode ter carregado o usuário nesta requisição
  if (req.usuario) return next();
  const token = extrairToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Faça login para continuar' });
  }
  try {
    const usuario = await usuarioDoToken(token);
    if (!usuario) {
      return res.status(401).json({ success: false, message: 'Sessão inválida. Faça login novamente' });
    }
    if (!usuario.ativo) {
      return res.status(403).json({ success: false, message: 'Conta desativada. Fale com a administração' });
    }
    req.usuario = usuario;
    next();
  } catch (erro) {
    const expirou = erro.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: expirou ? 'Sessão expirada. Faça login novamente' : 'Sessão inválida. Faça login novamente',
    });
  }
}

/** Exige que o usuário autenticado tenha um dos perfis informados */
export function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ success: false, message: 'Faça login para continuar' });
    }
    if (!perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ success: false, message: 'Você não tem permissão para esta ação' });
    }
    next();
  };
}

export const ehAdmin = (usuario) => usuario?.perfil === PERFIS.ADMIN;
