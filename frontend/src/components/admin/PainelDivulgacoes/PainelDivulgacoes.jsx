import { useCallback, useEffect, useState } from 'react'
import api from '../../../services/api'
import { dataLonga } from '../../../services/planos'
import Button from '../../ui/Button/Button'
import ConfirmModal from '../../ui/ConfirmModal/ConfirmModal'
import Icone from '../../ui/Icone/Icone'
import Modal from '../../ui/Modal/Modal'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import Tag from '../../ui/Tag/Tag'
import DataTable from '../../tables/DataTable/DataTable'
import { STATUS_DIVULGACAO, TIPOS_DIVULGACAO } from '../../../services/divulgacoes'
import '../../painel/Painel.css'

const VAZIO = { empreendedorId: '', tipo: 'NEGOCIO', titulo: '', canal: 'Instagram', status: 'PLANEJADA', link: '', alcance: '' }

/** Formulário de divulgação (registro; nada é publicado automaticamente) */
function FormDivulgacao({ inicial, negocios, aoSalvar, aoCancelar }) {
  const [valores, setValores] = useState(() => ({ ...VAZIO, ...inicial }))
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const edicao = Boolean(inicial?.id)

  const alterar = (evento) => {
    const { name, value } = evento.target
    setValores((anterior) => ({ ...anterior, [name]: value }))
    setErros((anterior) => ({ ...anterior, [name]: undefined }))
  }

  const enviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)
    const dados = {
      tipo: valores.tipo,
      titulo: valores.titulo.trim(),
      canal: valores.canal.trim() || null,
      status: valores.status,
      link: valores.link.trim() || null,
      alcance: valores.alcance === '' ? null : Number(valores.alcance),
      ...(edicao ? {} : { empreendedorId: Number(valores.empreendedorId) }),
    }
    setSalvando(true)
    try {
      await aoSalvar(dados)
    } catch (falha) {
      const mapa = {}
      for (const { campo, mensagem } of falha.data?.errors ?? []) mapa[campo] = mensagem
      setErros(mapa)
      setErroGeral(falha.message)
    } finally {
      setSalvando(false)
    }
  }

  const classe = (campo) => `campo__entrada ${erros[campo] ? 'campo__entrada--erro' : ''}`

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {erroGeral && (
        <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
          {erroGeral}
        </StatusMessage>
      )}
      {!edicao && (
        <div className="campo">
          <label className="campo__rotulo" htmlFor="div-negocio">
            Negócio<span className="campo__obrigatorio">*</span>
          </label>
          <select id="div-negocio" name="empreendedorId" className={classe('empreendedorId')} value={valores.empreendedorId} onChange={alterar}>
            <option value="" disabled>
              Escolha um negócio com plano Destaque
            </option>
            {/* Sem autorização o servidor recusa: a opção aparece, mas bloqueada */}
            {negocios.map((n) => (
              <option key={n.id} value={n.id} disabled={!n.autorizaDivulgacao}>
                {n.nomeNegocio}
                {n.autorizaDivulgacao ? '' : ' (não autorizou a divulgação)'}
              </option>
            ))}
          </select>
          <span className="campo__ajuda">Só aparecem negócios com o plano Destaque ativo. É preciso a autorização do empreendedor.</span>
        </div>
      )}
      <div className="campo">
        <label className="campo__rotulo" htmlFor="div-titulo">
          Título<span className="campo__obrigatorio">*</span>
        </label>
        <input id="div-titulo" name="titulo" className={classe('titulo')} value={valores.titulo} onChange={alterar} maxLength={150} placeholder="Ex.: Silva Reparos no feed da semana" />
        {erros.titulo && <span className="campo__erro">{erros.titulo}</span>}
      </div>
      <div className="formulario__linha">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="div-tipo">Tipo</label>
          <select id="div-tipo" name="tipo" className="campo__entrada" value={valores.tipo} onChange={alterar}>
            {Object.entries(TIPOS_DIVULGACAO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="div-canal">Canal</label>
          <input id="div-canal" name="canal" className="campo__entrada" value={valores.canal} onChange={alterar} maxLength={40} />
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="div-status">Status</label>
          <select id="div-status" name="status" className="campo__entrada" value={valores.status} onChange={alterar}>
            {Object.entries(STATUS_DIVULGACAO).map(([valor, { rotulo }]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="formulario__linha">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="div-link">Link da publicação</label>
          <input id="div-link" name="link" type="url" className={classe('link')} value={valores.link} onChange={alterar} maxLength={500} placeholder="https://..." />
          {erros.link && <span className="campo__erro">{erros.link}</span>}
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="div-alcance">Alcance (pessoas)</label>
          <input id="div-alcance" name="alcance" type="number" min="0" className={classe('alcance')} value={valores.alcance} onChange={alterar} />
        </div>
      </div>
      <div className="formulario__acoes">
        <Button variante="secundario" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : edicao ? 'Salvar alterações' : 'Registrar divulgação'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Divulgações nas redes oficiais. Só registro: não há integração com as redes.
 * O servidor exige plano com divulgação e a autorização do empreendedor.
 */
function PainelDivulgacoes({ empreendedores = [] }) {
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState(null)
  const [status, setStatus] = useState(null)
  const [emEdicao, setEmEdicao] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  const buscar = useCallback(
    () =>
      api
        .get('/divulgacoes')
        .then((resposta) => {
          setLista(resposta.data)
          setErro(null)
        })
        .catch((falha) => setErro(falha.message)),
    []
  )

  useEffect(() => {
    buscar()
  }, [buscar])

  const salvar = async (dados) => {
    const resposta = emEdicao?.id ? await api.put(`/divulgacoes/${emEdicao.id}`, dados) : await api.post('/divulgacoes', dados)
    setEmEdicao(null)
    setStatus({ tipo: 'sucesso', texto: resposta.message })
    await buscar()
  }

  const excluir = async () => {
    setExcluindo(true)
    try {
      const resposta = await api.delete(`/divulgacoes/${paraExcluir.id}`)
      setStatus({ tipo: 'sucesso', texto: resposta.message })
    } catch (falha) {
      setStatus({ tipo: 'erro', texto: falha.message })
    } finally {
      setParaExcluir(null)
      setExcluindo(false)
      buscar()
    }
  }

  if (!lista && !erro) return <Spinner texto="Carregando as divulgações..." />

  const comDestaque = empreendedores.filter((e) => e.emDestaque)
  const colunas = [
    { chave: 'negocio', titulo: 'Negócio', render: (d) => d.empreendedor?.nomeNegocio },
    { chave: 'titulo', titulo: 'Título' },
    { chave: 'tipo', titulo: 'Tipo', render: (d) => `${TIPOS_DIVULGACAO[d.tipo] ?? d.tipo}${d.canal ? ` · ${d.canal}` : ''}` },
    {
      chave: 'status',
      titulo: 'Status',
      render: (d) => {
        const status = STATUS_DIVULGACAO[d.status] ?? { rotulo: d.status, variante: 'neutra' }
        return <Tag variante={status.variante}>{status.rotulo}</Tag>
      },
    },
    { chave: 'publicadaEm', titulo: 'Publicada em', render: (d) => (d.publicadaEm ? dataLonga(d.publicadaEm) : '—') },
    { chave: 'alcance', titulo: 'Alcance', render: (d) => d.alcance ?? '—' },
  ]

  return (
    <div className="painel">
      {status && (
        <StatusMessage tipo={status.tipo} onFechar={() => setStatus(null)}>
          {status.texto}
        </StatusMessage>
      )}
      {erro && (
        <StatusMessage tipo="erro" onFechar={() => setErro(null)}>
          {erro}
        </StatusMessage>
      )}
      <div className="admin__barra">
        <Button onClick={() => setEmEdicao({})}>
          <Icone nome="add" tamanho={18} />
          Registrar divulgação
        </Button>
      </div>
      <p className="painel__detalhe">
        Registro do que entrou no calendário editorial das redes oficiais. Não há cota de publicações por
        negócio, e só entram negócios com o plano Destaque e com a autorização do empreendedor.
      </p>

      {/* Quem deixou (ou não) aparecer nas redes, entre os que podem entrar */}
      <section className="divulgacoes__autorizacoes" aria-labelledby="titulo-autorizacoes">
        <h3 id="titulo-autorizacoes">
          Autorizações dos negócios Destaque{' '}
          <small>
            ({comDestaque.filter((e) => e.autorizaDivulgacao).length} de {comDestaque.length} autorizam)
          </small>
        </h3>
        {comDestaque.length === 0 ? (
          <p className="painel__detalhe">Nenhum negócio com o plano Destaque ativo no momento.</p>
        ) : (
          <ul>
            {comDestaque.map((e) => (
              <li key={e.id} className={e.autorizaDivulgacao ? 'divulgacoes__autoriza' : 'divulgacoes__nao-autoriza'}>
                <Icone nome={e.autorizaDivulgacao ? 'check_circle' : 'block'} tamanho={18} />
                <span className="divulgacoes__autorizacao-nome">{e.nomeNegocio}</span>
                <span className="divulgacoes__autorizacao-texto">
                  {e.autorizaDivulgacao
                    ? `Autoriza${e.autorizaDivulgacaoEm ? ` desde ${dataLonga(e.autorizaDivulgacaoEm)}` : ''}`
                    : 'Não autorizou: não pode entrar no calendário'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <DataTable
        colunas={colunas}
        dados={lista ?? []}
        mensagemVazia="Nenhuma divulgação registrada."
        acoes={[
          { rotulo: 'Editar', onClick: (d) => setEmEdicao(d) },
          { rotulo: 'Excluir', variante: 'perigo', onClick: (d) => setParaExcluir(d) },
        ]}
      />

      <Modal aberto={Boolean(emEdicao)} titulo={emEdicao?.id ? 'Editar divulgação' : 'Registrar divulgação'} onFechar={() => setEmEdicao(null)} tamanho="md">
        {emEdicao && (
          <FormDivulgacao
            inicial={
              emEdicao.id
                ? { ...emEdicao, canal: emEdicao.canal ?? '', link: emEdicao.link ?? '', alcance: emEdicao.alcance ?? '' }
                : {}
            }
            negocios={comDestaque}
            aoSalvar={salvar}
            aoCancelar={() => setEmEdicao(null)}
          />
        )}
      </Modal>

      <ConfirmModal
        aberto={Boolean(paraExcluir)}
        titulo="Excluir divulgação"
        mensagem={`Excluir o registro "${paraExcluir?.titulo}"?`}
        carregando={excluindo}
        onConfirmar={excluir}
        onCancelar={() => setParaExcluir(null)}
      />
    </div>
  )
}

export default PainelDivulgacoes
