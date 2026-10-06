import { useParams, Link } from 'react-router-dom'
import { useConsulta } from '../../hooks/useConsulta'
import { linkWhatsapp } from '../../services/whatsapp'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Button from '../../components/ui/Button/Button'
import Tag from '../../components/ui/Tag/Tag'
import Icone from '../../components/ui/Icone/Icone'
import EmpreendedorCard from '../../components/cards/EmpreendedorCard/EmpreendedorCard'
import imagemPadrao from '../../assets/imagem-padrao.svg'
import './ProdutoDetalhe.css'
import Voltar from '../../components/ui/Voltar/Voltar'

const formatadorPreco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function linkDoItem(numero, nomeNegocio, nomeItem) {
  return linkWhatsapp(
    numero,
    `Olá! Vi "${nomeItem}" do ${nomeNegocio} na VitrineLocal e gostaria de mais informações.`
  )
}

function ProdutoDetalhe() {
  const { id } = useParams()
  // Com cache: voltar a um produto já visto é imediato. Sem manter o anterior,
  // para nunca mostrar outro produto com o endereço deste
  const consulta = useConsulta(`/produtos/${id}`, undefined, { manterAnterior: false })
  const produto = consulta.dados?.data ?? null
  const { carregando, erro } = consulta


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

  return (
    <>
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

      <section className="container secao produto-detalhe">
        <div className="produto-detalhe__imagem">
          <img
            decoding="async"
            src={imagem || imagemPadrao}
            alt={nome}
            onError={(evento) => {
              evento.currentTarget.src = imagemPadrao
            }}
          />
          <div className="produto-detalhe__tags">
            <Tag variante={ehServico ? 'servico' : 'produto'}>{ehServico ? 'Serviço' : 'Produto'}</Tag>
            {!disponivel && <Tag variante="alerta">Indisponível</Tag>}
          </div>
        </div>

        <div className="produto-detalhe__info">
          <span className="pagina-cabecalho__marca">{empreendedor.categoria}</span>
          <h1 className="produto-detalhe__nome">{nome}</h1>
          {descricao && <p className="produto-detalhe__descricao">{descricao}</p>}

          <div className="produto-detalhe__preco-caixa">
            <span className="produto-detalhe__a-partir">{ehServico ? 'A partir de' : 'Preço'}</span>
            <span className="produto-detalhe__preco">{formatadorPreco.format(preco)}</span>
          </div>

          <div className="produto-detalhe__acoes">
            <Button href={linkDoItem(empreendedor.whatsapp, empreendedor.nomeNegocio, nome)} variante="whatsapp">
              <Icone nome="chat" tamanho={20} />
              {ehServico ? 'Pedir orçamento no WhatsApp' : 'Pedir pelo WhatsApp'}
            </Button>
            <Button to={`/empreendedores/${empreendedor.id}`} variante="secundario">
              Ver o negócio
            </Button>
          </div>

          <p className="produto-detalhe__aviso">
            <Icone nome="handshake" tamanho={16} />
            O pedido é combinado direto com o empreendedor. A VitrineLocal não cobra comissão.
          </p>
        </div>
      </section>

      <section className="produto-detalhe__quem">
        <div className="container secao">
          <div className="secao__cabecalho">
            <div>
              <h2>Quem oferece</h2>
              <p className="secao__subtitulo">
                {empreendedor.bairro ? `${empreendedor.bairro}, ` : ''}
                {empreendedor.cidade}
              </p>
            </div>
          </div>
          <div className="produto-detalhe__quem-card">
            <EmpreendedorCard empreendedor={empreendedor} />
          </div>
        </div>
      </section>
    </>
  )
}

export default ProdutoDetalhe
