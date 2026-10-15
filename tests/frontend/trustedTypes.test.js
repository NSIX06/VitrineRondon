import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { htmlPermitido, scriptPermitido } from '../../frontend/src/services/trustedTypes.js'
import { ALFINETE_SVG, ATRIBUICAO_OSM, HTML_DO_MAPA, PREFIXO_LEAFLET } from '../../frontend/src/components/ui/Mapa/mapaHtml.js'

describe('política de Trusted Types', () => {
  it('deixa passar texto sem tag (entidades inclusive)', () => {
    expect(htmlPermitido('+')).toBe(true)
    expect(htmlPermitido('100 m')).toBe(true)
    expect(htmlPermitido('Tom &amp; Jerry')).toBe(true)
  })

  it('deixa passar só o HTML fixo do mapa', () => {
    expect(htmlPermitido(ALFINETE_SVG)).toBe(true)
    expect(htmlPermitido(`${PREFIXO_LEAFLET} <span aria-hidden="true">|</span> ${ATRIBUICAO_OSM}`)).toBe(true)
    expect(htmlPermitido('<svg/>')).toBe(true)
  })

  it.each([
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    `${ALFINETE_SVG}<img src=x onerror=alert(1)>`,
    '<a href="javascript:alert(1)">OpenStreetMap</a>',
    '<svg/><script>alert(1)</script>',
  ])('recusa qualquer outro HTML: %s', (html) => {
    expect(htmlPermitido(html)).toBe(false)
  })

  it('endereço de script só do próprio site', () => {
    const origem = 'https://vitrinerondon-1.onrender.com'
    expect(scriptPermitido('/assets/index-abc.js', origem)).toBe(true)
    expect(scriptPermitido(`${origem}/abertura.js`, origem)).toBe(true)
    expect(scriptPermitido('https://cdn.exemplo.com/x.js', origem)).toBe(false)
    expect(scriptPermitido('//evil.example/x.js', origem)).toBe(false)
  })

  // Uma versão nova do Leaflet pode trocar o HTML padrão dos botões: aí a
  // política passaria a recusar e o mapa cairia na tela de erro
  it('os textos padrão do Leaflet instalado estão na lista do mapa', () => {
    const require = createRequire(import.meta.url)
    const fonte = readFileSync(require.resolve('../../frontend/node_modules/leaflet/dist/leaflet-src.js'), 'utf8')
    const padroes = [
      ...[...fonte.matchAll(/^\s*zoom(?:In|Out)Text: '([^']+)'/gm)].map((m) => m[1]),
      /closeButton\.innerHTML = '([^']+)'/.exec(fonte)[1],
      /div\.innerHTML = '(<svg\/>)'/.exec(fonte)[1],
    ]
    expect(padroes).toHaveLength(4)
    for (const html of padroes) expect(HTML_DO_MAPA).toContain(html)
  })
})
