import { useEffect, useState } from 'react'
import './SearchBar.css'

/**
 * Campo de busca com debounce.
 * - `valor`: termo atual (controlado pelo pai)
 * - `onBuscar(termo)`: chamado após o usuário parar de digitar ou ao enviar
 * - `atraso`: tempo do debounce em ms
 */
function SearchBar({ valor = '', onBuscar, placeholder = 'Buscar...', atraso = 400 }) {
  const [texto, setTexto] = useState(valor)

  // Debounce: só notifica o pai quando o texto para de mudar
  useEffect(() => {
    if (texto === valor) return undefined
    const timer = setTimeout(() => onBuscar(texto.trim()), atraso)
    return () => clearTimeout(timer)
  }, [texto, valor, atraso, onBuscar])

  const aoEnviar = (evento) => {
    evento.preventDefault()
    onBuscar(texto.trim())
  }

  const limpar = () => {
    setTexto('')
    onBuscar('')
  }

  return (
    <form className="search-bar" role="search" onSubmit={aoEnviar}>
      <svg className="search-bar__icone" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <label className="visualmente-oculto" htmlFor="campo-busca">
        Buscar
      </label>
      <input
        id="campo-busca"
        type="search"
        className="search-bar__entrada"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {texto && (
        <button type="button" className="search-bar__limpar" onClick={limpar} aria-label="Limpar busca">
          &times;
        </button>
      )}
    </form>
  )
}

export default SearchBar
