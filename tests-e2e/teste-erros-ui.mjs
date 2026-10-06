// A tela de erro não pode mostrar pilha de chamadas nem caminho de arquivo.
// A falha é provocada de fora, bloqueando o arquivo da tela no navegador: nada
// de código de teste dentro do site.
import { APP, abrirNavegador, helpers } from './cdp.mjs'

let ok = 0
let falhas = 0
const checar = (nome, condicao, extra = '') => {
  if (condicao) { ok++; console.log(`  OK   ${nome}`) }
  else { falhas++; console.log(`  FALHA ${nome} ${extra}`) }
}

const VAZAMENTOS = [
  ['pilha de chamadas', /\bat [A-Za-z_$]/],
  ['caminho de arquivo', /\.(jsx?|tsx?):\d+/],
  ['endereco interno', /localhost:\d+|node_modules/],
  ['dica para desenvolvedor', /ErrorBoundary|errorElement|Hey developer/i],
  ['nome de biblioteca', /react-dom|react-router|vite/i],
]

async function main() {
  const nav = await abrirNavegador({ largura: 1280, altura: 900 })
  const { evaluate, esperar, esperarPor, navegar, screenshot, fechar, cdp } = nav
  const abrir = async (rota) => {
    await navegar(APP + rota)
    await evaluate(helpers)
    await esperar(1500)
  }

  try {
    console.log('\n1. Tela que não consegue carregar')
    await abrir('/')
    await cdp('Network.enable')
    // Derruba só o arquivo da tela Sobre, como uma conexão que cai no meio
    await cdp('Network.setBlockedURLs', { urls: ['*Sobre*'] })
    await evaluate(`__q('.navbar__menu a[href=\"/sobre\"]').click()`)
    await esperarPor("__q('.pagina-erro')", 20000)
    const texto = await evaluate('document.body.innerText')
    checar('mostra a nossa tela de erro', await evaluate("Boolean(__q('.pagina-erro'))"))
    checar('explica em português, sem jargão', texto.includes('A tela não terminou de carregar'))
    checar('oferece recarregar e voltar ao início', texto.includes('Recarregar a página') && texto.includes('Voltar ao início'))
    for (const [nome, padrao] of VAZAMENTOS) {
      checar(`não mostra ${nome}`, !padrao.test(texto), (texto.match(padrao) || [''])[0])
    }
    checar('a navegação do site continua de pé', await evaluate("Boolean(__q('.navbar__menu'))"))
    await screenshot('../docs/imagens-teste-erro-tela.png')
    await cdp('Network.setBlockedURLs', { urls: [] })

    console.log('\n2. Endereço que não existe')
    await abrir('/uma-rota-que-nao-existe')
    await esperarPor("__q('.pagina-erro')", 15000)
    const texto404 = await evaluate('document.body.innerText')
    checar('trata como página não encontrada', texto404.includes('Página não encontrada'))
    checar('não repete o endereço digitado', !texto404.includes('uma-rota-que-nao-existe'), texto404.slice(0, 120))

    console.log('\n3. Erro vindo da API')
    await abrir('/empreendedores/999999')
    await esperar(2000)
    const textoApi = await evaluate('document.body.innerText')
    for (const [nome, padrao] of VAZAMENTOS) {
      checar(`resposta de erro não mostra ${nome}`, !padrao.test(textoApi), (textoApi.match(padrao) || [''])[0])
    }
  } finally {
    fechar()
  }

  console.log(`\n=== ${ok} verificações OK, ${falhas} falhas ===`)
  process.exit(falhas === 0 ? 0 : 1)
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
