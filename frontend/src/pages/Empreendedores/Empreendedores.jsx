import { useCallback } from 'react'
import FundoDePontos from '../../components/ui/DotField/FundoDePontos'
import { useConsulta } from '../../hooks/useConsulta'
import { useFiltrosNaUrl } from '../../hooks/useFiltrosNaUrl'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Button from '../../components/ui/Button/Button'
import EmpreendedorCard from '../../components/cards/EmpreendedorCard/EmpreendedorCard'
import SearchBar from '../../components/filters/SearchBar/SearchBar'
import CategoriaFilter from '../../components/filters/CategoriaFilter/CategoriaFilter'
import Icone from '../../components/ui/Icone/Icone'
import '../listagem.css'
import './Empreendedores.css'
import Voltar from '../../components/ui/Voltar/Voltar'
import Paginacao from '../../components/ui/Paginacao/Paginacao'

// Cartões de negócio são mais altos que os da vitrine: duas fileiras por página
const POR_PAGINA = 6

function Empreendedores() {
  // Os filtros vivem na URL: dá para compartilhar o link e usar o botão voltar
  const { filtros, pagina, atualizarFiltro, irParaPagina, limparFiltros, temFiltro, topoDaLista } =
    useFiltrosNaUrl(['categoria', 'busca', 'bairro'])
  const { categoria, busca, bairro } = filtros

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

  const aoBuscar = useCallback((termo) => atualizarFiltro('busca', termo), [atualizarFiltro])

  return (
    <>
      <header className="pagina-cabecalho faixa faixa--ouro com-pontos">
        <FundoDePontos tom="claro" />
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Comércio de proximidade</span>
          <h1>Empreendedores</h1>
          <p>Quem produz, cozinha, conserta e cuida na sua região.</p>
        </div>
      </header>

      <section className="container secao listagem">
        <div className="listagem__filtros">
          <div className="listagem__busca">
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
              className="listagem__seletor"
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
            aoTentarDeNovo={recarregar}
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
            className={`listagem__resultados ${atualizando ? 'listagem__resultados--atualizando' : ''}`}
            aria-busy={atualizando}
          >
            <div className="listagem__resumo">
              <span className="listagem__contagem" aria-live="polite">
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
                Crie sua conta, cadastre o negócio e escolha um plano (mensal ou anual) para publicá-lo: Essencial
                ou Destaque. Sem comissão sobre as vendas.
              </p>
            </div>
          </div>
          <Button to="/cadastro" variante="destaque">
            Divulgar meu negócio
          </Button>
        </div>
      </section>
    </>
  )
}

export default Empreendedores
