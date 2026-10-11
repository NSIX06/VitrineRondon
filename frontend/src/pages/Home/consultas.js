// Consultas e código da página inicial que valem a pena começar cedo.
// Fica fora do Home.jsx para o main.jsx poder importar sem trazer a Home
// inteira para o pacote da primeira visita.
import api from '../../services/api'

// Cartões na pilha do topo: os do Destaque primeiro, completando com os demais
export const LIMITE_PILHA = 6

export const CONSULTAS_DA_HOME = {
  produtos: '/produtos',
  empreendedores: '/empreendedores',
  destaques: `/empreendedores/destaques?limite=${LIMITE_PILHA}`,
}

/** Código da pilha animada (e o gsap): baixado uma vez, em paralelo com os dados */
let pilha
export const carregarPilha = () => (pilha ??= import('../../components/home/PilhaDeNegocios'))

/**
 * Quem abre o site pela página inicial: dispara as consultas, a Home e a pilha
 * antes de o React desenhar a página. Antes era tudo em fila (código da Home,
 * depois os dados, depois o código da pilha) e a pilha demorava a aparecer.
 * As consultas usam o mesmo caminho do useConsulta: a Home pega a resposta
 * que já está chegando, em vez de pedir de novo.
 */
export function adiantarHome() {
  for (const caminho of Object.values(CONSULTAS_DA_HOME)) api.get(caminho).catch(() => {})
  import('./Home').catch(() => {})
  carregarPilha().catch(() => {})
}
