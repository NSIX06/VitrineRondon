// Driver de testes de ponta a ponta, sem dependências: conversa com o Microsoft
// Edge em modo headless pelo Chrome DevTools Protocol.
import { spawn, execFileSync } from 'node:child_process'
import { writeFileSync, rmSync, readdirSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { createServer } from 'node:net'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

// Endereço do site. O Vite sobe em outra porta quando a 5173 está ocupada;
// nesse caso rode com APP_URL=http://localhost:5174
export const APP = process.env.APP_URL || 'http://localhost:5173'

export const ADMIN = { email: 'admin@vitrinelocal.com.br', senha: 'Admin@2026' }
export const CARLOS = { email: 'carlos@silvareparos.com.br', senha: 'Carlos@2026' }

/** Porta livre de verdade: sortear sem checar fazia o driver conversar com um
 *  navegador de outra execução e travar esperando respostas. */
function portaLivre() {
  return new Promise((resolve, reject) => {
    const servidor = createServer()
    servidor.once('error', reject)
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address()
      servidor.close(() => resolve(port))
    })
  })
}

/** Remove perfis e navegadores de execuções antigas, inclusive de testes que
 *  foram interrompidos de fora e não chegaram a limpar o que criaram. */
function limparSobras() {
  const limite = Date.now() - 30 * 60 * 1000
  const antigos = readdirSync(process.env.TEMP)
    .filter((nome) => nome.startsWith('cdp-profile-'))
    .filter((nome) => Number(nome.split('-')[2]) < limite)
  if (antigos.length === 0) return
  const padroes = antigos.map((nome) => `'*${nome}*'`).join(',')
  const script =
    `$padroes = @(${padroes}); Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | ` +
    `Where-Object { $linha = $_.CommandLine; $padroes | Where-Object { $linha -like $_ } } | ` +
    `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
  try { execFileSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore' }) } catch { /* segue */ }
  for (const nome of antigos) {
    try { rmSync(`${process.env.TEMP}/${nome}`, { recursive: true, force: true }) } catch { /* segue */ }
  }
}

export async function abrirNavegador({ largura = 1280, altura = 1600, argumentos = [] } = {}) {
  limparSobras()
  const PORT = await portaLivre()
  // Perfil descartável, apagado ao fechar: perfis esquecidos já ocuparam 22 GB
  const perfil = `${process.env.TEMP}/cdp-profile-${Date.now()}-${PORT}`
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disk-cache-size=1',
    `--remote-debugging-port=${PORT}`, `--window-size=${largura},${altura}`,
    // Sem janela visível o Edge trata a aba como de fundo e para de desenhar
    // quadros: animações e capturas de tela travavam de vez em quando
    '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    `--user-data-dir=${perfil}`, ...argumentos, 'about:blank',
  ], { stdio: 'ignore' })

  // O Edge repassa o trabalho para processos que não ficam abaixo do que foi
  // aberto aqui; o nome único da pasta de perfil identifica todos eles
  let encerrado = false
  const encerrarNavegador = () => {
    if (encerrado) return
    encerrado = true
    const nomePerfil = perfil.split('/').pop()
    const script =
      `Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | ` +
      `Where-Object { $_.CommandLine -like '*${nomePerfil}*' } | ` +
      `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
    try { proc.kill() } catch { /* segue */ }
    try { execFileSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore' }) } catch { /* segue */ }
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      try { rmSync(perfil, { recursive: true, force: true }); return } catch {
        const ate = Date.now() + 250
        while (Date.now() < ate) { /* espera curta e síncrona */ }
      }
    }
  }
  process.once('exit', encerrarNavegador)

  let alvo
  for (let i = 0; i < 40; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
      alvo = lista.find((t) => t.type === 'page')
      if (alvo) break
    } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  if (!alvo) throw new Error('Edge não respondeu na porta de depuração')

  const ws = new WebSocket(alvo.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let id = 0
  const pendentes = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pendentes.has(msg.id)) {
      const { res, rej } = pendentes.get(msg.id)
      pendentes.delete(msg.id)
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result)
    }
  }
  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id
    // Sem tempo limite, uma resposta que nunca chega deixa o teste pendurado
    const relogio = setTimeout(() => {
      pendentes.delete(mid)
      rej(new Error(`sem resposta do navegador em ${method} (30s)`))
    }, 30000)
    const encerrar = (fn) => (valor) => { clearTimeout(relogio); fn(valor) }
    pendentes.set(mid, { res: encerrar(res), rej: encerrar(rej) })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
  await send('Page.enable')
  await send('Runtime.enable')

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'erro no evaluate')
    return r.result.value
  }
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
  const esperarPor = async (expr, timeout = 8000) => {
    const fim = Date.now() + timeout
    while (Date.now() < fim) {
      if (await evaluate(`Boolean(${expr})`)) return true
      await esperar(150)
    }
    throw new Error(`timeout esperando: ${expr}`)
  }
  const navegar = async (url) => { await send('Page.navigate', { url }); await esperar(1200) }
  const screenshot = async (arquivo) => {
    // Sob emulação de celular a captura às vezes não responde; sem
    // captureBeyondViewport e com uma segunda tentativa ela volta ao normal
    const capturar = () => send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    let resultado
    try { resultado = await capturar() } catch { await esperar(500); resultado = await capturar() }
    // Caminho relativo conta a partir desta pasta, e não de onde o comando foi
    // chamado: a suíte roda tanto daqui quanto da raiz, por npm run test:e2e
    const destino = isAbsolute(arquivo) ? arquivo : join(import.meta.dirname, arquivo)
    writeFileSync(destino, Buffer.from(resultado.data, 'base64'))
  }
  /** Clique real do mouse: passa pelo hit-testing do navegador.
   *  A rolagem acontece antes da medida, e sem suavidade: com o scroll ainda
   *  em curso o elemento saía de baixo do ponto medido e o clique errava. */
  const clicarEm = async (seletor) => {
    const achar = `document.querySelector(${JSON.stringify(seletor)})`
    const existe = await evaluate(`(() => { const el = ${achar}; if (!el) return false; el.scrollIntoView({ block: 'center', behavior: 'instant' }); return true })()`)
    if (!existe) throw new Error('não achei para clicar: ' + seletor)
    await esperar(250)
    const r = await evaluate(`(() => { const b = ${achar}.getBoundingClientRect(); return { x: b.left + b.width/2, y: b.top + b.height/2 } })()`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 })
  }
  const viewport = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true })
  const fechar = () => {
    try { ws.close() } catch { /* segue */ }
    encerrarNavegador()
    process.removeListener('exit', encerrarNavegador)
  }

  return { evaluate, esperar, esperarPor, navegar, screenshot, viewport, clicarEm, fechar, cdp: send }
}

// Helpers injetados na página: preencher campos controlados pelo React e ler textos
export const helpers = `
  window.__q = (sel) => document.querySelector(sel);
  window.__textoSemIcone = (e) => {
    const clone = e.cloneNode(true);
    clone.querySelectorAll('.icone').forEach(i => i.remove());
    return clone.textContent.trim().split(' ').filter(Boolean).join(' ').replace(String.fromCharCode(10), ' ');
  };
  window.__clickText = (texto, seletor = 'button, a') => {
    const el = [...document.querySelectorAll(seletor)].find(e => window.__textoSemIcone(e) === texto);
    if (!el) throw new Error('não achei: ' + texto);
    el.click(); return true;
  };
  window.__set = (sel, valor) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error('não achei campo: ' + sel);
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  window.__texto = (sel) => document.querySelector(sel)?.textContent.trim() ?? null;
  window.__linhas = () => [...document.querySelectorAll('tbody tr')].map(tr => tr.textContent.trim());
  true;
`

/** Entra pela tela de login. O seletor 'form button' evita o link do cabeçalho. */
export async function entrarNoSistema(nav, { email, senha } = ADMIN) {
  await nav.navegar(`${APP}/login`)
  await nav.evaluate(helpers)
  await nav.esperarPor("document.querySelector('#login-email')", 15000)
  await nav.evaluate(`__set('#login-email', ${JSON.stringify(email)})`)
  await nav.evaluate(`__set('#login-senha', ${JSON.stringify(senha)})`)
  await nav.evaluate("__clickText('Entrar', 'form button')")
  await nav.esperarPor("Boolean(localStorage.getItem('vitrinelocal.token'))", 15000)
  await nav.esperar(600)
}

/** Token de administrador para as chamadas diretas à API dentro dos testes */
export async function cabecalhoAdmin() {
  const resposta = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  })
  const dados = await resposta.json()
  if (!dados?.data?.token) throw new Error('não consegui o token de administrador')
  return { Authorization: `Bearer ${dados.data.token}`, 'Content-Type': 'application/json' }
}
