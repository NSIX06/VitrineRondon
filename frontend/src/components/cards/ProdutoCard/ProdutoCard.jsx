import { Link } from 'react-router-dom'
import Tag from '../../ui/Tag/Tag'
import Icone from '../../ui/Icone/Icone'
import SeloDestaque from '../../ui/SeloDestaque/SeloDestaque'
import { METRICAS, registrarMetrica } from '../../../services/metricas'
import imagemPadrao from '../../../assets/imagem-padrao.svg'
import { urlImagem } from '../../../services/imagens'
import './ProdutoCard.css'

const formatadorPreco = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/**
 * Card de produto ou serviço. O card inteiro é clicável e leva à página do item
 * (padrão "link estendido": o link do título cobre o card, e os links internos
 * ficam acima dele). Funciona com mouse, toque e teclado.
 * - `linkWhatsapp` (opcional): modo "orçamento" usado na página do empreendedor.
 */
function ProdutoCard({ produto, linkWhatsapp }) {
  const { id, nome, descricao, preco, tipo, imagem, disponivel, empreendedor } = produto
  const ehServico = tipo === 'servico'

  const tratarErroImagem = (evento) => {
    evento.currentTarget.src = imagemPadrao
  }

  return (
    <article className={`produto-card ${!disponivel ? 'produto-card--indisponivel' : ''}`}>
      <div className="produto-card__imagem-wrapper">
        <img
          decoding="async"
          className="produto-card__imagem"
          src={urlImagem(imagem) || imagemPadrao}
          alt=""
          loading="lazy"
          onError={tratarErroImagem}
        />
        <div className="produto-card__tags">
          <Tag variante={ehServico ? 'servico' : 'produto'}>
            {ehServico ? 'Serviço' : 'Produto'}
          </Tag>
          {!disponivel && <Tag variante="alerta">Indisponível</Tag>}
          {empreendedor?.emDestaque && <SeloDestaque compacto claro />}
        </div>
      </div>

      <div className="produto-card__corpo">
        <h3 className="produto-card__nome">
          <Link to={`/produtos/${id}`} className="produto-card__link">
            {nome}
          </Link>
        </h3>
        {descricao && <p className="produto-card__descricao">{descricao}</p>}
      </div>

      {linkWhatsapp ? (
        <div className="produto-card__rodape produto-card__rodape--orcamento">
          <div className="produto-card__linha-preco">
            <span className="produto-card__a-partir">A partir de</span>
            <span className="produto-card__preco">{formatadorPreco.format(preco)}</span>
          </div>
          <a
            className="produto-card__orcamento"
            href={`${linkWhatsapp}${encodeURIComponent(` Tenho interesse em: ${nome}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => registrarMetrica(produto.empreendedorId, METRICAS.CLIQUE_WHATSAPP)}
          >
            <Icone nome="calculate" tamanho={18} />
            Pedir orçamento
          </a>
        </div>
      ) : (
        <div className="produto-card__rodape">
          <span className="produto-card__preco">{formatadorPreco.format(preco)}</span>
          {empreendedor && (
            <Link to={`/empreendedores/${empreendedor.id}`} className="produto-card__empreendedor">
              <Icone nome="storefront" tamanho={16} />
              <span className="produto-card__negocio">{empreendedor.nomeNegocio}</span>
              {(empreendedor.bairro || empreendedor.cidade) && (
                <span className="produto-card__cidade">
                  , {empreendedor.bairro || empreendedor.cidade}
                </span>
              )}
            </Link>
          )}
        </div>
      )}
    </article>
  )
}

export default ProdutoCard
