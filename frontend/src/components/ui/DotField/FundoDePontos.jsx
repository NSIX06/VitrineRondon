import { lazy, Suspense, useEffect, useState } from 'react'

// Carregado à parte: o campo de pontos não pesa na primeira tela
const DotField = lazy(() => import('./DotField'))

/**
 * Verdadeiro quando a página terminou de carregar e o navegador ficou ocioso.
 * Só "ocioso" não bastava: esperando a rede, o navegador fica ocioso antes
 * mesmo da primeira pintura, e o fundo voltava para o caminho crítico.
 */
function useDepoisDaPrimeiraPintura() {
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    const ocioso = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 800))
    const cancelar = window.cancelIdleCallback ?? window.clearTimeout
    let pedido = 0
    const agendar = () => {
      pedido = ocioso(() => setPronto(true), { timeout: 2000 })
    }
    if (document.readyState === 'complete') agendar()
    else window.addEventListener('load', agendar, { once: true })
    return () => {
      window.removeEventListener('load', agendar)
      cancelar(pedido)
    }
  }, [])
  return pronto
}

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

// O fundo é só enfeite: ele entra quando o navegador fica ocioso, fora do
// caminho da primeira pintura (antes estava na cadeia crítica de arquivos)
function FundoDePontos({ tom = 'anil', ...props }) {
  const pronto = useDepoisDaPrimeiraPintura()
  if (!pronto) return null
  return (
    <Suspense fallback={null}>
      <DotField dotRadius={2} dotSpacing={16} bulgeStrength={60} glowRadius={180} cursorRadius={260} {...TONS[tom]} {...props} />
    </Suspense>
  )
}

export default FundoDePontos
