import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../../services/api'
import { categoriasDoFaq } from '../../../services/faq'
import Button from '../../ui/Button/Button'
import Tag from '../../ui/Tag/Tag'
import Icone from '../../ui/Icone/Icone'
import Modal from '../../ui/Modal/Modal'
import ConfirmModal from '../../ui/ConfirmModal/ConfirmModal'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import DataTable from '../../tables/DataTable/DataTable'
import FaqForm from '../../forms/FaqForm/FaqForm'
import CabecalhoSecao from '../CabecalhoSecao/CabecalhoSecao'
import './PainelFaq.css'

/**
 * Perguntas da central de ajuda, ativas e inativas. Cada alteração vai ao
 * servidor, que confere o perfil de administrador e registra na auditoria.
 */
function PainelFaq() {
  const [perguntas, setPerguntas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [status, setStatus] = useState(null)

  // null: fechado; {}: nova pergunta; { id, ... }: edição
  const [emEdicao, setEmEdicao] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  const buscar = useCallback(
    () =>
      api
        .get('/faq/todas')
        .then((resposta) => {
          setPerguntas(resposta.data)
          setErro(null)
        })
        .catch((erroApi) => setErro(erroApi.message))
        .finally(() => setCarregando(false)),
    []
  )

  useEffect(() => {
    buscar()
  }, [buscar])

  const categorias = useMemo(() => categoriasDoFaq(perguntas), [perguntas])
  const ativas = perguntas.filter((p) => p.ativo).length

  const salvar = async (dados) => {
    const edicao = Boolean(emEdicao?.id)
    const resposta = edicao ? await api.put(`/faq/${emEdicao.id}`, dados) : await api.post('/faq', dados)
    setEmEdicao(null)
    setStatus({ tipo: 'sucesso', texto: resposta.message })
    await buscar()
  }

  const excluir = async () => {
    setExcluindo(true)
    try {
      const resposta = await api.delete(`/faq/${paraExcluir.id}`)
      setStatus({ tipo: 'sucesso', texto: resposta.message })
      setParaExcluir(null)
      await buscar()
    } catch (erroApi) {
      setStatus({ tipo: 'erro', texto: erroApi.message })
      setParaExcluir(null)
    } finally {
      setExcluindo(false)
    }
  }

  const colunas = [
    { chave: 'ordem', titulo: 'Ordem', largura: '5rem' },
    {
      chave: 'pergunta',
      titulo: 'Pergunta',
      render: (p) => <span className="painel-faq__pergunta">{p.pergunta}</span>,
    },
    {
      chave: 'categoria',
      titulo: 'Assunto',
      render: (p) => p.categoria || <span className="painel-faq__sem-assunto">Sem assunto</span>,
    },
    {
      chave: 'ativo',
      titulo: 'Situação',
      render: (p) => (p.ativo ? <Tag variante="neutra">Visível</Tag> : <Tag variante="alerta">Oculta</Tag>),
    },
  ]

  const acoes = [
    { rotulo: 'Editar', onClick: (p) => setEmEdicao(p) },
    { rotulo: 'Excluir', variante: 'perigo', onClick: (p) => setParaExcluir(p) },
  ]

  return (
    <div className="painel-faq">
      <CabecalhoSecao
        titulo="Perguntas frequentes"
        texto={`${perguntas.length} ${perguntas.length === 1 ? 'pergunta' : 'perguntas'}, ${ativas} ${
          ativas === 1 ? 'visível' : 'visíveis'
        } na central de ajuda.`}
        acao={
          <Button onClick={() => setEmEdicao({})}>
            <Icone nome="add" tamanho={18} />
            Nova pergunta
          </Button>
        }
      />

      {status && (
        <StatusMessage tipo={status.tipo} onFechar={() => setStatus(null)}>
          {status.texto}
        </StatusMessage>
      )}

      {carregando && <Spinner texto="Carregando as perguntas..." />}

      {erro && (
        <StatusMessage
          tipo="erro"
          titulo="Não foi possível carregar as perguntas"
          aoTentarDeNovo={buscar}
        >
          <p>{erro}</p>
        </StatusMessage>
      )}

      {!carregando && !erro && (
        <DataTable
          colunas={colunas}
          dados={perguntas}
          acoes={acoes}
          mensagemVazia="Nenhuma pergunta cadastrada. Use o botão Nova pergunta para criar a primeira."
        />
      )}

      <Modal
        aberto={Boolean(emEdicao)}
        titulo={emEdicao?.id ? 'Editar pergunta' : 'Nova pergunta'}
        onFechar={() => setEmEdicao(null)}
        tamanho="lg"
      >
        {emEdicao && (
          <FaqForm
            key={emEdicao.id ?? 'nova'}
            inicial={emEdicao.id ? emEdicao : null}
            categorias={categorias}
            onSubmit={salvar}
            onCancelar={() => setEmEdicao(null)}
          />
        )}
      </Modal>

      <ConfirmModal
        aberto={Boolean(paraExcluir)}
        titulo="Excluir pergunta"
        mensagem={
          paraExcluir
            ? `A pergunta "${paraExcluir.pergunta}" sai da central de ajuda e não pode ser recuperada. Se quiser só escondê-la, edite e desmarque "Visível na central de ajuda".`
            : ''
        }
        carregando={excluindo}
        onConfirmar={excluir}
        onCancelar={() => setParaExcluir(null)}
      />
    </div>
  )
}

export default PainelFaq
