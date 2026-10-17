// Avaliações dos negócios pela tela: visitante, cliente, dono e moderação.
// Usa as contas do seed: Maria (dona do Ateliê) avalia o Brechó da Ju, que não
// é dela; Carlos denuncia; o admin remove e restaura. No fim, a avaliação de
// teste é apagada pela própria autora (a tela e o banco ficam como estavam).
import { APP, abrirNavegador, helpers, entrarNoSistema, cabecalhoAdmin, CARLOS, MARIA, criarPlacar } from './cdp.mjs'

const API = 'http://localhost:3001/api'
const { checar, encerrar } = criarPlacar()

/** Token de uma conta do seed, para chamadas diretas à API */
async function tokenDe({ email, senha }) {
  const resposta = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
  return (await resposta.json()).data.token
}

async function main() {
  const negocios = (await (await fetch(`${API}/empreendedores`)).json()).data
  const brecho = negocios.find((n) => /Brechó/i.test(n.nomeNegocio))
  const carlosNegocio = negocios.find((n) => /Silva Reparos/i.test(n.nomeNegocio))
  if (!brecho || !carlosNegocio) throw new Error('seed sem o Brechó da Ju ou o Silva Reparos')
  const perfil = `/empreendedores/${brecho.id}`

  // Uma execução interrompida deixa a avaliação de teste para trás
  const tokenMaria = await tokenDe(MARIA)
  const antes = await (await fetch(`${API}${perfil}/avaliacoes`, { headers: { Authorization: `Bearer ${tokenMaria}` } })).json()
  if (antes.minha) {
    await fetch(`${API}/avaliacoes/${antes.minha.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenMaria}` } })
  }
  const totalAntes = (await (await fetch(`${API}${perfil}/avaliacoes`)).json()).resumo.total

  const nav = await abrirNavegador({ largura: 1280, altura: 1000 })
  const { evaluate, esperar, esperarPor, navegar, clicarEm, cdp, viewport } = nav
  const abrir = async (rota, espera) => {
    await navegar(APP + rota)
    await evaluate(helpers)
    if (espera) await esperarPor(`__q(${JSON.stringify(espera)})`, 15000)
    await esperar(500)
  }
  const tecla = async (key, codigo) => {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: codigo })
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: codigo })
  }
  const sair = () => evaluate("localStorage.removeItem('vitrinelocal.token'); true")
  let idDaAvaliacao = null

  try {
    console.log('\n1. Visitante')
    await abrir(perfil, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__convite, .avaliacoes__vazio, .avaliacoes__media')", 15000)
    const visitante = await evaluate(`({
      convite: Boolean(__q('.avaliacoes__convite')),
      formulario: Boolean(__q('.form-avaliacao')),
      selo: __texto('.selo-reputacao'),
    })`)
    checar('visitante vê o convite para entrar, sem formulário', visitante.convite && !visitante.formulario, JSON.stringify(visitante))
    checar('selo de reputação no topo do perfil', Boolean(visitante.selo))

    console.log('\n2. Entrar pelo convite volta para o perfil')
    await clicarEm('.avaliacoes__convite a[href="/login"]')
    await esperarPor("__q('#login-email')", 15000)
    await evaluate(helpers)
    await evaluate(`__set('#login-email', ${JSON.stringify(MARIA.email)})`)
    await evaluate(`__set('#login-senha', ${JSON.stringify(MARIA.senha)})`)
    await evaluate("__clickText('Entrar', 'form button')")
    await esperarPor(`location.pathname === ${JSON.stringify(perfil)}`, 15000)
    await esperarPor("__q('.form-avaliacao')", 15000)
    checar('depois de entrar, volta ao perfil com o formulário', true)

    console.log('\n3. Validação e teclado')
    await evaluate("__q('.form-avaliacao button[type=submit]').click(); true")
    await esperar(300)
    const vazio = await evaluate(`[...document.querySelectorAll('.form-avaliacao .campo__erro')].map(e => e.textContent)`)
    checar('sem nota nem comentário, mostra os dois erros', vazio.length === 2, JSON.stringify(vazio))

    // Teclado: foca a primeira estrela e anda com a seta (rádios de verdade)
    await evaluate("__q('.form-avaliacao__estrela input').focus(); true")
    await tecla(' ', 32)
    await tecla('ArrowRight', 39)
    await tecla('ArrowRight', 39)
    await tecla('ArrowRight', 39)
    await esperar(200)
    const pelaTecla = await evaluate(`({
      marcada: [...document.querySelectorAll('.form-avaliacao__estrela input')].findIndex(i => i.checked) + 1,
      acesas: document.querySelectorAll('.form-avaliacao__estrela--acesa').length,
      rotulo: __texto('.form-avaliacao__rotulo-nota'),
    })`)
    checar('setas do teclado escolhem 4 estrelas', pelaTecla.marcada === 4 && pelaTecla.acesas === 4, JSON.stringify(pelaTecla))
    checar('mostra o nome da nota ("Bom")', pelaTecla.rotulo === 'Bom')

    await evaluate("__set('.form-avaliacao textarea', 'Peças lindas e entrega no prazo. <b>Recomendo</b>!'); true")
    await evaluate("__q('.form-avaliacao button[type=submit]').click(); true")
    await esperarPor("__q('.avaliacoes__minha')", 15000)
    const publicada = await evaluate(`({
      media: __texto('.avaliacoes__media strong'),
      selo: __texto('.selo-reputacao__media'),
      texto: __q('.avaliacoes__minha .cartao-avaliacao__texto')?.textContent,
      negrito: Boolean(__q('.avaliacoes__minha .cartao-avaliacao__texto b')),
      autor: __texto('.avaliacoes__minha .cartao-avaliacao__quem strong'),
    })`)
    checar('publica e mostra "Sua avaliação"', Boolean(publicada.texto), JSON.stringify(publicada))
    checar('HTML do comentário aparece como texto', publicada.texto?.includes('<b>Recomendo</b>') && !publicada.negrito)
    checar('autor aparece como primeiro nome e inicial', /^Maria [A-Z]\./.test(publicada.autor || ''), publicada.autor)
    checar('o selo do topo acompanha a nova média', publicada.selo === publicada.media, JSON.stringify(publicada))

    const lista = await (await fetch(`${API}${perfil}/avaliacoes`, { headers: { Authorization: `Bearer ${tokenMaria}` } })).json()
    idDaAvaliacao = lista.minha?.id
    checar('a contagem subiu uma', lista.resumo.total === totalAntes + 1, JSON.stringify(lista.resumo))

    console.log('\n4. Duplicada e edição')
    const duplicada = await fetch(`${API}${perfil}/avaliacoes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenMaria}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota: 5, comentario: 'Segunda tentativa' }),
    })
    checar('segunda avaliação do mesmo negócio é recusada (409)', duplicada.status === 409)

    await evaluate("__clickText('Editar', '.avaliacoes__minha button'); true")
    await esperarPor("__q('.form-avaliacao')", 5000)
    await evaluate("[...document.querySelectorAll('.form-avaliacao__estrela input')][4].click(); true")
    await evaluate("__clickText('Salvar alterações', '.form-avaliacao button'); true")
    await esperarPor("__q('.avaliacoes__minha')", 15000)
    const editada = await evaluate(`({
      data: __texto('.avaliacoes__minha .cartao-avaliacao__data'),
      estrelas: __q('.avaliacoes__minha .cartao-avaliacao__nota .estrelas')?.getAttribute('aria-label'),
    })`)
    checar('edição troca a nota e marca "editada"', /5 de 5/.test(editada.estrelas || '') && /editada/.test(editada.data || ''), JSON.stringify(editada))

    console.log('\n5. Dono não avalia o próprio negócio')
    await sair()
    await entrarNoSistema(nav, CARLOS)
    await abrir(`/empreendedores/${carlosNegocio.id}`, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__acao .status')", 15000)
    checar('o dono vê o aviso, sem formulário', !(await evaluate("Boolean(__q('.form-avaliacao'))")))
    const tokenCarlos = await tokenDe(CARLOS)
    const doDono = await fetch(`${API}/empreendedores/${carlosNegocio.id}/avaliacoes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCarlos}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota: 5, comentario: 'Meu negócio é ótimo' }),
    })
    checar('a API também recusa o dono (403)', doDono.status === 403)

    console.log('\n6. Denúncia e moderação')
    await abrir(perfil, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.cartao-avaliacao__denunciar')", 15000)
    await evaluate("__q('.cartao-avaliacao__denunciar').click(); true")
    await esperarPor("__q('.cartao-avaliacao__denuncia')", 5000)
    await evaluate("__set('.cartao-avaliacao__denuncia input', 'Teste de denúncia'); true")
    await evaluate("__clickText('Enviar denúncia', '.cartao-avaliacao__denuncia button'); true")
    await esperarPor("__q('.cartao-avaliacao__resposta')", 10000)
    checar('denúncia confirmada na tela', /moderação/.test(await evaluate("__texto('.cartao-avaliacao__resposta')")))

    const admin = await cabecalhoAdmin()
    const fila = await (await fetch(`${API}/avaliacoes?denunciadas=1`, { headers: admin })).json()
    checar('aparece na fila de denunciadas do admin', fila.data.some((a) => a.id === idDaAvaliacao))
    const semMotivo = await fetch(`${API}/avaliacoes/${idDaAvaliacao}/moderacao`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({ acao: 'remover' }),
    })
    checar('remover sem motivo é recusado (400)', semMotivo.status === 400)
    await fetch(`${API}/avaliacoes/${idDaAvaliacao}/moderacao`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({ acao: 'remover', motivo: 'Teste da moderação' }),
    })
    const publico = await (await fetch(`${API}${perfil}/avaliacoes`)).json()
    checar('removida some da lista e da média', publico.resumo.total === totalAntes && !publico.data.some((a) => a.id === idDaAvaliacao))
    const naoAdmin = await fetch(`${API}/avaliacoes/${idDaAvaliacao}/moderacao`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenCarlos}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'restaurar' }),
    })
    checar('quem não é admin não modera (403)', naoAdmin.status === 403)

    // A autora vê o motivo
    await sair()
    await entrarNoSistema(nav, MARIA)
    await abrir(perfil, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__acao .status')", 15000)
    checar('a autora vê que foi removida e o motivo', /Teste da moderação/.test(await evaluate("__texto('.avaliacoes__acao .status')")))

    await fetch(`${API}/avaliacoes/${idDaAvaliacao}/moderacao`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({ acao: 'restaurar' }),
    })
    const restaurada = await (await fetch(`${API}${perfil}/avaliacoes`)).json()
    checar('restaurar devolve à média', restaurada.resumo.total === totalAntes + 1)

    console.log('\n7. Celular e exclusão')
    await viewport(390, 844)
    await abrir(perfil, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__minha')", 15000)
    const celular = await evaluate('({ largura: document.documentElement.scrollWidth, tela: innerWidth })')
    checar('sem rolagem lateral no celular', celular.largura <= celular.tela, JSON.stringify(celular))

    await evaluate("__clickText('Apagar', '.avaliacoes__minha button'); true")
    await esperarPor("__q('.confirm-modal')", 5000)
    await evaluate("__clickText('Apagar avaliação', '.confirm-modal button'); true")
    await esperarPor("__q('.form-avaliacao')", 15000)
    const depois = await (await fetch(`${API}${perfil}/avaliacoes`)).json()
    checar('apagar devolve a contagem ao que era', depois.resumo.total === totalAntes)
    idDaAvaliacao = null

    console.log('\n8. Cadastro de cliente')
    await sair()
    await abrir('/cadastro/cliente', '#conta-nome')
    checar('tela de conta de cliente abre com o formulário', true)
  } catch (erro) {
    // Para entender a falha: o que a seção mostrava naquele momento
    const estado = await evaluate(
      "JSON.stringify({ rota: location.pathname, token: Boolean(localStorage.getItem('vitrinelocal.token')), secao: document.getElementById('avaliacoes')?.innerText.slice(0, 400) })"
    ).catch(() => 'sem resposta do navegador')
    console.error('Estado da tela:', estado)
    throw erro
  } finally {
    // Garante a limpeza mesmo se algo falhou no meio
    if (idDaAvaliacao) {
      await fetch(`${API}/avaliacoes/${idDaAvaliacao}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenMaria}` } })
    }
    nav.fechar()
  }
  encerrar()
}

main().catch((erro) => {
  console.error('ERRO:', erro.message)
  process.exit(1)
})
