import { useCallback } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { useFiltrosNaUrl } from '../../hooks/useFiltrosNaUrl'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Button from '../../components/ui/Button/Button'
import ProdutoCard from '../../components/cards/ProdutoCard/ProdutoCard'
import SearchBar from '../../components/filters/SearchBar/SearchBar'
import CategoriaFilter from '../../components/filters/CategoriaFilter/CategoriaFilter'
import Voltar from '../../components/ui/Voltar/Voltar'
import Paginacao from '../../components/ui/Paginacao/Paginacao'
import '../listagem.css'

// Quantos itens por página: três fileiras da grade em tela larga
const POR_PAGINA = 9

const TIPOS = [
  { valor: '', rotulo: 'Produtos e serviços' },
  { valor: 'produto', rotulo: 'Só produtos' },
  { valor: 'servico', rotulo: 'Só serviços' },
]

function Vitrine() {
  // Os filtros vivem na URL: dá para compartilhar o link e usar o botão voltar
  const { filtros, pagina, atualizarFiltro, irParaPagina, limparFiltros, temFiltro, topoDaLista } =
    useFiltrosNaUrl(['categoria', 'busca', 'tipo'])
  const { categoria, busca, tipo } = filtros

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

  const aoBuscar = useCallback((termo) => atualizarFiltro('busca', termo), [atualizarFiltro])

  return (
    <>
      <header className="pagina-cabecalho faixa faixa--anil">
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Catálogo comunitário</span>
          <h1>Vitrine</h1>
          <p>Tudo o que os empreendedores da sua cidade estão oferecendo agora.</p>
        </div>
      </header>

      <section className="container secao listagem">
        <div className="listagem__filtros">
          <div className="listagem__busca">
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
              className="listagem__seletor"
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
            aoTentarDeNovo={recarregar}
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
            className={`listagem__resultados ${atualizando ? 'listagem__resultados--atualizando' : ''}`}
            aria-busy={atualizando}
          >
            <div className="listagem__resumo">
              <span className="listagem__contagem" aria-live="polite">
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
