import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// A documentação da API usa a mesma marca do site. Como a API é publicada à
// parte (rootDir backend no Render), o logo e as fontes são copiados para
// backend/src/docs/arquivos. Se o site trocar o logo ou as fontes e a cópia
// ficar para trás, este teste avisa.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ler = (...partes) => readFileSync(path.join(RAIZ, ...partes))

const COPIAS = [
  ['frontend/src/assets/logo.svg', 'logo.svg'],
  ['frontend/public/fontes/texto-latin-c950377582.woff2', 'texto-latin-c950377582.woff2'],
  ['frontend/public/fontes/texto-latin-ext-f295ededfc.woff2', 'texto-latin-ext-f295ededfc.woff2'],
  ['frontend/public/fontes/texto-latin-3100e775e8.woff2', 'texto-latin-3100e775e8.woff2'],
  ['frontend/public/fontes/texto-latin-ext-34b9c504ca.woff2', 'texto-latin-ext-34b9c504ca.woff2'],
]

describe('identidade da documentação da API', () => {
  it.each(COPIAS)('%s está copiado sem mudança', (original, copia) => {
    expect(ler('backend/src/docs/arquivos', copia).equals(ler(original))).toBe(true)
  })

  it('o CSS da documentação usa os mesmos valores dos tokens do site', () => {
    const site = ler('frontend/src/index.css').toString()
    const docs = ler('backend/src/docs/inicio.css').toString()
    for (const token of ['--cor-anil', '--cor-ouro', '--cor-contorno', '--cor-papel', '--sombra-dura', '--raio', '--cel']) {
      const valor = (css) => css.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1].trim()
      expect(valor(docs), token).toBe(valor(site))
    }
  })

  it('a marca no topo é a mesma do site: logo, traço e letreiro com "Rondon" em ouro e brilho', async () => {
    const { cabecalhoDaMarca } = await import('../../backend/src/docs/paginaInicial.js')
    const html = cabecalhoDaMarca()
    expect(html).toContain('/api/docs/arquivos/logo.svg')
    expect(html).toContain('navbar__divisor')
    expect(html).toContain('<span class="letreiro">Vitrine</span>')
    expect(html).toContain('<span class="letreiro letreiro--ouro letreiro--brilho">Rondon</span>')
  })
})
