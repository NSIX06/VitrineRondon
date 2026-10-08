// Planos e assinaturas de ponta a ponta, com a regra central do VitrineRondon:
// navegar é gratuito; divulgar um negócio exige conta + plano em vigor.
// Cobre a vitrine (só negócios com plano, Destaque primeiro), a página de
// planos, o cadastro em três etapas, o rascunho que vira negócio publicado, os
// painéis do Essencial e do Destaque, a troca de plano, o cancelamento que
// respeita o período pago e o celular.
//
// Roda o seed no começo e no fim (só com --resetar-banco): parte sempre do
// mesmo cenário (DEMO.md) e deixa o banco pronto para a demonstração. Precisa da ABACATEPAY_API_KEY de
// testes no backend/.env e de internet para abrir o checkout. A aprovação do
// pagamento vem da simulação do admin, que aplica o mesmo tratamento do aviso
// do gateway (o checkout hospedado não é automatizado aqui).
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { APP, CARLOS, MARIA, abrirNavegador, cabecalhoAdmin, entrarNoSistema, helpers, criarPlacar } from './cdp.mjs'

const API = 'http://localhost:3001/api'
const BACKEND = fileURLToPath(new URL('../backend/', import.meta.url))
const PATRICIA = { email: 'patricia@espacobelaflor.com.br', senha: CARLOS.senha }

const { checar, encerrar } = criarPlacar()

const semear = () => execFileSync('node', ['prisma/seed.js'], { cwd: BACKEND, stdio: 'ignore' })

// O seed APAGA o banco inteiro. Sem pedido explícito, a suíte não roda: rodar
// por engano levaria embora o que foi cadastrado à mão no banco local.
if (!process.argv.includes('--resetar-banco')) {
  console.error(
    'Esta suíte recria o banco com o seed (apaga tudo o que foi cadastrado à mão).\n' +
      'Para rodar mesmo assim: node tests-e2e/teste-planos-ui.mjs --resetar-banco  (ou npm run test:e2e:planos)'
  )
  process.exit(1)
}

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
  const textoDe = (seletor) => evaluate(`__q(${JSON.stringify(seletor)})?.innerText ?? ''`)
  const admin = await cabecalhoAdmin()
  const assinaturasDe = async (prefixo) =>
    (await (await fetch(`${API}/assinaturas`, { headers: admin })).json()).data.filter((a) => a.empreendedor.nomeNegocio.startsWith(prefixo))

  /** Na página de planos, escolhe o plano e segue até o checkout de testes */
  const assinarPelaPagina = async (seletorDoCartao) => {
    await abrir('/planos', seletorDoCartao)
    await evaluate(`__q(${JSON.stringify(`${seletorDoCartao} .planos__acao .botao`)}).click()`)
    await esperarPor("__q('.modal .planos__confirmacao')", 10000)
    await evaluate("__clickText('Ir para o pagamento', '.modal button')")
    let noCheckout = false
    for (let i = 0; i < 40 && !noCheckout; i++) {
      await esperar(500)
      noCheckout = /abacatepay/.test(await evaluate('location.hostname').catch(() => ''))
    }
    return noCheckout
  }
  /** Aprova (simulação) o checkout pendente do negócio */
  const aprovarPendente = async (prefixo) => {
    const pendente = (await assinaturasDe(prefixo)).find((a) => a.status === 'PENDENTE')
    if (pendente) await fetch(`${API}/assinaturas/${pendente.id}/simular-aprovacao`, { method: 'POST', headers: admin })
    return Boolean(pendente)
  }

  try {
    console.log('\n1. A vitrine: só aparece negócio com plano em vigor')
    await abrir('/empreendedores', '.empreendedor-card')
    let lista = await nomesNaLista()
    checar('os quatro negócios com plano aparecem', lista.length === 4, JSON.stringify(lista))
    checar('o rascunho (sem plano) fica fora', !lista.some((e) => e.nome === 'Espaço Bela Flor'))
    checar('o Destaque vem primeiro, com o selo', lista[0]?.nome === 'Ateliê Fio & Arte' && lista[0].selo)
    checar('o Silva Reparos (Essencial) está em último', lista.at(-1)?.nome === 'Silva Reparos Residenciais')
    await abrir('/vitrine?busca=sobrancelhas', '.vitrine__filtros, .listagem__filtros')
    await esperar(800)
    checar('a busca não acha item de negócio sem plano', await evaluate("!document.querySelector('.produto-card')"))
    await abrir('/', '#titulo-feira')
    checar('a Home mostra a feira com o Destaque primeiro, com selo', await evaluate("Boolean(__q('.feira .card-swap__cartao .selo-destaque')) && __q('.feira__nome').textContent.includes('Ateliê')"))

    console.log('\n2. Página de planos (visitante)')
    await abrir('/planos', '.planos__cartao')
    checar('dois planos à venda', (await evaluate("document.querySelectorAll('.planos__cartao').length")) === 2)
    checar('preços de R$ 50 e R$ 75', /50,00/.test(await textoDe('.planos__lista')) && /75,00/.test(await textoDe('.planos__lista')))
    checar('a página diz que o plano é necessário para divulgar', /escolha um dos planos mensais/i.test(await textoDe('.pagina-cabecalho')))
    checar('nenhum texto fala em plano opcional ou cadastro gratuito', !(await evaluate("/opciona|cadastro (na vitrine )?(continua )?gratuito/i.test(document.body.innerText)")))
    checar('o quadro de transparência não promete resultado', /não garante/i.test(await textoDe('.planos__transparencia')))
    await evaluate("__q('.planos__cartao--destaque .planos__acao .botao').click()")
    await esperar(800)
    checar('sem conta, assinar leva ao cadastro com o plano escolhido', (await evaluate('location.pathname + location.search')) === '/cadastro?plano=DESTAQUE')

    console.log('\n3. Cadastro em três etapas: conta, negócio, plano')
    await abrir('/cadastro?plano=DESTAQUE', '#conta-nome')
    checar('o cadastro não promete publicação gratuita', !(await evaluate("/sem taxa|gratuit/i.test(__q('.pagina-cabecalho').innerText)")))
    checar('três etapas visíveis', (await evaluate("document.querySelectorAll('.cadastro__etapas li').length")) === 3)
    await evaluate(`__set('#conta-nome', 'Rita Teste'); __set('#conta-email', 'rita.e2e@exemplo.com'); __set('#conta-telefone', '66991230000');
      __set('#conta-senha', 'Teste@2026Forte'); __set('#conta-confirmacao', 'Teste@2026Forte'); __q('#aceite-termos').click(); __q('#aceite-privacidade').click(); true`)
    await evaluate("__clickText('Continuar', 'form button')")
    await esperarPor("__q('#emp-nome')", 10000)
    await evaluate(`__set('#emp-nome', 'Bolos da Rita'); __set('#emp-categoria', 'Alimentação'); __set('#emp-cidade', 'Rondonópolis'); true`)
    await evaluate("__clickText('Continuar', 'form button')")
    await esperarPor("__q('.escolha-plano')", 15000)
    checar('depois do negócio vem a escolha do plano', true)
    checar('o plano escolhido na página de planos já vem marcado', await evaluate("__q('.escolha-plano input[value=DESTAQUE]').checked"))
    checar('o negócio novo não está na vitrine antes do pagamento', !(await (await fetch(`${API}/empreendedores`)).json()).data.some((e) => e.nomeNegocio === 'Bolos da Rita'))
    await evaluate("__clickText('Escolher depois')")
    await esperarPor("__q('.meu-negocio__abas')", 15000)
    checar('escolhendo depois, o painel mostra o rascunho e o caminho para publicar', /ainda não está publicado/i.test(await textoDe('.meu-negocio')))
    await sair()

    console.log('\n4. Rascunho que vira negócio publicado')
    await entrarNoSistema(nav, PATRICIA)
    await abrir('/meu-negocio', '[role=tab]')
    checar('o painel avisa que o negócio não está publicado', /ainda não está publicado/i.test(await textoDe('.meu-negocio')))
    const idFlor = await evaluate("new URL([...document.querySelectorAll('.meu-negocio__acoes-topo a')][0].href).pathname.split('/').pop()")
    await abrir(`/empreendedores/${idFlor}`, '.detalhe__previa')
    checar('a dona vê a prévia, avisada de que só ela vê', /só você e a administração/i.test(await textoDe('.detalhe__previa')))
    checar('assinar o Essencial abre o checkout', await assinarPelaPagina('.planos__cartao:not(.planos__cartao--destaque)'))
    checar('o checkout ficou aguardando pagamento', await aprovarPendente('Espaço Bela Flor'))
    await abrir('/meu-negocio?assinatura=retorno', '.painel__plano')
    await esperar(1500)
    checar('pago, o painel mostra o plano ativo e o negócio publicado', /Essencial/.test(await textoDe('.painel__plano')) && /Publicado/.test(await textoDe('.painel__fatos')))
    await sair()
    await abrir('/empreendedores', '.empreendedor-card')
    checar('e o negócio aparece na vitrine', (await nomesNaLista()).some((e) => e.nome === 'Espaço Bela Flor'))

    console.log('\n5. Painel de quem é Destaque')
    await entrarNoSistema(nav, MARIA)
    await abrir('/meu-negocio', '[role=tab]')
    await abrirAba('Plano')
    checar('plano Destaque ativo, com vencimento', /Destaque/.test(await textoDe('.painel__plano')) && /Vencimento/i.test(await textoDe('.painel__fatos')))
    await abrirAba('Desempenho')
    checar('o Destaque vê o gráfico por dia', await evaluate("Boolean(__q('.desempenho__grafico svg'))"))
    await abrirAba('Divulga')
    checar('a divulgação mostra as duas do seed', (await evaluate("document.querySelectorAll('.divulgacoes__item').length")) === 2)
    await sair()

    console.log('\n6. O Essencial assina o Destaque')
    await entrarNoSistema(nav, CARLOS)
    await abrir('/meu-negocio', '[role=tab]')
    await abrirAba('Plano')
    checar('começa no Essencial ativo', /Essencial/.test(await textoDe('.painel__plano')) && /Ativa/i.test(await textoDe('.painel__plano')))
    await abrirAba('Desempenho')
    checar('o Essencial vê os totais, sem o gráfico', await evaluate("Boolean(__q('.desempenho__cartoes')) && !__q('.desempenho__grafico')"))
    checar('a troca abre o checkout', await assinarPelaPagina('.planos__cartao--destaque'))
    checar('o pedido de troca ficou aguardando pagamento', await aprovarPendente('Silva'))
    await abrir('/meu-negocio?assinatura=retorno', '.painel__plano')
    await esperar(1500)
    checar('na volta, o painel abre na aba Plano com o Destaque ativo', /Destaque/.test(await textoDe('.painel__plano')) && /Ativa/i.test(await textoDe('.painel__plano')))
    checar('o parâmetro de retorno sai da URL', !(await evaluate("location.search.includes('assinatura')")))
    await sair()
    await abrir('/empreendedores', '.empreendedor-card')
    lista = await nomesNaLista()
    checar('o Silva Reparos sobe para o segundo lugar, com selo', lista[1]?.nome === 'Silva Reparos Residenciais' && lista[1].selo, JSON.stringify(lista))
    const historico = await assinaturasDe('Silva')
    checar('o Essencial antigo foi cancelado (sem duas cobranças ativas)', historico.filter((a) => a.status === 'ATIVA').length === 1 && historico.some((a) => a.plano.nome === 'ESSENCIAL' && a.status === 'CANCELADA'))

    console.log('\n7. Cancelamento respeita o período pago')
    await entrarNoSistema(nav, CARLOS)
    await abrir('/meu-negocio', '[role=tab]')
    await abrirAba('Plano')
    await evaluate("__clickText('Cancelar assinatura')")
    await esperarPor("__q('.modal')", 5000)
    checar('a confirmação explica que segue publicado até o fim do período', /continua publicado/i.test(await textoDe('.modal')))
    await evaluate("[...document.querySelectorAll('.modal button')].find(b => __textoSemIcone(b) === 'Cancelar assinatura').click()")
    await esperar(2000)
    checar('o painel mostra a cancelada com a data até quando vale', /Publicado até/i.test(await textoDe('.painel__fatos')) && /não haverá novas cobranças/i.test(await textoDe('.painel__plano')))
    await sair()
    await abrir('/empreendedores', '.empreendedor-card')
    checar('dentro do período, o negócio continua na vitrine', (await nomesNaLista()).some((e) => e.nome === 'Silva Reparos Residenciais'))

    console.log('\n8. Celular (390px)')
    await viewport(390, 844)
    await abrir('/planos', '.planos__cartao')
    checar('/planos sem rolagem lateral', await semRolagemLateral())
    await abrir('/cadastro', '#conta-nome')
    checar('/cadastro sem rolagem lateral', await semRolagemLateral())
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

  encerrar()
}

main().catch((e) => { console.error('ERRO:', e.message); process.exitCode = 1 })
