// Middleware global de tratamento de erros.
// Nada do que a biblioteca escreveu chega ao cliente: a resposta leva só um
// texto nosso, e o detalhe técnico fica no log do servidor.
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { mensagemPadrao, MENSAGEM_GENERICA } from '../utils/erros.js';

/**
 * { campo: [mensagens] } a partir de um ZodError. O campo é o caminho com
 * pontos ("conta.email"); erro que não é de um campo (ex.: corpo vazio) fica
 * em "body".
 */
export function errosPorCampo(erro) {
  const mapa = {};
  for (const issue of erro.issues) {
    const campo = issue.path.join('.') || 'body';
    (mapa[campo] ??= []).push(issue.message);
  }
  return mapa;
}

/** Identifica o erro no log sem despejar o objeto inteiro na resposta */
function registrarNoServidor(req, erro) {
  const onde = `${req.method} ${req.originalUrl}`;
  console.error(`Erro não tratado em ${onde}:`, erro);
}

export function errorHandler(erro, req, res, next) {
  // Erros de validação (Zod): o JSON chegou bem formado, mas os dados não
  // passam nas regras. 422 diz isso; 400 fica para o que nem dá para ler
  // (JSON malformado, ID que não é número). Os erros vêm agrupados por campo,
  // cada um com a lista do que falta corrigir: { "preco": ["..."] }.
  if (erro instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Dados inválidos',
      errors: errosPorCampo(erro),
    });
  }

  // Banco fora do ar ou conexão perdida: não é defeito da requisição, e quem
  // chamou pode tentar de novo. 503 diz isso; 500 diria que a API quebrou.
  const CODIGOS_DE_CONEXAO = ['P1001', 'P1002', 'P1008', 'P1017'];
  if (
    erro instanceof Prisma.PrismaClientInitializationError ||
    (erro instanceof Prisma.PrismaClientKnownRequestError && CODIGOS_DE_CONEXAO.includes(erro.code))
  ) {
    registrarNoServidor(req, erro);
    return res.status(503).json({
      success: false,
      message: 'O serviço está indisponível no momento. Tente de novo em instantes',
    });
  }

  // Gateway de pagamento sem chave, recusando ou fora do ar: o defeito não é
  // da requisição. O motivo (resposta do AbacatePay, variável ausente) fica
  // no log; o site recebe um código para explicar em linguagem simples.
  if (erro.name === 'ErroGateway') {
    registrarNoServidor(req, erro);
    return res.status(503).json({
      success: false,
      codigo: 'PAGAMENTO_INDISPONIVEL',
      message: 'O pagamento está indisponível no momento. Tente de novo mais tarde',
    });
  }

  // Erros conhecidos do Prisma
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    switch (erro.code) {
      case 'P2025': // registro não encontrado
        return res.status(404).json({
          success: false,
          message: 'Registro não encontrado',
        });
      case 'P2002': // violação de campo único
        return res.status(409).json({
          success: false,
          message: 'Já existe um registro com esses dados',
        });
      case 'P2003': // violação de chave estrangeira: dado legível que aponta para o nada
        return res.status(422).json({
          success: false,
          message: 'Referência inválida: o registro relacionado não existe',
        });
      default:
        break;
    }
  }

  // JSON malformado enviado pelo cliente
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido no corpo da requisição',
    });
  }

  // Corpo maior que o limite de express.json (ou da imagem, no envio de arquivo)
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: req.originalUrl?.startsWith('/api/uploads')
        ? 'A imagem passa de 5 MB. Escolha um arquivo menor'
        : 'Corpo da requisição muito grande',
    });
  }

  // Erros com status definido manualmente (ex.: 404 lançado no controller).
  // Só repassamos o texto de erros criados por erroHttp: uma biblioteca também
  // pode definir status, e a mensagem dela costuma descrever o sistema.
  if (erro.status && erro.status < 500) {
    if (!erro.publico) registrarNoServidor(req, erro);
    return res.status(erro.status).json({
      success: false,
      message: erro.publico ? erro.message : mensagemPadrao(erro.status),
      ...(erro.publico && erro.campos ? { errors: erro.campos } : {}),
    });
  }

  registrarNoServidor(req, erro);
  return res.status(500).json({
    success: false,
    message: MENSAGEM_GENERICA,
  });
}
