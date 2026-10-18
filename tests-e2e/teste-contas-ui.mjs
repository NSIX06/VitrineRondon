// Contas: cliente, empreendedor e sessão sem conflito.
// 1. Conta de cliente que depois cadastra um negócio pelo /cadastro (antes
//    travava em "e-mail já cadastrado").
// 2. Quem já está logado não cria outra conta por cima da sessão.
// 3. O login dos empreendedores continua igual.
// Cria contas teste.*@exemplo.com.br e as apaga no fim (só no banco local).
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { APP, abrirNavegador, helpers, entrarNoSistema, MARIA, criarPlacar } from './cdp.mjs'

const API = 'http://localhost:3001/api'
const { checar, encerrar } = criarPlacar()
const SENHA = 'Feira2026xyz'

async function apagarContasDeTeste() {
  const pastaBackend = join(import.meta.dirname, '..', 'backend')
  const require = createRequire(join(pastaBackend, 'package.json'))
  require('dotenv').config({ path: join(pastaBackend, '.env'), quiet: true })
  const host = new URL(process.env.DATABASE_URL).hostname
  if (!['localhost', '127.0.0.1'].includes(host)) {
    console.log('  (banco não é local: as contas de teste não foram apagadas)')
    return
  }
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const contas = await prisma.usuario.findMany({
      where: { email: { startsWith: 'teste.', endsWith: '@exemplo.com.br' } },
      select: { id: true },
    })
    const ids = contas.map((c) => c.id)
    await prisma.empreendedor.deleteMany({ where: { usuarioId: { in: ids } } })
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } })
  } finally {
    await prisma.$disconnect()
  }
}

/** Conta de cliente pela API (como as que já existem em produção) */
async function criarCliente(email) {
  const resposta = await fetch(`${API}/auth/registrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Teste Cliente',
      email,
      telefone: '66991234567',
      senha: SENHA,
      confirmacaoSenha: SENHA,
      aceites: { termosDeUso: true, politicaPrivacidade: true },
    }),
  })
  if (!resposta.ok) throw new Error(`não criei o cliente de teste (${resposta.status})`)
  return (await resposta.json()).data
}

async function main() {
  const nav = await abrirNavegador({ largura: 1280, altura: 1000 })
  const { evaluate, esperar, esperarPor, navegar, clicarEm } = nav
  const abrir = async (rota, espera) => {
    await navegar(APP + rota)
    await evaluate(helpers)
    if (espera) await esperarPor(`__q(${JSON.stringify(espera)})`, 15000)
    await esperar(500)
  }
  const sair = () => evaluate("localStorage.removeItem('vitrinelocal.token'); true")

  try {
    console.log('\n1. Cliente que depois anuncia pelo /cadastro')
    const email = `teste.cliente.${Date.now()}@exemplo.com.br`
    await criarCliente(email)
    await abrir('/cadastro', '#conta-nome')
    await evaluate(
      `__set('#conta-nome','Teste Cliente');__set('#conta-email','${email}');__set('#conta-telefone','(66) 99123-4567');__set('#conta-senha','${SENHA}');__set('#conta-confirmacao','${SENHA}')`
    )
    await clicarEm('#aceite-termos')
    await clicarEm('#aceite-privacidade')
    await clicarEm('.conta-form button[type=submit]')
    await esperar(1500)
    // A conferência da etapa 1 já avisa que o e-mail tem conta
    const etapa1 = await evaluate("({ form: Boolean(__q('#conta-nome')), erro: __texto('.conta-form .campo__erro') })")
    if (etapa1.form) {
      checar('etapa 1 avisa que o e-mail já tem conta e orienta a entrar com ela', /já tem conta.*Entre/i.test(etapa1.erro || ''), JSON.stringify(etapa1))
      await evaluate("[...document.querySelectorAll('.cadastro__caixa a')].find(a => a.getAttribute('href') === '/login').click(); true")
      await esperarPor("__q('#login-email')", 10000)
      await evaluate(helpers)
      await evaluate(`__set('#login-email','${email}');__set('#login-senha','${SENHA}')`)
      await evaluate("__clickText('Entrar', 'form button')")
      await esperarPor("location.pathname === '/meu-negocio' && __q('#emp-nome')", 15000)
      checar('entrando pelo cadastro, a conta de cliente vai direto ao formulário do negócio', true)
      await sair()
    } else {
      // Se passou (ex.: conferência desligada), o fim da etapa 2 resolve
      await esperarPor("__q('#emp-nome')", 8000)
      await evaluate(`__set('#emp-nome','Doces do Cliente');__set('#emp-categoria', __q('#emp-categoria').options[1].value)`)
      await clicarEm('.empreendedor-form button[type=submit]')
      await esperarPor("/Plano e pagamento/.test(__q('.cadastro__etapa--ativa')?.innerText)", 20000)
      checar('com a senha certa, o negócio entra na conta de cliente', true)
    }

    console.log('\n2. Logado, o /cadastro não cria outra conta')
    const tokenCliente = (
      await (
        await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha: SENHA }),
        })
      ).json()
    ).data.token
    await evaluate(`localStorage.setItem('vitrinelocal.token', ${JSON.stringify(tokenCliente)}); true`)
    await abrir('/cadastro', '.cadastro__formulario')
    await esperarPor("__q('.cadastro__conectado-acoes')", 10000)
    const logado = await evaluate("({ conta: Boolean(__q('#conta-nome')), aviso: __texto('.cadastro__formulario .status__titulo') })")
    checar('mostra "Você já entrou como" e esconde o formulário de conta', !logado.conta && /já entrou/.test(logado.aviso || ''), JSON.stringify(logado))
    await clicarEm('.cadastro__conectado-acoes a')
    await esperarPor("location.pathname === '/meu-negocio' && __q('#emp-nome')", 15000)
    checar('"Cadastrar o negócio nesta conta" leva ao formulário do negócio', true)
    const menu = await evaluate("[...document.querySelectorAll('.navbar a')].some(a => /Minhas avaliações/.test(a.textContent))")
    checar('menu do cliente oferece "Minhas avaliações"', menu)

    console.log('\n3. Login de empreendedor')
    await sair()
    await entrarNoSistema(nav, MARIA)
    await esperarPor("location.pathname === '/meu-negocio'", 15000)
    checar('empreendedora entra e cai no "Meu negócio"', true)
  } finally {
    nav.fechar()
    await apagarContasDeTeste()
  }
  encerrar()
}

main().catch((erro) => {
  console.error('ERRO:', erro.message)
  process.exit(1)
})
