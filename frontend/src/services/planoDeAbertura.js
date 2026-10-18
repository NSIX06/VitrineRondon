// O que cada página precisa logo na abertura: as telas (código) e as leituras
// (dados). A função é autossuficiente de propósito (sem imports nem nada de
// fora dela): o build a copia, pelo texto, para um script pequeno dentro do
// index.html, que começa os pedidos antes de o JavaScript principal chegar.
// O mesmo plano é usado depois pelo main.jsx (services/adiantamentos.js).
//
// Os caminhos das leituras precisam ser idênticos aos que as telas pedem
// (useConsulta: caminho + query na mesma ordem); os testes de adiantamentos
// conferem.

/**
 * @returns {{ telas: string[], leituras: { caminho: string, comSessao: boolean }[] }}
 *   telas: nomes das telas (os mesmos de pages/<Nome>/<Nome>.jsx)
 */
export function planoDaAbertura(caminho, busca, comSessao) {
  var POR_PAGINA_VITRINE = 9
  var POR_PAGINA_EMPREENDEDORES = 6
  var LIMITE_PILHA = 6
  var parametros = new URLSearchParams(busca || '')
  // Igual ao montarQuery de services/api.js: ignora vazios, mantém a ordem
  function query(pares) {
    var partes = pares.filter(function (par) {
      return par[1] !== undefined && par[1] !== null && par[1] !== ''
    })
    return partes.length ? '?' + new URLSearchParams(partes).toString() : ''
  }
  function filtro(nome) {
    return parametros.get(nome) || ''
  }
  var pagina = Number(parametros.get('pagina')) || 1
  var item = /^\/(empreendedores|produtos)\/(\d+)\/?$/.exec(caminho)
  var telas = []
  var leituras = []
  function ler(c, sessao) {
    leituras.push({ caminho: c, comSessao: Boolean(sessao) })
  }

  if (caminho === '/') {
    ler('/produtos')
    ler('/empreendedores')
    ler('/empreendedores/destaques?limite=' + LIMITE_PILHA)
  } else if (caminho === '/vitrine') {
    telas.push('Vitrine')
    ler('/produtos' + query([['categoria', filtro('categoria')], ['busca', filtro('busca')], ['tipo', filtro('tipo')], ['bairro', filtro('bairro')], ['pagina', pagina], ['porPagina', POR_PAGINA_VITRINE]]))
    ler('/empreendedores')
  } else if (caminho === '/empreendedores') {
    telas.push('Empreendedores')
    ler('/empreendedores' + query([['categoria', filtro('categoria')], ['busca', filtro('busca')], ['bairro', filtro('bairro')], ['pagina', pagina], ['porPagina', POR_PAGINA_EMPREENDEDORES]]))
    ler('/empreendedores')
  } else if (item && item[1] === 'empreendedores') {
    telas.push('EmpreendedorDetalhe')
    ler('/empreendedores/' + item[2])
  } else if (item && item[1] === 'produtos') {
    telas.push('ProdutoDetalhe')
    ler('/produtos/' + item[2])
  } else if (caminho === '/login' || (!comSessao && /^\/(meu-negocio|admin)(\/|$)/.test(caminho))) {
    telas.push('Login')
  } else if (/^\/meu-negocio(\/|$)/.test(caminho)) {
    telas.push('MeuNegocio')
    ler('/auth/me', true)
    ler('/empreendedores/meu', true)
    var aba = parametros.get('aba')
    if (aba === 'plano') ler('/assinaturas/minha', true)
    if (aba === 'desempenho') ler('/metricas/meu-negocio?dias=30', true)
  } else if (/^\/admin(\/|$)/.test(caminho)) {
    telas.push('Admin')
    ler('/auth/me', true)
  }
  return { telas: telas, leituras: leituras }
}
