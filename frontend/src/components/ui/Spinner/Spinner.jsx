import './Spinner.css'

/** Indicador de carregamento com texto acessível. */
function Spinner({ texto = 'Carregando...' }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__circulo" aria-hidden="true" />
      <span className="spinner__texto">{texto}</span>
    </div>
  )
}

export default Spinner
