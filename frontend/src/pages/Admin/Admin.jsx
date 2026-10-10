import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
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
import PainelAuditoria from '../../components/admin/PainelAuditoria/PainelAuditoria'
import PainelUsuarios from '../../components/admin/PainelUsuarios/PainelUsuarios'
import PainelFaq from '../../components/admin/PainelFaq/PainelFaq'
import PainelAssinaturas from '../../components/admin/PainelAssinaturas/PainelAssinaturas'
import PainelDivulgacoes from '../../components/admin/PainelDivulgacoes/PainelDivulgacoes'
import { formatarPreco } from '../../services/formatos'
import { formatarTelefone } from '../../services/telefone'
import TagTipo from '../../components/ui/Tag/TagTipo'
import './Admin.css'
import { SITUACAO_NEGOCIO } from '../../services/planos'

const ABAS = [
  { id: 'produtos', rotulo: 'Produtos', icone: 'shopping_bag' },
  { id: 'empreendedores', rotulo: 'Empreendedores', icone: 'storefront' },
  { id: 'assinaturas', rotulo: 'Assinaturas', icone: 'workspace_premium' },
  { id: 'divulgacoes', rotulo: 'Divulgações', icone: 'campaign' },
  { id: 'mensagens', rotulo: 'Mensagens', icone: 'chat_bubble' },
  { id: 'usuarios', rotulo: 'Contas', icone: 'group' },
  { id: 'faq', rotulo: 'FAQ', icone: 'help' },
  { id: 'auditoria', rotulo: 'Auditoria', icone: 'history' },
]

/** "1 cidade", "2 cidades" */
const plural = (quantidade, singular, pluralizado) =>
  `${quantidade} ${quantidade === 1 ? singular : pluralizado}`

const formatadorData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const dataCurta = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/** Busca as três listas do painel de uma vez */
async function buscarDadosPainel() {
  const [rProdutos, rEmpreendedores, rContatos, rUsuarios] = await Promise.all([
    api.get('/produtos'),
    api.get('/empreendedores'),
    api.get('/contatos'),
    api.get('/usuarios'),
  ])
  return {
    produtos: rProdutos.data,
    empreendedores: rEmpreendedores.data,
    contatos: rContatos.data,
    usuarios: rUsuarios.data,
  }
}

function Admin() {
  // A aba fica no endereço (?aba=faq): recarregar ou compartilhar abre a mesma.
  // O atalho "Administrar perguntas" da central de ajuda usa isso.
  const [searchParams, setSearchParams] = useSearchParams()
  const abaPedida = searchParams.get('aba')
  const [abaAtiva, setAbaAtiva] = useState(() =>
    ABAS.some((aba) => aba.id === abaPedida) ? abaPedida : 'produtos'
  )

  const escolherAba = (id) => {
    setAbaAtiva(id)
    setSearchParams(
      (atual) => {
        const proximo = new URLSearchParams(atual)
        proximo.set('aba', id)
        return proximo
      },
      { replace: true, preventScrollReset: true }
    )
  }

  // Teclado no grupo de abas: ← → trocam, Home e End vão à primeira e à última
  const navegarPelasAbas = (evento) => {
    const posicao = ABAS.findIndex((aba) => aba.id === abaAtiva)
    const destino = {
      ArrowRight: (posicao + 1) % ABAS.length,
      ArrowLeft: (posicao - 1 + ABAS.length) % ABAS.length,
      Home: 0,
      End: ABAS.length - 1,
    }[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    const id = ABAS[destino].id
    escolherAba(id)
    document.getElementById(`aba-admin-${id}`)?.focus()
  }

  // Dados de cada aba
  const [produtos, setProdutos] = useState([])
  const [empreendedores, setEmpreendedores] = useState([])
  const [contatos, setContatos] = useState([])
  const [usuarios, setUsuarios] = useState([])

  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState(null)

  // Feedback de operações (sucesso/erro)
  const [status, setStatus] = useState(null)

  // Modal de formulário: { entidade: 'produto' | 'empreendedor', registro?: objeto }
  const [modalForm, setModalForm] = useState(null)

  // Modal de confirmação de exclusão: { entidade, registro }
  const [confirmacao, setConfirmacao] = useState(null)
  const [excluindo, setExcluindo] = useState(false)


  // Não altera `carregando` ao iniciar: o estado inicial já é true e as
  // recargas após salvar/excluir devem manter a tabela visível.
  const carregarTudo = useCallback(
    () =>
      buscarDadosPainel()
        .then((dados) => {
          setProdutos(dados.produtos)
          setEmpreendedores(dados.empreendedores)
          setContatos(dados.contatos)
          setUsuarios(dados.usuarios)
          setErroCarregamento(null)
        })
        .catch((erro) => setErroCarregamento(erro.message))
        .finally(() => setCarregando(false)),
    []
  )

  const tentarNovamente = () => {
    setCarregando(true)
    carregarTudo()
  }

  useEffect(() => {
    carregarTudo()
  }, [carregarTudo])

  // O resultado aparece num aviso flutuante: a página não pula para o topo
  const mostrarStatus = (tipo, mensagem) => setStatus({ tipo, mensagem })
  const fecharStatus = useCallback(() => setStatus(null), [])

  const abrirNovo = (entidade) => setModalForm({ entidade, registro: null })
  const abrirEdicao = (entidade, registro) => setModalForm({ entidade, registro })
  const fecharModalForm = () => setModalForm(null)

  const salvar = async (dados) => {
    const { entidade, registro } = modalForm
    const rota = entidade === 'produto' ? '/produtos' : '/empreendedores'
    const nomeEntidade = entidade === 'produto' ? 'Produto' : 'Empreendedor'

    // Deixa o erro subir para o formulário exibir os campos inválidos
    const resposta = registro?.id
      ? await api.put(`${rota}/${registro.id}`, dados)
      : await api.post(rota, dados)

    fecharModalForm()
    await carregarTudo()
    mostrarStatus(
      'sucesso',
      resposta.message || `${nomeEntidade} ${registro?.id ? 'atualizado' : 'cadastrado'} com sucesso`
    )
  }

  const pedirExclusao = (entidade, registro) => setConfirmacao({ entidade, registro })
  const cancelarExclusao = () => setConfirmacao(null)

  const confirmarExclusao = async () => {
    const { entidade, registro } = confirmacao
    const rotas = { produto: '/produtos', empreendedor: '/empreendedores', contato: '/contatos' }

    setExcluindo(true)
    try {
      const resposta = await api.delete(`${rotas[entidade]}/${registro.id}`)
      setConfirmacao(null)
      await carregarTudo()
      mostrarStatus('sucesso', resposta.message || 'Registro excluído com sucesso')
    } catch (erro) {
      setConfirmacao(null)
      mostrarStatus('erro', erro.message)
    } finally {
      setExcluindo(false)
    }
  }

  const alternarLido = async (contato) => {
    try {
      const resposta = await api.patch(`/contatos/${contato.id}/lido`, { lido: !contato.lido })
      setContatos((anterior) =>
        anterior.map((item) => (item.id === contato.id ? resposta.data : item))
      )
      mostrarStatus('sucesso', resposta.message)
    } catch (erro) {
      mostrarStatus('erro', erro.message)
    }
  }

  const colunasProdutos = [
    {
      chave: 'nome',
      titulo: 'Nome',
      render: (p) => (
        <span className="admin__celula-principal">
          {p.nome}
          {!p.disponivel && <Tag variante="alerta">Indisponível</Tag>}
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
      render: (p) => <span className="admin__preco">{formatarPreco(p.preco)}</span>,
    },
    {
      chave: 'empreendedor',
      titulo: 'Empreendedor',
      render: (p) => p.empreendedor?.nomeNegocio ?? '—',
    },
  ]

  const colunasEmpreendedores = [
    {
      chave: 'nomeNegocio',
      titulo: 'Negócio',
      render: (e) => (
        <span className="admin__celula-principal">
          {e.nomeNegocio}
          {!e.usuarioId && <span className="admin__secundario">Sem conta responsável</span>}
        </span>
      ),
    },
    {
      chave: 'situacao',
      titulo: 'Situação',
      // Só ATIVO aparece na vitrine; os demais ficam guardados, fora do público
      render: (e) => {
        const s = SITUACAO_NEGOCIO[e.situacao] ?? (e.ativo ? null : SITUACAO_NEGOCIO.SUSPENSO)
        return s ? <Tag variante={s.variante}>{s.rotulo}</Tag> : '—'
      },
    },
    { chave: 'responsavel', titulo: 'Responsável' },
    { chave: 'categoria', titulo: 'Categoria', render: (e) => <Tag variante="categoria">{e.categoria}</Tag> },
    {
      chave: 'cidade',
      titulo: 'Bairro / Cidade',
      render: (e) => (
        <span className="admin__celula-principal admin__celula-principal--normal">
          {e.bairro || '—'}
          <span className="admin__secundario">{e.cidade}</span>
        </span>
      ),
    },
    { chave: 'whatsapp', titulo: 'WhatsApp', render: (e) => formatarTelefone(e.whatsapp) || '—' },
    {
      chave: 'autorizaDivulgacao',
      titulo: 'Redes sociais',
      // O empreendedor marca (ou retira) a autorização na aba Divulgação do painel dele
      render: (e) =>
        e.autorizaDivulgacao ? (
          <span className="admin__celula-principal admin__celula-principal--normal">
            <Tag variante="sucesso">Autoriza</Tag>
            {e.autorizaDivulgacaoEm && (
              <span className="admin__secundario">desde {dataCurta.format(new Date(e.autorizaDivulgacaoEm))}</span>
            )}
          </span>
        ) : (
          <Tag variante="neutra">Não autoriza</Tag>
        ),
    },
    {
      chave: 'itens',
      titulo: 'Itens',
      render: (e) => e._count?.produtos ?? 0,
    },
  ]

  const colunasContatos = [
    {
      chave: 'lido',
      titulo: 'Status',
      render: (c) => (
        <Tag variante={c.lido ? 'neutra' : 'ouro'}>{c.lido ? 'Lida' : 'Nova'}</Tag>
      ),
    },
    {
      chave: 'nome',
      titulo: 'Remetente',
      render: (c) => (
        <span className="admin__celula-principal">
          {c.nome}
          <span className="admin__secundario">{c.email}</span>
          {c.telefone && <span className="admin__secundario">{formatarTelefone(c.telefone)}</span>}
        </span>
      ),
    },
    {
      chave: 'mensagem',
      titulo: 'Mensagem',
      render: (c) => <span className="data-table__truncar" title={c.mensagem}>{c.mensagem}</span>,
    },
    {
      chave: 'empreendedor',
      titulo: 'Para',
      render: (c) => c.empreendedor?.nomeNegocio ?? 'Equipe do VitrineRondon',
    },
    {
      chave: 'createdAt',
      titulo: 'Recebida em',
      render: (c) => formatadorData.format(new Date(c.createdAt)),
    },
  ]

  const contatosNaoLidos = contatos.filter((c) => !c.lido).length

  // Contagem mostrada em cada aba (as que carregam os próprios dados ficam sem)
  const resumoDaAba = (id) => {
    if (carregando || erroCarregamento) return null
    const contagens = {
      produtos: plural(produtos.length, 'item', 'itens'),
      empreendedores: plural(empreendedores.length, 'negócio', 'negócios'),
      mensagens: contatosNaoLidos ? plural(contatosNaoLidos, 'nova', 'novas') : 'tudo lido',
      usuarios: plural(usuarios.length, 'conta', 'contas'),
    }
    return contagens[id] ?? null
  }

  return (
    <>
      <section className="container secao admin">
        <div className="admin__topo">
          <div>
            <span className="pagina-cabecalho__marca">Ambiente restrito de gestão</span>
            <h1>Painel de administração</h1>
            <p>
              Cadastre, edite e remova produtos e empreendedores. Acompanhe as mensagens, as contas
              cadastradas, as perguntas frequentes e a trilha de auditoria do sistema.
            </p>
          </div>
        </div>

        <Aviso aviso={status} onFechar={fecharStatus} />

        {!carregando && !erroCarregamento && (
          <div className="admin__metricas">
            <div className="admin__metrica">
              <span className="admin__metrica-rotulo">Negócios do bairro</span>
              <div className="admin__metrica-valor">
                <span className="admin__metrica-numero">{empreendedores.length}</span>
                <Tag variante="neutra">
                  {plural(empreendedores.filter((e) => e.ativo).length, 'ativo', 'ativos')}
                </Tag>
              </div>
              <div className="admin__metrica-detalhe">
                <span>Cadastros na vitrine</span>
                <strong>{plural(new Set(empreendedores.map((e) => e.cidade)).size, 'cidade', 'cidades')}</strong>
              </div>
            </div>
            <div className="admin__metrica">
              <span className="admin__metrica-rotulo">Catálogo ativo</span>
              <div className="admin__metrica-valor">
                <span className="admin__metrica-numero">{produtos.length}</span>
                <Tag variante="ouro">{produtos.filter((p) => p.disponivel).length} no ar</Tag>
              </div>
              <div className="admin__metrica-detalhe">
                <span>
                  {produtos.filter((p) => p.tipo === 'produto').length} produtos,{' '}
                  {produtos.filter((p) => p.tipo === 'servico').length} serviços
                </span>
              </div>
            </div>
            <div className="admin__metrica">
              <span className="admin__metrica-rotulo">Contas cadastradas</span>
              <div className="admin__metrica-valor">
                <span className="admin__metrica-numero">{usuarios.length}</span>
                <Tag variante="ouro">
                  {plural(
                    usuarios.filter((u) => u.perfil === 'EMPREENDEDOR').length,
                    'empreendedor',
                    'empreendedores'
                  )}
                </Tag>
              </div>
              <div className="admin__metrica-detalhe">
                <span>Pessoas com acesso ao sistema</span>
                {usuarios.some((u) => !u.ativo) && (
                  <strong>{plural(usuarios.filter((u) => !u.ativo).length, 'desativada', 'desativadas')}</strong>
                )}
              </div>
            </div>
            <div className="admin__metrica">
              <span className="admin__metrica-rotulo">Mensagens recebidas</span>
              <div className="admin__metrica-valor">
                <span className="admin__metrica-numero">{contatos.length}</span>
                {contatosNaoLidos > 0 ? (
                  <Tag variante="alerta">{contatosNaoLidos} sem ler</Tag>
                ) : (
                  <Tag variante="neutra">Tudo lido</Tag>
                )}
              </div>
              <div className="admin__metrica-detalhe">
                <span>Caixa de entrada da comunidade</span>
              </div>
            </div>
          </div>
        )}

        {/* Abas em "teclas": todas à vista (sem rolagem lateral), com a contagem
            de cada seção. Setas, Home e End trocam de aba pelo teclado. */}
        <div className="admin__abas" role="tablist" aria-label="Seções do painel" onKeyDown={navegarPelasAbas}>
          {ABAS.map((aba) => {
            const ativa = abaAtiva === aba.id
            const resumo = resumoDaAba(aba.id)
            return (
              <button
                key={aba.id}
                type="button"
                role="tab"
                id={`aba-admin-${aba.id}`}
                aria-selected={ativa}
                aria-controls="painel-admin"
                tabIndex={ativa ? 0 : -1}
                className={`admin__aba ${ativa ? 'admin__aba--ativa' : ''}`}
                onClick={() => escolherAba(aba.id)}
              >
                <span className="admin__aba-icone" aria-hidden="true">
                  <Icone nome={aba.icone} tamanho={20} />
                </span>
                <span className="admin__aba-texto">
                  <span className="admin__aba-rotulo">{aba.rotulo}</span>
                  {resumo && <small className="admin__aba-resumo">{resumo}</small>}
                </span>
                {aba.id === 'mensagens' && contatosNaoLidos > 0 && (
                  <span className="admin__contador" aria-label={`${contatosNaoLidos} não lidas`}>
                    {contatosNaoLidos}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {carregando && <Spinner texto="Carregando o painel..." />}

        {erroCarregamento && !carregando && (
          <StatusMessage
            tipo="erro"
            titulo="Não foi possível carregar os dados"
            aoTentarDeNovo={tentarNovamente}
          >
            <p>{erroCarregamento}</p>
          </StatusMessage>
        )}

        {!carregando && !erroCarregamento && (
          <div
            className="admin__painel"
            role="tabpanel"
            id="painel-admin"
            aria-labelledby={`aba-admin-${abaAtiva}`}
            key={abaAtiva}
          >
            {abaAtiva === 'produtos' && (
              <>
                <div className="admin__barra">
                  <Button onClick={() => abrirNovo('produto')}>
                    <Icone nome="add" tamanho={18} />
                    Novo produto
                  </Button>
                </div>
                <DataTable
                  colunas={colunasProdutos}
                  dados={produtos}
                  mensagemVazia="Nenhum produto cadastrado. Clique em “Novo produto” para começar."
                  acoes={[
                    { rotulo: 'Editar', onClick: (p) => abrirEdicao('produto', p) },
                    { rotulo: 'Excluir', variante: 'perigo', onClick: (p) => pedirExclusao('produto', p) },
                  ]}
                />
              </>
            )}

            {abaAtiva === 'empreendedores' && (
              <>
                <div className="admin__barra">
                  <Button onClick={() => abrirNovo('empreendedor')}>
                    <Icone nome="person_add" tamanho={18} />
                    Novo empreendedor
                  </Button>
                </div>
                <DataTable
                  colunas={colunasEmpreendedores}
                  dados={empreendedores}
                  mensagemVazia="Nenhum empreendedor cadastrado ainda."
                  acoes={[
                    { rotulo: 'Editar', onClick: (e) => abrirEdicao('empreendedor', e) },
                    { rotulo: 'Excluir', variante: 'perigo', onClick: (e) => pedirExclusao('empreendedor', e) },
                  ]}
                />
              </>
            )}

            {abaAtiva === 'mensagens' && (
              <>
                <DataTable
                  colunas={colunasContatos}
                  dados={contatos}
                  mensagemVazia="Nenhuma mensagem recebida até agora."
                  acoes={[
                    {
                      rotulo: 'Marcar como lida',
                      onClick: alternarLido,
                      ocultarSe: (c) => c.lido,
                    },
                    {
                      rotulo: 'Marcar como não lida',
                      onClick: alternarLido,
                      ocultarSe: (c) => !c.lido,
                    },
                    { rotulo: 'Excluir', variante: 'perigo', onClick: (c) => pedirExclusao('contato', c) },
                  ]}
                />
              </>
            )}

            {/* As abas abaixo carregam os próprios dados: filtrar contas, editar
                perguntas ou paginar a auditoria não recarrega o painel inteiro */}
            {abaAtiva === 'usuarios' && <PainelUsuarios aoAlterar={carregarTudo} />}

            {abaAtiva === 'assinaturas' && <PainelAssinaturas aoAlterar={carregarTudo} />}
            {abaAtiva === 'divulgacoes' && <PainelDivulgacoes empreendedores={empreendedores} />}
            {abaAtiva === 'faq' && <PainelFaq />}
            {abaAtiva === 'auditoria' && <PainelAuditoria />}
          </div>
        )}
      </section>

      {/* Modal de criação/edição: o mesmo formulário serve para os dois casos */}
      <Modal
        aberto={Boolean(modalForm)}
        onFechar={fecharModalForm}
        tamanho={modalForm?.entidade === 'empreendedor' ? 'xl' : 'lg'}
        titulo={
          modalForm
            ? `${modalForm.registro ? 'Editar' : 'Novo'} ${
                modalForm.entidade === 'produto' ? 'produto' : 'empreendedor'
              }`
            : ''
        }
      >
        {modalForm?.entidade === 'produto' && (
          <ProdutoForm
            initialData={modalForm.registro}
            empreendedores={empreendedores}
            onSubmit={salvar}
            onCancelar={fecharModalForm}
          />
        )}
        {modalForm?.entidade === 'empreendedor' && (
          <EmpreendedorForm
            initialData={modalForm.registro}
            moderacao
            onSubmit={salvar}
            onCancelar={fecharModalForm}
          />
        )}
      </Modal>

      <ConfirmModal
        aberto={Boolean(confirmacao)}
        titulo="Excluir registro"
        mensagem={montarMensagemExclusao(confirmacao)}
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={cancelarExclusao}
      />
    </>
  )
}

function montarMensagemExclusao(confirmacao) {
  if (!confirmacao) return ''
  const { entidade, registro } = confirmacao
  if (entidade === 'produto') {
    return `Excluir “${registro.nome}”? Esta ação não pode ser desfeita.`
  }
  if (entidade === 'empreendedor') {
    const itens = registro._count?.produtos ?? 0
    return `Excluir “${registro.nomeNegocio}”? ${
      itens > 0 ? `Os ${itens} itens deste empreendedor também serão removidos. ` : ''
    }Esta ação não pode ser desfeita.`
  }
  return `Excluir a mensagem de ${registro.nome}? Esta ação não pode ser desfeita.`
}

export default Admin
