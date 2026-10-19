// "A página sossegou": a primeira interação da pessoa (mexer o mouse, rolar,
// tocar, teclado) ou 8 s depois do carregamento, o que vier antes.
//
// Os enfeites animados (a pilha de cartões da Home, a palavra que alterna no
// botão do menu, o fundo das migalhas) só começam a se mexer depois disso.
// Cada quadro de animação custa pintura; rodando durante o carregamento, eles
// travavam a página (o PageSpeed media centenas de ms de bloqueio no
// computador). Até lá, ficam parados, no primeiro quadro, com o mesmo visual.
// Quando sossega, o <html> ganha a classe "sossegou" (o CSS espera por ela).

const INTERACOES = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart']
const DEPOIS_DO_CARREGAMENTO_MS = 8000

let promessa = null

/** Promise que se resolve uma vez só, quando a página sossega */
export function quandoSossegar() {
  if (promessa) return promessa
  promessa = new Promise((pronto) => {
    let espera = 0
    const sossegar = () => {
      window.clearTimeout(espera)
      window.removeEventListener('load', esperarCarregar)
      INTERACOES.forEach((tipo) => window.removeEventListener(tipo, sossegar))
      pronto()
    }
    function esperarCarregar() {
      espera = window.setTimeout(sossegar, DEPOIS_DO_CARREGAMENTO_MS)
    }
    INTERACOES.forEach((tipo) => window.addEventListener(tipo, sossegar, { once: true, passive: true }))
    if (document.readyState === 'complete') esperarCarregar()
    else window.addEventListener('load', esperarCarregar, { once: true })
  })
  return promessa
}

/** Marca o <html> com "sossegou" quando a página sossegar (chamado uma vez, no main.jsx) */
export function marcarSossego() {
  quandoSossegar().then(() => document.documentElement.classList.add('sossegou'))
}
