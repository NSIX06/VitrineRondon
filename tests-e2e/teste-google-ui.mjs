// Login com Google de ponta a ponta, com o provedor simulado
// (provedor-google-simulado.mjs; veja lá como subir a API apontando para ele).
// Cobre: primeiro login e conta criada sozinha, volta ao perfil, avaliação,
// login recorrente na mesma conta, logins simultâneos, cancelamento, e-mail
// de conta existente (vínculo só com a senha), permissões e o login dos
// empreendedores. Apaga as contas e o vínculo de teste no fim (banco local).
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
    await prisma.usuario.deleteMany({ where: { id: { in: contas.map((c) => c.id) } } })
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
  const sair = () => evaluate("localStorage.removeItem('vitrinelocal.token'); true")
  const eu = () => evaluate("fetch('http://localhost:3001/api/auth/me', { headers: { Authorization: 'Bearer ' + localStorage.getItem('vitrinelocal.token') } }).then(r => r.json()).then(j => j.data)")
  let idDaConta = null

  try {
    console.log('\n1. Primeiro login pelo perfil do negócio')
    await abrir(perfil, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__convite .botao-google')", 15000)
    checar('visitante vê "Continuar com Google" no convite', true)
    checar('o topo do perfil tem "Avaliar negócio"', await evaluate("Boolean(__q('.detalhe__avaliar'))"))
    provedor.proxima(CLIENTE_GOOGLE)
    await clicarEm('.avaliacoes__convite .botao-google')
    await esperarPor(`location.pathname === ${JSON.stringify(perfil)} && Boolean(localStorage.getItem('vitrinelocal.token'))`, 20000)
    await evaluate(helpers)
    await esperarPor("__q('.form-avaliacao')", 15000)
    checar('volta ao mesmo perfil, logado, com o formulário', true)
    checar('o código de uso único não fica na barra de endereço', !(await evaluate('location.href.includes("codigo")')))
    const conta = await eu()
    idDaConta = conta.id
    checar('conta criada sozinha como cliente (COMUM), sem negócio', conta.perfil === 'COMUM' && conta.email === CLIENTE_GOOGLE.email, JSON.stringify(conta))

    console.log('\n2. Avaliação pela conta do Google')
    await evaluate("[...document.querySelectorAll('.form-avaliacao__estrela input')][3].click(); true")
    await evaluate("__set('.form-avaliacao textarea', 'Atendimento ótimo, avaliado pelo login do Google.'); true")
    await evaluate("__q('.form-avaliacao button[type=submit]').click(); true")
    await esperarPor("__q('.avaliacoes__minha')", 15000)
    checar('avaliação publicada com o nome curto', /^Teste L\./.test(await evaluate("__texto('.avaliacoes__minha .cartao-avaliacao__quem strong')") || ''))

    console.log('\n3. Login recorrente')
    await sair()
    provedor.proxima(CLIENTE_GOOGLE)
    await abrir('/login', '#login-email')
    await clicarEm('.login__conteudo .botao-google')
    await esperarPor("Boolean(localStorage.getItem('vitrinelocal.token')) && location.pathname !== '/entrar/google'", 20000)
    checar('a mesma conta Google entra na mesma conta interna', (await eu()).id === idDaConta)
    await abrir(perfil, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__minha')", 15000)
    checar('a avaliação continua sendo dela', true)

    console.log('\n4. Permissões')
    await abrir('/admin', '.status, .admin')
    checar('cliente do Google não entra no painel admin', /Acesso restrito/.test(await evaluate("__texto('.status__titulo') || ''")))

    console.log('\n5. Dois primeiros logins ao mesmo tempo')
    provedor.padrao({ sub: `g-simultaneo-${marca}`, email: `teste.google.simultaneo.${marca}@exemplo.com.br`, nome: 'Teste Simultaneo' })
    const [a, b] = await Promise.all([loginPorFetch(), loginPorFetch()])
    const [ra, rb] = await Promise.all(
      [a, b].map((fluxo) => fetch(fluxo.retorno, { redirect: 'manual', headers: { cookie: fluxo.cookie } }))
    )
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

    console.log('\n6. Login cancelado e state forjado')
    await sair()
    provedor.proxima({ cancelar: true })
    await abrir('/login', '#login-email')
    await clicarEm('.login__conteudo .botao-google')
    await esperarPor("location.pathname === '/entrar/google' && document.querySelector('.entrar-google__cartao .status')", 20000)
    await evaluate(helpers)
    checar('cancelar mostra o aviso e o botão para tentar de novo', /cancelado/.test(await evaluate("__texto('.entrar-google__cartao .status')")) && await evaluate("Boolean(__q('.entrar-google__cartao .botao-google'))"))
    const forjado = await fetch(`${API}/auth/google/retorno?code=x&state=forjado`, { redirect: 'manual' })
    // Sem o cookie não há para onde voltar com segurança: volta com erro (se
    // houver site na lista de origens) ou responde 400. Nunca entra.
    checar('retorno sem o cookie do navegador é recusado', forjado.status === 400 || /erro=expirado/.test(forjado.headers.get('location') || ''), String(forjado.status))

    console.log('\n7. E-mail de conta existente: vínculo só com a senha')
    provedor.proxima({ sub: `g-maria-${marca}`, email: MARIA.email, nome: 'Maria do Google' })
    await abrir(perfil, '#avaliacoes')
    await evaluate("document.getElementById('avaliacoes').scrollIntoView(); true")
    await esperarPor("__q('.avaliacoes__convite .botao-google')", 15000)
    await clicarEm('.avaliacoes__convite .botao-google')
    await esperarPor("document.querySelector('#vincular-senha')", 20000)
    await evaluate(helpers)
    checar('pede a senha da conta existente, sem entrar sozinho', !(await evaluate("localStorage.getItem('vitrinelocal.token')")))
    await evaluate("__set('#vincular-senha', 'senha-errada-123')")
    await evaluate("__clickText('Ligar e entrar', 'form button')")
    await esperarPor("__q('.entrar-google__cartao .status')", 10000)
    checar('senha errada não liga nem entra', !(await evaluate("localStorage.getItem('vitrinelocal.token')")))
    await evaluate(`__set('#vincular-senha', ${JSON.stringify(MARIA.senha)})`)
    await evaluate("__clickText('Ligar e entrar', 'form button')")
    await esperarPor(`location.pathname === ${JSON.stringify(perfil)} && Boolean(localStorage.getItem('vitrinelocal.token'))`, 20000)
    const maria = await eu()
    checar('com a senha certa, entra na conta dela, com o perfil de antes', maria.email === MARIA.email && maria.perfil === 'EMPREENDEDOR', JSON.stringify(maria))
    await sair()
    provedor.proxima({ sub: `g-maria-${marca}`, email: MARIA.email, nome: 'Maria do Google' })
    await abrir('/login', '#login-email')
    await clicarEm('.login__conteudo .botao-google')
    await esperarPor("Boolean(localStorage.getItem('vitrinelocal.token')) && location.pathname !== '/entrar/google'", 20000)
    checar('depois de ligado, o Google entra direto na conta dela', (await eu()).email === MARIA.email)

    console.log('\n8. Login dos empreendedores e celular')
    await sair()
    await entrarNoSistema(nav, CARLOS)
    await esperarPor("location.pathname === '/meu-negocio'", 15000)
    checar('login por senha do empreendedor continua igual', true)
    await sair()
    await viewport(390, 844)
    await abrir('/login', '#login-email')
    checar('login sem rolagem lateral no celular', await evaluate('document.documentElement.scrollWidth <= innerWidth'))
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
