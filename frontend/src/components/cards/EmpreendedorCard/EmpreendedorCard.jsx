import { Link } from 'react-router-dom'
import Tag from '../../ui/Tag/Tag'
import Icone from '../../ui/Icone/Icone'
import SeloDestaque from '../../ui/SeloDestaque/SeloDestaque'
import Foto from '../../ui/Foto/Foto'
import SeloNovo from '../../ui/SeloNovo/SeloNovo'
import { ehNovidade } from '../../../services/novidades'
import './EmpreendedorCard.css'

/**
 * Card de empreendedor.
 * Espera o formato de GET /api/empreendedores (com `_count.produtos` opcional).
 */
function EmpreendedorCard({ empreendedor }) {
  const { id, nomeNegocio, responsavel, descricao, categoria, cidade, fotoUrl, emDestaque, publicadoDesde, _count } =
    empreendedor
  const totalItens = _count?.produtos

  return (
    // Negócio do plano Destaque: cartão premium, em anil e dourado, com reflexo ao passar
    <article className={`empreendedor-card ${emDestaque ? 'empreendedor-card--destaque reflexo-ao-passar' : ''}`}>
      <Link to={`/empreendedores/${id}`} className="empreendedor-card__foto-wrapper">
        <Foto
          className="empreendedor-card__foto"
          valor={fotoUrl}
          foco={empreendedor.fotoFoco}
          alt={`Foto de ${nomeNegocio}`}
          sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 380px"
        />
      </Link>

      <div className="empreendedor-card__corpo">
        <div className="empreendedor-card__etiquetas">
          <Tag variante="categoria">{categoria}</Tag>
          {emDestaque && <SeloDestaque compacto />}
          {ehNovidade(publicadoDesde) && <SeloNovo compacto />}
        </div>
        <h3 className="empreendedor-card__nome">
          <Link to={`/empreendedores/${id}`} className="empreendedor-card__link">
            <span className="nome-letreiro">{nomeNegocio}</span>
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
