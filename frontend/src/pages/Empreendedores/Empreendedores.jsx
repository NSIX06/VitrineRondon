import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useConsulta } from '../../hooks/useConsulta'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Button from '../../components/ui/Button/Button'
import EmpreendedorCard from '../../components/cards/EmpreendedorCard/EmpreendedorCard'
import SearchBar from '../../components/filters/SearchBar/SearchBar'
import CategoriaFilter from '../../components/filters/CategoriaFilter/CategoriaFilter'
import Icone from '../../components/ui/Icone/Icone'
import './Empreendedores.css'
import Voltar from '../../components/ui/Voltar/Voltar'
import Paginacao from '../../components/ui/Paginacao/Paginacao'

// Cartões de negócio são mais altos que os da vitrine: duas fileiras por página
const POR_PAGINA = 6

function Empreendedores() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoria = searchParams.get('categoria') || ''
  const busca = searchParams.get('busca') || ''
  const bairro = searchParams.get('bairro') || ''
  const pagina = Number(searchParams.get('pagina')) || 1

  // Lista filtrada: a anterior fica na tela enquanto a nova carrega
  const { dados, carregando, atualizando, erro, recarregar } = useConsulta('/empreendedores', {
    categoria,
    busca,
    bairro,
    pagina,
    porPagina: POR_PAGINA,
  })
  const empreendedores = dados?.data ?? []
  const paginacao = dados?.paginacao

  // Bairros para o filtro: vêm da lista completa, que também fica no cache
  const { dados: todos } = useConsulta('/empreendedores')
  const bairros = [...new Set((todos?.data ?? []).map((e) => e.bairro).filter(Boolean))].sort()

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
  const temFiltro = Boolean(categoria || busca || bairro)

  return (
    <>
      <header className="pagina-cabecalho">
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Comércio de proximidade</span>
          <h1>Empreendedores</h1>
          <p>Quem produz, cozinha, conserta e cuida na sua região.</p>
        </div>
      </header>

      <section className="container secao empreendedores">
        <div className="empreendedores__filtros">
          <div className="empreendedores__busca">
            <SearchBar
              valor={busca}
              onBuscar={aoBuscar}
              placeholder="Buscar por negócio, responsável ou descrição"
            />
            <label className="visualmente-oculto" htmlFor="filtro-bairro">
              Bairro
            </label>
            <select
              id="filtro-bairro"
              className="empreendedores__bairro"
              value={bairro}
              onChange={(evento) => atualizarFiltro('bairro', evento.target.value)}
            >
              <option value="">Todos os bairros</option>
              {bairros.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
          <CategoriaFilter
            selecionada={categoria}
            onSelecionar={(valor) => atualizarFiltro('categoria', valor)}
          />
        </div>

        {carregando && <Spinner texto="Buscando empreendedores..." />}

        {erro && (
          <StatusMessage
            tipo="erro"
            titulo="Não foi possível carregar a lista"
            acao={
              <Button variante="secundario" tamanho="sm" onClick={recarregar}>
                Tentar novamente
              </Button>
            }
          >
            <p>{erro.message}</p>
          </StatusMessage>
        )}

        {!carregando && !erro && !atualizando && empreendedores.length === 0 && (
          <StatusMessage tipo="vazio" titulo="Nenhum empreendedor encontrado">
            <p>
              {temFiltro
                ? 'Nenhum negócio bate com esses filtros.'
                : 'Ainda não há empreendedores cadastrados.'}
            </p>
            {temFiltro && (
              <Button variante="secundario" tamanho="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            )}
          </StatusMessage>
        )}

        {!carregando && empreendedores.length > 0 && (
          <div
            ref={topoDaLista}
            className={`empreendedores__resultados ${atualizando ? 'empreendedores__resultados--atualizando' : ''}`}
            aria-busy={atualizando}
          >
            <div className="empreendedores__resumo">
              <span className="empreendedores__contagem" aria-live="polite">
                {atualizando ? (
                  'Atualizando...'
                ) : (
                  <>
                    {paginacao?.total ?? empreendedores.length}{' '}
                    {(paginacao?.total ?? empreendedores.length) === 1 ? 'negócio' : 'negócios'}
                    {categoria && ` em ${categoria}`}
                    {bairro && ` no bairro ${bairro}`}
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
              {empreendedores.map((empreendedor) => (
                <li key={empreendedor.id}>
                  <EmpreendedorCard empreendedor={empreendedor} />
                </li>
              ))}
            </ul>

            <Paginacao
              pagina={paginacao?.pagina ?? 1}
              totalPaginas={paginacao?.totalPaginas}
              total={paginacao?.total}
              rotuloItens="negócios"
              aoMudar={irParaPagina}
            />
          </div>
        )}

        <div className="empreendedores__chamada">
          <div className="empreendedores__chamada-texto">
            <span className="empreendedores__chamada-icone" aria-hidden="true">
              <Icone nome="local_convenience_store" tamanho={28} />
            </span>
            <div>
              <h3>Você também produz ou atende no bairro?</h3>
              <p>
                A VitrineLocal é gratuita e feita para quem mantém a economia local viva. Cadastre
                seus produtos e serviços sem taxas.
              </p>
            </div>
          </div>
          <Button to="/cadastro" variante="destaque">
            Cadastrar meu negócio
          </Button>
        </div>
      </section>
    </>
  )
}

export default Empreendedores
