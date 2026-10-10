// Cadastro de empreendedor no celular (390px), do jeito que a pessoa usa:
// telefone digitado tecla por tecla e colado, "Seu negócio" com campos
// faltando (a tela precisa levar até o erro, senão parece travada) e o avanço
// até "Plano e pagamento". Para no botão de pagar: não abre o checkout do
// gateway, para não criar cobrança de teste a cada execução.
// A conta criada (teste.*@exemplo.com.br) é apagada do banco local no fim.
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { APP, abrirNavegador, helpers, criarPlacar } from './cdp.mjs'

const { checar, encerrar } = criarPlacar()

/** Apaga as contas de teste e os negócios delas; só em banco local */
async function apagarContasDeTeste() {
  const pastaBackend = join(import.meta.dirname, '..', 'backend')
  const require = createRequire(join(pastaBackend, 'package.json'))
  require('dotenv').config({ path: join(pastaBackend, '.env'), quiet: true })
  const host = new URL(process.env.DATABASE_URL).hostname
  if (!['localhost', '127.0.0.1'].includes(host)) {
    console.log('  (banco não é local: a conta de teste não foi apagada)')
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

async function main() {
  const email = `teste.celular.${Date.now()}@exemplo.com.br`
  const nav = await abrirNavegador({ largura: 390, altura: 844 })
  const { evaluate, esperar, esperarPor, navegar, viewport, clicarEm, fechar, cdp } = nav

  const digitar = async (texto) => {
    for (const c of texto) {
      await cdp('Input.insertText', { text: c })
      await esperar(15)
    }
  }
  const colar = async (texto) => {
    await cdp('Input.insertText', { text: texto })
    await esperar(50)
  }
  const tecla = async (key, keyCode) => {
    await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: keyCode })
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: keyCode })
    await esperar(30)
  }
  const valor = (sel) => evaluate(`__q('${sel}').value`)
  const limparCampo = async (sel) => {
    await clicarEm(sel)
    await evaluate(`__q('${sel}').select()`)
    await tecla('Delete', 46)
  }
  const naTela = (sel) =>
    evaluate(`(e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight })(__q('${sel}'))`)

  try {
    await viewport(390, 844)
    await navegar(APP + '/cadastro')
    await evaluate(
      helpers +
        ';window.__falhas=[];addEventListener("error",e=>__falhas.push(String(e.message)));addEventListener("unhandledrejection",e=>__falhas.push(String(e.reason)));true'
    )
    await esperarPor("__q('#conta-nome')", 15000)

    console.log('\n1. Telefone com máscara')
    await limparCampo('#conta-telefone')
    await digitar('66991234567')
    checar('celular digitado vira (66) 99123-4567', (await valor('#conta-telefone')) === '(66) 99123-4567', await valor('#conta-telefone'))
    await limparCampo('#conta-telefone')
    await digitar('6634211234')
    checar('fixo digitado vira (66) 3421-1234', (await valor('#conta-telefone')) === '(66) 3421-1234', await valor('#conta-telefone'))
    await limparCampo('#conta-telefone')
    await colar('+55 (66) 99123-4567')
    checar('colado com +55 e máscara', (await valor('#conta-telefone')) === '(66) 99123-4567', await valor('#conta-telefone'))
    await limparCampo('#conta-telefone')
    await colar('66 9 9123 4567')
    checar('colado só com espaços', (await valor('#conta-telefone')) === '(66) 99123-4567', await valor('#conta-telefone'))
    // (66) 99123-|4567: o Backspace em cima do traço apaga o 3, e não "trava"
    await evaluate("__q('#conta-telefone').setSelectionRange(11, 11)")
    await tecla('Backspace', 8)
    checar('Backspace depois do traço apaga o dígito', (await valor('#conta-telefone')) === '(66) 9912-4567', await valor('#conta-telefone'))
    await evaluate("__q('#conta-telefone').setSelectionRange(7, 7)")
    await digitar('5')
    const cursor = await evaluate("__q('#conta-telefone').selectionStart")
    checar('digitar no meio mantém o cursor no lugar', (await valor('#conta-telefone')) === '(66) 99512-4567' && cursor === 8, `cursor ${cursor}`)

    await limparCampo('#conta-telefone')
    await digitar('669912')
    await evaluate(
      `__set('#conta-nome','Teste Celular');__set('#conta-email','${email}');__set('#conta-senha','Feira2026xyz');__set('#conta-confirmacao','Feira2026xyz')`
    )
    await clicarEm('#aceite-termos')
    await clicarEm('#aceite-privacidade')
    await clicarEm('.conta-form button[type=submit]')
    await esperar(1000)
    checar('telefone incompleto não passa da etapa 1', await evaluate("Boolean(__q('#conta-telefone'))"))
    checar('a tela leva até o telefone com erro', await naTela('#conta-telefone'))
    await limparCampo('#conta-telefone')
    await digitar('66991234567')
    await clicarEm('.conta-form button[type=submit]')
    await esperarPor("__q('#emp-nome')", 8000)
    checar('WhatsApp já vem com o telefone da conta, formatado', (await valor('#emp-whatsapp')) === '(66) 99123-4567', await valor('#emp-whatsapp'))

    console.log('\n2. Seu negócio com campos faltando')
    await clicarEm('.empreendedor-form button[type=submit]')
    await esperar(1200)
    checar('continua em "Seu negócio"', /Seu negócio/.test(await evaluate("__q('.cadastro__etapa--ativa').innerText")))
    checar('a tela sobe até o primeiro campo com erro', await naTela('#emp-nome'))
    checar('o foco vai para o campo', (await evaluate('document.activeElement.id')) === 'emp-nome')
    checar('aviso junto do botão diz quantos campos faltam', /2 campos/.test(await evaluate("__q('.resumo-erros')?.innerText || ''")))

    console.log('\n3. Layout de "Seu negócio" no celular')
    checar('sem rolagem lateral', await evaluate('document.documentElement.scrollWidth <= innerWidth'))
    await clicarEm('.horarios-editor__atalho')
    await esperar(300)
    checar(
      'caixa de marcar do dia não cobre o nome (Seg, Ter...)',
      await evaluate(`[...document.querySelectorAll('.horarios-editor__nome')].every(l => {
        const caixa = l.querySelector('input').getBoundingClientRect(), moldura = l.querySelector('.caixa-marcar').getBoundingClientRect()
        return caixa.width === moldura.width && caixa.right <= moldura.right + 0.5 })`)
    )
    checar(
      'dia fechado fica numa linha só',
      await evaluate(`(li => Math.abs(li.querySelector('.horarios-editor__nome').getBoundingClientRect().top - li.querySelector('.horarios-editor__fechado').getBoundingClientRect().top) < 20)(document.querySelector('.horarios-editor__dia--fechado'))`)
    )

    console.log('\n4. Avança para Plano e pagamento')
    await evaluate(`__set('#emp-nome','Doces do Teste');__set('#emp-categoria', __q('#emp-categoria').options[1].value)`)
    await clicarEm('.empreendedor-form button[type=submit]')
    await esperarPor("/Plano e pagamento/.test(__q('.cadastro__etapa--ativa')?.innerText)", 20000)
    checar('chegou em "Plano e pagamento"', true)
    await esperarPor("__q('.escolha-plano .planos__cartao')", 15000)
    // Os mesmos cartões da página de planos, cada um com o seu botão de assinar
    const cartoes = await evaluate(
      "[...document.querySelectorAll('.escolha-plano .planos__cartao')].map(c => { const b = c.querySelector('.planos__acao button'); return { texto: b?.innerText ?? '', desativado: b?.disabled } })"
    )
    checar('dois planos, com os cartões da página de planos', cartoes.length === 2, JSON.stringify(cartoes))
    checar('cada cartão tem o botão de assinar liberado', cartoes.every((c) => /assinar/i.test(c.texto) && !c.desativado), JSON.stringify(cartoes))
    checar('planos sem rolagem lateral', await evaluate('document.documentElement.scrollWidth <= innerWidth'))
    const falhas = await evaluate('window.__falhas')
    checar('nenhum erro de JavaScript no caminho', falhas.length === 0, falhas.join(' | '))
  } finally {
    fechar()
    await apagarContasDeTeste().catch((erro) => console.log('  (não foi possível apagar a conta de teste:', erro.message + ')'))
  }
}

main()
  .catch((erro) => checar('suíte sem exceção', false, erro.message))
  .finally(() => encerrar())
