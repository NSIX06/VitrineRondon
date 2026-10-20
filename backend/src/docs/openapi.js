// Contrato da API em OpenAPI 3.0, servido em /api/docs (Swagger UI) e em
// /api/docs/openapi.json.
//
// Os corpos das requisições não são escritos à mão: saem dos mesmos schemas
// Zod que validam cada rota (z.toJSONSchema). Mudou a validação, mudou a
// documentação. O teste tests/backend/openapi.test.js confere que toda rota
// registrada no Express aparece aqui, e vice-versa.
import { z } from 'zod';
import {
  registrarComumSchema,
  registrarEmpreendedorSchema,
  conferirContaSchema,
  loginSchema,
  esqueciSenhaSchema,
  codigoRedefinicaoSchema,
  redefinirSenhaSchema,
} from '../controllers/authController.js';
import { codigoSchema, vinculoSchema } from '../controllers/loginSocialController.js';
import { criarProdutoSchema, atualizarProdutoSchema } from '../controllers/produtoController.js';
import { criarEmpreendedorSchema, atualizarEmpreendedorSchema } from '../controllers/empreendedorController.js';
import { criarContatoSchema } from '../controllers/contatoController.js';
import { criarFaqSchema, atualizarFaqSchema } from '../controllers/faqController.js';
import { escolherPlanoSchema } from '../controllers/assinaturaController.js';
import { criarDivulgacaoSchema, atualizarDivulgacaoSchema } from '../controllers/divulgacaoController.js';
import { avaliacaoSchema, denunciaSchema, moderacaoSchema } from '../controllers/avaliacaoController.js';
import { situacaoSchema } from '../controllers/usuarioController.js';
import { eventoSchema } from '../controllers/metricaController.js';
import { TIPOS_ACEITOS } from '../services/imagens.js';
import { TIPOS_TERMO } from '../services/termos.js';
import { ORDENS } from '../services/avaliacoes.js';

/** Schema Zod -> Schema Object do OpenAPI 3.0, do lado de quem envia (input) */
const corpoDe = (schema) =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input', unrepresentable: 'any' });

// ---------------------------------------------------------------------------
// Peças reutilizadas
// ---------------------------------------------------------------------------

const ref = (nome) => ({ $ref: `#/components/schemas/${nome}` });
const respostaJson = (descricao, schema = ref('Sucesso')) => ({
  description: descricao,
  content: { 'application/json': { schema } },
});
const erro = (descricao) => respostaJson(descricao, ref('Erro'));

/** Respostas de erro comuns, pelo código */
const ERROS = {
  400: erro('Requisição ilegível: JSON malformado ou ID que não é número'),
  401: erro('Sem login, ou sessão expirada/encerrada'),
  403: erro('Logado, mas sem permissão para este recurso'),
  404: erro('Recurso não encontrado (ou fora da vitrine para quem não é dono nem administração)'),
  409: erro('Conflito com um registro existente (ex.: e-mail já cadastrado)'),
  410: erro('Link de recuperação inválido, usado ou expirado'),
  413: erro('Corpo maior que o limite'),
  422: respostaJson('Dados inválidos: `errors` traz a lista de problemas de cada campo', ref('ErroValidacao')),
  429: erro('Muitas requisições: o limite deste endpoint foi atingido'),
  503: erro('Banco de dados ou gateway de pagamento indisponível no momento'),
};

const parametroId = (descricao = 'Identificador numérico') => ({
  name: 'id',
  in: 'path',
  required: true,
  description: descricao,
  schema: { type: 'integer', minimum: 1 },
});

const consulta = (name, descricao, schema = { type: 'string' }) => ({ name, in: 'query', required: false, description: descricao, schema });
const PAGINACAO = [
  consulta('pagina', 'Página (a partir de 1). Sem `pagina` nem `porPagina`, a lista vem inteira', { type: 'integer', minimum: 1 }),
  consulta('porPagina', 'Itens por página (1 a 60)', { type: 'integer', minimum: 1, maximum: 60 }),
];

/**
 * Quem pode chamar. Define a segurança no OpenAPI e as respostas 401/403.
 * - publico: sem login
 * - login: qualquer conta logada (a regra de dono é conferida no serviço)
 * - admin: só a administração
 */
const ACESSOS = {
  publico: { security: [], erros: [] },
  login: { security: [{ bearerAuth: [] }], erros: [401, 403] },
  admin: { security: [{ bearerAuth: [] }], erros: [401, 403] },
};

// ---------------------------------------------------------------------------
// Endpoints: método + URI + finalidade + entrada + respostas
// ---------------------------------------------------------------------------

/**
 * Cada item: [método, caminho, opções]. O caminho segue o OpenAPI
 * ({id}); o teste converte para o formato do Express (:id) ao comparar.
 */
export const ENDPOINTS = [
  // Saúde
  ['get', '/health', { tag: 'Saúde', resumo: 'Situação da API, do banco e das integrações', acesso: 'publico', respostas: { 200: 'API no ar', 503: true } }],

  // Produtos e serviços
  ['get', '/produtos', {
    tag: 'Produtos', resumo: 'Lista os itens da vitrine', acesso: 'publico',
    parametros: [
      consulta('categoria', 'Categoria do negócio'),
      consulta('tipo', 'produto ou servico', { type: 'string', enum: ['produto', 'servico'] }),
      consulta('busca', 'Texto no nome ou na descrição'),
      consulta('bairro', 'Bairro do negócio'),
      consulta('empreendedorId', 'Só os itens de um negócio', { type: 'integer', minimum: 1 }),
      ...PAGINACAO,
    ],
    respostas: { 200: ['Lista de itens', ref('Lista')], 422: true },
  }],
  ['get', '/produtos/{id}', { tag: 'Produtos', resumo: 'Consulta um item', acesso: 'publico', respostas: { 200: 'Item encontrado', 400: true, 404: true } }],
  ['post', '/produtos', { tag: 'Produtos', resumo: 'Cadastra um item no próprio negócio (exige plano em vigor)', acesso: 'login', corpo: criarProdutoSchema, respostas: { 201: 'Item criado', 422: true } }],
  ['put', '/produtos/{id}', { tag: 'Produtos', resumo: 'Atualiza um item do próprio negócio', acesso: 'login', corpo: atualizarProdutoSchema, respostas: { 200: 'Item atualizado', 400: true, 404: true, 422: true } }],
  ['delete', '/produtos/{id}', { tag: 'Produtos', resumo: 'Remove um item do próprio negócio', acesso: 'login', respostas: { 200: 'Item removido', 400: true, 404: true } }],

  // Empreendedores
  ['get', '/empreendedores', {
    tag: 'Empreendedores', resumo: 'Lista os negócios publicados (Destaque primeiro)', acesso: 'publico',
    parametros: [consulta('categoria', 'Categoria'), consulta('cidade', 'Cidade'), consulta('bairro', 'Bairro'), consulta('busca', 'Nome, responsável ou descrição'), ...PAGINACAO],
    respostas: { 200: ['Lista de negócios', ref('Lista')], 422: true },
  }],
  ['get', '/empreendedores/destaques', {
    tag: 'Empreendedores', resumo: 'Negócios do plano Destaque, em rodízio', acesso: 'publico',
    parametros: [consulta('limite', 'Quantos (1 a 12)', { type: 'integer', minimum: 1, maximum: 12 }), consulta('categoria', 'Categoria')],
    respostas: { 200: ['Lista de negócios', ref('Lista')] },
  }],
  ['get', '/empreendedores/meu', { tag: 'Empreendedores', resumo: 'O negócio da conta logada', acesso: 'login', respostas: { 200: 'Negócio da conta', 404: true } }],
  ['post', '/empreendedores/meu', { tag: 'Empreendedores', resumo: 'Cadastra o negócio da conta logada (fica em rascunho até assinar um plano)', acesso: 'login', corpo: criarEmpreendedorSchema, respostas: { 201: 'Negócio criado', 409: true, 422: true } }],
  ['get', '/empreendedores/{id}', { tag: 'Empreendedores', resumo: 'Perfil público de um negócio', acesso: 'publico', respostas: { 200: 'Negócio encontrado', 400: true, 404: true } }],
  ['post', '/empreendedores', { tag: 'Empreendedores', resumo: 'Cadastra um negócio pela administração', acesso: 'admin', corpo: criarEmpreendedorSchema, respostas: { 201: 'Negócio criado', 422: true } }],
  ['put', '/empreendedores/{id}', { tag: 'Empreendedores', resumo: 'Atualiza um negócio (dono ou administração)', acesso: 'login', corpo: atualizarEmpreendedorSchema, respostas: { 200: 'Negócio atualizado', 400: true, 404: true, 422: true } }],
  ['delete', '/empreendedores/{id}', { tag: 'Empreendedores', resumo: 'Exclui um negócio', acesso: 'admin', respostas: { 200: 'Negócio excluído', 400: true, 404: true } }],

  // Avaliações
  ['get', '/empreendedores/{id}/avaliacoes', {
    tag: 'Avaliações', resumo: 'Reputação e avaliações publicadas de um negócio', acesso: 'publico',
    parametros: [
      consulta('ordem', 'Ordenação', { type: 'string', enum: Object.keys(ORDENS) }),
      consulta('pagina', 'Página (a partir de 1)', { type: 'integer', minimum: 1 }),
      consulta('porPagina', 'Avaliações por página', { type: 'integer', minimum: 1 }),
    ],
    respostas: { 200: 'Resumo e avaliações', 400: true, 404: true, 422: true },
  }],
  ['post', '/empreendedores/{id}/avaliacoes', { tag: 'Avaliações', resumo: 'Avalia um negócio (uma avaliação por conta)', acesso: 'login', corpo: avaliacaoSchema, respostas: { 201: 'Avaliação publicada', 400: true, 404: true, 409: true, 422: true, 429: true } }],
  ['get', '/avaliacoes', {
    tag: 'Avaliações', resumo: 'Avaliações para moderação', acesso: 'admin',
    parametros: [consulta('status', 'PUBLICADA ou REMOVIDA'), consulta('denunciadas', '1 para só as denunciadas'), ...PAGINACAO],
    respostas: { 200: ['Lista para moderação', ref('Lista')] },
  }],
  ['get', '/avaliacoes/minhas', { tag: 'Avaliações', resumo: 'Avaliações feitas pela conta logada', acesso: 'login', respostas: { 200: ['Lista da conta', ref('Lista')] } }],
  ['put', '/avaliacoes/{id}', { tag: 'Avaliações', resumo: 'Edita a própria avaliação', acesso: 'login', corpo: avaliacaoSchema, respostas: { 200: 'Avaliação editada', 400: true, 404: true, 422: true, 429: true } }],
  ['delete', '/avaliacoes/{id}', { tag: 'Avaliações', resumo: 'Apaga a própria avaliação', acesso: 'login', respostas: { 200: 'Avaliação apagada', 400: true, 404: true } }],
  ['post', '/avaliacoes/{id}/denuncias', { tag: 'Avaliações', resumo: 'Denuncia uma avaliação', acesso: 'login', corpo: denunciaSchema, respostas: { 201: 'Denúncia registrada', 400: true, 404: true, 409: true, 422: true, 429: true } }],
  ['put', '/avaliacoes/{id}/moderacao', { tag: 'Avaliações', resumo: 'Remove (com motivo) ou restaura uma avaliação', acesso: 'admin', corpo: moderacaoSchema, respostas: { 200: 'Moderação aplicada', 400: true, 404: true, 422: true } }],

  // Contatos
  ['post', '/contatos', { tag: 'Contatos', resumo: 'Envia uma mensagem à equipe', acesso: 'publico', corpo: criarContatoSchema, respostas: { 201: 'Mensagem recebida', 422: true, 429: true } }],
  ['get', '/contatos', { tag: 'Contatos', resumo: 'Mensagens recebidas', acesso: 'admin', respostas: { 200: ['Lista de mensagens', ref('Lista')] } }],
  ['patch', '/contatos/{id}/lido', { tag: 'Contatos', resumo: 'Marca a mensagem como lida ou não lida', acesso: 'admin', respostas: { 200: 'Situação trocada', 400: true, 404: true } }],
  ['delete', '/contatos/{id}', { tag: 'Contatos', resumo: 'Exclui uma mensagem', acesso: 'admin', respostas: { 200: 'Mensagem excluída', 400: true, 404: true } }],

  // Autenticação (operações, não recursos: entrar, sair, recuperar senha)
  ['post', '/auth/registrar', { tag: 'Autenticação', resumo: 'Cria uma conta de cliente e já abre a sessão', acesso: 'publico', corpo: registrarComumSchema, respostas: { 201: ['Conta criada, com o token', ref('Sessao')], 409: true, 422: true, 429: true } }],
  ['post', '/auth/registrar-empreendedor', { tag: 'Autenticação', resumo: 'Cria a conta e o negócio numa só transação', acesso: 'publico', corpo: registrarEmpreendedorSchema, respostas: { 201: ['Conta e negócio criados, com o token', ref('Sessao')], 409: true, 422: true, 429: true } }],
  ['post', '/auth/conferir-conta', { tag: 'Autenticação', resumo: 'Confere os dados da etapa 1 do cadastro antes de seguir', acesso: 'publico', corpo: conferirContaSchema, respostas: { 200: 'Dados aceitos', 409: true, 422: true, 429: true } }],
  ['post', '/auth/login', { tag: 'Autenticação', resumo: 'Entra com e-mail e senha', acesso: 'publico', corpo: loginSchema, respostas: { 200: ['Sessão aberta, com o token', ref('Sessao')], 401: true, 422: true, 429: true } }],
  ['post', '/auth/logout', { tag: 'Autenticação', resumo: 'Encerra a sessão (o token deixa de valer)', acesso: 'login', respostas: { 200: 'Sessão encerrada' } }],
  ['get', '/auth/me', { tag: 'Autenticação', resumo: 'Dados da conta logada', acesso: 'login', respostas: { 200: 'Conta logada' } }],
  ['get', '/auth/provedores', { tag: 'Autenticação', resumo: 'Provedores de login social configurados', acesso: 'publico', respostas: { 200: 'Provedores disponíveis' } }],
  ['get', '/auth/google/iniciar', { tag: 'Autenticação', resumo: 'Redireciona para o login do Google', acesso: 'publico', respostas: { 302: 'Redirecionamento para o Google' } }],
  ['get', '/auth/google/retorno', { tag: 'Autenticação', resumo: 'Volta do Google: troca o código e redireciona ao site', acesso: 'publico', respostas: { 302: 'Redirecionamento para o site' } }],
  ['post', '/auth/google/sessao', { tag: 'Autenticação', resumo: 'Troca o código de uso único pela sessão', acesso: 'publico', corpo: codigoSchema, respostas: { 200: ['Sessão aberta', ref('Sessao')], 410: true, 422: true, 429: true } }],
  ['post', '/auth/google/vincular', { tag: 'Autenticação', resumo: 'Vincula o Google a uma conta existente, confirmando a senha', acesso: 'publico', corpo: vinculoSchema, respostas: { 200: ['Conta vinculada', ref('Sessao')], 401: true, 410: true, 422: true, 429: true } }],
  ['post', '/auth/esqueci-senha', { tag: 'Autenticação', resumo: 'Pede o link de nova senha por e-mail (mesma resposta exista a conta ou não)', acesso: 'publico', corpo: esqueciSenhaSchema, respostas: { 200: 'Pedido recebido', 422: true, 429: true } }],
  ['post', '/auth/redefinir-senha/verificar', { tag: 'Autenticação', resumo: 'Confere o link de nova senha sem gastá-lo', acesso: 'publico', corpo: codigoRedefinicaoSchema, respostas: { 200: 'Link válido', 410: true, 422: true, 429: true } }],
  ['post', '/auth/redefinir-senha', { tag: 'Autenticação', resumo: 'Troca a senha pelo link do e-mail', acesso: 'publico', corpo: redefinirSenhaSchema, respostas: { 200: 'Senha alterada', 410: true, 422: true, 429: true } }],

  // Termos
  ['get', '/termos', { tag: 'Termos', resumo: 'Versão vigente e documentos legais', acesso: 'publico', respostas: { 200: 'Documentos disponíveis' } }],
  ['get', '/termos/{tipo}', {
    tag: 'Termos', resumo: 'Texto de um documento legal', acesso: 'publico',
    parametros: [{ name: 'tipo', in: 'path', required: true, description: 'Documento', schema: { type: 'string', enum: Object.keys(TIPOS_TERMO) } }],
    respostas: { 200: 'Documento', 404: true },
  }],

  // Auditoria
  ['get', '/auditoria', {
    tag: 'Auditoria', resumo: 'Trilha de auditoria, com filtros', acesso: 'admin',
    parametros: [
      ...PAGINACAO,
      consulta('acao', 'Ação registrada'),
      consulta('tipoEntidade', 'Tipo do registro afetado'),
      consulta('status', 'SUCESSO ou ERRO', { type: 'string', enum: ['SUCESSO', 'ERRO'] }),
      consulta('usuarioId', 'Conta que fez a ação', { type: 'integer', minimum: 1 }),
      consulta('de', 'Data inicial (aaaa-mm-dd)', { type: 'string', format: 'date' }),
      consulta('ate', 'Data final (aaaa-mm-dd)', { type: 'string', format: 'date' }),
      consulta('busca', 'Texto na descrição'),
    ],
    respostas: { 200: ['Registros', ref('Lista')], 422: true },
  }],
  ['get', '/auditoria/opcoes', { tag: 'Auditoria', resumo: 'Valores possíveis dos filtros', acesso: 'admin', respostas: { 200: 'Opções dos filtros' } }],
  ['get', '/auditoria/{id}', { tag: 'Auditoria', resumo: 'Um registro da auditoria', acesso: 'admin', respostas: { 200: 'Registro', 400: true, 404: true } }],

  // Contas
  ['get', '/usuarios', {
    tag: 'Contas', resumo: 'Contas do sistema', acesso: 'admin',
    parametros: [
      consulta('perfil', 'Perfil', { type: 'string', enum: ['COMUM', 'EMPREENDEDOR', 'ADMIN'] }),
      consulta('ativo', 'true ou false', { type: 'string', enum: ['true', 'false'] }),
      consulta('busca', 'Nome ou e-mail'),
    ],
    respostas: { 200: ['Contas', ref('Lista')], 422: true },
  }],
  ['patch', '/usuarios/{id}/situacao', { tag: 'Contas', resumo: 'Ativa ou desativa uma conta', acesso: 'admin', corpo: situacaoSchema, respostas: { 200: 'Situação trocada', 400: true, 404: true, 422: true } }],

  // FAQ
  ['get', '/faq', { tag: 'FAQ', resumo: 'Perguntas frequentes visíveis', acesso: 'publico', respostas: { 200: ['Perguntas', ref('Lista')] } }],
  ['get', '/faq/todas', { tag: 'FAQ', resumo: 'Todas as perguntas, inclusive as ocultas', acesso: 'admin', respostas: { 200: ['Perguntas', ref('Lista')] } }],
  ['post', '/faq', { tag: 'FAQ', resumo: 'Cria uma pergunta', acesso: 'admin', corpo: criarFaqSchema, respostas: { 201: 'Pergunta criada', 422: true } }],
  ['put', '/faq/{id}', { tag: 'FAQ', resumo: 'Atualiza uma pergunta', acesso: 'admin', corpo: atualizarFaqSchema, respostas: { 200: 'Pergunta atualizada', 400: true, 404: true, 422: true } }],
  ['delete', '/faq/{id}', { tag: 'FAQ', resumo: 'Exclui uma pergunta', acesso: 'admin', respostas: { 200: 'Pergunta excluída', 400: true, 404: true } }],

  // Imagens
  ['post', '/uploads/imagem', {
    tag: 'Imagens', resumo: 'Envia uma foto (convertida para WebP no servidor)', acesso: 'login',
    corpoBinario: TIPOS_ACEITOS,
    respostas: { 201: 'Imagem guardada, com a URL', 413: true, 422: true, 429: true, 503: true },
  }],

  // Planos e assinaturas
  ['get', '/planos', { tag: 'Planos e assinaturas', resumo: 'Planos disponíveis e preços', acesso: 'publico', respostas: { 200: 'Planos' } }],
  ['get', '/assinaturas/minha', { tag: 'Planos e assinaturas', resumo: 'Assinatura do negócio da conta logada', acesso: 'login', respostas: { 200: 'Assinatura atual', 404: true } }],
  ['post', '/assinaturas', { tag: 'Planos e assinaturas', resumo: 'Assina um plano e recebe o link do checkout', acesso: 'login', corpo: escolherPlanoSchema, respostas: { 201: 'Assinatura criada, com o link do checkout', 409: true, 422: true, 503: true } }],
  ['put', '/assinaturas/minha', { tag: 'Planos e assinaturas', resumo: 'Troca o plano da assinatura atual', acesso: 'login', corpo: escolherPlanoSchema, respostas: { 200: 'Plano trocado', 404: true, 409: true, 422: true, 503: true } }],
  ['delete', '/assinaturas/minha', { tag: 'Planos e assinaturas', resumo: 'Cancela a renovação (vale até o fim do período pago)', acesso: 'login', respostas: { 200: 'Renovação cancelada', 404: true, 503: true } }],
  ['get', '/assinaturas', { tag: 'Planos e assinaturas', resumo: 'Todas as assinaturas', acesso: 'admin', respostas: { 200: ['Assinaturas', ref('Lista')] } }],
  ['post', '/assinaturas/{id}/simular-aprovacao', { tag: 'Planos e assinaturas', resumo: 'Demonstração: aprova o pagamento (fora de produção)', acesso: 'admin', respostas: { 200: 'Pagamento aprovado', 400: true, 404: true } }],
  ['post', '/assinaturas/{id}/simular-falha', { tag: 'Planos e assinaturas', resumo: 'Demonstração: recusa o pagamento (fora de produção)', acesso: 'admin', respostas: { 200: 'Pagamento recusado', 400: true, 404: true } }],

  // Métricas
  ['post', '/metricas', { tag: 'Métricas', resumo: 'Registra uma visita ou clique (chamado pelo site)', acesso: 'publico', corpo: eventoSchema, respostas: { 204: 'Evento registrado', 422: true, 429: true } }],
  ['get', '/metricas/meu-negocio', {
    tag: 'Métricas', resumo: 'Desempenho do negócio da conta logada', acesso: 'login',
    parametros: [consulta('dias', 'Período em dias (7 a 90)', { type: 'integer', minimum: 7, maximum: 90 })],
    respostas: { 200: 'Totais e série por dia', 404: true },
  }],

  // Divulgações
  ['get', '/divulgacoes/minhas', { tag: 'Divulgações', resumo: 'Divulgações do negócio da conta logada', acesso: 'login', respostas: { 200: ['Divulgações', ref('Lista')] } }],
  ['get', '/divulgacoes', {
    tag: 'Divulgações', resumo: 'Todas as divulgações', acesso: 'admin',
    parametros: [consulta('empreendedorId', 'Só de um negócio', { type: 'integer', minimum: 1 })],
    respostas: { 200: ['Divulgações', ref('Lista')], 400: true },
  }],
  ['post', '/divulgacoes', { tag: 'Divulgações', resumo: 'Registra uma divulgação nas redes', acesso: 'admin', corpo: criarDivulgacaoSchema, respostas: { 201: 'Divulgação registrada', 422: true } }],
  ['put', '/divulgacoes/{id}', { tag: 'Divulgações', resumo: 'Atualiza uma divulgação', acesso: 'admin', corpo: atualizarDivulgacaoSchema, respostas: { 200: 'Divulgação atualizada', 400: true, 404: true, 422: true } }],
  ['delete', '/divulgacoes/{id}', { tag: 'Divulgações', resumo: 'Exclui uma divulgação', acesso: 'admin', respostas: { 200: 'Divulgação excluída', 400: true, 404: true } }],

  // Webhooks
  ['post', '/webhooks/abacatepay', {
    tag: 'Webhooks', resumo: 'Eventos do gateway de pagamento (assinatura HMAC no cabeçalho)', acesso: 'publico',
    corpoBinario: ['application/json'],
    respostas: { 200: 'Evento processado', 400: true, 401: true },
  }],
];

// ---------------------------------------------------------------------------
// Montagem do documento
// ---------------------------------------------------------------------------

function operacao(metodo, caminho, opcoes) {
  const acesso = ACESSOS[opcoes.acesso];
  const parametros = [...(caminho.includes('{id}') ? [parametroId()] : []), ...(opcoes.parametros ?? [])];

  const respostas = {};
  const codigos = { ...Object.fromEntries(acesso.erros.map((c) => [c, true])), ...opcoes.respostas };
  // Toda rota que lê JSON pode receber um corpo ilegível; toda rota pode cair num erro inesperado
  if (opcoes.corpo) codigos[400] ??= true;
  codigos[500] = true;
  for (const [codigo, valor] of Object.entries(codigos)) {
    if (valor === true) respostas[codigo] = codigo === '500' ? erro('Erro inesperado no servidor') : ERROS[codigo];
    else if (Array.isArray(valor)) respostas[codigo] = respostaJson(valor[0], valor[1]);
    else if (codigo === '204' || codigo === '302') respostas[codigo] = { description: valor };
    else respostas[codigo] = respostaJson(valor);
  }

  const operacaoOpenApi = {
    tags: [opcoes.tag],
    summary: opcoes.resumo,
    operationId: `${metodo}${caminho.replace(/[{}]/g, '').replace(/[/-](\w)/g, (_, l) => l.toUpperCase())}`,
    security: acesso.security,
    ...(opcoes.acesso === 'admin' ? { description: 'Só a administração (perfil ADMIN).' } : {}),
    ...(parametros.length ? { parameters: parametros } : {}),
    responses: respostas,
  };
  if (opcoes.corpo) {
    operacaoOpenApi.requestBody = { required: true, content: { 'application/json': { schema: corpoDe(opcoes.corpo) } } };
  } else if (opcoes.corpoBinario) {
    operacaoOpenApi.requestBody = {
      required: true,
      content: Object.fromEntries(opcoes.corpoBinario.map((tipo) => [tipo, { schema: { type: 'string', format: 'binary' } }])),
    };
  }
  return operacaoOpenApi;
}

let documento;

/** Documento OpenAPI 3.0 (montado uma vez e guardado) */
export function especificacaoOpenApi() {
  if (documento) return documento;
  const paths = {};
  for (const [metodo, caminho, opcoes] of ENDPOINTS) {
    (paths[caminho] ??= {})[metodo] = operacao(metodo, caminho, opcoes);
  }
  documento = {
    openapi: '3.0.3',
    info: {
      title: 'API do VitrineRondon',
      version: '1.0.0',
      description: [
        'Vitrine digital do comércio de bairro de Rondonópolis-MT.',
        '',
        '**Contrato:** recurso na URI, intenção no método. Respostas em JSON no formato `{ success, message, data }`;',
        'listas paginadas trazem `paginacao`.',
        '',
        '**Erros:** `400` corpo ilegível ou ID que não é número · `401` sem login · `403` sem permissão ·',
        '`404` não encontrado · `409` conflito · `422` dados inválidos, com `errors: { campo: [mensagens] }` ·',
        '`429` limite de requisições · `500` erro inesperado · `503` serviço indisponível.',
        '',
        '**Segurança:** HTTPS obrigatório em produção, CORS restrito ao site, limite de requisições por IP,',
        'token JWT no cabeçalho `Authorization: Bearer <token>` e perfil conferido no banco a cada requisição.',
      ].join('\n'),
    },
    servers: [{ url: '/api', description: 'Este servidor' }],
    tags: [...new Set(ENDPOINTS.map(([, , o]) => o.tag))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token devolvido pelo login ou pelo cadastro' },
      },
      schemas: {
        Sucesso: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { description: 'Recurso pedido ou criado' },
          },
          required: ['success'],
        },
        Lista: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { type: 'object' } },
            total: { type: 'integer' },
            paginacao: ref('Paginacao'),
          },
          required: ['success', 'data'],
        },
        Paginacao: {
          type: 'object',
          properties: {
            pagina: { type: 'integer', example: 1 },
            porPagina: { type: 'integer', example: 12 },
            total: { type: 'integer', example: 40 },
            totalPaginas: { type: 'integer', example: 4 },
          },
        },
        Sessao: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: { token: { type: 'string' }, usuario: { type: 'object' } },
            },
          },
        },
        Erro: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Registro não encontrado' },
          },
          required: ['success', 'message'],
        },
        ErroValidacao: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Dados inválidos' },
            errors: {
              type: 'object',
              additionalProperties: { type: 'array', items: { type: 'string' } },
              example: { preco: ['O preço deve ser maior que zero'] },
            },
          },
          required: ['success', 'message', 'errors'],
        },
      },
    },
  };
  return documento;
}
