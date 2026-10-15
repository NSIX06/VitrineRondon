// Todo HTML que o Leaflet escreve com innerHTML no nosso mapa. Fica aqui, em
// texto fixo, porque a política de Trusted Types (services/trustedTypes.js) só
// deixa passar HTML que esteja nesta lista: qualquer outro é recusado.

/** Atribuição exigida pelo OpenStreetMap, no canto do mapa */
export const ATRIBUICAO_OSM =
  '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

/** Crédito do Leaflet em texto puro (o padrão dele traz uma bandeira em SVG) */
export const PREFIXO_LEAFLET = 'Leaflet'

/** Alfinete nas cores da marca: evita depender das imagens do Leaflet */
export const ALFINETE_SVG = `<svg viewBox="0 0 24 32" width="30" height="40" aria-hidden="true">
    <path d="M12 0C5.9 0 1 4.9 1 11c0 8 11 21 11 21s11-13 11-21c0-6.1-4.9-11-11-11z" fill="#17346E" stroke="#FFC93C" stroke-width="2"/>
    <circle cx="12" cy="11" r="4" fill="#FFC93C"/>
  </svg>`

export const HTML_DO_MAPA = [
  // Testes do Leaflet, ao carregar, para saber se o navegador desenha SVG (ou VML, no IE antigo)
  '<svg/>',
  '<v:shape adj="1"/>',
  // Botões de zoom e de fechar o balão do endereço (textos padrão do Leaflet 1.9)
  '<span aria-hidden="true">+</span>',
  '<span aria-hidden="true">&#x2212;</span>',
  '<span aria-hidden="true">&#215;</span>',
  ALFINETE_SVG,
  // Canto do mapa: o crédito e a atribuição, unidos pelo separador do Leaflet
  `${PREFIXO_LEAFLET} <span aria-hidden="true">|</span> ${ATRIBUICAO_OSM}`,
  ATRIBUICAO_OSM,
]
