import { useState } from 'react'
import { Link } from 'react-router-dom'
import Tag from '../../ui/Tag/Tag'
import Icone from '../../ui/Icone/Icone'
import SeloDestaque from '../../ui/SeloDestaque/SeloDestaque'
import Foto from '../../ui/Foto/Foto'
import SeloNovo from '../../ui/SeloNovo/SeloNovo'
import Estrelas from '../../avaliacoes/Estrelas/Estrelas'
import { ehNovidade } from '../../../services/novidades'
import { formatarMedia, textoDaQuantidade } from '../../../services/avaliacoes'
import { localDoNegocio, textoDosItens } from '../../../services/cartaoDoNegocio'
import './EmpreendedorCard.css'

/**
 * Card de empreendedor, o mesmo em toda listagem de negócios.
 * Espera o formato de GET /api/empreendedores (com `_count.produtos` e
 * `avaliacoes` opcionais). A variante sai do dado real: `emDestaque` (plano
 * Destaque em vigor) liga o cartão anil e dourado; sem ele, o cartão branco do
 * plano Essencial. Estrutura, espaçamentos e nota são os mesmos nos dois.
 */
function EmpreendedorCard({ empreendedor }) {
  const { id, nomeNegocio, responsavel, descricao, categoria, fotoUrl, emDestaque, publicadoDesde, _count, avaliacoes } =
    empreendedor
  const totalItens = _count?.produtos
  const local = localDoNegocio(empreendedor)
  const [fotoFalhou, setFotoFalhou] = useState(false)
  const semFoto = !fotoUrl || fotoFalhou

  return (
    // Negócio do plano Destaque: cartão premium, em anil e dourado, com reflexo ao passar
    <article
      className={`empreendedor-card ${emDestaque ? 'empreendedor-card--destaque reflexo-ao-passar' : 'empreendedor-card--essencial'}`}
    >
      <Link
        to={`/empreendedores/${id}`}
        className="empreendedor-card__foto-wrapper"
        tabIndex={-1}
        aria-hidden="true"
      >
        {semFoto ? (
          // Sem foto (ou foto quebrada): vitrine desenhada nas cores do plano
          <span className="empreendedor-card__sem-foto">
            <span className="empreendedor-card__sem-foto-icone">
              <Icone nome="storefront" tamanho={30} />
            </span>
            <span className="empreendedor-card__sem-foto-texto">Sem foto ainda</span>
          </span>
        ) : (
          <Foto
            className="empreendedor-card__foto"
            valor={fotoUrl}
            foco={empreendedor.fotoFoco}
            alt={`Foto de ${nomeNegocio}`}
            sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1100px) 50vw, 380px"
            onError={() => setFotoFalhou(true)}
          />
        )}
      </Link>

      <div className="empreendedor-card__corpo">
        <div className="empreendedor-card__etiquetas">
          <Tag variante="categoria">{categoria}</Tag>
          {emDestaque && <SeloDestaque compacto />}
          {ehNovidade(publicadoDesde) && <SeloNovo compacto />}
        </div>
        <h3 className="empreendedor-card__nome" title={nomeNegocio}>
          <Link to={`/empreendedores/${id}`} className="empreendedor-card__link">
            <span className="nome-letreiro">{nomeNegocio}</span>
          </Link>
        </h3>
        <span className="empreendedor-card__responsavel">
          {local && <Icone nome="location_on" tamanho={15} />}
          {local ? `${responsavel} · ${local}` : responsavel}
        </span>
        {descricao && <p className="empreendedor-card__descricao">{descricao}</p>}

        {/* Reputação: dos clientes, calculada no servidor. Não é o selo do plano */}
        {avaliacoes && (
          <p className="empreendedor-card__reputacao">
            {avaliacoes.total ? (
              <>
                <Estrelas valor={avaliacoes.media} total={avaliacoes.total} tamanho={16} destaque={emDestaque} />
                <strong className="empreendedor-card__media">{formatarMedia(avaliacoes.media)}</strong>
                <span className="empreendedor-card__avaliacoes">· {textoDaQuantidade(avaliacoes.total)}</span>
              </>
            ) : (
              <span className="empreendedor-card__avaliacoes">Ainda sem avaliações</span>
            )}
          </p>
        )}

        <div className="empreendedor-card__rodape">
          {typeof totalItens === 'number' && (
            <span className="empreendedor-card__itens">
              <Icone nome="inventory_2" tamanho={18} />
              {textoDosItens(totalItens)}
            </span>
          )}
          <Link
            to={`/empreendedores/${id}`}
            className="empreendedor-card__botao"
            aria-label={`Conhecer o negócio ${nomeNegocio}`}
          >
            Conhecer negócio
            <Icone nome="arrow_forward" tamanho={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default EmpreendedorCard
