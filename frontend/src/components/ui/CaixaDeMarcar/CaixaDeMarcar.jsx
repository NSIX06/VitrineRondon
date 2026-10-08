import './CaixaDeMarcar.css'

/**
 * Caixa de marcar animada, no visual do sistema: ao marcar, a caixa fica
 * amarela e o visto é "desenhado" (traço SVG com stroke-dashoffset), e ela
 * afunda um pouco ao ser pressionada, como as teclas. Inspirada no Checkbox do
 * animate-ui, feita só com CSS (sem Tailwind, Headless UI nem motion).
 *
 * Por baixo continua um <input type="checkbox"> de verdade: teclado, leitor de
 * tela, <label htmlFor> e formulários funcionam como antes. Todas as props vão
 * para o input (id, name, checked, onChange, disabled, aria-*...).
 * - `tamanho`: 'md' (padrão, 22px) | 'sm' (18px)
 */
function CaixaDeMarcar({ tamanho = 'md', className = '', ...props }) {
  return (
    <span className={`caixa-marcar caixa-marcar--${tamanho} ${className}`.trim()}>
      <input type="checkbox" className="caixa-marcar__entrada" {...props} />
      <svg className="caixa-marcar__visto" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
      </svg>
    </span>
  )
}

export default CaixaDeMarcar
