// Erros que a API pode mostrar para quem fez a requisição.
//
// A regra é simples: só sai para o cliente o texto que nós escrevemos aqui.
// Mensagem de biblioteca, de driver do banco ou de sistema de arquivos costuma
// dizer caminho de arquivo, nome de coluna e versão de dependência — tudo isso
// fica no log do servidor, onde só a administração vê.

/** Mensagem padrão quando o erro não tem uma escrita por nós */
const MENSAGENS = {
  400: 'Requisição inválida',
  401: 'Faça login para continuar',
  403: 'Você não tem permissão para esta ação',
  404: 'Registro não encontrado',
  409: 'Já existe um registro com esses dados',
  413: 'Corpo da requisição muito grande',
  415: 'Formato de conteúdo não suportado',
  429: 'Muitas requisições. Tente novamente em instantes',
};

export const MENSAGEM_GENERICA = 'Não foi possível concluir a operação. Tente novamente';

/**
 * Cria um erro com status HTTP e mensagem própria para o usuário.
 * A marca `publico` é o que autoriza o errorHandler a repassar o texto.
 */
export function erroHttp(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  erro.publico = true;
  return erro;
}

/** Converte o :id da rota, recusando qualquer coisa que não seja inteiro positivo */
export function parseId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw erroHttp(400, 'ID inválido');
  return id;
}

/** Texto seguro para um status, quando o erro não trouxe um nosso */
export function mensagemPadrao(status) {
  return MENSAGENS[status] || MENSAGEM_GENERICA;
}
