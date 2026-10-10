// Central de ajuda, paginação, formulário de contato estável e tabela da
// auditoria. Cobre o checklist manual do módulo de perguntas frequentes:
// quem vê o quê, o CRUD pela tela, busca, filtro e a trava da rota.
import { APP, abrirNavegador, helpers, entrarNoSistema, cabecalhoAdmin, CARLOS, criarPlacar } from './cdp.mjs'

const API = 'http://localhost:3001/api'
const { checar, encerrar } = criarPlacar()

const PERGUNTA_TESTE = 'Pergunta criada pelo teste da tela?'

async function main() {
  const nav = await abrirNavegador({ largura: 1280, altura: 1000 })
  const { evaluate, esperar, esperarPor, navegar, clicarEm, screenshot, viewport, fechar } = nav
  const abrir = async (rota, espera) => {
    await navegar(APP + rota)
    await evaluate(helpers)
    if (espera) await esperarPor(`__q(${JSON.stringify(espera)})`, 15000)
    await esperar(600)
  }
  const sair = () => evaluate("localStorage.removeItem('vitrinelocal.token'); true")

  // Uma execução interrompida no meio deixa a pergunta de teste para trás
  const cabecalho = await cabecalhoAdmin()
  const sobras = (await (await fetch(`${API}/faq/todas`, { headers: cabecalho })).json()).data
  for (const sobra of sobras.filter((p) => p.pergunta === PERGUNTA_TESTE)) {
    await fetch(`${API}/faq/${sobra.id}`, { method: 'DELETE', headers: cabecalho })
  }

  try {
    // ================= Área pública =================
    console.log('\n1. Central de ajuda (visitante)')
    await abrir('/contato', '.acordeao')
    const publico = await evaluate(`({
      itens: document.querySelectorAll('.acordeao__item').length,
      abertos: document.querySelectorAll('.acordeao__painel:not([hidden])').length,
      atalhoAdmin: [...document.querySelectorAll('a')].some(a => a.href.includes('aba=faq')),
    })`)
    checar('mostra as perguntas ativas', publico.itens >= 1, JSON.stringify(publico))
    checar('começa com todas fechadas', publico.abertos === 0)
    checar('visitante não vê o atalho de administrar', !publico.atalhoAdmin)

    await clicarEm('.acordeao__item:nth-child(1) .acordeao__botao')
    await esperar(300)
    await clicarEm('.acordeao__item:nth-child(2) .acordeao__botao')
    await esperar(300)
    const acordeao = await evaluate(`({
      abertos: document.querySelectorAll('.acordeao__painel:not([hidden])').length,
      segundoAberto: __q('.acordeao__item:nth-child(2) .acordeao__botao').getAttribute('aria-expanded'),
      primeiroAberto: __q('.acordeao__item:nth-child(1) .acordeao__botao').getAttribute('aria-expanded'),
    })`)
    checar('abre uma pergunta por vez', acordeao.abertos === 1 && acordeao.segundoAberto === 'true' && acordeao.primeiroAberto === 'false', JSON.stringify(acordeao))

    await evaluate("__set('#perguntas-busca', 'endereco')")
    await esperar(300)
    const busca = await evaluate(`[...document.querySelectorAll('.acordeao__botao')].map(b => b.innerText)`)
    checar('busca sem acento encontra "endereço"', busca.length === 1 && /endereço/i.test(busca[0]), JSON.stringify(busca))

    await evaluate("__set('#perguntas-busca', 'xyzzy nada')")
    await esperar(300)
    checar('mostra estado vazio amigável', Boolean(await evaluate(`[...document.querySelectorAll('.status__titulo, .status h3, .status strong')].some(e => /Nenhuma pergunta encontrada/.test(e.innerText))`)))
    await evaluate("__clickText('Limpar busca')")
    await esperar(300)

    const categorias = await evaluate("[...__q('#perguntas-categoria').options].map(o => o.value).filter(Boolean)")
    await evaluate(`__set('#perguntas-categoria', ${JSON.stringify(categorias[0])})`)
    await esperar(300)
    const filtradas = await evaluate("document.querySelectorAll('.acordeao__item').length")
    const total = (await (await fetch(`${API}/faq`)).json()).data.filter((p) => p.categoria === categorias[0]).length
    checar('filtra pelo assunto', filtradas === total, `${filtradas} na tela, ${total} esperados`)
    await screenshot('../docs/imagens-teste-faq-publico.png')

    // ================= Contato estável =================
    console.log('\n2. Formulário de contato: só para a equipe, e responsivo')
    for (const largura of [1280, 820, 390]) {
      await viewport(largura, 1000)
      await abrir('/contato', '.contato__formulario .contato-form')
      checar(`${largura}px: sem escolha de destinatário`, !(await evaluate("Boolean(__q('.contato__formulario select'))")))
      checar(`${largura}px: a mensagem vai para a equipe`, /equipe do VitrineRondon/.test(await evaluate("__q('.contato-form__destino').innerText")))
      const rolagem = await evaluate('document.documentElement.scrollWidth')
      checar(`${largura}px: sem rolagem lateral`, rolagem <= largura, `${rolagem}px`)
    }
    await viewport(1280, 1000)

    // ================= Paginação =================
    console.log('\n3. Paginação')
    await abrir('/vitrine', '.grade-cards')
    const vitrine = await evaluate(`({ cartoes: document.querySelectorAll('.grade-cards > li').length, paginacao: Boolean(__q('.paginacao')) })`)
    checar('a vitrine mostra 9 itens por página', vitrine.cartoes <= 9 && vitrine.paginacao, JSON.stringify(vitrine))
    await clicarEm('.paginacao button:last-of-type')
    await esperarPor("location.search.includes('pagina=2')", 8000)
    await esperar(800)
    checar('a página vai para a URL, para voltar e compartilhar', await evaluate("location.search === '?pagina=2'"))
    checar('mostra os itens da página 2', (await evaluate("document.querySelectorAll('.grade-cards > li').length")) > 0)
    await clicarEm('.voltar')
    await esperarPor("!location.search.includes('pagina=2')", 8000)
    checar('o botão voltar retorna à página anterior da lista', true)

    await abrir('/vitrine?pagina=2', '.grade-cards')
    await evaluate("__set('#filtro-tipo', 'servico')")
    await esperar(800)
    checar('trocar o filtro volta para a primeira página', !(await evaluate("location.search.includes('pagina')")))

    await abrir('/empreendedores', '.grade-cards')
    checar('empreendedores têm 6 por página', (await evaluate("document.querySelectorAll('.grade-cards > li').length")) <= 6)

    // ================= Quem pode administrar =================
    console.log('\n4. Permissões na tela')
    await entrarNoSistema(nav, CARLOS)
    await abrir('/contato', '.acordeao')
    checar('empreendedor não vê o atalho de administrar', !(await evaluate("[...document.querySelectorAll('a')].some(a => a.href.includes('aba=faq'))")))
    checar('empreendedor não vê o menu Admin', !(await evaluate("[...document.querySelectorAll('.navbar a')].some(a => new URL(a.href).pathname === '/admin')")))
    await abrir('/admin?aba=faq')
    await esperar(800)
    const bloqueio = await evaluate(`({ texto: document.body.innerText, aba: Boolean(__q('.painel-faq')) })`)
    checar('entrar em /admin pela URL mostra acesso restrito', /Acesso restrito/.test(bloqueio.texto) && !bloqueio.aba)
    await sair()

    await entrarNoSistema(nav)
    await abrir('/contato', '.acordeao')
    checar('admin vê o atalho de administrar', await evaluate("[...document.querySelectorAll('a')].some(a => a.href.includes('aba=faq'))"))
    await evaluate("[...document.querySelectorAll('a')].find(a => a.href.includes('aba=faq')).click()")
    await esperarPor("__q('.painel-faq')", 15000)
    checar('o atalho abre direto a aba de perguntas', true)

    // ================= CRUD pela tela =================
    console.log('\n5. Criar, editar, esconder e excluir pela tela')
    await evaluate("__clickText('Nova pergunta')")
    await esperarPor("__q('#faq-pergunta')", 8000)
    await evaluate("__q('.faq-form button[type=submit]').click()")
    await esperar(300)
    checar('o formulário cobra os campos obrigatórios', (await evaluate("document.querySelectorAll('.faq-form .campo__erro').length")) >= 2)
    await evaluate(`__set('#faq-pergunta', ${JSON.stringify(PERGUNTA_TESTE)})`)
    await evaluate("__set('#faq-resposta', 'Resposta criada pelo teste.')")
    await evaluate("__set('#faq-categoria', 'Teste da tela')")
    await evaluate("__set('#faq-ordem', '98')")
    await evaluate("__q('.faq-form button[type=submit]').click()")
    await esperarPor(`[...document.querySelectorAll('.painel-faq tbody tr')].some(tr => tr.innerText.includes(${JSON.stringify(PERGUNTA_TESTE)}))`, 10000)
    checar('a pergunta criada aparece na tabela', true)

    await abrir('/contato', '.acordeao')
    checar('a pergunta nova aparece na central de ajuda', await evaluate(`__q('.acordeao').innerText.includes(${JSON.stringify(PERGUNTA_TESTE)})`))

    await abrir('/admin?aba=faq', '.painel-faq tbody tr')
    await evaluate(`(() => { const linha = [...document.querySelectorAll('.painel-faq tbody tr')].find(tr => tr.innerText.includes(${JSON.stringify(PERGUNTA_TESTE)})); [...linha.querySelectorAll('button')].find(b => b.innerText.trim() === 'Editar').click() })()`)
    await esperarPor("__q('#faq-ativo')", 8000)
    await evaluate("__q('#faq-ativo').click()")
    await evaluate("__q('.faq-form button[type=submit]').click()")
    await esperarPor(`[...document.querySelectorAll('.painel-faq tbody tr')].some(tr => tr.innerText.includes(${JSON.stringify(PERGUNTA_TESTE)}) && /oculta/i.test(tr.innerText))`, 10000)
    checar('editar e desmarcar deixa a pergunta oculta', true)
    await screenshot('../docs/imagens-teste-faq-admin.png')

    await abrir('/contato', '.acordeao')
    checar('pergunta oculta some da central de ajuda', !(await evaluate(`__q('.acordeao').innerText.includes(${JSON.stringify(PERGUNTA_TESTE)})`)))

    await abrir('/admin?aba=faq', '.painel-faq tbody tr')
    await evaluate(`(() => { const linha = [...document.querySelectorAll('.painel-faq tbody tr')].find(tr => tr.innerText.includes(${JSON.stringify(PERGUNTA_TESTE)})); [...linha.querySelectorAll('button')].find(b => b.innerText.trim() === 'Excluir').click() })()`)
    await esperar(400)
    checar('excluir pede confirmação antes', await evaluate("document.body.innerText.includes('não pode ser recuperada')"))
    await evaluate("[...document.querySelectorAll('.modal button, [role=dialog] button')].find(b => b.innerText.trim() === 'Excluir').click()")
    await esperarPor(`![...document.querySelectorAll('.painel-faq tbody tr')].some(tr => tr.innerText.includes(${JSON.stringify(PERGUNTA_TESTE)}))`, 10000)
    checar('a pergunta excluída sai da tabela', true)

    // ================= Auditoria =================
    console.log('\n6. Tabela da auditoria')
    await abrir('/admin?aba=auditoria', '.data-table tbody tr')
    const celulas = await evaluate(`[...document.querySelectorAll('.data-table tbody tr')].slice(0, 8).map(tr => {
      const linha = tr.getBoundingClientRect(), acoes = tr.querySelector('.data-table__col-acoes').getBoundingClientRect()
      return Math.abs(linha.top - acoes.top) < 1 && Math.abs(linha.bottom - acoes.bottom) < 1
    })`)
    checar('o botão Detalhes fica dentro da própria linha', celulas.length > 0 && celulas.every(Boolean), JSON.stringify(celulas))
    const acoesAudit = await (await fetch(`${API}/auditoria?tipoEntidade=PerguntaFrequente&porPagina=20`, { headers: await cabecalhoAdmin() })).json()
    const tipos = new Set(acoesAudit.data.map((l) => l.acao))
    checar('criar, editar e excluir ficaram na auditoria', ['CREATE', 'UPDATE', 'DELETE'].every((t) => tipos.has(t)), [...tipos].join(', '))
  } finally {
    fechar()
  }

  encerrar()
}

main().catch((e) => { console.error('ERRO:', e.message); process.exitCode = 1 })
