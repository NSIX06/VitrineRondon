import './Icone.css'

/**
 * Ícone da fonte Material Symbols Outlined (carregada no index.html).
 * - `nome`: nome do símbolo, ex.: "storefront", "lock", "handshake"
 * - `tamanho`: em px
 */
function Icone({ nome, tamanho = 20, className = '' }) {
  return (
    <span
      className={`icone material-symbols-outlined ${className}`.trim()}
      style={{ fontSize: tamanho }}
      aria-hidden="true"
    >
      {nome}
    </span>
  )
}

export default Icone
