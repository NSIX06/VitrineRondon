// Planos e assinaturas de ponta a ponta: a vitrine com o selo e a ordem, a
// página de planos, os painéis do Essencial e do Destaque, a troca de plano
// com o checkout de testes do AbacatePay e o efeito na vitrine.
//
// Roda o seed no começo e no fim: parte sempre do mesmo cenário (DEMO.md) e
// deixa o banco pronto para a demonstração. Precisa da ABACATEPAY_API_KEY de
// testes no backend/.env e de internet para abrir o checkout.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { APP, CARLOS, MARIA, abrirNavegador, cabecalhoAdmin, entrarNoSistema, helpers } from './cdp.mjs'

const API = 'http://localhost:3001/api'
const BACKEND = fileURLToPath(new URL('../backend/', import.meta.url))

let ok = 0
let falhas = 0
const checar = (nome, condicao, extra = '') => {
  if (condicao) { ok++; console.log(`  OK   ${nome}`) }
  else { falhas++; console.log(`  FALHA ${nome} ${extra}`) }
}

const semear = () => execFileSync('node', ['prisma/seed.js'], { cwd: BACKEND, stdio: 'ignore' })

async function main() {
  semear()
  const nav = await abrirNavegador({ largura: 1280, altura: 900 })
  const { evaluate, esperar, esperarPor, navegar, viewport, fechar } = nav
  const abrir = async (rota, espera) => {
    await navegar(APP + rota)
    await evaluate(helpers)
    if (espera) await esperarPor(`__q(${JSON.stringify(espera)})`, 15000)
    await esperar(700)
  }
  const nomesNaLista = () => evaluate("[...document.querySelectorAll('.empreendedor-card')].map(c => ({ nome: c.querySelector('.empreendedor-card__nome').innerText.trim(), selo: Boolean(c.querySelector('.selo-destaque')) }))")
  const abrirAba = async (rotulo) => {
    await evaluate(`[...document.querySelectorAll('[role=tab]')].find(t => __textoSemIcone(t).startsWith(${JSON.stringify(rotulo)})).click()`)
    await esperar(1500)
  }
  const sair = () => evaluate("localStorage.removeItem('vitrinelocal.token'); true")
  const semRolagemLateral = () => evaluate('document.documentElement.scrollWidth <= innerWidth')

  try {
    console.log('\n1. A vitrine: selo e ordem, sem esconder quem não assina')
    await abrir('/empreendedores', '.empreendedor-card')
    let lista = await nomesNaLista()
    checar('os cinco negócios aparecem', lista.length === 5, JSON.stringify(lista))
    checar('o Destaque vem primeiro, com o selo', lista[0]?.nome === 'Ateliê Fio & Arte' && lista[0].selo)
    checar('só o Destaque tem selo', lista.filter((e) => e.selo).length === 1)
    checar('o Silva Reparos (Essencial) está em último', lista.at(-1)?.nome === 'Silva Reparos Residenciais')
    await abrir('/', '#titulo-destaques')
    checar('a Home mostra a seção de destaques com o selo', await evaluate("Boolean(__q('.destaques .selo-destaque'))"))

    console.log('\n2. Página de planos (visitante)')
    await abrir('/planos', '.planos__cartao')
    checar('dois planos à venda', (await evaluate("document.querySelectorAll('.planos__cartao').length")) === 2)
    checar('preços de R$ 50 e R$ 75', await evaluate("(t => /50,00/.test(t) && /75,00/.test(t))(__q('.planos__lista').innerText)"))
    checar('o quadro de transparência não promete resultado', await evaluate("/não garante/i.test(__q('.planos__transparencia').innerText)"))
    checar('o aviso de ambiente de testes aparece', await evaluate("/Ambiente de testes/.test(document.body.innerText)"))
    await evaluate("__q('.planos__cartao--destaque .planos__acao .botao').click()")
    await esperar(800)
    checar('sem login, assinar leva para a entrada', (await evaluate('location.pathname')) === '/login')

    console.log('\n3. Painel de quem é Destaque')
    await entrarNoSistema(nav, MARIA)
    await abrir('/meu-negocio', '[role=tab]')
    await abrirAba('Plano')
    checar('plano Destaque ativo', await evaluate("(t => /Destaque/.test(t) && /Ativa/i.test(t))(__q('.painel__plano').innerText)"))
    await abrirAba('Desempenho')
    checar('o Destaque vê o gráfico por dia', await evaluate("Boolean(__q('.desempenho__grafico svg'))"))
    await abrirAba('Divulga')
    checar('a divulgação mostra as duas do seed', (await evaluate("document.querySelectorAll('.divulgacoes__item').length")) === 2)
    await sair()

    console.log('\n4. O Essencial assina o Destaque')
    await entrarNoSistema(nav, CARLOS)
    await abrir('/meu-negocio', '[role=tab]')
    await abrirAba('Plano')
    checar('começa no Essencial ativo', await evaluate("(t => /Essencial/.test(t) && /Ativa/i.test(t))(__q('.painel__plano').innerText)"))
    await abrirAba('Desempenho')
    checar('o Essencial vê os totais, sem o gráfico', await evaluate("Boolean(__q('.desempenho__cartoes')) && !__q('.desempenho__grafico')"))

    await abrir('/planos', '.planos__cartao--destaque')
    await evaluate("__q('.planos__cartao--destaque .planos__acao .botao').click()")
    await esperarPor("__q('.modal .planos__confirmacao')", 10000)
    checar('a confirmação avisa que o plano atual segue até o pagamento', await evaluate("/continua valendo/.test(__q('.planos__confirmacao').innerText)"))
    await evaluate("__clickText('Ir para o pagamento', '.modal button')")
    let noCheckout = false
    for (let i = 0; i < 40 && !noCheckout; i++) {
      await esperar(500)
      noCheckout = /abacatepay/.test(await evaluate('location.hostname').catch(() => ''))
    }
    checar('abre o checkout do AbacatePay', noCheckout)

    // O pagamento de teste é aprovado pela simulação, que aplica o mesmo
    // tratamento do aviso do gateway (o checkout hospedado não é automatizado aqui)
    const admin = await cabecalhoAdmin()
    const assinaturas = (await (await fetch(`${API}/assinaturas`, { headers: admin })).json()).data
    const pendente = assinaturas.find((a) => a.status === 'PENDENTE' && a.empreendedor.nomeNegocio.startsWith('Silva'))
    checar('o pedido de troca ficou aguardando pagamento', Boolean(pendente))
    if (pendente) await fetch(`${API}/assinaturas/${pendente.id}/simular-aprovacao`, { method: 'POST', headers: admin })

    await abrir('/meu-negocio?assinatura=retorno', '.painel__plano')
    await esperar(1500)
    checar('na volta, o painel abre na aba Plano com o Destaque ativo', await evaluate("(t => /Destaque/.test(t) && /Ativa/i.test(t))(__q('.painel__plano').innerText)"))
    checar('o parâmetro de retorno sai da URL', !(await evaluate("location.search.includes('assinatura')")))
    checar('aparece a próxima cobrança', await evaluate("/Próxima cobrança/i.test(__q('.painel__fatos').innerText)"))

    console.log('\n5. O efeito na vitrine')
    await sair()
    await abrir('/empreendedores', '.empreendedor-card')
    lista = await nomesNaLista()
    checar('o Silva Reparos sobe para o segundo lugar, com selo', lista[1]?.nome === 'Silva Reparos Residenciais' && lista[1].selo, JSON.stringify(lista))
    checar('os negócios sem plano continuam na lista', lista.length === 5)
    const historico = (await (await fetch(`${API}/assinaturas`, { headers: admin })).json()).data.filter((a) => a.empreendedor.nomeNegocio.startsWith('Silva'))
    checar('o Essencial antigo foi cancelado (sem duas cobranças ativas)', historico.filter((a) => a.status === 'ATIVA').length === 1 && historico.some((a) => a.plano.nome === 'ESSENCIAL' && a.status === 'CANCELADA'))

    console.log('\n6. Celular (390px)')
    await viewport(390, 844)
    await abrir('/planos', '.planos__cartao')
    checar('/planos sem rolagem lateral', await semRolagemLateral())
    await entrarNoSistema(nav, CARLOS)
    for (const aba of ['Plano', 'Desempenho', 'Divulga']) {
      await abrir('/meu-negocio', '[role=tab]')
      await abrirAba(aba)
      checar(`aba ${aba} sem rolagem lateral`, await semRolagemLateral())
    }
  } finally {
    fechar()
    semear()
  }

  console.log(`\n=== ${ok} verificações OK, ${falhas} falhas ===`)
  process.exitCode = falhas === 0 ? 0 : 1
}

main().catch((e) => { console.error('ERRO:', e.message); process.exitCode = 1 })
