// Paginação opcional das listagens públicas.
//
// Sem `pagina` na query a resposta continua vindo inteira, como sempre: as
// telas que mostram poucos itens (home, painel do empreendedor) e as coleções
// de teste não precisam mudar por causa disto.
import { erroHttp } from './erros.js';

const POR_PAGINA_PADRAO = 12;
const POR_PAGINA_MAXIMO = 60;

/** Lê pagina/porPagina da query; `ativa` diz se o cliente pediu paginação */
export function lerPaginacao(query = {}) {
  const pediu = query.pagina !== undefined || query.porPagina !== undefined;
  if (!pediu) return { ativa: false };

  const pagina = Number(query.pagina ?? 1);
  const porPagina = Number(query.porPagina ?? POR_PAGINA_PADRAO);
  if (!Number.isInteger(pagina) || pagina < 1) throw erroHttp(400, 'Página inválida');
  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > POR_PAGINA_MAXIMO) {
    throw erroHttp(400, `Informe de 1 a ${POR_PAGINA_MAXIMO} itens por página`);
  }

  return { ativa: true, pagina, porPagina, skip: (pagina - 1) * porPagina, take: porPagina };
}

/** Dados da paginação para a resposta, já com o total de páginas calculado */
export function resumoPaginacao({ pagina, porPagina }, total) {
  return { pagina, porPagina, total, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
}
