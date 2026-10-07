// Mapa com Leaflet, ver a senha no login e no cadastro, e setas de voltar.
import { APP, abrirNavegador, helpers, criarPlacar } from './cdp.mjs'

const API = 'http://localhost:3001/api'
const { checar, encerrar } = criarPlacar()

async function main() {
  const negocios = (await (await fetch(`${API}/empreendedores`)).json()).data
  const comEndereco = negocios.find((e) => e.exibirEndereco)
  const semEndereco = negocios.find((e) => !e.exibirEndereco)

  const nav = await abrirNavegador({ largura: 1280, altura: 1000 })
  const { evaluate, esperar, esperarPor, navegar, screenshot, viewport, clicarEm, fechar } = nav
  const abrir = async (rota, espera = '.navbar__menu') => {
    await navegar(APP + rota)
    await evaluate(helpers)
    await esperarPor(`__q(${JSON.stringify(espera)})`, 15000)
  }

  try {
    console.log('\n1. Mapa (Leaflet + OpenStreetMap)')
    await abrir(`/empreendedores/${comEndereco.id}`, '.mapa')
    await esperar(5000)
    const mapa = await evaluate(`(() => {
      const t = [...document.querySelectorAll('.leaflet-tile-loaded')]
      return {
        leaflet: Boolean(__q('.leaflet-container')),
        ladrilhos: t.length,
        deOSM: t.every(i => i.src.includes('tile.openstreetmap.org')),
        semZero: t.every(i => !i.src.includes('/32767/32767')),
        alfinete: Boolean(__q('.mapa__alfinete')),
        creditos: (__q('.leaflet-control-attribution') || {}).innerText || '',
        abrirOSM: (__q('.mapa__abrir') || {}).href || '',
        googleMaps: (() => {
          const html = document.documentElement.innerHTML.toLowerCase()
          return html.includes('google.com/maps') || html.includes('maps.google')
        })(),
      }
    })()`)
    checar('a página usa Leaflet', mapa.leaflet)
    checar('os ladrilhos vêm do OpenStreetMap', mapa.ladrilhos > 0 && mapa.deOSM, `${mapa.ladrilhos} ladrilhos`)
    checar('o mapa não cai no ponto zero do oceano', mapa.semZero)
    checar('marca o ponto do negócio', mapa.alfinete)
    checar('mostra os créditos do OpenStreetMap', mapa.creditos.includes('OpenStreetMap'), mapa.creditos)
    checar('oferece abrir no OpenStreetMap', mapa.abrirOSM.includes('openstreetmap.org'))
    checar('nenhum resto do Google Maps na página', !mapa.googleMaps)
    await evaluate(`__q('.detalhe__mapa').scrollIntoView({ block: 'center' })`)
    await esperar(2000)
    await screenshot('../docs/imagens-teste-mapa-exato.png')

    if (semEndereco) {
      await abrir(`/empreendedores/${semEndereco.id}`, '.mapa')
      await esperar(5000)
      const privado = await evaluate(`({ alfinete: Boolean(__q('.mapa__alfinete')), area: Boolean(__q('.leaflet-interactive')) })`)
      checar('endereço oculto mostra área, sem alfinete', !privado.alfinete && privado.area, JSON.stringify(privado))
      await evaluate(`__q('.detalhe__mapa').scrollIntoView({ block: 'center' })`)
      await esperar(2000)
      await screenshot('../docs/imagens-teste-mapa-regiao.png')
    }

    console.log('\n2. Ver a senha')
    await abrir('/login', '#login-senha')
    await evaluate(`__set('#login-senha', 'Senha123')`)
    const antes = await evaluate(`({ tipo: __q('#login-senha').type, rotulo: __q('.campo-senha__ver').getAttribute('aria-label') })`)
    checar('a senha começa escondida', antes.tipo === 'password' && antes.rotulo === 'Mostrar a senha', JSON.stringify(antes))
    await clicarEm('.campo-senha__ver')
    await esperar(300)
    const depois = await evaluate(`({ tipo: __q('#login-senha').type, rotulo: __q('.campo-senha__ver').getAttribute('aria-label'), valor: __q('#login-senha').value, pressionado: __q('.campo-senha__ver').getAttribute('aria-pressed') })`)
    checar('o botão mostra a senha', depois.tipo === 'text' && depois.valor === 'Senha123', JSON.stringify(depois))
    checar('o botão avisa o leitor de tela', depois.rotulo === 'Ocultar a senha' && depois.pressionado === 'true')
    await clicarEm('.campo-senha__ver')
    await esperar(300)
    checar('clicar de novo esconde', (await evaluate(`__q('#login-senha').type`)) === 'password')
    await screenshot('../docs/imagens-teste-senha-login.png')

    await abrir('/cadastro', '#conta-senha')
    const campos = await evaluate(`document.querySelectorAll('.campo-senha__ver').length`)
    checar('cadastro tem o botão nos dois campos de senha', campos === 2, `-> ${campos}`)
    await evaluate(`__set('#conta-senha', 'Senha123'); __set('#conta-confirmacao', 'Senha123')`)
    await clicarEm('.campo-senha__ver')
    await esperar(300)
    const so_um = await evaluate(`({ senha: __q('#conta-senha').type, confirmacao: __q('#conta-confirmacao').type })`)
    checar('cada campo tem seu próprio botão', so_um.senha === 'text' && so_um.confirmacao === 'password', JSON.stringify(so_um))

    console.log('\n3. Setas para voltar')
    await abrir('/vitrine', '.grade-cards')
    await esperar(600)
    await evaluate(`__q('.grade-cards > li:nth-child(3) .produto-card__link').click()`)
    await esperarPor(`location.pathname.startsWith('/produtos/') && __q('.detalhe__migalhas')`, 10000)
    checar('a página do item tem a seta', await evaluate(`Boolean(__q('.voltar'))`))
    checar('a seta é botão quando há página anterior', (await evaluate(`__q('.voltar').tagName`)) === 'BUTTON')
    await clicarEm('.voltar')
    await esperarPor(`location.pathname === '/vitrine'`, 8000)
    checar('a seta volta para a vitrine', true)

    // Entrando direto pelo endereço, não há página anterior: vira link
    await abrir('/contato', '.voltar')
    const direto = await evaluate(`({ tag: __q('.voltar').tagName, destino: new URL(__q('.voltar').href).pathname, texto: __textoSemIcone(__q('.voltar')) })`)
    checar('sem página anterior, a seta vira link seguro', direto.tag === 'A' && direto.destino === '/', JSON.stringify(direto))
    checar('o link diz para onde leva', direto.texto === 'Início', direto.texto)

    // A seta de avançar só acende depois de voltar, como no navegador
    await abrir('/vitrine', '.grade-cards')
    await esperar(600)
    checar('avançar começa apagado', await evaluate(`__q('.avancar').disabled`))
    await evaluate(`__q('.grade-cards > li:nth-child(2) .produto-card__link').click()`)
    await esperarPor(`location.pathname.startsWith('/produtos/') && __q('.detalhe__migalhas')`, 10000)
    await clicarEm('.voltar')
    await esperarPor(`location.pathname === '/vitrine'`, 8000)
    await esperar(500)
    checar('depois de voltar, avançar acende', !(await evaluate(`__q('.avancar').disabled`)))
    await clicarEm('.avancar')
    await esperarPor(`location.pathname.startsWith('/produtos/') && __q('.detalhe__migalhas')`, 8000)
    checar('avançar leva à tela seguinte', true)
    await evaluate(`__q('.navbar__menu a[href="/empreendedores"]').click()`)
    await esperarPor(`location.pathname === '/empreendedores'`, 8000)
    await esperar(500)
    checar('abrir uma tela nova apaga o avançar', await evaluate(`__q('.avancar').disabled`))

    const alinhamento = await evaluate(`(() => {
      const seta = __q('.voltar .icone').getBoundingClientRect()
      const titulo = __q('.pagina-cabecalho h1').getBoundingClientRect()
      const par = __q('.navegacao').getBoundingClientRect()
      const avancar = __q('.avancar').getBoundingClientRect()
      return {
        desvio: Math.round(seta.left - titulo.left),
        mesmaLinha: Math.abs(par.top - avancar.top) < 2 && Math.abs(par.bottom - avancar.bottom) < 2,
      }
    })()`)
    checar('a seta alinha com o título da página', Math.abs(alinhamento.desvio) <= 2, `${alinhamento.desvio}px`)
    checar('voltar e avançar na mesma linha', alinhamento.mesmaLinha)

    const paginas = ['/vitrine', '/empreendedores', '/contato', '/sobre', '/login', '/cadastro', '/termos', `/empreendedores/${comEndereco.id}`]
    const faltando = []
    for (const rota of paginas) {
      await abrir(rota)
      await esperar(400)
      if (!(await evaluate(`Boolean(__q('.voltar'))`))) faltando.push(rota)
    }
    checar('todas as telas internas têm a seta', faltando.length === 0, faltando.join(', '))

    console.log('\n4. Celular (400px)')
    await viewport(400, 900)
    for (const rota of [`/empreendedores/${comEndereco.id}`, '/login', '/cadastro']) {
      await abrir(rota, '.voltar')
      await esperar(800)
      const largura = await evaluate('document.documentElement.scrollWidth')
      checar(`sem rolagem horizontal em ${rota}`, largura <= 400, `${largura}px`)
    }
    await abrir(`/empreendedores/${comEndereco.id}`, '.mapa')
    await esperar(4000)
    await evaluate(`__q('.detalhe__mapa').scrollIntoView({ block: 'center' })`)
    await esperar(1500)
    await screenshot('../docs/imagens-teste-mapa-celular.png')
  } finally {
    fechar()
  }

  encerrar({ forcar: true })
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
