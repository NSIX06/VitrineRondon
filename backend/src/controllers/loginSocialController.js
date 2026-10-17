// Login com Google (e, no futuro, outros provedores OpenID Connect).
// Regras e validação do id_token em services/loginSocial.js.
//
// O retorno nunca põe o token de sessão na URL: o site recebe, no fragmento
// (#), um código de uso único que vale 60 s e o troca pela sessão aqui. O
// fragmento não vai para servidores nem para o "Referer".
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { registrarLog } from '../services/auditoria.js';
import {
  aleatorio,
  assinarTemporario,
  configuracaoDoProvedor,
  desafioPkce,
  destinoSeguro,
  lerTemporario,
  provedorConfigurado,
  resolverIdentidade,
  trocarCodigo,
  validarIdToken,
} from '../services/loginSocial.js';
import { lerOrigens, origemPermitida } from '../utils/origens.js';
import { respostaSessao } from './authController.js';

const COOKIE = 'vl_login_social';
const VALIDADE_ESTADO_S = 10 * 60;
const VALIDADE_CODIGO_S = 60;
const VALIDADE_VINCULO_S = 10 * 60;
const producao = () => process.env.NODE_ENV === 'production';

/** Origem do site que pediu o login, se for uma das permitidas (CORS_ORIGINS) */
function origemDoSite(origem) {
  const texto = String(origem || '').replace(/\/+$/, '').toLowerCase();
  const lista = lerOrigens(process.env.CORS_ORIGINS);
  if (texto && origemPermitida(texto, { lista, producao: producao() })) return texto;
  return lista[0] || null;
}

/** Endereço de retorno registrado no provedor (o mesmo nas duas pontas do fluxo) */
function enderecoDeRetorno(req) {
  return process.env.GOOGLE_URL_RETORNO || `${req.protocol}://${req.get('host')}/api/auth/google/retorno`;
}

/** Volta ao site com o resultado no fragmento */
function voltarAoSite(res, origem, parametros) {
  res.redirect(303, `${origem}/entrar/google#${new URLSearchParams(parametros).toString()}`);
}

function lerCookie(req, nome) {
  for (const parte of String(req.headers.cookie || '').split(';')) {
    const [chave, ...valor] = parte.trim().split('=');
    if (chave === nome) return decodeURIComponent(valor.join('='));
  }
  return null;
}

const opcoesDoCookie = () => ({
  httpOnly: true,
  secure: producao(),
  sameSite: 'lax',
  path: '/api/auth/google',
});

// GET /api/auth/provedores  -> quais logins externos estão disponíveis
export function listarProvedores(req, res) {
  res.json({ success: true, data: { google: provedorConfigurado('GOOGLE') } });
}

// GET /api/auth/google/iniciar?destino=/empreendedores/3%23avaliacoes&origem=https://site
export function iniciarGoogle(req, res) {
  const origem = origemDoSite(req.query.origem);
  if (!origem) return res.status(400).json({ success: false, message: 'Origem do site não permitida' });
  if (!provedorConfigurado('GOOGLE')) return voltarAoSite(res, origem, { erro: 'indisponivel' });

  const config = configuracaoDoProvedor('GOOGLE');
  const estado = aleatorio();
  const nonce = aleatorio();
  const verificador = aleatorio(48);
  const destino = destinoSeguro(req.query.destino);

  // Estado, nonce e verificador ficam num cookie assinado e de vida curta, só
  // para o caminho do retorno: o retorno confere que é o mesmo navegador que
  // começou o login (proteção contra CSRF e troca de sessão)
  res.cookie(
    COOKIE,
    assinarTemporario({ tipo: 'estado', estado, nonce, verificador, destino, origem }, VALIDADE_ESTADO_S),
    { ...opcoesDoCookie(), maxAge: VALIDADE_ESTADO_S * 1000 }
  );

  const url = new URL(config.urlAutorizacao);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: enderecoDeRetorno(req),
    response_type: 'code',
    scope: 'openid email profile',
    state: estado,
    nonce,
    code_challenge: desafioPkce(verificador),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  res.redirect(302, url.toString());
}

// GET /api/auth/google/retorno?code=...&state=...  (o provedor redireciona para cá)
export async function retornoGoogle(req, res, next) {
  const fluxo = lerTemporario(lerCookie(req, COOKIE), 'estado');
  res.clearCookie(COOKIE, opcoesDoCookie());
  const origem = fluxo?.origem || origemDoSite(null);
  if (!origem) return res.status(400).json({ success: false, message: 'Login expirado. Tente de novo.' });

  try {
    if (req.query.error) {
      return voltarAoSite(res, origem, { erro: req.query.error === 'access_denied' ? 'cancelado' : 'falhou' });
    }
    // Sem o cookie, ou com outro state: o login não começou neste navegador
    if (!fluxo || !req.query.state || req.query.state !== fluxo.estado || !req.query.code) {
      return voltarAoSite(res, origem, { erro: 'expirado' });
    }

    const config = configuracaoDoProvedor('GOOGLE');
    const idToken = await trocarCodigo({
      config,
      codigo: String(req.query.code),
      verificador: fluxo.verificador,
      redirectUri: enderecoDeRetorno(req),
    });
    const perfil = await validarIdToken(idToken, { config, nonce: fluxo.nonce });
    const resultado = await resolverIdentidade(req, { provedor: 'GOOGLE', ...perfil });

    if (resultado.vincular) {
      // E-mail de uma conta que já existe: não liga sozinho. A pessoa entra
      // com a senha dessa conta para ligar o Google a ela.
      const vinculo = assinarTemporario(
        { tipo: 'vinculo', provedor: 'GOOGLE', sujeito: perfil.sujeito, email: perfil.email, destino: fluxo.destino },
        VALIDADE_VINCULO_S
      );
      return voltarAoSite(res, origem, { vincular: vinculo, email: perfil.email, destino: fluxo.destino });
    }

    const { usuario, novo } = resultado;
    if (!usuario.ativo) return voltarAoSite(res, origem, { erro: 'desativada' });

    await registrarLog(req, {
      usuario: { id: usuario.id, nome: usuario.nome },
      acao: novo ? 'CADASTRO' : 'LOGIN',
      tipoEntidade: 'Usuario',
      entidadeId: usuario.id,
      descricao: novo ? `Conta de cliente criada pelo Google: ${usuario.email}` : `Login com Google: ${usuario.email}`,
    });
    const codigo = assinarTemporario({ tipo: 'troca', sub: usuario.id }, VALIDADE_CODIGO_S);
    return voltarAoSite(res, origem, { codigo, destino: fluxo.destino });
  } catch (erro) {
    if (erro.motivo) {
      console.warn(`Login com Google recusado: ${erro.message}`);
      return voltarAoSite(res, origem, { erro: 'falhou' });
    }
    next(erro);
  }
}

/** Marca o token temporário como usado; false se já tinha sido usado */
async function usarUmaVez(dados) {
  try {
    await prisma.sessaoEncerrada.create({ data: { jti: dados.jti, expiraEm: new Date(dados.exp * 1000) } });
    return true;
  } catch (erro) {
    if (erro?.code === 'P2002') return false;
    throw erro;
  }
}

async function sessaoDe(usuarioId) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, nome: true, email: true, telefone: true, perfil: true, ativo: true, createdAt: true, empreendedor: { select: { id: true } } },
  });
  if (!usuario || !usuario.ativo) return null;
  const { empreendedor, ...dados } = usuario;
  return respostaSessao(dados, empreendedor);
}

export const codigoSchema = z.object({ codigo: z.string({ error: 'Código inválido' }).min(10).max(2000) });

// POST /api/auth/google/sessao  { codigo }  -> mesma resposta do login por senha
export async function sessaoGoogle(req, res, next) {
  try {
    const dados = lerTemporario(req.body.codigo, 'troca');
    if (!dados || !(await usarUmaVez(dados))) {
      return res.status(401).json({ success: false, message: 'O login expirou. Tente entrar com o Google de novo.' });
    }
    const sessao = await sessaoDe(dados.sub);
    if (!sessao) return res.status(403).json({ success: false, message: 'Conta desativada. Fale com a administração' });
    res.json({ success: true, message: 'Login realizado', data: sessao });
  } catch (erro) {
    next(erro);
  }
}

export const vinculoSchema = z.object({
  vinculo: z.string({ error: 'Vínculo inválido' }).min(10).max(4000),
  senha: z.string({ error: 'Informe a senha' }).min(1, 'Informe a senha').max(200),
});

// POST /api/auth/google/vincular  { vinculo, senha }
// Liga a conta Google a uma conta existente com o mesmo e-mail, depois de a
// pessoa provar que é dona dela com a senha.
export async function vincularGoogle(req, res, next) {
  try {
    const dados = lerTemporario(req.body.vinculo, 'vinculo');
    if (!dados) return res.status(401).json({ success: false, message: 'O pedido expirou. Entre com o Google de novo.' });

    const usuario = await prisma.usuario.findUnique({ where: { email: dados.email } });
    const senhaConfere = usuario?.senhaHash ? await bcrypt.compare(req.body.senha, usuario.senhaHash) : false;
    if (!usuario || !senhaConfere) {
      await registrarLog(req, {
        acao: 'LOGIN_RECUSADO',
        tipoEntidade: 'Usuario',
        entidadeId: usuario?.id ?? null,
        status: 'ERRO',
        erroMensagem: 'Senha incorreta ao ligar o Google',
        descricao: `Tentativa de ligar o Google recusada para ${dados.email}`,
      });
      return res.status(401).json({ success: false, message: 'Senha incorreta' });
    }
    if (!usuario.ativo) return res.status(403).json({ success: false, message: 'Conta desativada. Fale com a administração' });
    if (!(await usarUmaVez(dados))) {
      return res.status(401).json({ success: false, message: 'O pedido expirou. Entre com o Google de novo.' });
    }

    try {
      await prisma.identidadeExterna.create({
        data: { usuarioId: usuario.id, provedor: dados.provedor, sujeito: dados.sujeito, email: dados.email, ultimoAcessoEm: new Date() },
      });
    } catch (erro) {
      if (erro?.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Esta conta já está ligada a outra conta Google.' });
      }
      throw erro;
    }
    await registrarLog(req, {
      usuario: { id: usuario.id, nome: usuario.nome },
      acao: 'UPDATE',
      tipoEntidade: 'Usuario',
      entidadeId: usuario.id,
      descricao: `Conta ligada ao Google: ${usuario.email}`,
    });
    res.json({ success: true, message: 'Google ligado à sua conta', data: await sessaoDe(usuario.id) });
  } catch (erro) {
    next(erro);
  }
}
