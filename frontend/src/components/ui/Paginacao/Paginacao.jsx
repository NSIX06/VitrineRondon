import Button from '../Button/Button'
import Icone from '../Icone/Icone'
import './Paginacao.css'

/**
 * Navegação entre páginas de uma listagem.
 * Não aparece quando tudo cabe em uma página só.
 * - `aoMudar(novaPagina)`: quem chama decide o que fazer com o número
 */
function Paginacao({ pagina, totalPaginas, total, rotuloItens = 'itens', aoMudar }) {
  if (!totalPaginas || totalPaginas <= 1) return null

  return (
    <nav className="paginacao" aria-label={`Páginas de ${rotuloItens}`}>
      <Button variante="secundario" tamanho="sm" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
        <Icone nome="chevron_left" tamanho={18} />
        Anterior
      </Button>

      <span className="paginacao__texto" aria-live="polite">
        <span>
          Página <strong>{pagina}</strong> de {totalPaginas}
        </span>
        {total > 0 && (
          <span className="paginacao__total">
            {total} {rotuloItens} no total
          </span>
        )}
      </span>

      <Button
        variante="secundario"
        tamanho="sm"
        disabled={pagina >= totalPaginas}
        onClick={() => aoMudar(pagina + 1)}
      >
        Próxima
        <Icone nome="chevron_right" tamanho={18} />
      </Button>
    </nav>
  )
}

export default Paginacao
