// Telas no celular (390px), termos em modal no cadastro e o painel sem
// informação repetida.
import { APP, abrirNavegador, helpers, entrarNoSistema } from './cdp.mjs'

let ok = 0
let falhas = 0
const checar = (nome, condicao, extra = '') => {
  if (condicao) { ok++; console.log(`  OK   ${nome}`) }
  else { falhas++; console.log(`  FALHA ${nome} ${extra}`) }
}

async function main() {
  const nav = await abrirNavegador({ largura: 390, altura: 844 })
  const { evaluate, esperar, esperarPor, navegar, viewport, screenshot, clicarEm, cdp, fechar } = nav
  const abrir = async (rota, espera) => {
    await navegar(APP + rota)
    await evaluate(helpers)
    if (espera) await esperarPor(`__q(${JSON.stringify(espera)})`, 15000)
    await esperar(700)
  }
  const semRolagemLateral = () => evaluate('document.documentElement.scrollWidth <= innerWidth')
  // Alguma aba do navegador aberta direto num documento legal?
  const abaComDocumento = async () =>
    (await cdp('Target.getTargets')).targetInfos.some(
      (t) => t.type === 'page' && /\/(termos|privacidade)(\?|$)/.test(new URL(t.url || 'about:blank', APP).pathname)
    )

  try {
    await viewport(390, 844)

    console.log('\n1. Telas públicas carregam no celular')
    for (const [rota, espera] of [['/vitrine', '.grade-cards'], ['/empreendedores', '.grade-cards'], ['/contato', '.acordeao']]) {
      await abrir(rota, espera)
      const erro = await evaluate("[...document.querySelectorAll('.status--erro')].map(e => e.innerText).join(' | ')")
      checar(`${rota} mostra os dados, sem erro`, !erro, erro)
      checar(`${rota} sem rolagem lateral`, await semRolagemLateral())
    }

    console.log('\n2. Termos e política no cadastro')
    await abrir('/cadastro', '#conta-nome')
    await evaluate("__set('#conta-nome', 'Maria Teste')")
    await clicarEm('.aceite .link-em-texto')
    await esperarPor("__q('.modal .documento-legal h2')", 15000)
    checar('os termos abrem por cima do formulário', (await evaluate('location.pathname')) === '/cadastro')
    checar('nenhuma aba nova é aberta no documento', !(await abaComDocumento()))
    checar('ler os termos não marca o aceite sozinho', !(await evaluate("__q('#aceite-termos').checked")))
    await evaluate("__q('.modal__fundo').scrollTo({ top: 5000, behavior: 'instant' })")
    await esperar(300)
    checar('o fechar continua visível no fim do documento', await evaluate("(r => r.top >= 0 && r.bottom <= innerHeight)(__q('.modal__cabecalho').getBoundingClientRect())"))
    await evaluate("__clickText('Voltar ao formulário')")
    await esperar(300)
    checar('fechar devolve ao formulário com o que foi digitado', !(await evaluate("Boolean(__q('.modal'))")) && (await evaluate("__q('#conta-nome').value")) === 'Maria Teste')

    await clicarEm('.aceite__item:nth-child(3) .link-em-texto')
    await esperarPor("__q('.modal .documento-legal')", 15000)
    checar('a política também abre no modal', (await evaluate("__q('.modal__titulo').innerText")) === 'Política de Privacidade')
    await screenshot('../docs/imagens-teste-termos-celular.png')
    await evaluate("__q('.modal__fechar').click()")
    await esperar(300)

    const linksNovaAba = await evaluate("[...document.querySelectorAll('a[target=_blank]')].filter(a => ['/termos', '/privacidade'].includes(new URL(a.href).pathname)).length")
    checar('nenhum link para os documentos abre em outra aba', linksNovaAba === 0, `${linksNovaAba} links`)

    console.log('\n3. Painel no celular')
    await entrarNoSistema(nav)
    await abrir('/admin', '.admin__metricas')
    checar('sem rolagem lateral', await semRolagemLateral())
    const metricas = await evaluate("[...document.querySelectorAll('.admin__metrica')].map(m => Math.round(m.getBoundingClientRect().top))")
    checar('métricas em duas colunas', new Set(metricas).size === 2, JSON.stringify(metricas))
    const abas = await evaluate("[...document.querySelectorAll('.admin__aba')].map(a => Math.round(a.getBoundingClientRect().width))")
    checar('abas do mesmo tamanho', new Set(abas).size === 1, JSON.stringify(abas))
    checar('botões de ação lado a lado', await evaluate("(b => b.length === 2 && Math.abs(b[0].getBoundingClientRect().top - b[1].getBoundingClientRect().top) < 2)([...document.querySelectorAll('.data-table__acoes')[0].children])"))
    await screenshot('../docs/imagens-teste-admin-celular.png')

    console.log('\n4. Sem informação repetida no painel')
    await viewport(1280, 900)
    await abrir('/admin', '.admin__metricas')
    checar('cadastrar produto fica dentro da aba de produtos', await evaluate("Boolean([...document.querySelectorAll('.admin__painel button')].find(b => b.innerText.includes('Novo produto')))"))
    checar('o topo não repete as ações das abas', !(await evaluate("[...document.querySelectorAll('.admin__topo-acoes button')].some(b => /Novo (produto|empreendedor)/.test(b.innerText))")))
    await evaluate("[...document.querySelectorAll('.admin__aba')].find(a => __textoSemIcone(a).startsWith('Mensagens')).click()")
    await esperar(400)
    checar('a aba de mensagens não repete o total do cartão', !(await evaluate("Boolean(__q('.admin__painel .admin__barra'))")))
    await evaluate("__q('.navbar__conta-botao').click()")
    await esperar(300)
    const noMenu = await evaluate("[...document.querySelectorAll('.navbar__conta-menu a')].map(a => new URL(a.href).pathname)")
    checar('o menu da conta não repete o botão Admin ao lado', !noMenu.includes('/admin'), JSON.stringify(noMenu))
  } finally {
    fechar()
  }

  console.log(`\n=== ${ok} verificações OK, ${falhas} falhas ===`)
  process.exitCode = falhas === 0 ? 0 : 1
}

main().catch((e) => { console.error('ERRO:', e.message); process.exitCode = 1 })
