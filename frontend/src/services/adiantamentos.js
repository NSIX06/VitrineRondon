// O que cada página já pode começar a baixar na abertura. O plano (telas e
// leituras) mora em planoDeAbertura.js e vale em dois lugares:
// - no script pequeno dentro do index.html (gerado no build), que começa os
//   pedidos antes de o JavaScript principal chegar;
// - aqui, quando o main.jsx roda, para o que o script não cobriu (por
//   exemplo, em desenvolvimento, onde o script não existe).
// Sem isso, tudo vinha em fila: JavaScript principal, código da tela, dados.
import { adiantarLeitura, obterToken } from './api.js'
import { planoDaAbertura } from './planoDeAbertura.js'

// Mesmos tamanhos de página das telas (pages/Vitrine e pages/Empreendedores)
export const POR_PAGINA_VITRINE = 9
export const POR_PAGINA_EMPREENDEDORES = 6

const TELAS = {
  Vitrine: () => import('../pages/Vitrine/Vitrine.jsx'),
  Empreendedores: () => import('../pages/Empreendedores/Empreendedores.jsx'),
  EmpreendedorDetalhe: () => import('../pages/EmpreendedorDetalhe/EmpreendedorDetalhe.jsx'),
  ProdutoDetalhe: () => import('../pages/ProdutoDetalhe/ProdutoDetalhe.jsx'),
  Login: () => import('../pages/Login/Login.jsx'),
  MeuNegocio: () => import('../pages/MeuNegocio/MeuNegocio.jsx'),
  Admin: () => import('../pages/Admin/Admin.jsx'),
}

/** O plano no formato antigo (usado pelos testes): { telas: [funções], leituras: [caminhos] } */
export function planoDeAdiantamento(caminho, busca = '', comSessao = false) {
  const plano = planoDaAbertura(caminho, busca, comSessao)
  return {
    telas: plano.telas.map((nome) => TELAS[nome]).filter(Boolean),
    leituras: plano.leituras.map((leitura) => leitura.caminho),
  }
}

/** Dispara o que a página aberta vai precisar (a Home tem o seu, em pages/Home/consultas.js) */
export function adiantarPagina(local = window.location) {
  const { telas, leituras } = planoDeAdiantamento(local.pathname, local.search, Boolean(obterToken()))
  for (const carregar of telas) carregar().catch(() => {})
  for (const caminho of leituras) adiantarLeitura(caminho)
}
