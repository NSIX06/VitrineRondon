import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filtros e página de uma listagem guardados na URL: dá para compartilhar o
 * link e o botão voltar do navegador volta ao filtro ou à página anterior.
 *
 * Devolve `filtros` (os valores pedidos, '' quando ausentes), `pagina`,
 * `atualizarFiltro(chave, valor)`, `irParaPagina(n)`, `limparFiltros()`,
 * `temFiltro` e `topoDaLista`, o ref do começo da lista para onde a troca de
 * página rola.
 *
 * @param {string[]} chaves  parâmetros de filtro da página, ex.: ['categoria', 'busca']
 */
export function useFiltrosNaUrl(chaves) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtros = Object.fromEntries(chaves.map((chave) => [chave, searchParams.get(chave) || '']))
  const pagina = Number(searchParams.get('pagina')) || 1

  // Atualiza um parâmetro da URL removendo-o quando vazio
  const atualizarFiltro = useCallback(
    (chave, valor) => {
      setSearchParams(
        (anterior) => {
          const proximo = new URLSearchParams(anterior)
          if (valor) proximo.set(chave, valor)
          else proximo.delete(chave)
          // Filtro novo, contagem nova: a página 3 do resultado antigo pode
          // nem existir no novo
          proximo.delete('pagina')
          return proximo
        },
        // Filtrar não é mudar de página: a rolagem fica onde está
        { replace: true, preventScrollReset: true }
      )
    },
    [setSearchParams]
  )

  // Trocar de página leva ao começo da lista, não ao topo da tela inteira
  const topoDaLista = useRef(null)
  const irParaPagina = (novaPagina) => {
    setSearchParams(
      (anterior) => {
        const proximo = new URLSearchParams(anterior)
        if (novaPagina > 1) proximo.set('pagina', String(novaPagina))
        else proximo.delete('pagina')
        return proximo
      },
      { preventScrollReset: true }
    )
    topoDaLista.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const limparFiltros = () => setSearchParams({}, { replace: true, preventScrollReset: true })
  const temFiltro = chaves.some((chave) => filtros[chave])

  return { filtros, pagina, atualizarFiltro, irParaPagina, limparFiltros, temFiltro, topoDaLista }
}
