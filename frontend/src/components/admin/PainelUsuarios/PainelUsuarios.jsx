import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'
import { useAuth, PERFIS } from '../../../contexts/auth'
import Button from '../../ui/Button/Button'
import Tag from '../../ui/Tag/Tag'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import ConfirmModal from '../../ui/ConfirmModal/ConfirmModal'
import DataTable from '../../tables/DataTable/DataTable'
import '../painel-filtros.css'
import './PainelUsuarios.css'

const formatadorData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

const FILTROS_VAZIOS = { busca: '', perfil: '', ativo: '' }

const VARIANTE_DO_PERFIL = {
  [PERFIS.ADMIN]: 'alerta',
  [PERFIS.EMPREENDEDOR]: 'ouro',
  [PERFIS.COMUM]: 'neutra',
}

/**
 * Contas cadastradas na vitrine. A moderação aqui é apenas ligar e desligar
 * o acesso: toda alteração passa pelo servidor e entra na auditoria.
 */
function PainelUsuarios({ aoAlterar }) {
  const { usuario: usuarioLogado } = useAuth()

  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  // Depois da primeira carga, a tabela fica na tela enquanto os filtros atualizam
  const [jaCarregou, setJaCarregou] = useState(false)
  const [erro, setErro] = useState(null)
  const [status, setStatus] = useState(null)

  // Conta cuja situação está para ser trocada
  const [confirmacao, setConfirmacao] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const buscar = useCallback(() => {
    const parametros = {}
    for (const [chave, valor] of Object.entries(filtros)) {
      if (String(valor).trim() !== '') parametros[chave] = valor
    }
    return api
      .get('/usuarios', parametros)
      .then((resposta) => {
        setUsuarios(resposta.data)
        setErro(null)
        setJaCarregou(true)
      })
      .catch((erroApi) => setErro(erroApi.message))
      .finally(() => setCarregando(false))
  }, [filtros])

  useEffect(() => {
    buscar()
  }, [buscar])

  const alterarFiltro = (evento) => {
    const { name, value } = evento.target
    setCarregando(true)
    setFiltros((anterior) => ({ ...anterior, [name]: value }))
  }

  const confirmarTroca = async () => {
    setSalvando(true)
    try {
      const resposta = await api.patch(`/usuarios/${confirmacao.id}/situacao`, {
        ativo: !confirmacao.ativo,
      })
      setUsuarios((anterior) =>
        anterior.map((item) => (item.id === confirmacao.id ? resposta.data : item))
      )
      setConfirmacao(null)
      setStatus({ tipo: 'sucesso', mensagem: resposta.message })
      // O painel recalcula os indicadores com o número atualizado
      if (aoAlterar) aoAlterar()
    } catch (erroApi) {
      setConfirmacao(null)
      setStatus({ tipo: 'erro', mensagem: erroApi.message })
    } finally {
      setSalvando(false)
    }
  }

  const temFiltro = Object.values(filtros).some((valor) => String(valor).trim() !== '')

  const colunas = [
    {
      chave: 'nome',
      titulo: 'Pessoa',
      render: (u) => (
        <span className="usuarios__celula">
          <strong>{u.nome}</strong>
          <span className="usuarios__email">{u.email}</span>
          {u.telefone && <span className="usuarios__email">{u.telefone}</span>}
        </span>
      ),
    },
    {
      chave: 'perfil',
      titulo: 'Perfil',
      render: (u) => <Tag variante={VARIANTE_DO_PERFIL[u.perfil] ?? 'neutra'}>{u.perfil}</Tag>,
    },
    {
      chave: 'empreendedor',
      titulo: 'Negócio',
      render: (u) =>
        u.empreendedor ? (
          <Link to={`/empreendedores/${u.empreendedor.id}`} className="usuarios__negocio">
            {u.empreendedor.nomeNegocio}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      chave: 'createdAt',
      titulo: 'Desde',
      render: (u) => formatadorData.format(new Date(u.createdAt)),
    },
    {
      chave: 'ativo',
      titulo: 'Situação',
      render: (u) =>
        u.ativo ? <Tag variante="neutra">Ativa</Tag> : <Tag variante="alerta">Desativada</Tag>,
    },
  ]

  return (
    <div className="usuarios">
      <div className="painel-filtros">
        <div className="campo painel-filtros__campo painel-filtros__campo--busca">
          <label className="campo__rotulo" htmlFor="usuarios-busca">
            Buscar
          </label>
          <input
            id="usuarios-busca"
            name="busca"
            className="campo__entrada"
            value={filtros.busca}
            onChange={alterarFiltro}
            placeholder="Nome ou e-mail"
            maxLength={150}
          />
        </div>

        <div className="campo painel-filtros__campo">
          <label className="campo__rotulo" htmlFor="usuarios-perfil">
            Perfil
          </label>
          <select
            id="usuarios-perfil"
            name="perfil"
            className="campo__entrada"
            value={filtros.perfil}
            onChange={alterarFiltro}
          >
            <option value="">Todos</option>
            <option value={PERFIS.COMUM}>Comum</option>
            <option value={PERFIS.EMPREENDEDOR}>Empreendedor</option>
            <option value={PERFIS.ADMIN}>Administrador</option>
          </select>
        </div>

        <div className="campo painel-filtros__campo">
          <label className="campo__rotulo" htmlFor="usuarios-situacao">
            Situação
          </label>
          <select
            id="usuarios-situacao"
            name="ativo"
            className="campo__entrada"
            value={filtros.ativo}
            onChange={alterarFiltro}
          >
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Desativadas</option>
          </select>
        </div>
      </div>

      {status && (
        <StatusMessage tipo={status.tipo} onFechar={() => setStatus(null)}>
          {status.mensagem}
        </StatusMessage>
      )}

      <div className="painel-barra">
        <span className="painel-barra__total">
          {usuarios.length} {usuarios.length === 1 ? 'conta' : 'contas'}
          {temFiltro && ' com os filtros aplicados'}
        </span>
        {temFiltro && (
          <Button
            variante="secundario"
            tamanho="sm"
            onClick={() => {
              setCarregando(true)
              setFiltros(FILTROS_VAZIOS)
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {erro && (
        <StatusMessage
          tipo="erro"
          titulo="Não foi possível carregar as contas"
          aoTentarDeNovo={() => {
            setCarregando(true)
            buscar()
          }}
        >
          <p>{erro}</p>
        </StatusMessage>
      )}

      {carregando && !jaCarregou && <Spinner texto="Carregando as contas..." />}

      {jaCarregou && !erro && (
        <div className={`painel-tabela ${carregando ? 'painel-tabela--atualizando' : ''}`} aria-busy={carregando}>
        <DataTable
          colunas={colunas}
          dados={usuarios}
          mensagemVazia={
            temFiltro ? 'Nenhuma conta encontrada com esses filtros.' : 'Nenhuma conta cadastrada.'
          }
          acoes={[
            {
              rotulo: 'Desativar',
              variante: 'perigo',
              onClick: (u) => setConfirmacao(u),
              // A própria conta do administrador não pode ser desativada
              ocultarSe: (u) => !u.ativo || u.id === usuarioLogado?.id,
            },
            {
              rotulo: 'Reativar',
              onClick: (u) => setConfirmacao(u),
              ocultarSe: (u) => u.ativo,
            },
          ]}
        />
        </div>
      )}

      <ConfirmModal
        aberto={Boolean(confirmacao)}
        titulo={confirmacao?.ativo ? 'Desativar conta' : 'Reativar conta'}
        mensagem={
          confirmacao?.ativo
            ? `Desativar a conta de ${confirmacao?.nome}? A pessoa perde o acesso imediatamente, mas o negócio e o histórico continuam no sistema.`
            : `Reativar a conta de ${confirmacao?.nome}? A pessoa volta a poder entrar no sistema.`
        }
        textoConfirmar={confirmacao?.ativo ? 'Desativar' : 'Reativar'}
        carregando={salvando}
        onConfirmar={confirmarTroca}
        onCancelar={() => setConfirmacao(null)}
      />
    </div>
  )
}

export default PainelUsuarios
