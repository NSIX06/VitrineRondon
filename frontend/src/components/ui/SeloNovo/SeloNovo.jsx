import './SeloNovo.css'

/**
 * Selo "Novo na vitrine": negócio que chegou há pouco (ver services/novidades).
 * Verde, para não ser confundido com o dourado do plano Destaque.
 * - `compacto`: só "Novo" (cards e listas)
 * - `claro`: para foto ou fundo escuro
 */
function SeloNovo({ compacto = false, claro = false, className = '' }) {
  const classes = ['selo-novo', compacto && 'selo-novo--compacto', claro && 'selo-novo--claro', className]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={classes} title="Negócio que chegou há pouco ao VitrineRondon">
      <svg className="selo-novo__brilho" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5c.8 4.6 4.9 8.7 9.5 9.5-4.6.8-8.7 4.9-9.5 9.5-.8-4.6-4.9-8.7-9.5-9.5 4.6-.8 8.7-4.9 9.5-9.5Z" />
      </svg>
      {compacto ? 'Novo' : 'Novo na vitrine'}
    </span>
  )
}

export default SeloNovo
