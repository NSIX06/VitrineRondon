// Autenticação por JWT e controle de acesso por perfil
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

/** Gera o token de sessão com o mínimo necessário (id e perfil) */
export function gerarToken(usuario) {
  return jwt.sign({ sub: usuario.id, perfil: usuario.perfil }, segredo(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

/** Lê o token do cabeçalho Authorization: Bearer <token> */
function extrairToken(req) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');
  return tipo === 'Bearer' && token ? token : null;
}

/**
 * Carrega o usuário do token, se houver. Não bloqueia a requisição:
 * rotas públicas usam isso para saber quem está navegando (ex.: dono vê o próprio item inativo).
 */
export async function autenticarOpcional(req, res, next) {
  const token = extrairToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, segredo());
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    });
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
    const payload = jwt.verify(token, segredo());
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    });
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
