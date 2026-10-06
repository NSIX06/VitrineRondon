import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../../services/api'
import Button from '../../ui/Button/Button'
import Modal from '../../ui/Modal/Modal'
import Tag from '../../ui/Tag/Tag'
import Icone from '../../ui/Icone/Icone'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import DataTable from '../../tables/DataTable/DataTable'
import './PainelAuditoria.css'

const formatadorData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
const formatadorDia = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const formatadorHora = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' })

const FILTROS_VAZIOS = {
  busca: '',
  acao: '',
  tipoEntidade: '',
  status: '',
  usuarioId: '',
  de: '',
  ate: '',
}

/** Rótulos legíveis para as ações gravadas pelo servidor */
const ROTULOS_ACAO = {
  LOGIN: 'Entrada no sistema',
  LOGOUT: 'Saída do sistema',
  LOGIN_RECUSADO: 'Entrada recusada',
  CADASTRO: 'Cadastro de conta',
  ACEITE_TERMOS: 'Aceite de termos',
  CREATE: 'Criação',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
  UPDATE_PERFIL: 'Mudança de perfil',
  ATIVAR_USUARIO: 'Reativação de conta',
  DESATIVAR_USUARIO: 'Desativação de conta',
}

const rotuloDaAcao = (acao) => ROTULOS_ACAO[acao] ?? acao

/** Valor de um campo do "antes/depois" em texto legível */
function valorLegivel(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

/** Monta a query da API a partir dos filtros preenchidos */
function montarParametros(filtros, pagina, porPagina) {
  const parametros = { pagina, porPagina }
  for (const [chave, valor] of Object.entries(filtros)) {
    if (String(valor).trim() !== '') parametros[chave] = valor
  }
  return parametros
}

/**
 * Consulta da trilha de auditoria. Só o administrador chega aqui: a rota
 * /api/auditoria recusa qualquer outro perfil, então esta tela é apenas a
 * janela para o que o servidor já decidiu mostrar.
 */
function PainelAuditoria() {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(20)

  const [logs, setLogs] = useState([])
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1, pagina: 1 })
  const [opcoes, setOpcoes] = useState(null)

  const [carregando, setCarregando] = useState(true)
  // Depois da primeira carga, a tabela fica na tela enquanto os filtros atualizam
  const [jaCarregou, setJaCarregou] = useState(false)
  const [erro, setErro] = useState(null)

  const [detalhe, setDetalhe] = useState(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  // As opções dos filtros vêm dos valores que existem de fato na tabela
  useEffect(() => {
    api
      .get('/auditoria/opcoes')
      .then((resposta) => setOpcoes(resposta.data))
      .catch(() => setOpcoes(null))
  }, [])

  const buscar = useCallback(
    () =>
      api
        .get('/auditoria', montarParametros(filtros, pagina, porPagina))
        .then((resposta) => {
          setLogs(resposta.data)
          setPaginacao(resposta.paginacao)
          setErro(null)
          setJaCarregou(true)
        })
        .catch((erroApi) => setErro(erroApi.message))
        .finally(() => setCarregando(false)),
    [filtros, pagina, porPagina]
  )

  useEffect(() => {
    buscar()
  }, [buscar])

  const alterarFiltro = (evento) => {
    const { name, value } = evento.target
    setCarregando(true)
    setPagina(1)
    setFiltros((anterior) => ({ ...anterior, [name]: value }))
  }

  const limparFiltros = () => {
    setCarregando(true)
    setPagina(1)
    setFiltros(FILTROS_VAZIOS)
  }

  // Trocar de página leva ao começo da tabela, e não ao topo do painel
  const topoRef = useRef(null)
  const irPara = (novaPagina) => {
    setCarregando(true)
    setPagina(novaPagina)
    topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const abrirDetalhe = async (log) => {
    setCarregandoDetalhe(true)
    setDetalhe({ id: log.id })
    try {
      const resposta = await api.get(`/auditoria/${log.id}`)
      setDetalhe(resposta.data)
    } catch (erroApi) {
      setDetalhe(null)
      setErro(erroApi.message)
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  const temFiltro = Object.values(filtros).some((valor) => String(valor).trim() !== '')

  const colunas = [
    {
      chave: 'criadoEm',
      titulo: 'Quando',
      render: (log) => (
        <span className="auditoria__quando">
          {formatadorDia.format(new Date(log.criadoEm))}
          <span className="auditoria__hora">{formatadorHora.format(new Date(log.criadoEm))}</span>
        </span>
      ),
    },
    {
      chave: 'usuarioNome',
      titulo: 'Quem',
      render: (log) => log.usuarioNome ?? <span className="auditoria__anonimo">visitante</span>,
    },
    {
      chave: 'acao',
      titulo: 'Ação',
      render: (log) => (
        <span className="auditoria__acao">
          <strong>{rotuloDaAcao(log.acao)}</strong>
          <span className="auditoria__acao-codigo">{log.acao}</span>
        </span>
      ),
    },
    {
      // O registro afetado vai junto da descrição: em uma coluna própria a
      // tabela ficava larga demais e escondia a coluna de ações
      chave: 'descricao',
      titulo: 'O que aconteceu',
      render: (log) => (
        <span className="auditoria__descricao">
          {log.descricao ?? '—'}
          {log.tipoEntidade && (
            <span className="auditoria__registro">
              {log.tipoEntidade}
              {log.entidadeId ? ` #${log.entidadeId}` : ''}
            </span>
          )}
        </span>
      ),
    },
    {
      chave: 'status',
      titulo: 'Situação',
      render: (log) =>
        log.status === 'ERRO' ? <Tag variante="alerta">Erro</Tag> : <Tag variante="neutra">OK</Tag>,
    },
  ]

  const camposAlterados = detalhe
    ? [
        ...new Set([
          ...Object.keys(detalhe.valoresAntes ?? {}),
          ...Object.keys(detalhe.valoresDepois ?? {}),
        ]),
      ]
    : []

  return (
    <div className="auditoria" ref={topoRef}>
      <div className="auditoria__filtros">
        <div className="campo auditoria__campo auditoria__campo--busca">
          <label className="campo__rotulo" htmlFor="auditoria-busca">
            Buscar
          </label>
          <input
            id="auditoria-busca"
            name="busca"
            className="campo__entrada"
            value={filtros.busca}
            onChange={alterarFiltro}
            placeholder="Descrição, pessoa ou ação"
            maxLength={150}
          />
        </div>

        <div className="campo auditoria__campo">
          <label className="campo__rotulo" htmlFor="auditoria-acao">
            Ação
          </label>
          <select
            id="auditoria-acao"
            name="acao"
            className="campo__entrada"
            value={filtros.acao}
            onChange={alterarFiltro}
          >
            <option value="">Todas</option>
            {(opcoes?.acoes ?? []).map((item) => (
              <option key={item.valor} value={item.valor}>
                {rotuloDaAcao(item.valor)} ({item.total})
              </option>
            ))}
          </select>
        </div>

        <div className="campo auditoria__campo">
          <label className="campo__rotulo" htmlFor="auditoria-entidade">
            Registro
          </label>
          <select
            id="auditoria-entidade"
            name="tipoEntidade"
            className="campo__entrada"
            value={filtros.tipoEntidade}
            onChange={alterarFiltro}
          >
            <option value="">Todos</option>
            {(opcoes?.entidades ?? []).map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.valor} ({item.total})
              </option>
            ))}
          </select>
        </div>

        <div className="campo auditoria__campo">
          <label className="campo__rotulo" htmlFor="auditoria-usuario">
            Pessoa
          </label>
          <select
            id="auditoria-usuario"
            name="usuarioId"
            className="campo__entrada"
            value={filtros.usuarioId}
            onChange={alterarFiltro}
          >
            <option value="">Todas</option>
            {(opcoes?.usuarios ?? []).map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="campo auditoria__campo">
          <label className="campo__rotulo" htmlFor="auditoria-status">
            Situação
          </label>
          <select
            id="auditoria-status"
            name="status"
            className="campo__entrada"
            value={filtros.status}
            onChange={alterarFiltro}
          >
            <option value="">Todas</option>
            <option value="SUCESSO">Concluídas</option>
            <option value="ERRO">Com erro</option>
          </select>
        </div>

        <div className="campo auditoria__campo">
          <label className="campo__rotulo" htmlFor="auditoria-de">
            De
          </label>
          <input
            id="auditoria-de"
            name="de"
            type="date"
            className="campo__entrada"
            value={filtros.de}
            onChange={alterarFiltro}
          />
        </div>

        <div className="campo auditoria__campo">
          <label className="campo__rotulo" htmlFor="auditoria-ate">
            Até
          </label>
          <input
            id="auditoria-ate"
            name="ate"
            type="date"
            className="campo__entrada"
            value={filtros.ate}
            onChange={alterarFiltro}
          />
        </div>
      </div>

      <div className="auditoria__barra">
        <span className="auditoria__total">
          {paginacao.total} {paginacao.total === 1 ? 'registro' : 'registros'}
          {temFiltro ? ' com os filtros aplicados' : ' na trilha de auditoria'}
          {opcoes?.resumo?.erros > 0 && !temFiltro && `, ${opcoes.resumo.erros} com erro`}
        </span>
        <div className="auditoria__barra-acoes">
          <label className="auditoria__por-pagina" htmlFor="auditoria-por-pagina">
            Por página
            <select
              id="auditoria-por-pagina"
              className="campo__entrada"
              value={porPagina}
              onChange={(evento) => {
                setCarregando(true)
                setPagina(1)
                setPorPagina(Number(evento.target.value))
              }}
            >
              {[20, 50, 100].map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </label>
          {temFiltro && (
            <Button variante="secundario" tamanho="sm" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {erro && (
        <StatusMessage
          tipo="erro"
          titulo="Não foi possível consultar a auditoria"
          acao={
            <Button
              variante="secundario"
              tamanho="sm"
              onClick={() => {
                setCarregando(true)
                buscar()
              }}
            >
              Tentar novamente
            </Button>
          }
        >
          <p>{erro}</p>
        </StatusMessage>
      )}

      {carregando && !jaCarregou && <Spinner texto="Consultando a auditoria..." />}

      {jaCarregou && !erro && (
        <div className={`painel-tabela ${carregando ? 'painel-tabela--atualizando' : ''}`} aria-busy={carregando}>
        <>
          <DataTable
            colunas={colunas}
            dados={logs}
            mensagemVazia={
              temFiltro
                ? 'Nenhum registro encontrado com esses filtros.'
                : 'Nenhuma atividade registrada até agora.'
            }
            acoes={[{ rotulo: 'Detalhes', onClick: abrirDetalhe }]}
          />

          {paginacao.totalPaginas > 1 && (
            <nav className="auditoria__paginacao" aria-label="Paginação da auditoria">
              <Button
                variante="secundario"
                tamanho="sm"
                disabled={pagina <= 1}
                onClick={() => irPara(pagina - 1)}
              >
                <Icone nome="chevron_left" tamanho={18} />
                Anterior
              </Button>
              <span className="auditoria__paginacao-texto">
                Página {paginacao.pagina} de {paginacao.totalPaginas}
              </span>
              <Button
                variante="secundario"
                tamanho="sm"
                disabled={pagina >= paginacao.totalPaginas}
                onClick={() => irPara(pagina + 1)}
              >
                Próxima
                <Icone nome="chevron_right" tamanho={18} />
              </Button>
            </nav>
          )}
        </>
        </div>
      )}

      <Modal
        aberto={Boolean(detalhe)}
        titulo={`Registro de auditoria #${detalhe?.id ?? ''}`}
        onFechar={() => setDetalhe(null)}
        tamanho="lg"
      >
        {carregandoDetalhe && <Spinner texto="Carregando o registro..." />}

        {!carregandoDetalhe && detalhe?.acao && (
          <div className="auditoria-detalhe">
            <dl className="auditoria-detalhe__lista">
              <div>
                <dt>Quando</dt>
                <dd>{formatadorData.format(new Date(detalhe.criadoEm))}</dd>
              </div>
              <div>
                <dt>Ação</dt>
                <dd>
                  {rotuloDaAcao(detalhe.acao)} <code>{detalhe.acao}</code>
                </dd>
              </div>
              <div>
                <dt>Quem</dt>
                <dd>
                  {detalhe.usuario
                    ? `${detalhe.usuario.nome} (${detalhe.usuario.email}) · ${detalhe.usuario.perfil}`
                    : detalhe.usuarioNome ?? 'Visitante não identificado'}
                </dd>
              </div>
              <div>
                <dt>Registro afetado</dt>
                <dd>
                  {detalhe.tipoEntidade
                    ? `${detalhe.tipoEntidade}${detalhe.entidadeId ? ` #${detalhe.entidadeId}` : ''}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Situação</dt>
                <dd>
                  {detalhe.status === 'ERRO' ? (
                    <Tag variante="alerta">Erro</Tag>
                  ) : (
                    <Tag variante="neutra">Concluída</Tag>
                  )}
                  {detalhe.erroMensagem && ` — ${detalhe.erroMensagem}`}
                </dd>
              </div>
              <div>
                <dt>Origem</dt>
                <dd>
                  IP {detalhe.ip ?? '—'}
                  {detalhe.userAgent && (
                    <span className="auditoria-detalhe__agente">{detalhe.userAgent}</span>
                  )}
                </dd>
              </div>
            </dl>

            {detalhe.descricao && <p className="auditoria-detalhe__descricao">{detalhe.descricao}</p>}

            {camposAlterados.length > 0 ? (
              <div className="auditoria-detalhe__mudancas">
                <h3>O que mudou</h3>
                <div className="data-table__wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Campo</th>
                        <th scope="col">Antes</th>
                        <th scope="col">Depois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {camposAlterados.map((campo) => (
                        <tr key={campo}>
                          <th scope="row">{campo}</th>
                          <td className="auditoria-detalhe__antes">
                            {valorLegivel(detalhe.valoresAntes?.[campo])}
                          </td>
                          <td className="auditoria-detalhe__depois">
                            {valorLegivel(detalhe.valoresDepois?.[campo])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="auditoria-detalhe__sem-mudanca">
                Esta ação não alterou campos de um registro.
              </p>
            )}

            <p className="auditoria-detalhe__aviso">
              <Icone nome="lock" tamanho={16} />
              Senhas, hashes e tokens nunca são gravados na auditoria.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PainelAuditoria
