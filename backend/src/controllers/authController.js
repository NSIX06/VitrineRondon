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
import { ehSenhaComum } from '../services/senhasComuns.js';
import { enviarEmail, emailDeRecuperacao } from '../services/email.js';
import {
  VALIDADE_MINUTOS,
  INTERVALO_MINIMO_MINUTOS,
  gerarCodigo,
  hashDoCodigo,
  codigoValido,
  linkDeRedefinicao,
  situacaoDoPedido,
} from '../services/redefinicaoSenha.js';

const senhaSchema = z
  .string({ error: 'Senha é obrigatória' })
  .min(8, 'A senha deve ter ao menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'A senha deve conter letras')
  .regex(/\d/, 'A senha deve conter números')
  .refine((senha) => !ehSenhaComum(senha), 'Essa senha é muito comum. Escolha outra, mais difícil de adivinhar');

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

/** Aceite dos dois documentos na trilha de auditoria (os dois cadastros públicos) */
function registrarAceiteNoLog(req, usuario) {
  return registrarLog(req, {
    usuario,
    acao: 'ACEITE_TERMOS',
    tipoEntidade: 'Termos',
    descricao: `Aceite dos Termos de Uso e da Política de Privacidade, versão ${versaoVigente()}`,
    depois: { versao: versaoVigente(), termosDeUso: true, politicaPrivacidade: true },
  });
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
    await registrarAceiteNoLog(req, usuario);

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
    await registrarAceiteNoLog(req, usuario);

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

// ---------------------------------------------------------------------------
// Esqueci a senha
// ---------------------------------------------------------------------------

export const esqueciSenhaSchema = z.object({
  email: z.string({ error: 'E-mail é obrigatório' }).trim().toLowerCase().email('E-mail inválido').max(150),
});

const codigoSchema = z.string({ error: 'Link inválido' }).refine(codigoValido, 'Link inválido');

export const codigoRedefinicaoSchema = z.object({ codigo: codigoSchema });

export const redefinirSenhaSchema = z
  .object({
    codigo: codigoSchema,
    senha: senhaSchema,
    confirmacaoSenha: z.string({ error: 'Confirme a senha' }),
  })
  .refine((dados) => dados.senha === dados.confirmacaoSenha, {
    message: 'As senhas não conferem',
    path: ['confirmacaoSenha'],
  });

// Mesma resposta exista o e-mail ou não: ninguém descobre quem tem conta
const RESPOSTA_PEDIDO =
  'Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha. Confira a caixa de entrada e o spam.';

const MENSAGENS_DO_LINK = {
  invalido: 'Este link não é válido. Peça um novo na tela de recuperação.',
  usado: 'Este link já foi usado. Se precisar, peça um novo.',
  expirado: `Este link passou dos ${VALIDADE_MINUTOS} minutos e expirou. Peça um novo.`,
};

/** Gera o pedido e manda o e-mail (roda depois da resposta, sem atrasá-la) */
async function criarPedidoEEnviar(req, usuario) {
  const recente = await prisma.redefinicaoSenha.findFirst({
    where: {
      usuarioId: usuario.id,
      usadoEm: null,
      createdAt: { gt: new Date(Date.now() - INTERVALO_MINIMO_MINUTOS * 60_000) },
    },
    select: { id: true },
  });
  if (recente) return; // pedido repetido em menos de 2 minutos: o e-mail anterior ainda serve

  const codigo = gerarCodigo();
  // Um link por vez: os pedidos anteriores ainda abertos deixam de valer
  await prisma.$transaction([
    prisma.redefinicaoSenha.updateMany({
      where: { usuarioId: usuario.id, usadoEm: null },
      data: { usadoEm: new Date() },
    }),
    prisma.redefinicaoSenha.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashDoCodigo(codigo),
        expiraEm: new Date(Date.now() + VALIDADE_MINUTOS * 60_000),
      },
    }),
  ]);

  const email = emailDeRecuperacao({ nome: usuario.nome, link: linkDeRedefinicao(codigo), minutos: VALIDADE_MINUTOS });
  const resultado = await enviarEmail({ para: usuario.email, ...email });
  await registrarLog(req, {
    usuario: { id: usuario.id, nome: usuario.nome },
    acao: 'SENHA_RECUPERACAO',
    tipoEntidade: 'Usuario',
    entidadeId: usuario.id,
    status: resultado.enviado || resultado.motivo === 'simulado' ? 'SUCESSO' : 'ERRO',
    erroMensagem: resultado.enviado ? null : resultado.motivo,
    descricao: `Pedido de recuperação de senha: ${usuario.email}`,
  });
}

// POST /api/auth/esqueci-senha
export async function esqueciSenha(req, res, next) {
  const { email } = req.body;
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nome: true, email: true, ativo: true },
    });
    // Responde antes de mandar o e-mail: o tempo de resposta não denuncia se a conta existe
    res.json({ success: true, message: RESPOSTA_PEDIDO });
    if (usuario?.ativo) {
      criarPedidoEEnviar(req, usuario).catch((erro) =>
        console.error(`[senha] Falha ao preparar a recuperação: ${erro.message}`)
      );
    }
  } catch (erro) {
    next(erro);
  }
}

/** Busca o pedido pelo código do link e diz se ele ainda vale */
async function pedidoDoCodigo(codigo) {
  const pedido = await prisma.redefinicaoSenha.findUnique({
    where: { tokenHash: hashDoCodigo(codigo) },
    include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
  });
  const situacao = pedido && !pedido.usuario.ativo ? 'invalido' : situacaoDoPedido(pedido);
  return { pedido, situacao };
}

// POST /api/auth/redefinir-senha/verificar  (a tela confere o link antes de mostrar o formulário)
export async function verificarRedefinicao(req, res, next) {
  try {
    const { situacao } = await pedidoDoCodigo(req.body.codigo);
    if (situacao !== 'valido') {
      return res.status(410).json({ success: false, motivo: situacao, message: MENSAGENS_DO_LINK[situacao] });
    }
    res.json({ success: true, data: { valido: true } });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/auth/redefinir-senha
export async function redefinirSenha(req, res, next) {
  const { codigo, senha } = req.body;
  try {
    const { pedido, situacao } = await pedidoDoCodigo(codigo);
    if (situacao !== 'valido') {
      return res.status(410).json({ success: false, motivo: situacao, message: MENSAGENS_DO_LINK[situacao] });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const agora = new Date();
    await prisma.$transaction([
      // Marca o pedido como usado só se ninguém usou no meio do caminho (dois cliques no link)
      prisma.redefinicaoSenha.update({ where: { id: pedido.id, usadoEm: null }, data: { usadoEm: agora } }),
      prisma.redefinicaoSenha.updateMany({
        where: { usuarioId: pedido.usuarioId, usadoEm: null },
        data: { usadoEm: agora },
      }),
      // A data da troca derruba as sessões abertas antes dela (ver middlewares/auth.js)
      prisma.usuario.update({ where: { id: pedido.usuarioId }, data: { senhaHash, senhaAlteradaEm: agora } }),
    ]);

    await registrarLog(req, {
      usuario: { id: pedido.usuario.id, nome: pedido.usuario.nome },
      acao: 'SENHA_REDEFINIDA',
      tipoEntidade: 'Usuario',
      entidadeId: pedido.usuario.id,
      descricao: `Senha redefinida pelo link de recuperação: ${pedido.usuario.email}`,
    });

    res.json({ success: true, message: 'Senha alterada. Entre com a nova senha.' });
  } catch (erro) {
    // O pedido foi usado por outra requisição entre a leitura e a gravação
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
      return res.status(410).json({ success: false, motivo: 'usado', message: MENSAGENS_DO_LINK.usado });
    }
    next(erro);
  }
}
