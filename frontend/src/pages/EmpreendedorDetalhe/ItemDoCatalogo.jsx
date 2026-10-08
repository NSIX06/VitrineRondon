import { Link } from 'react-router-dom'
import Tag from '../../components/ui/Tag/Tag'
import TagTipo from '../../components/ui/Tag/TagTipo'
import Icone from '../../components/ui/Icone/Icone'
import imagemPadrao from '../../assets/imagem-padrao.svg'
import { urlImagem } from '../../services/imagens'
import { formatarPreco } from '../../services/formatos'

/**
 * Item do catálogo no perfil do negócio, em linha: foto à esquerda, nome,
 * preço e descrição à direita e o pedido pelo WhatsApp. O nome cobre o cartão
 * (link estendido) e leva à página do item; o botão de pedir fica por cima.
 */
function ItemDoCatalogo({ produto, linkPedido, aoPedir }) {
  const { id, nome, descricao, preco, tipo, imagem, disponivel } = produto
  const ehServico = tipo === 'servico'

  return (
    <article className={`item-catalogo ${!disponivel ? 'item-catalogo--indisponivel' : ''}`}>
      <div className="item-catalogo__foto">
        <img
          decoding="async"
          loading="lazy"
          src={urlImagem(imagem) || imagemPadrao}
          alt=""
          onError={(evento) => {
            evento.currentTarget.src = imagemPadrao
          }}
        />
        <span className="item-catalogo__tags">
          <TagTipo tipo={tipo} />
          {!disponivel && <Tag variante="alerta">Indisponível</Tag>}
        </span>
      </div>

      <div className="item-catalogo__corpo">
        <div className="item-catalogo__topo">
          <h3 className="item-catalogo__nome">
            <Link to={`/produtos/${id}`} className="item-catalogo__link">
              {nome}
            </Link>
          </h3>
          <p className="item-catalogo__preco">
            <span>{ehServico ? 'A partir de' : 'Preço'}</span>
            <strong>{formatarPreco(preco)}</strong>
          </p>
        </div>
        {descricao && <p className="item-catalogo__descricao">{descricao}</p>}
        <div className="item-catalogo__rodape">
          <span className="item-catalogo__detalhes">
            Ver detalhes
            <Icone nome="arrow_forward" tamanho={16} />
          </span>
          <a
            className="item-catalogo__pedir"
            href={linkPedido}
            target="_blank"
            rel="noopener noreferrer"
            onClick={aoPedir}
          >
            <Icone nome={ehServico ? 'request_quote' : 'chat'} tamanho={18} />
            {ehServico ? 'Pedir orçamento' : 'Pedir pelo WhatsApp'}
          </a>
        </div>
      </div>
    </article>
  )
}

export default ItemDoCatalogo
