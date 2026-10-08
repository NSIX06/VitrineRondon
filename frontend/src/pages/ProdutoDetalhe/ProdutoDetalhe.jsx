import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useConsulta } from '../../hooks/useConsulta'
import { useRelogio } from '../../hooks/useRelogio'
import { linkWhatsapp } from '../../services/whatsapp'
import { detalheDaSituacao, situacaoAtendimento } from '../../services/horarios'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Button from '../../components/ui/Button/Button'
import Tag from '../../components/ui/Tag/Tag'
import Icone from '../../components/ui/Icone/Icone'
import ProdutoCard from '../../components/cards/ProdutoCard/ProdutoCard'
import imagemPadrao from '../../assets/imagem-padrao.svg'
import { formatarPreco } from '../../services/formatos'
import TagTipo from '../../components/ui/Tag/TagTipo'
import SeloNovo from '../../components/ui/SeloNovo/SeloNovo'
import { ehNovidade } from '../../services/novidades'
import '../detalhe-migalhas.css'
import './ProdutoDetalhe.css'
import Voltar from '../../components/ui/Voltar/Voltar'
import { urlImagem } from '../../services/imagens'
import { METRICAS, registrarMetrica } from '../../services/metricas'

/** Quantos outros itens do mesmo negócio aparecem embaixo */
const OUTROS_ITENS = 3

function linkDoItem(numero, nomeNegocio, nomeItem) {
  return linkWhatsapp(
    numero,
    `Olá! Vi "${nomeItem}" do ${nomeNegocio} no VitrineRondon e gostaria de mais informações.`
  )
}

const trocarPorPadrao = (evento) => {
  evento.currentTarget.src = imagemPadrao
}

/** Outros itens do mesmo negócio, sem o que está aberto */
function MaisDoNegocio({ empreendedor, itemAtual }) {
  const consulta = useConsulta(`/produtos?empreendedorId=${empreendedor.id}`)
  const outros = (consulta.dados?.data ?? []).filter((p) => p.id !== itemAtual).slice(0, OUTROS_ITENS)
  if (outros.length === 0) return null

  return (
    <section className="item__mais" aria-labelledby="titulo-mais">
      <div className="container secao">
        <div className="item__mais-topo">
          <div>
            <span className="pagina-cabecalho__marca">Do mesmo negócio</span>
            <h2 id="titulo-mais">Mais de {empreendedor.nomeNegocio}</h2>
          </div>
          <Button to={`/empreendedores/${empreendedor.id}`} variante="secundario" tamanho="sm">
            Ver o catálogo completo
          </Button>
        </div>
        <ul className="grade-cards">
          {outros.map((produto) => (
            <li key={produto.id}>
              <ProdutoCard produto={produto} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function ProdutoDetalhe() {
  const { id } = useParams()
  // Com cache: voltar a um produto já visto é imediato. Sem manter o anterior,
  // para nunca mostrar outro produto com o endereço deste
  const consulta = useConsulta(`/produtos/${id}`, undefined, { manterAnterior: false })
  const produto = consulta.dados?.data ?? null
  const { carregando, erro } = consulta
  const produtoId = produto?.id
  const negocioId = produto?.empreendedor?.id
  // O selo de atendimento troca sozinho quando o horário começa ou termina
  const agora = useRelogio()

  // Uma visualização por item aberto (o servidor ignora repetição e o dono)
  useEffect(() => {
    if (produtoId && negocioId) registrarMetrica(negocioId, METRICAS.VISUALIZACAO_PRODUTO, produtoId)
  }, [produtoId, negocioId])

  if (carregando) return <Spinner texto="Carregando o item..." />

  if (erro) {
    const naoEncontrado = erro.status === 404 || erro.status === 400
    return (
      <section className="container secao">
        <StatusMessage
          tipo={naoEncontrado ? 'vazio' : 'erro'}
          titulo={naoEncontrado ? 'Item não encontrado' : 'Não foi possível carregar'}
        >
          <p>{naoEncontrado ? 'Esse item não existe ou foi removido.' : erro.message}</p>
          <Button to="/vitrine" variante="secundario" tamanho="sm">
            Voltar para a vitrine
          </Button>
        </StatusMessage>
      </section>
    )
  }

  const { nome, descricao, preco, tipo, imagem, disponivel, empreendedor } = produto
  const ehServico = tipo === 'servico'
  const destaque = empreendedor.emDestaque
  const novo = ehNovidade(empreendedor.publicadoDesde)
  const situacao = situacaoAtendimento(empreendedor.horarios ?? [], agora)
  const atendeAgora = empreendedor.ativo !== false && situacao.aberto
  const local = [empreendedor.bairro, empreendedor.cidade].filter(Boolean).join(', ')
  const pedir = () => registrarMetrica(empreendedor.id, METRICAS.CLIQUE_WHATSAPP)

  return (
    <div className={`item ${destaque ? 'item--destaque' : ''}`}>
      <div className="detalhe__migalhas">
        <div className="container detalhe__migalhas-conteudo">
          <Voltar para="/vitrine" rotulo="Ver a vitrine" />
          <nav aria-label="Você está em" className="detalhe__migalhas-nav">
            <Link to="/">Início</Link>
            <span aria-hidden="true">/</span>
            <Link to="/vitrine">Vitrine</Link>
            <span aria-hidden="true">/</span>
            <span className="detalhe__migalhas-atual">{nome}</span>
          </nav>
        </div>
      </div>

      <section className="container item__principal">
        <div className="item__foto">
          <img decoding="async" src={urlImagem(imagem) || imagemPadrao} alt={nome} onError={trocarPorPadrao} />
          <div className="item__foto-tags">
            <TagTipo tipo={tipo} />
            {!disponivel && <Tag variante="alerta">Indisponível</Tag>}
          </div>
        </div>

        <div className="item__lado">
          <div className="item__ficha">
            <span className="pagina-cabecalho__marca">{empreendedor.categoria}</span>
            <h1 className="item__nome">{nome}</h1>
            {descricao && <p className="item__descricao">{descricao}</p>}

            <div className="item__preco-caixa">
              <span className="item__a-partir">{ehServico ? 'A partir de' : 'Preço'}</span>
              <span className="item__preco">{formatarPreco(preco)}</span>
            </div>

            <Button
              href={linkDoItem(empreendedor.whatsapp, empreendedor.nomeNegocio, nome)}
              variante="whatsapp"
              onClick={pedir}
              className="item__pedir"
            >
              <Icone nome="chat" tamanho={20} />
              {ehServico ? 'Pedir orçamento no WhatsApp' : 'Pedir pelo WhatsApp'}
            </Button>

            <ul className="item__garantias">
              <li>
                <Icone nome="handshake" tamanho={16} />
                Pedido combinado direto com quem faz
              </li>
              <li>
                <Icone nome="payments" tamanho={16} />
                Sem comissão do VitrineRondon
              </li>
            </ul>
          </div>

          {/* Quem oferece: cartão compacto do negócio, no lugar da seção inteira */}
          <Link to={`/empreendedores/${empreendedor.id}`} className="item__negocio">
            {destaque && (
              <span className="item__negocio-fita">
                <Icone nome="star" tamanho={14} />
                Negócio Destaque
              </span>
            )}
            <img
              className="item__negocio-foto"
              decoding="async"
              src={urlImagem(empreendedor.fotoUrl) || imagemPadrao}
              alt=""
              onError={trocarPorPadrao}
            />
            <span className="item__negocio-texto">
              <span className="item__negocio-rotulo">Quem oferece</span>
              <strong className="item__negocio-nome">{empreendedor.nomeNegocio}</strong>
              <span className="item__negocio-meta">
                {empreendedor.responsavel}
                {local ? ` · ${local}` : ''}
              </span>
              <span className="item__negocio-selos">
                <span className={`item__situacao ${atendeAgora ? 'item__situacao--aberto' : ''}`}>
                  <span className="item__ponto" aria-hidden="true" />
                  {atendeAgora ? 'Aberto agora' : 'Fechado agora'}
                  {!situacao.semHorario && <span className="item__situacao-quando">· {detalheDaSituacao(situacao)}</span>}
                </span>
                {novo && <SeloNovo compacto claro={destaque} />}
              </span>
            </span>
            <span className="item__negocio-ir" aria-hidden="true">
              <Icone nome="arrow_forward" tamanho={20} />
            </span>
          </Link>
        </div>
      </section>

      <MaisDoNegocio empreendedor={empreendedor} itemAtual={produto.id} />
    </div>
  )
}

export default ProdutoDetalhe
