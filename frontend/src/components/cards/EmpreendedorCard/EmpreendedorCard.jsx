import { Link } from 'react-router-dom'
import Tag from '../../ui/Tag/Tag'
import Icone from '../../ui/Icone/Icone'
import SeloDestaque from '../../ui/SeloDestaque/SeloDestaque'
import imagemPadrao from '../../../assets/imagem-padrao.svg'
import { urlImagem } from '../../../services/imagens'
import './EmpreendedorCard.css'

/**
 * Card de empreendedor.
 * Espera o formato de GET /api/empreendedores (com `_count.produtos` opcional).
 */
function EmpreendedorCard({ empreendedor }) {
  const { id, nomeNegocio, responsavel, descricao, categoria, cidade, fotoUrl, emDestaque, _count } =
    empreendedor
  const totalItens = _count?.produtos

  const tratarErroImagem = (evento) => {
    evento.currentTarget.src = imagemPadrao
  }

  return (
    <article className="empreendedor-card">
      <Link to={`/empreendedores/${id}`} className="empreendedor-card__foto-wrapper">
        <img
          decoding="async"
          className="empreendedor-card__foto"
          src={urlImagem(fotoUrl) || imagemPadrao}
          alt={`Foto de ${nomeNegocio}`}
          loading="lazy"
          onError={tratarErroImagem}
        />
      </Link>

      <div className="empreendedor-card__corpo">
        <div className="empreendedor-card__etiquetas">
          <Tag variante="categoria">{categoria}</Tag>
          {emDestaque && <SeloDestaque compacto />}
        </div>
        <h3 className="empreendedor-card__nome">
          <Link to={`/empreendedores/${id}`} className="empreendedor-card__link">
            {nomeNegocio}
          </Link>
        </h3>
        <span className="empreendedor-card__responsavel">
          {responsavel}, {cidade}
        </span>
        {descricao && <p className="empreendedor-card__descricao">{descricao}</p>}

        <div className="empreendedor-card__rodape">
          {typeof totalItens === 'number' && (
            <span className="empreendedor-card__itens">
              <Icone nome="inventory_2" tamanho={18} />
              {totalItens === 0
                ? 'Nenhum item'
                : `${totalItens} ${totalItens === 1 ? 'item' : 'itens'} na vitrine`}
            </span>
          )}
          <Link to={`/empreendedores/${id}`} className="empreendedor-card__botao">
            Conhecer negócio
            <Icone nome="arrow_forward" tamanho={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default EmpreendedorCard
