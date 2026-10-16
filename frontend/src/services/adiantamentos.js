// O que cada página do site já pode começar a baixar na abertura, antes de o
// React desenhar a tela. Sem isso, tudo vinha em fila: JavaScript principal,
// depois o código da tela, depois os dados (e, em área com login, ainda a
// confirmação da sessão no meio). Medido no celular lento: o perfil de um
// negócio levava 4,2 s até a descrição aparecer.
//
// Os endereços aqui precisam ser os mesmos que as telas pedem: a leitura
// adiantada só é aproveitada quando o caminho e a query são idênticos
// (adiantarLeitura, em services/api.js). Os testes de adiantamentos conferem.
import { adiantarLeitura, montarQuery, obterToken } from './api.js'

// Mesmos tamanhos de página das telas (pages/Vitrine e pages/Empreendedores)
export const POR_PAGINA_VITRINE = 9
export const POR_PAGINA_EMPREENDEDORES = 6

/** Filtros e página da URL, como o useFiltrosNaUrl lê */
function filtrosDaUrl(busca, nomes) {
  const parametros = new URLSearchParams(busca)
  const filtros = Object.fromEntries(nomes.map((nome) => [nome, parametros.get(nome) || '']))
  return { ...filtros, pagina: Number(parametros.get('pagina')) || 1 }
}

/**
 * O que adiantar para um endereço: { telas: [funções de import], leituras: [caminhos] }.
 * Separado de `adiantarPagina` para ser testado sem navegador.
 */
export function planoDeAdiantamento(caminho, busca = '', comSessao = false) {
  const telas = []
  const leituras = []
  const item = /^\/(empreendedores|produtos)\/(\d+)\/?$/.exec(caminho)

  if (caminho === '/vitrine') {
    telas.push(() => import('../pages/Vitrine/Vitrine.jsx'))
    const { categoria, busca: termo, tipo, pagina } = filtrosDaUrl(busca, ['categoria', 'busca', 'tipo'])
    leituras.push(`/produtos${montarQuery({ categoria, busca: termo, tipo, pagina, porPagina: POR_PAGINA_VITRINE })}`)
  } else if (caminho === '/empreendedores') {
    telas.push(() => import('../pages/Empreendedores/Empreendedores.jsx'))
    const { categoria, busca: termo, bairro, pagina } = filtrosDaUrl(busca, ['categoria', 'busca', 'bairro'])
    leituras.push(`/empreendedores${montarQuery({ categoria, busca: termo, bairro, pagina, porPagina: POR_PAGINA_EMPREENDEDORES })}`)
    leituras.push('/empreendedores')
  } else if (item?.[1] === 'empreendedores') {
    telas.push(() => import('../pages/EmpreendedorDetalhe/EmpreendedorDetalhe.jsx'))
    leituras.push(`/empreendedores/${item[2]}`)
  } else if (item?.[1] === 'produtos') {
    telas.push(() => import('../pages/ProdutoDetalhe/ProdutoDetalhe.jsx'))
    leituras.push(`/produtos/${item[2]}`)
  } else if (caminho === '/login' || (!comSessao && /^\/(meu-negocio|admin)(\/|$)/.test(caminho))) {
    // Vai cair no login: a foto do painel é o maior elemento da tela no celular
    telas.push(() => import('../pages/Login/Login.jsx'))
  } else if (/^\/meu-negocio(\/|$)/.test(caminho)) {
    telas.push(() => import('../pages/MeuNegocio/MeuNegocio.jsx'))
    leituras.push('/auth/me', '/empreendedores/meu')
    const aba = new URLSearchParams(busca).get('aba')
    if (aba === 'plano') leituras.push('/assinaturas/minha')
    if (aba === 'desempenho') leituras.push('/metricas/meu-negocio?dias=30')
  } else if (/^\/admin(\/|$)/.test(caminho)) {
    telas.push(() => import('../pages/Admin/Admin.jsx'))
    leituras.push('/auth/me')
  }
  return { telas, leituras }
}

/** Dispara o que a página aberta vai precisar (a Home tem o seu, em pages/Home/consultas.js) */
export function adiantarPagina(local = window.location) {
  const { telas, leituras } = planoDeAdiantamento(local.pathname, local.search, Boolean(obterToken()))
  for (const carregar of telas) carregar().catch(() => {})
  for (const caminho of leituras) adiantarLeitura(caminho)
}
