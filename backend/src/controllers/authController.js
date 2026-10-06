// Autenticação e cadastro
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { gerarToken, PERFIS } from '../middlewares/auth.js';
import { registrarLog, contextoDaRequisicao } from '../services/auditoria.js';
import { montarAceites, versaoVigente } from '../services/termos.js';
import { criarEmpreendedorSchema } from './empreendedorController.js';
import { comHorariosParaPrisma } from '../services/horarios.js';

const senhaSchema = z
  .string({ error: 'Senha é obrigatória' })
  .min(8, 'A senha deve ter ao menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'A senha deve conter letras')
  .regex(/\d/, 'A senha deve conter números');

const telefoneSchema = z
  .string({ error: 'Telefone é obrigatório' })
  .trim()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine((digitos) => digitos.length >= 10 && digitos.length <= 13, 'Telefone deve ter DDD e número');

// Aceites obrigatórios (RN-TERMOS-01). Validados aqui, no servidor, não só na tela.
const aceitesSchema = z.object({
  termosDeUso: z.literal(true, { error: 'É preciso aceitar os Termos de Uso' }),
  politicaPrivacidade: z.literal(true, { error: 'É preciso aceitar a Política de Privacidade' }),
});

const contaSchema = z
  .object({
    nome: z.string({ error: 'Nome é obrigatório' }).trim().min(2, 'Informe seu nome').max(150),
    email: z.string({ error: 'E-mail é obrigatório' }).trim().toLowerCase().email('E-mail inválido').max(150),
    telefone: telefoneSchema,
    senha: senhaSchema,
    confirmacaoSenha: z.string({ error: 'Confirme a senha' }),
  })
  .refine((dados) => dados.senha === dados.confirmacaoSenha, {
    message: 'As senhas não conferem',
    path: ['confirmacaoSenha'],
  });

export const registrarComumSchema = contaSchema.safeExtend({ aceites: aceitesSchema });

export const registrarEmpreendedorSchema = z.object({
  conta: contaSchema,
  negocio: criarEmpreendedorSchema,
  aceites: aceitesSchema,
});

export const loginSchema = z.object({
  email: z.string({ error: 'E-mail é obrigatório' }).trim().toLowerCase().email('E-mail inválido'),
  senha: z.string({ error: 'Senha é obrigatória' }).min(1, 'Senha é obrigatória'),
});

const usuarioPublico = { id: true, nome: true, email: true, telefone: true, perfil: true, ativo: true, createdAt: true };

function respostaSessao(usuario, empreendedor = null) {
  return {
    token: gerarToken(usuario),
    usuario: { ...usuario, empreendedorId: empreendedor?.id ?? usuario.empreendedor?.id ?? null },
  };
}

function ehEmailDuplicado(erro) {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002';
}

// POST /api/auth/registrar
export async function registrarComum(req, res, next) {
  const { nome, email, telefone, senha } = req.body;
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    // Usuário e aceites na mesma transação: sem cadastro concluído, sem aceite (RN-TERMOS-08)
    const usuario = await prisma.$transaction(async (tx) => {
      const criado = await tx.usuario.create({
        data: { nome, email, telefone, senhaHash, perfil: PERFIS.COMUM },
        select: usuarioPublico,
      });
      await tx.aceiteTermos.createMany({
        data: montarAceites(contextoDaRequisicao(req)).map((a) => ({ ...a, usuarioId: criado.id })),
      });
      return criado;
    });

    await registrarLog(req, {
      usuario,
      acao: 'CADASTRO',
      tipoEntidade: 'Usuario',
      entidadeId: usuario.id,
      descricao: `Cadastro de usuário comum: ${usuario.email}`,
      depois: { nome, email, telefone, perfil: PERFIS.COMUM },
    });
    await registrarLog(req, {
      usuario,
      acao: 'ACEITE_TERMOS',
      tipoEntidade: 'Termos',
      descricao: `Aceite dos Termos de Uso e da Política de Privacidade, versão ${versaoVigente()}`,
      depois: { versao: versaoVigente(), termosDeUso: true, politicaPrivacidade: true },
    });

    res.status(201).json({ success: true, message: 'Conta criada com sucesso', data: respostaSessao(usuario) });
  } catch (erro) {
    if (ehEmailDuplicado(erro)) {
      await registrarLog(req, {
        acao: 'CADASTRO',
        tipoEntidade: 'Usuario',
        status: 'ERRO',
        erroMensagem: 'E-mail já cadastrado',
        descricao: `Tentativa de cadastro com e-mail já existente: ${email}`,
      });
      return res.status(409).json({
        success: false,
        message: 'Este e-mail já está cadastrado',
        errors: [{ campo: 'email', mensagem: 'Este e-mail já está cadastrado' }],
      });
    }
    next(erro);
  }
}

// POST /api/auth/registrar-empreendedor
export async function registrarEmpreendedor(req, res, next) {
  const { conta, negocio } = req.body;
  try {
    const senhaHash = await bcrypt.hash(conta.senha, 10);
    // Conta, negócio e aceites em uma transação só: ou grava tudo, ou nada.
    const { usuario, empreendedor } = await prisma.$transaction(async (tx) => {
      const usuarioCriado = await tx.usuario.create({
        data: {
          nome: conta.nome,
          email: conta.email,
          telefone: conta.telefone,
          senhaHash,
          perfil: PERFIS.EMPREENDEDOR,
        },
        select: usuarioPublico,
      });
      const empreendedorCriado = await tx.empreendedor.create({
        data: { ...comHorariosParaPrisma(negocio), usuarioId: usuarioCriado.id },
      });
      await tx.aceiteTermos.createMany({
        data: montarAceites(contextoDaRequisicao(req)).map((a) => ({ ...a, usuarioId: usuarioCriado.id })),
      });
      return { usuario: usuarioCriado, empreendedor: empreendedorCriado };
    });

    await registrarLog(req, {
      usuario,
      acao: 'CADASTRO',
      tipoEntidade: 'Usuario',
      entidadeId: usuario.id,
      descricao: `Cadastro de empreendedor: ${usuario.email}`,
      depois: { nome: conta.nome, email: conta.email, telefone: conta.telefone, perfil: PERFIS.EMPREENDEDOR },
    });
    await registrarLog(req, {
      usuario,
      acao: 'CREATE',
      tipoEntidade: 'Empreendedor',
      entidadeId: empreendedor.id,
      descricao: `Negócio cadastrado no registro: ${empreendedor.nomeNegocio}`,
      depois: negocio,
    });
    await registrarLog(req, {
      usuario,
      acao: 'ACEITE_TERMOS',
      tipoEntidade: 'Termos',
      descricao: `Aceite dos Termos de Uso e da Política de Privacidade, versão ${versaoVigente()}`,
      depois: { versao: versaoVigente(), termosDeUso: true, politicaPrivacidade: true },
    });

    res.status(201).json({
      success: true,
      message: 'Conta e negócio criados com sucesso',
      data: { ...respostaSessao(usuario, empreendedor), empreendedor },
    });
  } catch (erro) {
    if (ehEmailDuplicado(erro)) {
      await registrarLog(req, {
        acao: 'CADASTRO',
        tipoEntidade: 'Usuario',
        status: 'ERRO',
        erroMensagem: 'E-mail já cadastrado',
        descricao: `Tentativa de cadastro de empreendedor com e-mail já existente: ${conta.email}`,
      });
      return res.status(409).json({
        success: false,
        message: 'Este e-mail já está cadastrado',
        errors: [{ campo: 'conta.email', mensagem: 'Este e-mail já está cadastrado' }],
      });
    }
    next(erro);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  const { email, senha } = req.body;
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { empreendedor: { select: { id: true } } },
    });
    const senhaConfere = usuario ? await bcrypt.compare(senha, usuario.senhaHash) : false;

    if (!usuario || !senhaConfere) {
      await registrarLog(req, {
        acao: 'LOGIN_RECUSADO',
        tipoEntidade: 'Usuario',
        entidadeId: usuario?.id ?? null,
        status: 'ERRO',
        erroMensagem: usuario ? 'Senha incorreta' : 'E-mail não cadastrado',
        descricao: `Tentativa de login recusada para ${email}`,
      });
      // Mesma mensagem nos dois casos para não revelar quais e-mails existem
      return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos' });
    }

    if (!usuario.ativo) {
      await registrarLog(req, {
        usuario: { id: usuario.id, nome: usuario.nome },
        acao: 'LOGIN_RECUSADO',
        tipoEntidade: 'Usuario',
        entidadeId: usuario.id,
        status: 'ERRO',
        erroMensagem: 'Conta desativada',
        descricao: `Login recusado: conta desativada (${email})`,
      });
      return res.status(403).json({ success: false, message: 'Conta desativada. Fale com a administração' });
    }

    const { senhaHash, ...dadosPublicos } = usuario;
    await registrarLog(req, {
      usuario: { id: usuario.id, nome: usuario.nome },
      acao: 'LOGIN',
      tipoEntidade: 'Usuario',
      entidadeId: usuario.id,
      descricao: `Login realizado: ${email}`,
    });

    res.json({ success: true, message: 'Login realizado', data: respostaSessao(dadosPublicos) });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/auth/logout  (o token é descartado no cliente; aqui só registramos)
export async function logout(req, res) {
  await registrarLog(req, {
    acao: 'LOGOUT',
    tipoEntidade: 'Usuario',
    entidadeId: req.usuario.id,
    descricao: `Logout: ${req.usuario.email}`,
  });
  res.json({ success: true, message: 'Sessão encerrada' });
}

// GET /api/auth/me
export async function me(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { ...usuarioPublico, empreendedor: { select: { id: true, nomeNegocio: true } } },
    });
    res.json({
      success: true,
      data: { ...usuario, empreendedorId: usuario.empreendedor?.id ?? null },
    });
  } catch (erro) {
    next(erro);
  }
}
