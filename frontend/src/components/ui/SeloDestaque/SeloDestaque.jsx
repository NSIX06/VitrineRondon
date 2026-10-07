import './SeloDestaque.css'

/**
 * Selo "Negócio em Destaque" (plano Destaque ativo). Discreto de propósito:
 * marca o negócio sem gritar mais que o conteúdo.
 * - `compacto`: só a estrela e "Destaque" (cards e listas)
 * - `claro`: para fundo escuro (capa de foto)
 */
function SeloDestaque({ compacto = false, claro = false, className = '' }) {
  const classes = ['selo-destaque', compacto && 'selo-destaque--compacto', claro && 'selo-destaque--claro', className]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={classes} title="Negócio com o plano Destaque do VitrineRondon">
      <svg className="selo-destaque__estrela" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.6l2.7 6 6.5.6-4.9 4.4 1.4 6.4L12 16.8 6.3 20l1.4-6.4-4.9-4.4 6.5-.6z" />
      </svg>
      {compacto ? 'Destaque' : 'Negócio em Destaque'}
    </span>
  )
}

export default SeloDestaque
