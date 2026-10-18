// Avaliar sem cadastro: o cliente escreve a avaliação e confirma com o Google
// só ao publicar (provedor simulado: provedor-google-simulado.mjs; veja lá
// como subir a API apontando para ele).
// Cobre: rascunho guardado e publicado sozinho na volta, cancelamento sem
// perder o texto, "Minhas avaliações", sessão recorrente na mesma conta,
// logins simultâneos, state forjado, e-mail de conta existente (vínculo só
// com a senha), sessão de cliente que não vale depois de virar empreendedor,
// permissões e o login dos empreendedores. Apaga o que criou (banco local).
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { APP, abrirNavegador, helpers, entrarNoSistema, CARLOS, MARIA, criarPlacar } from './cdp.mjs'
import { iniciarProvedor } from './provedor-google-simulado.mjs'

const API = 'http://localhost:3001/api'
const { checar, encerrar } = criarPlacar()
const marca = Date.now()
const CLIENTE_GOOGLE = { sub: `g-${marca}`, email: `teste.google.${marca}@exemplo.com.br`, nome: 'Teste Google Lima' }

function prismaLocal() {
  const pastaBackend = join(import.meta.dirname, '..', 'backend')
  const require = createRequire(join(pastaBackend, 'package.json'))
  require('dotenv').config({ path: join(pastaBackend, '.env'), quiet: true })
  if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) return null
  const { PrismaClient } = require('@prisma/client')
  return new PrismaClient()
}

async function limpar() {
  const prisma = prismaLocal()
  if (!prisma) return console.log('  (banco não é local: nada foi apagado)')
  try {
    // Vínculos de teste em contas do seed (a Maria) e as contas criadas pelo Google
    await prisma.identidadeExterna.deleteMany({ where: { sujeito: { startsWith: 'g-' } } })
    const contas = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste.google.', endsWith: '@exemplo.com.br' } }, select: { id: true } })
    const ids = contas.map((c) => c.id)
    await prisma.empreendedor.deleteMany({ where: { usuarioId: { in: ids } } })
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } })
  } finally {
    await prisma.$disconnect()
  }
}

/** Faz o caminho do navegador só com fetch (para os logins simultâneos) */
async function loginPorFetch(destino = '/') {
  const inicio = await fetch(`${API}/auth/google/iniciar?${new URLSearchParams({ destino, origem: APP })}`, { redirect: 'manual' })
  const cookie = inicio.headers.get('set-cookie').split(';')[0]
  const noProvedor = await fetch(inicio.headers.get('location'), { redirect: 'manual' })
  return { cookie, retorno: noProvedor.headers.get('location') }
}

/** Sessão de cliente pelo caminho completo, sem navegador */
async function sessaoPorFetch() {
  const fluxo = await loginPorFetch()
  const volta = await fetch(fluxo.retorno, { redirect: 'manual', headers: { cookie: fluxo.cookie } })
  const codigo = new URLSearchParams(new URL(volta.headers.get('location')).hash.slice(1)).get('codigo')
  const resposta = await fetch(`${API}/auth/google/sessao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo }),
  })
  return (await resposta.json()).data.token
}

async function main() {
  const provedores = await (await fetch(`${API}/auth/provedores`)).json()
  if (!provedores.data.google) throw new Error('a API não está com o Google configurado (veja provedor-google-simulado.mjs)')

  const provedor = await iniciarProvedor()
  const negocios = (await (await fetch(`${API}/empreendedores`)).json()).data
  const brecho = negocios.find((n) => /Brechó/i.test(n.nomeNegocio))
  const perfil = `/empreendedores/${brecho.id}`

  const nav = await abrirNavegador({ largura: 1280, altura: 1000 })
  const { evaluate, esperar, esperarPor, navegar, clicarEm, viewport } = nav
  const abrir = async (rota, espera) => {
    await navegar(APP + rota)
    await evaluate(helpers)
    if (espera) await esperarPor(`__q(${JSON.stringify(espera)})`, 15000)
    await esperar(500)
  }
  const irAvaliacoes = async () => {
    await abrir(perfil, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__acao > *')", 15000)
  }
  const escrever = async (estrelas, texto) => {
    await evaluate(`[...document.querySelectorAll('.form-avaliacao__estrela input')][${estrelas - 1}].click(); true`)
    await evaluate(`__set('.form-avaliacao textarea', ${JSON.stringify(texto)}); true`)
  }
  const sair = () => evaluate("localStorage.removeItem('vitrinelocal.token'); true")
  const token = () => evaluate("localStorage.getItem('vitrinelocal.token')")
  const eu = (t) =>
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } }).then(async (r) => ({ status: r.status, ...(await r.json()) }))
  let idDaConta = null

  try {
    console.log('\n1. Visitante escreve a avaliação antes de qualquer login')
    await irAvaliacoes()
    const inicio = await evaluate(`({
      form: Boolean(__q('.avaliacoes__convite .form-avaliacao')),
      botao: __q('.avaliacoes__convite .form-avaliacao button[type=submit]')?.textContent.trim(),
      avaliar: Boolean(__q('.detalhe__avaliar')),
    })`)
    checar('visitante já vê as estrelas e o comentário', inicio.form, JSON.stringify(inicio))
    checar('o botão é "Publicar com Google"', /Publicar com Google/.test(inicio.botao || ''))
    checar('o topo do perfil tem "Avaliar negócio"', inicio.avaliar)

    console.log('\n2. Cancelar no Google não perde o que foi escrito')
    await escrever(4, 'Texto que não pode se perder.')
    provedor.proxima({ cancelar: true })
    await clicarEm('.avaliacoes__convite .form-avaliacao button[type=submit]')
    await esperarPor("location.pathname === '/entrar/google' && document.querySelector('.entrar-google__cartao .status')", 20000)
    await evaluate(helpers)
    checar('mostra que foi cancelado, com o botão para tentar de novo', /cancelado/.test(await evaluate("__texto('.entrar-google__cartao .status')")))
    await evaluate("__clickText('Voltar para onde eu estava', 'a'); true")
    await esperarPor(`location.pathname === ${JSON.stringify(perfil)} && document.getElementById('avaliacoes')`, 15000)
    await evaluate(helpers)
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__convite .form-avaliacao textarea')", 15000)
    const rascunho = await evaluate(`({
      texto: __q('.form-avaliacao textarea').value,
      nota: [...document.querySelectorAll('.form-avaliacao__estrela input')].findIndex(i => i.checked) + 1,
    })`)
    checar('na volta, a nota e o texto continuam no formulário', rascunho.texto === 'Texto que não pode se perder.' && rascunho.nota === 4, JSON.stringify(rascunho))

    console.log('\n3. Publicar com Google: conta criada sozinha e avaliação publicada na volta')
    await escrever(5, 'Atendimento ótimo, publicado sem cadastro.')
    provedor.proxima(CLIENTE_GOOGLE)
    await clicarEm('.avaliacoes__convite .form-avaliacao button[type=submit]')
    await esperarPor(`location.pathname === ${JSON.stringify(perfil)} && Boolean(localStorage.getItem('vitrinelocal.token'))`, 20000)
    await evaluate(helpers)
    await esperarPor("__q('.avaliacoes__minha')", 20000)
    const publicada = await evaluate(`({
      texto: __q('.avaliacoes__minha .cartao-avaliacao__texto')?.textContent,
      url: location.href,
      rascunho: localStorage.getItem('vitrinelocal.rascunhoAvaliacao'),
    })`)
    checar('a avaliação foi publicada sozinha, sem pedir para enviar de novo', publicada.texto === 'Atendimento ótimo, publicado sem cadastro.', JSON.stringify(publicada))
    checar('o rascunho foi apagado do navegador', publicada.rascunho === null)
    checar('o código de uso único não fica na barra de endereço', !publicada.url.includes('codigo'))
    const sessao = await eu(await token())
    idDaConta = sessao.data.id
    checar('conta de cliente (COMUM) criada sozinha, sem negócio', sessao.data.perfil === 'COMUM' && sessao.data.email === CLIENTE_GOOGLE.email, JSON.stringify(sessao.data))

    console.log('\n4. Menu do cliente e "Minhas avaliações"')
    const menu = await evaluate(`({
      minhas: [...document.querySelectorAll('.navbar a')].some(a => /Minhas avaliações/.test(a.textContent)),
      anunciar: [...document.querySelectorAll('.navbar a')].some(a => /Anunciar meu negócio/.test(a.textContent)),
      tipo: __texto('.navbar__conta-perfil'),
    })`)
    checar('o menu mostra "Minhas avaliações", não "Anunciar meu negócio"', menu.minhas && !menu.anunciar, JSON.stringify(menu))
    checar('o tipo da conta aparece como "Cliente"', menu.tipo === 'Cliente')
    await abrir('/minhas-avaliacoes', '.minhas-avaliacoes__item')
    checar('"Minhas avaliações" lista a avaliação com o negócio', (await evaluate("__texto('.minhas-avaliacoes__negocio')"))?.includes(brecho.nomeNegocio.trim()))
    await evaluate("__clickText('Editar', '.minhas-avaliacoes__item button'); true")
    await esperarPor("__q('.minhas-avaliacoes__item .form-avaliacao')", 5000)
    await evaluate("[...document.querySelectorAll('.form-avaliacao__estrela input')][3].click(); true")
    await evaluate("__clickText('Salvar alterações', '.form-avaliacao button'); true")
    await esperarPor("__q('.minhas-avaliacoes__item .cartao-avaliacao__nota .estrelas')?.getAttribute('aria-label')?.startsWith('4 de 5')", 15000)
    checar('editar por "Minhas avaliações" troca a nota', true)

    console.log('\n5. Sessão de cliente: 30 dias, e recorrente na mesma conta')
    const conteudo = JSON.parse(Buffer.from((await token()).split('.')[1], 'base64url').toString())
    checar('a sessão de cliente dura 30 dias', conteudo.exp - conteudo.iat === 30 * 24 * 3600 && conteudo.escopo === 'cliente', JSON.stringify(conteudo))
    await sair()
    await abrir('/minhas-avaliacoes', '.minhas-avaliacoes__confirmar .botao-google')
    checar('sem sessão, "Minhas avaliações" pede a confirmação com o Google (não o login de empreendedor)', true)
    provedor.proxima(CLIENTE_GOOGLE)
    await clicarEm('.minhas-avaliacoes__confirmar .botao-google')
    await esperarPor("location.pathname === '/minhas-avaliacoes' && Boolean(localStorage.getItem('vitrinelocal.token'))", 20000)
    checar('a mesma conta Google volta para a mesma conta interna', (await eu(await token())).data.id === idDaConta)

    console.log('\n6. O login dos empreendedores não oferece Google')
    await sair()
    await abrir('/login', '#login-email')
    checar('a tela de login é só de e-mail e senha', !(await evaluate("Boolean(__q('.botao-google'))")))

    console.log('\n7. Permissões e a sessão de cliente que vira empreendedor')
    provedor.proxima(CLIENTE_GOOGLE)
    const tokenCliente = await sessaoPorFetch()
    const naoAdmin = await fetch(`${API}/usuarios`, { headers: { Authorization: `Bearer ${tokenCliente}` } })
    checar('cliente do Google não acessa rotas de admin (403)', naoAdmin.status === 403)
    const negocio = await fetch(`${API}/empreendedores/meu`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCliente}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomeNegocio: 'Negócio do Teste Google', responsavel: 'Teste Google', categoria: 'Serviços', cidade: 'Rondonópolis', whatsapp: '66991234567' }),
    }).then((r) => r.json())
    checar('ao anunciar, recebe uma sessão nova de empreendedor', Boolean(negocio.token), negocio.message)
    checar('a sessão longa de cliente deixa de valer', (await eu(tokenCliente)).status === 401)
    checar('a sessão nova vale como empreendedor', (await eu(negocio.token)).data?.perfil === 'EMPREENDEDOR')

    console.log('\n8. Dois primeiros logins ao mesmo tempo')
    provedor.padrao({ sub: `g-simultaneo-${marca}`, email: `teste.google.simultaneo.${marca}@exemplo.com.br`, nome: 'Teste Simultaneo' })
    const [a, b] = await Promise.all([loginPorFetch(), loginPorFetch()])
    const [ra, rb] = await Promise.all([a, b].map((fluxo) => fetch(fluxo.retorno, { redirect: 'manual', headers: { cookie: fluxo.cookie } })))
    const codigos = [ra, rb].map((r) => new URLSearchParams(new URL(r.headers.get('location')).hash.slice(1)).get('codigo'))
    const sessoes = await Promise.all(
      codigos.map((codigo) =>
        fetch(`${API}/auth/google/sessao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) }).then((r) => r.json())
      )
    )
    checar('os dois terminam na mesma conta (sem duplicar)', sessoes[0].data?.usuario?.id && sessoes[0].data.usuario.id === sessoes[1].data?.usuario?.id, JSON.stringify(sessoes.map((s) => s.data?.usuario?.id ?? s.message)))
    provedor.padrao(null)
    const repetido = await fetch(`${API}/auth/google/sessao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: codigos[0] }) })
    checar('o código de troca não vale duas vezes', repetido.status === 401)
    const forjado = await fetch(`${API}/auth/google/retorno?code=x&state=forjado`, { redirect: 'manual' })
    checar('retorno sem o cookie do navegador é recusado', forjado.status === 400 || /erro=expirado/.test(forjado.headers.get('location') || ''), String(forjado.status))

    console.log('\n9. E-mail de conta existente: vínculo só com a senha')
    provedor.proxima({ sub: `g-maria-${marca}`, email: MARIA.email, nome: 'Maria do Google' })
    await irAvaliacoes()
    await evaluate("__clickText('Confirme com o Google', '.avaliacoes__convite a'); true")
    await esperarPor("document.querySelector('#vincular-senha')", 20000)
    await evaluate(helpers)
    checar('pede a senha da conta existente, sem entrar sozinho', !(await token()))
    await evaluate("__set('#vincular-senha', 'senha-errada-123')")
    await evaluate("__clickText('Ligar e entrar', 'form button')")
    await esperarPor("__q('.entrar-google__cartao .status')", 10000)
    checar('senha errada não liga nem entra', !(await token()))
    await evaluate(`__set('#vincular-senha', ${JSON.stringify(MARIA.senha)})`)
    await evaluate("__clickText('Ligar e entrar', 'form button')")
    await esperarPor(`location.pathname === ${JSON.stringify(perfil)} && Boolean(localStorage.getItem('vitrinelocal.token'))`, 20000)
    const maria = await eu(await token())
    checar('com a senha certa, entra na conta dela, com o perfil de antes', maria.data.email === MARIA.email && maria.data.perfil === 'EMPREENDEDOR', JSON.stringify(maria.data))

    console.log('\n10. Login de empreendedor e celular')
    await sair()
    await entrarNoSistema(nav, CARLOS)
    await esperarPor("location.pathname === '/meu-negocio'", 15000)
    checar('login por senha do empreendedor continua igual', true)
    await sair()
    await viewport(390, 844)
    await irAvaliacoes()
    checar('formulário de avaliação sem rolagem lateral no celular', await evaluate('document.documentElement.scrollWidth <= innerWidth'))
  } catch (erro) {
    const estado = await evaluate("JSON.stringify({ url: location.href, texto: document.body.innerText.slice(0, 300) })").catch(() => 'sem resposta')
    console.error('Estado da tela:', estado)
    throw erro
  } finally {
    nav.fechar()
    await provedor.parar()
    await limpar()
  }
  encerrar()
}

main().catch((erro) => {
  console.error('ERRO:', erro.message)
  process.exit(1)
})
