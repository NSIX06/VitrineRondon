// Login por provedor externo (OpenID Connect), começando pelo Google.
//
// Fluxo "authorization code" com PKCE, feito todo no servidor:
//   /auth/google/iniciar  -> Google -> /auth/google/retorno -> site (#codigo=...)
// O site troca o código (uso único, 60 s) pela mesma sessão JWT do login por
// senha: não existe um segundo sistema de sessão. O id_token é validado aqui
// (assinatura pelas chaves públicas do provedor, emissor, audiência, validade,
// nonce e e-mail verificado); nada do que identifica a pessoa vem da tela.
//
// Provedor novo (Microsoft, Apple...) = uma entrada a mais em PROVEDORES.
import { createHash, createPublicKey, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { PERFIS } from '../middlewares/auth.js';
import { montarAceites } from './termos.js';
import { contextoDaRequisicao } from './auditoria.js';

const producao = () => process.env.NODE_ENV === 'production';

/**
 * Endereços de cada provedor. Fora de produção, os do Google podem apontar
 * para um provedor simulado (testes de ponta a ponta); em produção, nunca.
 */
export function configuracaoDoProvedor(nome = 'GOOGLE') {
  if (nome !== 'GOOGLE') return null;
  const local = (variavel, padrao) => (!producao() && process.env[variavel]) || padrao;
  return {
    nome: 'GOOGLE',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    urlAutorizacao: local('GOOGLE_URL_AUTORIZACAO', 'https://accounts.google.com/o/oauth2/v2/auth'),
    urlToken: local('GOOGLE_URL_TOKEN', 'https://oauth2.googleapis.com/token'),
    urlChaves: local('GOOGLE_URL_CHAVES', 'https://www.googleapis.com/oauth2/v3/certs'),
    emissores: local('GOOGLE_EMISSOR', '') ? [process.env.GOOGLE_EMISSOR] : ['https://accounts.google.com', 'accounts.google.com'],
  };
}

/** O provedor tem cliente e segredo configurados? */
export function provedorConfigurado(nome = 'GOOGLE') {
  const config = configuracaoDoProvedor(nome);
  return Boolean(config?.clientId && config?.clientSecret);
}

// ---------------------------------------------------------------------------
// Tokens temporários do fluxo (estado, código de troca, vínculo pendente).
// Assinados com uma chave derivada do JWT_SECRET, diferente da das sessões:
// assim nenhum deles serve como token de sessão, nem o contrário.
// ---------------------------------------------------------------------------
function chaveDoFluxo() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não definido no .env');
  return createHash('sha256').update(`${process.env.JWT_SECRET}:login-social`).digest();
}

export function assinarTemporario(dados, segundos) {
  return jwt.sign(dados, chaveDoFluxo(), { algorithm: 'HS256', expiresIn: segundos, jwtid: randomBytes(16).toString('hex') });
}

/** Confere e devolve o conteúdo; null se inválido, expirado ou de outro tipo */
export function lerTemporario(token, tipo) {
  try {
    const dados = jwt.verify(String(token || ''), chaveDoFluxo(), { algorithms: ['HS256'] });
    return dados.tipo === tipo ? dados : null;
  } catch {
    return null;
  }
}

/** Texto aleatório para state, nonce e PKCE */
export const aleatorio = (bytes = 32) => randomBytes(bytes).toString('base64url');

/** Desafio PKCE (S256) a partir do verificador */
export const desafioPkce = (verificador) => createHash('sha256').update(verificador).digest('base64url');

/**
 * Caminho interno para voltar depois do login. Só caminhos do próprio site
 * ("/empreendedores/3#avaliacoes"): nada de "//outro.site", esquema ou barra
 * invertida, para o login não virar um redirecionador aberto.
 */
export function destinoSeguro(destino) {
  const texto = String(destino || '');
  if (!texto.startsWith('/') || texto.startsWith('//') || /[\\\s]/.test(texto) || texto.length > 300) return '/';
  return texto;
}

// ---------------------------------------------------------------------------
// Validação do id_token
// ---------------------------------------------------------------------------
const chavesEmCache = new Map(); // url -> { chaves, ate }
const VALIDADE_CHAVES_MS = 60 * 60 * 1000;

async function chavesPublicas(url, { renovar = false } = {}) {
  const guardadas = chavesEmCache.get(url);
  if (guardadas && !renovar && guardadas.ate > Date.now()) return guardadas.chaves;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`chaves do provedor indisponíveis (${resposta.status})`);
  const { keys = [] } = await resposta.json();
  chavesEmCache.set(url, { chaves: keys, ate: Date.now() + VALIDADE_CHAVES_MS });
  return keys;
}

/** Para os testes: esquece as chaves guardadas */
export function esquecerChaves() {
  chavesEmCache.clear();
}

/**
 * Valida o id_token e devolve { sujeito, email, nome }. Lança erro com
 * `motivo` em qualquer falha: assinatura, emissor, audiência, validade,
 * nonce ou e-mail não verificado.
 */
export async function validarIdToken(idToken, { config, nonce }) {
  const falha = (motivo) => Object.assign(new Error(`id_token recusado: ${motivo}`), { motivo });
  const decodificado = jwt.decode(idToken, { complete: true });
  if (!decodificado?.header?.kid) throw falha('sem identificação da chave');
  if (decodificado.header.alg !== 'RS256') throw falha('algoritmo inesperado');

  // Chave nova do provedor (rotação): busca a lista de novo uma vez
  let jwk = (await chavesPublicas(config.urlChaves)).find((chave) => chave.kid === decodificado.header.kid);
  if (!jwk) jwk = (await chavesPublicas(config.urlChaves, { renovar: true })).find((chave) => chave.kid === decodificado.header.kid);
  if (!jwk) throw falha('chave desconhecida');

  let dados;
  try {
    dados = jwt.verify(idToken, createPublicKey({ key: jwk, format: 'jwk' }), {
      algorithms: ['RS256'],
      audience: config.clientId,
      issuer: config.emissores,
      clockTolerance: 60,
    });
  } catch (erro) {
    throw falha(erro.message);
  }
  if (!dados.sub) throw falha('sem identificador da conta');
  if (dados.nonce !== nonce) throw falha('nonce diferente');
  if (!dados.email || dados.email_verified !== true) throw falha('e-mail não verificado');

  return {
    sujeito: String(dados.sub),
    email: String(dados.email).trim().toLowerCase(),
    nome: String(dados.name || dados.given_name || '').trim().slice(0, 150) || 'Cliente',
  };
}

/** Troca o código de autorização pelos tokens do provedor (com o verificador PKCE) */
export async function trocarCodigo({ config, codigo, verificador, redirectUri }) {
  const resposta = await fetch(config.urlToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: codigo,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      code_verifier: verificador,
    }),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !dados.id_token) {
    throw Object.assign(new Error(`troca do código recusada (${resposta.status})`), { motivo: 'troca' });
  }
  return dados.id_token;
}

// ---------------------------------------------------------------------------
// Identidade interna
// ---------------------------------------------------------------------------
const CONTA = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  perfil: true,
  ativo: true,
  createdAt: true,
  empreendedor: { select: { id: true } },
};

/**
 * Acha ou cria a conta de quem acabou de entrar pelo provedor:
 * - vínculo já existe: a mesma conta de sempre (com qualquer perfil);
 * - e-mail de uma conta existente, sem vínculo: { vincular } (a pessoa
 *   precisa entrar com a senha dessa conta; nada é ligado sozinho);
 * - ninguém: conta nova de cliente (COMUM), com o aceite dos termos.
 * Dois primeiros logins simultâneos esbarram no índice único e o segundo
 * recupera a conta criada pelo primeiro, sem duplicar.
 */
export async function resolverIdentidade(req, { provedor, sujeito, email, nome }) {
  const buscarVinculo = () =>
    prisma.identidadeExterna.findUnique({
      where: { provedor_sujeito: { provedor, sujeito } },
      include: { usuario: { select: CONTA } },
    });

  const existente = await buscarVinculo();
  if (existente) {
    await prisma.identidadeExterna.update({ where: { id: existente.id }, data: { email, ultimoAcessoEm: new Date() } });
    return { usuario: existente.usuario, novo: false };
  }

  const mesmoEmail = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (mesmoEmail) return { vincular: true };

  try {
    const usuario = await prisma.$transaction(async (tx) => {
      const criado = await tx.usuario.create({
        data: { nome, email, telefone: null, senhaHash: null, perfil: PERFIS.COMUM },
        select: CONTA,
      });
      await tx.identidadeExterna.create({
        data: { usuarioId: criado.id, provedor, sujeito, email, ultimoAcessoEm: new Date() },
      });
      await tx.aceiteTermos.createMany({
        data: montarAceites(contextoDaRequisicao(req)).map((aceite) => ({ ...aceite, usuarioId: criado.id })),
      });
      return criado;
    });
    return { usuario, novo: true };
  } catch (erro) {
    if (erro?.code !== 'P2002') throw erro;
    // Outro login simultâneo criou primeiro: usa o que ele criou
    const criadoPeloOutro = await buscarVinculo();
    if (criadoPeloOutro) return { usuario: criadoPeloOutro.usuario, novo: false };
    // O e-mail ficou com outra conta nesse meio-tempo
    return { vincular: true };
  }
}
