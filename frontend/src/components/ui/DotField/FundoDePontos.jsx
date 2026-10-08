import { lazy, Suspense } from 'react'

// Carregado à parte: o campo de pontos não pesa na primeira tela
const DotField = lazy(() => import('./DotField'))

/**
 * Fundo de pontos interativo para as faixas de destaque (topo da Home e
 * cabeçalhos coloridos). Cores no tom da faixa:
 * - `tom="anil"`: pontos dourados e brilho dourado, para fundo anil
 * - `tom="claro"`: pontos anil, para fundo céu ou ouro
 * O elemento pai precisa de position: relative; o conteúdo dele fica por cima
 * com a classe .fundo-de-pontos__conteudo (ou z-index próprio).
 */
const TONS = {
  anil: {
    gradientFrom: 'rgba(251, 191, 36, 0.55)',
    gradientTo: 'rgba(219, 228, 255, 0.35)',
    glowColor: 'rgba(251, 191, 36, 0.22)',
  },
  claro: {
    gradientFrom: 'rgba(23, 52, 110, 0.32)',
    gradientTo: 'rgba(23, 52, 110, 0.16)',
    glowColor: 'rgba(255, 255, 255, 0.4)',
  },
}

function FundoDePontos({ tom = 'anil', ...props }) {
  return (
    <Suspense fallback={null}>
      <DotField dotRadius={2} dotSpacing={16} bulgeStrength={60} glowRadius={180} cursorRadius={260} {...TONS[tom]} {...props} />
    </Suspense>
  )
}

export default FundoDePontos
