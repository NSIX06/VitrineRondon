// Abertura do site (a marca, a barra amarela e "// carregando"), a cada
// carregamento da página do zero: primeiro acesso ou recarregar. Segue
// o ritmo do portfólio do autor, mais curto: fica no mínimo 0,7 s, para a
// barra terminar de encher, e no máximo 1,5 s, para nunca segurar o site. Ao
// sair, sobe como uma cortina. O HTML e o estilo dela moram no index.html.
// (Com 1,1 s a 2,6 s e mais 0,9 s de saída, o conteúdo só aparecia inteiro
// por volta de 3,5 s no celular lento, o que pesava no Speed Index.)

const MINIMO_MS = 700
const MAXIMO_MS = 1500
const SAIDA_MS = 600

const paginaCarregada = () =>
  document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((pronto) => window.addEventListener('load', pronto, { once: true }))

const espera = (ms) => new Promise((pronto) => window.setTimeout(pronto, ms))

/**
 * Tira a abertura quando a página carregou e `esperarTambem` terminou (os
 * dados da Home, por exemplo), respeitando o mínimo e o máximo.
 */
export async function encerrarAbertura(esperarTambem = Promise.resolve()) {
  const abertura = document.getElementById('abertura')
  if (!abertura) return

  // O relógio conta desde a abertura da página, e não desde que este código chegou
  await Promise.race([Promise.all([paginaCarregada(), esperarTambem.catch(() => {})]), espera(MAXIMO_MS - performance.now())])
  await espera(MINIMO_MS - performance.now())

  abertura.classList.add('abertura--saindo')
  window.setTimeout(() => abertura.remove(), SAIDA_MS)
}
