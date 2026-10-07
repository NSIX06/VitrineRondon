import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/auth'
import Button from '../../components/ui/Button/Button'
import Modal from '../../components/ui/Modal/Modal'
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Aviso from '../../components/ui/Aviso/Aviso'
import Spinner from '../../components/ui/Spinner/Spinner'
import Tag from '../../components/ui/Tag/Tag'
import Icone from '../../components/ui/Icone/Icone'
import DataTable from '../../components/tables/DataTable/DataTable'
import ProdutoForm from '../../components/forms/ProdutoForm/ProdutoForm'
import EmpreendedorForm from '../../components/forms/EmpreendedorForm/EmpreendedorForm'
import { formatarPreco } from '../../services/formatos'
import TagTipo from '../../components/ui/Tag/TagTipo'
import './MeuNegocio.css'
import Voltar from '../../components/ui/Voltar/Voltar'
import SeloDestaque from '../../components/ui/SeloDestaque/SeloDestaque'
import PainelPlano from '../../components/painel/PainelPlano'
import PainelDesempenho from '../../components/painel/PainelDesempenho'
import PainelDivulgacao from '../../components/painel/PainelDivulgacao'

const ABAS = [
  { id: 'catalogo', rotulo: 'Catálogo', icone: 'inventory_2' },
  { id: 'plano', rotulo: 'Plano', icone: 'workspace_premium' },
  { id: 'desempenho', rotulo: 'Desempenho', icone: 'monitoring' },
  { id: 'divulgacao', rotulo: 'Divulgação', icone: 'campaign' },
]

/**
 * Área do empreendedor: cadastro do próprio negócio e gestão do catálogo dele.
 * O servidor decide o que este usuário pode ver e alterar; aqui só consumimos
 * as rotas /empreendedores/meu, que já filtram pelo dono.
 */
function MeuNegocio() {
  const { atualizarUsuario } = useAuth()
  const [parametros, setParametros] = useSearchParams()
  // Volta do checkout do gateway (?assinatura=retorno): abre no plano e confere
  // o pagamento. O parâmetro sai da URL para um F5 não repetir a conferência.
  const [voltouDoCheckout] = useState(() => parametros.get('assinatura') === 'retorno')
  const [aba, setAba] = useState(() =>
    voltouDoCheckout ? 'plano' : ABAS.some((a) => a.id === parametros.get('aba')) ? parametros.get('aba') : 'catalogo'
  )
  useEffect(() => {
    if (parametros.has('assinatura')) {
      const sem = new URLSearchParams(parametros)
      sem.delete('assinatura')
      setParametros(sem, { replace: true })
    }
  }, [parametros, setParametros])


  const [negocio, setNegocio] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState(null)
  const [status, setStatus] = useState(null)

  // Modal de formulário: { entidade: 'negocio' | 'produto', registro?: objeto }
  const [modalForm, setModalForm] = useState(null)
  const [confirmacao, setConfirmacao] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  /** O plano mudou (pagamento, troca ou cancelamento): atualiza selo e divulgação */
  const aoMudarPlano = useCallback((resumo) => {
    if (!resumo) return
    setNegocio((anterior) =>
      anterior && (anterior.planoAtual !== resumo.planoAtual || anterior.emDestaque !== resumo.emDestaque)
        ? { ...anterior, ...resumo }
        : anterior
    )
  }, [])

  // Aviso flutuante: salvar no modal não tira a pessoa do lugar na página
  const mostrarStatus = (tipo, mensagem) => setStatus({ tipo, mensagem })
  const fecharStatus = useCallback(() => setStatus(null), [])

  // 404 aqui não é erro: significa "ainda não cadastrou o negócio"
  const carregar = useCallback(
    () =>
      api
        .get('/empreendedores/meu')
        .then((resposta) => {
          setNegocio(resposta.data)
          setErroCarregamento(null)
        })
        .catch((erro) => {
          if (erro.status === 404) {
            setNegocio(null)
            setErroCarregamento(null)
          } else {
            setErroCarregamento(erro.message)
          }
        })
        .finally(() => setCarregando(false)),
    []
  )

  useEffect(() => {
    carregar()
  }, [carregar])

  const cadastrarNegocio = async (dados) => {
    const resposta = await api.post('/empreendedores/meu', dados)
    setNegocio({ ...resposta.data, produtos: [] })
    // Cadastrar o primeiro negócio promove a conta a EMPREENDEDOR
    if (resposta.perfilAtualizado) atualizarUsuario({ perfil: resposta.perfilAtualizado })
    mostrarStatus('sucesso', resposta.message)
  }

  const salvarNegocio = async (dados) => {
    const resposta = await api.put(`/empreendedores/${negocio.id}`, dados)
    setNegocio((anterior) => ({ ...resposta.data, produtos: anterior.produtos }))
    setModalForm(null)
    mostrarStatus('sucesso', resposta.message)
  }

  const salvarProduto = async (dados) => {
    const emEdicao = modalForm?.registro
    const resposta = emEdicao
      ? await api.put(`/produtos/${emEdicao.id}`, dados)
      : await api.post('/produtos', dados)

    setNegocio((anterior) => ({
      ...anterior,
      produtos: emEdicao
        ? anterior.produtos.map((item) => (item.id === emEdicao.id ? resposta.data : item))
        : [resposta.data, ...anterior.produtos],
    }))
    setModalForm(null)
    mostrarStatus('sucesso', resposta.message)
  }

  const confirmarExclusao = async () => {
    setExcluindo(true)
    try {
      const resposta = await api.delete(`/produtos/${confirmacao.id}`)
      setNegocio((anterior) => ({
        ...anterior,
        produtos: anterior.produtos.filter((item) => item.id !== confirmacao.id),
      }))
      setConfirmacao(null)
      mostrarStatus('sucesso', resposta.message)
    } catch (erro) {
      setConfirmacao(null)
      mostrarStatus('erro', erro.message)
    } finally {
      setExcluindo(false)
    }
  }

  const colunas = [
    {
      chave: 'nome',
      titulo: 'Nome',
      render: (p) => (
        <span className="meu-negocio__celula">
          {p.nome}
          {!p.disponivel && <Tag variante="alerta">Oculto da vitrine</Tag>}
        </span>
      ),
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      render: (p) => (
        <TagTipo tipo={p.tipo} />
      ),
    },
    {
      chave: 'preco',
      titulo: 'Preço',
      render: (p) => <span className="meu-negocio__preco">{formatarPreco(p.preco)}</span>,
    },
  ]

  if (carregando) {
    return (
      <section className="container secao">
        <Spinner texto="Carregando seu negócio..." />
      </section>
    )
  }

  if (erroCarregamento) {
    return (
      <section className="container secao">
        <StatusMessage
          tipo="erro"
          titulo="Não foi possível carregar"
          aoTentarDeNovo={carregar}
        >
          {erroCarregamento}
        </StatusMessage>
      </section>
    )
  }

  if (!negocio) {
    return (
      <section className="container secao meu-negocio">
        <Voltar para="/" rotulo="Início" />
        <header className="meu-negocio__cabecalho">
          <span className="meu-negocio__indice">Cadastro</span>
          <h1 className="meu-negocio__titulo">Coloque seu negócio na vitrine</h1>
          <p className="meu-negocio__linha-fina">
            Preencha os dados abaixo e seu negócio passa a aparecer para quem procura no bairro. Você
            pode alterar tudo depois e decidir se o endereço fica visível.
          </p>
        </header>

        <Aviso aviso={status} onFechar={fecharStatus} />

        <div className="meu-negocio__cartao">
          <EmpreendedorForm onSubmit={cadastrarNegocio} textoEnviar="Cadastrar meu negócio" />
        </div>
      </section>
    )
  }

  const produtos = negocio.produtos ?? []
  const disponiveis = produtos.filter((p) => p.disponivel).length

  return (
    <section className="container secao meu-negocio">
      <Voltar para="/" rotulo="Início" />
        <header className="meu-negocio__cabecalho meu-negocio__cabecalho--painel">
        <div>
          <span className="meu-negocio__indice">Minha área</span>
          <h1 className="meu-negocio__titulo">{negocio.nomeNegocio}</h1>
          {negocio.emDestaque && <SeloDestaque className="meu-negocio__selo" />}
          <p className="meu-negocio__linha-fina">
            {negocio.categoria} · {negocio.bairro ? `${negocio.bairro}, ` : ''}
            {negocio.cidade}
          </p>
          {!negocio.ativo && (
            <Tag variante="alerta">Negócio inativo: não aparece na vitrine pública</Tag>
          )}
        </div>
        <div className="meu-negocio__acoes-topo">
          <Button to={`/empreendedores/${negocio.id}`} variante="secundario" tamanho="sm">
            <Icone nome="visibility" tamanho={18} />
            Ver como o público vê
          </Button>
          <Button onClick={() => setModalForm({ entidade: 'negocio' })} tamanho="sm">
            <Icone nome="edit" tamanho={18} />
            Editar dados
          </Button>
        </div>
      </header>

      <Aviso aviso={status} onFechar={fecharStatus} />

      <div className="meu-negocio__abas" role="tablist" aria-label="Seções do seu negócio">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`aba-${item.id}`}
            aria-selected={aba === item.id}
            aria-controls="painel-negocio"
            className={`meu-negocio__aba ${aba === item.id ? 'meu-negocio__aba--ativa' : ''}`}
            onClick={() => setAba(item.id)}
          >
            <Icone nome={item.icone} tamanho={18} />
            {item.rotulo}
          </button>
        ))}
      </div>

      <div id="painel-negocio" role="tabpanel" aria-labelledby={`aba-${aba}`} className="meu-negocio__painel">
      {aba === 'plano' && <PainelPlano voltouDoCheckout={voltouDoCheckout} aoMudar={aoMudarPlano} />}
      {aba === 'desempenho' && <PainelDesempenho />}
      {aba === 'divulgacao' && (
        <PainelDivulgacao
          negocio={negocio}
          aoAtualizar={(salvo) => setNegocio((anterior) => ({ ...salvo, produtos: anterior.produtos }))}
        />
      )}
      {aba === 'catalogo' && (
      <>
      <div className="meu-negocio__resumo">
        <div className="meu-negocio__indicador">
          <span className="meu-negocio__indicador-rotulo">Itens no catálogo</span>
          <strong className="meu-negocio__indicador-numero">{produtos.length}</strong>
          <span className="meu-negocio__indicador-detalhe">
            {disponiveis} {disponiveis === 1 ? 'visível' : 'visíveis'} na vitrine
          </span>
        </div>
        <div className="meu-negocio__indicador">
          <span className="meu-negocio__indicador-rotulo">Contato</span>
          <strong className="meu-negocio__indicador-numero meu-negocio__indicador-numero--texto">
            {negocio.whatsapp || '—'}
          </strong>
          <span className="meu-negocio__indicador-detalhe">
            {negocio.instagram ? `@${negocio.instagram.replace('@', '')}` : 'Sem Instagram'}
          </span>
        </div>
        <div className="meu-negocio__indicador">
          <span className="meu-negocio__indicador-rotulo">Endereço</span>
          <strong className="meu-negocio__indicador-numero meu-negocio__indicador-numero--texto">
            {negocio.exibirEndereco ? 'Visível' : 'Oculto'}
          </strong>
          <span className="meu-negocio__indicador-detalhe">
            {negocio.exibirEndereco
              ? 'O endereço completo aparece na página do negócio'
              : 'Só o bairro é mostrado ao público'}
          </span>
        </div>
      </div>

      <div className="meu-negocio__barra">
        <h2 className="meu-negocio__subtitulo">Produtos e serviços</h2>
        <Button onClick={() => setModalForm({ entidade: 'produto' })} variante="destaque" tamanho="sm">
          <Icone nome="add" tamanho={18} />
          Novo item
        </Button>
      </div>

      <DataTable
        colunas={colunas}
        dados={produtos}
        mensagemVazia="Seu catálogo está vazio. Clique em “Novo item” para publicar o primeiro produto ou serviço."
        acoes={[
          { rotulo: 'Editar', onClick: (p) => setModalForm({ entidade: 'produto', registro: p }) },
          { rotulo: 'Excluir', variante: 'perigo', onClick: (p) => setConfirmacao(p) },
        ]}
      />

      <p className="meu-negocio__rodape">
        Precisa de ajuda ou quer remover seu negócio da vitrine?{' '}
        <Link to="/contato">Fale com a administração</Link>.
      </p>
      </>
      )}
      </div>

      <Modal
        aberto={modalForm?.entidade === 'negocio'}
        titulo="Editar dados do negócio"
        onFechar={() => setModalForm(null)}
        tamanho="xl"
      >
        <EmpreendedorForm
          initialData={negocio}
          onSubmit={salvarNegocio}
          onCancelar={() => setModalForm(null)}
          textoEnviar="Salvar alterações"
        />
      </Modal>

      <Modal
        aberto={modalForm?.entidade === 'produto'}
        titulo={modalForm?.registro ? 'Editar item' : 'Novo produto ou serviço'}
        onFechar={() => setModalForm(null)}
        tamanho="lg"
      >
        <ProdutoForm
          initialData={modalForm?.registro}
          negocioFixo={negocio}
          onSubmit={salvarProduto}
          onCancelar={() => setModalForm(null)}
        />
      </Modal>

      <ConfirmModal
        aberto={Boolean(confirmacao)}
        titulo="Excluir item"
        mensagem={`Excluir “${confirmacao?.nome}” do seu catálogo? Esta ação não pode ser desfeita.`}
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setConfirmacao(null)}
      />
    </section>
  )
}

export default MeuNegocio
