import { Link } from 'react-router-dom'
import './Button.css'

/**
 * Botão reutilizável.
 * - `variante`: "primario" | "destaque" | "secundario" | "claro" | "perigo" | "whatsapp" | "texto"
 * - `tamanho`: "sm" | "md"
 * - Se receber `to`, renderiza um Link do router; se receber `href`, um <a>; senão, <button>.
 */
function Button({
  children,
  variante = 'primario',
  tamanho = 'md',
  to,
  href,
  type = 'button',
  disabled = false,
  className = '',
  ...props
}) {
  const classes = `botao botao--${variante} botao--${tamanho} ${className}`.trim()

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  )
}

export default Button
