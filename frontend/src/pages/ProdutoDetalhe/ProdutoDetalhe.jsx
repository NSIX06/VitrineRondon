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

function ProdutoDetalhe() {
  const { id } = useParams()
  // Com cache: voltar a um produto já visto é imediato. Sem manter o anterior,
  // para nunca mostrar outro produto com o endereço deste
  const consulta = useConsulta(`/produtos/${id}`, undefined, { manterAnterior: false })
  const produto = consulta.dados?.data ?? null
  const { carregando, erro } = consulta
  const produtoId = produto?.id
  const negocioId = produto?.empreendedor?.id
  // Catálogo do mesmo negócio: conta os itens e mostra outros embaixo
  const catalogo = useConsulta(negocioId ? '/produtos' : null, negocioId ? { empreendedorId: negocioId } : undefined)
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
  const primeiroNome = empreendedor.responsavel.split(' ')[0]
  const situacao = situacaoAtendimento(empreendedor.horarios ?? [], agora)
  const atendeAgora = empreendedor.ativo !== false && situacao.aberto
  const local = [empreendedor.bairro, empreendedor.cidade].filter(Boolean).join(', ')
  const pedir = () => registrarMetrica(empreendedor.id, METRICAS.CLIQUE_WHATSAPP)
  const perfil = `/empreendedores/${empreendedor.id}`
  const itensDoNegocio = catalogo.dados?.data ?? []
  const outros = itensDoNegocio.filter((p) => p.id !== produto.id).slice(0, OUTROS_ITENS)

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
            <Link to={perfil} className="item__migalha-negocio">
              {empreendedor.nomeNegocio}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="detalhe__migalhas-atual">{nome}</span>
          </nav>
        </div>
      </div>

      <section className="container item__principal">
        <div className="item__coluna">
          <div className="item__foto">
            <img decoding="async" src={urlImagem(imagem) || imagemPadrao} alt={nome} onError={trocarPorPadrao} />
            <div className="item__foto-tags">
              <TagTipo tipo={tipo} />
              {!disponivel && <Tag variante="alerta">Indisponível</Tag>}
            </div>
            {local && (
              <span className="item__foto-local">
                <Icone nome="location_on" tamanho={14} />
                {empreendedor.bairro || empreendedor.cidade}
              </span>
            )}
          </div>

          {/* O que o VitrineRondon garante (e o que não faz): sem promessa de resultado */}
          <div className="item__garantias">
            <h2 className="item__garantias-titulo">
              <Icone nome="shield_with_heart" tamanho={20} />
              Como funciona o pedido
            </h2>
            <ul>
              <li>
                <span className="item__garantias-marca">
                  <Icone nome="check" tamanho={16} />
                </span>
                <span>
                  <strong>Negociação direta com quem faz</strong>
                  Você combina prazo, entrega e forma de pagamento com {primeiroNome}, sem intermediários.
                </span>
              </li>
              <li>
                <span className="item__garantias-marca item__garantias-marca--ouro">
                  <Icone nome="check" tamanho={16} />
                </span>
                <span>
                  <strong>Sem comissão sobre a venda</strong>
                  O VitrineRondon não fica com parte do valor: o que você paga vai para o negócio.
                </span>
              </li>
              <li>
                <span className="item__garantias-marca">
                  <Icone nome="check" tamanho={16} />
                </span>
                <span>
                  <strong>Atendimento em {local || 'Rondonópolis'}</strong>
                  Confirme pelo WhatsApp se {primeiroNome} atende o seu bairro.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="item__lado">
          <div className="item__ficha">
            <div className="item__ficha-topo">
              <span className="pagina-cabecalho__marca">{empreendedor.categoria}</span>
            </div>
            <h1 className="item__nome">{nome}</h1>
            {descricao && <p className="item__descricao">{descricao}</p>}

            <div className="item__preco-caixa">
              <div className="item__preco-linha">
                <span className="item__a-partir">{ehServico ? 'A partir de' : 'Preço'}</span>
                <span className="item__preco">{formatarPreco(preco)}</span>
              </div>
              <p className="item__preco-nota">
                {ehServico
                  ? `Valor de referência. O preço final depende do serviço e é combinado direto com ${primeiroNome}.`
                  : `Preço informado pelo negócio. Entrega ou retirada são combinadas pelo WhatsApp.`}
              </p>
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
            <p className="item__pedir-dica">
              <Icone nome="info" tamanho={15} />
              Abre a conversa com {primeiroNome} já com o nome deste {ehServico ? 'serviço' : 'produto'}.
            </p>
          </div>

          {/* Quem oferece: cartão do negócio com o essencial e o caminho para o perfil */}
          <div className="item__negocio">
            {destaque && (
              <span className="item__negocio-fita">
                <Icone nome="star" tamanho={14} />
                Negócio Destaque
              </span>
            )}
            <div className="item__negocio-topo">
              <span className="item__negocio-rotulo">Quem oferece este {ehServico ? 'serviço' : 'produto'}</span>
              <span className={`item__situacao ${atendeAgora ? 'item__situacao--aberto' : ''}`}>
                <span className="item__ponto" aria-hidden="true" />
                {atendeAgora ? 'Aberto agora' : 'Fechado agora'}
                {!situacao.semHorario && <span className="item__situacao-quando">· {detalheDaSituacao(situacao)}</span>}
              </span>
            </div>
            <div className="item__negocio-corpo">
              <img
                className="item__negocio-foto"
                decoding="async"
                src={urlImagem(empreendedor.fotoUrl) || imagemPadrao}
                alt=""
                onError={trocarPorPadrao}
              />
              <div className="item__negocio-texto">
                <Link to={perfil} className="item__negocio-nome">
                  {empreendedor.nomeNegocio}
                </Link>
                <span className="item__negocio-meta">
                  {empreendedor.responsavel}
                  {local ? ` · ${local}` : ''}
                </span>
                <span className="item__negocio-selos">
                  <Tag variante={destaque ? 'ouro' : 'servico'}>{empreendedor.categoria}</Tag>
                  {novo && <SeloNovo compacto claro={destaque} />}
                </span>
              </div>
            </div>
            <div className="item__negocio-rodape">
              <span>
                {itensDoNegocio.length > 0 &&
                  `${itensDoNegocio.length} ${itensDoNegocio.length === 1 ? 'item' : 'itens'} na vitrine`}
              </span>
              <Link to={perfil} className="item__negocio-perfil">
                Ver o perfil completo
                <Icone nome="arrow_forward" tamanho={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {outros.length > 0 && (
        <section className="item__mais" aria-labelledby="titulo-mais">
          <div className="container secao">
            <div className="item__mais-topo">
              <div>
                <span className="pagina-cabecalho__marca">Do mesmo negócio</span>
                <h2 id="titulo-mais">Mais de {empreendedor.nomeNegocio}</h2>
              </div>
              <Button to={perfil} variante="secundario" tamanho="sm">
                Ver o catálogo completo ({itensDoNegocio.length} {itensDoNegocio.length === 1 ? 'item' : 'itens'})
                <Icone nome="list_alt" tamanho={18} />
              </Button>
            </div>
            <ul className="grade-cards">
              {outros.map((item) => (
                <li key={item.id}>
                  <ProdutoCard produto={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}

export default ProdutoDetalhe
