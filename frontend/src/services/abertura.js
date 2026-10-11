// Abertura da primeira visita (a marca, a barra amarela e "// carregando"),
// no mesmo ritmo do portfólio do autor: fica no mínimo 1,1 s, para a barra
// terminar de encher, e no máximo 2,6 s, para nunca segurar o site. Ao sair,
// sobe como uma cortina. O HTML e o estilo dela moram no index.html.

const CHAVE = 'vitrine-abertura'
const MINIMO_MS = 1100
const MAXIMO_MS = 2600
const SAIDA_MS = 900

const paginaCarregada = () =>
  document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((pronto) => window.addEventListener('load', pronto, { once: true }))

const espera = (ms) => new Promise((pronto) => window.setTimeout(pronto, ms))

/**
 * Tira a abertura quando a página carregou e `esperarTambem` terminou (os
 * dados da Home, por exemplo), respeitando o mínimo e o máximo.
 * Na mesma sessão, a abertura já começa escondida (index.html) e só sai do DOM.
 */
export async function encerrarAbertura(esperarTambem = Promise.resolve()) {
  const abertura = document.getElementById('abertura')
  if (!abertura) return
  if (document.documentElement.classList.contains('sem-abertura')) {
    abertura.remove()
    return
  }

  // O relógio conta desde a abertura da página, e não desde que este código chegou
  await Promise.race([Promise.all([paginaCarregada(), esperarTambem.catch(() => {})]), espera(MAXIMO_MS - performance.now())])
  await espera(MINIMO_MS - performance.now())

  try {
    sessionStorage.setItem(CHAVE, '1')
  } catch {
    // sem armazenamento: a abertura aparece de novo na próxima visita
  }
  abertura.classList.add('abertura--saindo')
  window.setTimeout(() => abertura.remove(), SAIDA_MS)
}
