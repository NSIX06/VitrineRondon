import { CATEGORIAS } from '../../../services/constantes'
import './CategoriaFilter.css'

/**
 * Filtro de categoria em forma de plaquinhas.
 * - `selecionada`: categoria ativa ('' = todas)
 * - `onSelecionar(categoria)`: chamado ao clicar
 * - `categorias`: lista opcional; usa CATEGORIAS por padrão
 */
function CategoriaFilter({ selecionada = '', onSelecionar, categorias = CATEGORIAS }) {
  const opcoes = ['', ...categorias]

  return (
    <div className="categoria-filter" role="group" aria-label="Filtrar por categoria">
      {opcoes.map((categoria) => {
        const ativa = categoria === selecionada
        return (
          <button
            key={categoria || 'todas'}
            type="button"
            className={`categoria-filter__opcao ${ativa ? 'categoria-filter__opcao--ativa' : ''}`}
            aria-pressed={ativa}
            onClick={() => onSelecionar(categoria)}
          >
            {categoria || 'Todas'}
          </button>
        )
      })}
    </div>
  )
}

export default CategoriaFilter
