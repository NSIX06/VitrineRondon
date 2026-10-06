import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useConsulta } from '../../hooks/useConsulta'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Button from '../../components/ui/Button/Button'
import ProdutoCard from '../../components/cards/ProdutoCard/ProdutoCard'
import SearchBar from '../../components/filters/SearchBar/SearchBar'
import CategoriaFilter from '../../components/filters/CategoriaFilter/CategoriaFilter'
import './Vitrine.css'
import Voltar from '../../components/ui/Voltar/Voltar'
import Paginacao from '../../components/ui/Paginacao/Paginacao'

// Quantos itens por página: três fileiras da grade em tela larga
const POR_PAGINA = 9

const TIPOS = [
  { valor: '', rotulo: 'Produtos e serviços' },
  { valor: 'produto', rotulo: 'Só produtos' },
  { valor: 'servico', rotulo: 'Só serviços' },
]

function Vitrine() {
  // Os filtros vivem na URL: dá para compartilhar o link e usar o botão voltar
  const [searchParams, setSearchParams] = useSearchParams()
  const categoria = searchParams.get('categoria') || ''
  const busca = searchParams.get('busca') || ''
  const tipo = searchParams.get('tipo') || ''
  const pagina = Number(searchParams.get('pagina')) || 1

  // Sem apagar a tela: ao trocar filtro, a lista anterior fica até a nova chegar
  const { dados, carregando, atualizando, erro, recarregar } = useConsulta('/produtos', {
    categoria,
    busca,
    tipo,
    pagina,
    porPagina: POR_PAGINA,
  })
  const produtos = dados?.data ?? []
  const paginacao = dados?.paginacao

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

  const aoBuscar = useCallback((termo) => atualizarFiltro('busca', termo), [atualizarFiltro])

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
  const temFiltro = Boolean(categoria || busca || tipo)

  return (
    <>
      <header className="pagina-cabecalho">
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Catálogo comunitário</span>
          <h1>Vitrine</h1>
          <p>Tudo o que os empreendedores da sua cidade estão oferecendo agora.</p>
        </div>
      </header>

      <section className="container secao vitrine">
        <div className="vitrine__filtros">
          <div className="vitrine__busca">
            <SearchBar
              valor={busca}
              onBuscar={aoBuscar}
              placeholder="Buscar por nome ou descrição"
            />
            <label className="visualmente-oculto" htmlFor="filtro-tipo">
              Tipo
            </label>
            <select
              id="filtro-tipo"
              className="vitrine__tipo"
              value={tipo}
              onChange={(evento) => atualizarFiltro('tipo', evento.target.value)}
            >
              {TIPOS.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </div>
          <CategoriaFilter
            selecionada={categoria}
            onSelecionar={(valor) => atualizarFiltro('categoria', valor)}
          />
        </div>

        {carregando && <Spinner texto="Carregando a vitrine..." />}

        {erro && (
          <StatusMessage
            tipo="erro"
            titulo="Não foi possível carregar a vitrine"
            acao={
              <Button variante="secundario" tamanho="sm" onClick={recarregar}>
                Tentar novamente
              </Button>
            }
          >
            <p>{erro.message}</p>
          </StatusMessage>
        )}

        {!carregando && !erro && !atualizando && produtos.length === 0 && (
          <StatusMessage tipo="vazio" titulo="Nenhum item encontrado">
            <p>
              {temFiltro
                ? 'Nada bate com esses filtros. Tente outra palavra ou outra categoria.'
                : 'Ainda não há produtos ou serviços cadastrados.'}
            </p>
            {temFiltro && (
              <Button variante="secundario" tamanho="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            )}
          </StatusMessage>
        )}

        {!carregando && produtos.length > 0 && (
          <div
            ref={topoDaLista}
            className={`vitrine__resultados ${atualizando ? 'vitrine__resultados--atualizando' : ''}`}
            aria-busy={atualizando}
          >
            <div className="vitrine__resumo">
              <span className="vitrine__contagem" aria-live="polite">
                {atualizando ? (
                  'Atualizando...'
                ) : (
                  <>
                    {paginacao?.total ?? produtos.length}{' '}
                    {(paginacao?.total ?? produtos.length) === 1 ? 'item' : 'itens'}
                    {categoria && ` em ${categoria}`}
                    {busca && ` para “${busca}”`}
                  </>
                )}
              </span>
              {temFiltro && (
                <Button variante="texto" tamanho="sm" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              )}
            </div>
            <ul className="grade-cards">
              {produtos.map((produto) => (
                <li key={produto.id}>
                  <ProdutoCard produto={produto} />
                </li>
              ))}
            </ul>

            <Paginacao
              pagina={paginacao?.pagina ?? 1}
              totalPaginas={paginacao?.totalPaginas}
              total={paginacao?.total}
              rotuloItens="itens"
              aoMudar={irParaPagina}
            />
          </div>
        )}
      </section>
    </>
  )
}

export default Vitrine
