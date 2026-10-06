import './Tag.css'

/**
 * Etiqueta pequena em caixa alta, com cantos retos.
 * - `variante`: "categoria" | "produto" | "servico" | "neutra" | "alerta" | "ouro"
 */
function Tag({ children, variante = 'neutra' }) {
  return <span className={`tag tag--${variante}`}>{children}</span>
}

export default Tag
