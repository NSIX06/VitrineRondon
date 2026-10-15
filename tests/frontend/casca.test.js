import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// O topo da Home vem pronto no index.html (a "casca") para o texto principal
// aparecer antes do JavaScript. Se o texto da Home mudar e a casca não, a
// pessoa veria um texto e depois outro: este teste avisa.
const FRONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend')
const html = readFileSync(path.join(FRONT, 'index.html'), 'utf8')
const home = readFileSync(path.join(FRONT, 'src/pages/Home/Home.jsx'), 'utf8')

/** Texto de um elemento com a classe, no HTML ou no JSX, sem tags e espaços extras */
function textoDe(fonte, classe) {
  const re = new RegExp(`class(?:Name)?="${classe}"[^>]*>([\\s\\S]*?)</(?:p|span|h1)>`)
  const achado = re.exec(fonte)
  if (!achado) return null
  return achado[1]
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('casca da primeira tela', () => {
  it.each(['hero__selo', 'hero__titulo', 'hero__texto'])('%s igual na casca e na Home', (classe) => {
    const naCasca = textoDe(html, classe)
    expect(naCasca).toBeTruthy()
    expect(naCasca).toBe(textoDe(home, classe))
  })

  it('a casca fica dentro do #root, para o React trocá-la ao montar', () => {
    const raiz = html.slice(html.indexOf('<div id="root">'))
    expect(raiz.indexOf('hero__texto')).toBeGreaterThan(0)
    expect(raiz.indexOf('hero__texto')).toBeLessThan(raiz.indexOf('<script') === -1 ? Infinity : raiz.indexOf('<script'))
  })

  it('sem preload das fontes (disputava a banda com o JavaScript no 4G)', () => {
    expect(html).not.toMatch(/rel="preload"[^>]*\/fontes\//)
  })
})
