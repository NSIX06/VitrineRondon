// Serviço central de auditoria.
// Toda gravação de log passa por aqui e acontece no servidor: o navegador
// nunca envia logs. Senhas, hashes e tokens são removidos antes de gravar.
import prisma from '../config/prisma.js';

const CAMPOS_SENSIVEIS = new Set([
  'senha',
  'senhaHash',
  'senha_hash',
  'confirmacaoSenha',
  'token',
  'authorization',
  'refreshToken',
]);

/** Remove campos sensíveis de um objeto (raso) antes de guardar no log */
export function limparSensiveis(objeto) {
  if (!objeto || typeof objeto !== 'object') return objeto;
  const saida = {};
  for (const [chave, valor] of Object.entries(objeto)) {
    if (CAMPOS_SENSIVEIS.has(chave)) continue;
    saida[chave] = valor;
  }
  return saida;
}

/** Mantém no "antes" e no "depois" só os campos que realmente mudaram */
export function diferencas(antes, depois) {
  if (!antes || !depois) return { antes: limparSensiveis(antes), depois: limparSensiveis(depois) };
  const a = limparSensiveis(antes);
  const d = limparSensiveis(depois);
  const soAntes = {};
  const soDepois = {};
  for (const chave of new Set([...Object.keys(a), ...Object.keys(d)])) {
    if (JSON.stringify(a[chave]) !== JSON.stringify(d[chave])) {
      soAntes[chave] = a[chave] ?? null;
      soDepois[chave] = d[chave] ?? null;
    }
  }
  return { antes: soAntes, depois: soDepois };
}

/** Extrai IP e User-Agent da requisição, com limite de tamanho */
export function contextoDaRequisicao(req) {
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '')
    .toString()
    .trim()
    .slice(0, 60);
  const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 300);
  return { ip: ip || null, userAgent: userAgent || null };
}

/**
 * Grava um log de auditoria. Nunca lança: uma falha ao registrar o log não
 * pode derrubar a operação principal, mas é escrita no console.
 * `dados.usuario` força o autor quando ele ainda não está em `req.usuario`,
 * como no próprio cadastro da conta.
 */
export async function registrarLog(req, dados) {
  try {
    const usuario = dados.usuario || req?.usuario || null;
    const { ip, userAgent } = contextoDaRequisicao(req);
    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuario?.id ?? null,
        usuarioNome: usuario?.nome ?? null,
        acao: dados.acao,
        tipoEntidade: dados.tipoEntidade ?? null,
        entidadeId: dados.entidadeId ?? null,
        descricao: dados.descricao ?? null,
        valoresAntes: dados.antes ? limparSensiveis(dados.antes) : undefined,
        valoresDepois: dados.depois ? limparSensiveis(dados.depois) : undefined,
        ip,
        userAgent,
        status: dados.status ?? 'SUCESSO',
        erroMensagem: dados.erroMensagem ?? null,
      },
    });
  } catch (erro) {
    console.error('Falha ao gravar log de auditoria:', erro.message);
  }
}
