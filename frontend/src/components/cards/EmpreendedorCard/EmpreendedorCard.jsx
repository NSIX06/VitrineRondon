import { useState } from 'react'
import { Link } from 'react-router-dom'
import Tag from '../../ui/Tag/Tag'
import Icone from '../../ui/Icone/Icone'
import SeloDestaque from '../../ui/SeloDestaque/SeloDestaque'
import Foto from '../../ui/Foto/Foto'
import SeloNovo from '../../ui/SeloNovo/SeloNovo'
import Estrelas from '../../avaliacoes/Estrelas/Estrelas'
import { ehNovidade } from '../../../services/novidades'
import { descricaoDaReputacao, formatarMedia } from '../../../services/avaliacoes'
import './EmpreendedorCard.css'

/** "3 itens na vitrine"; sem itens, diz que o catálogo está sendo montado */
function textoDosItens(total) {
  if (total === 0) return 'Catálogo em montagem'
  return `${total} ${total === 1 ? 'item' : 'itens'} na vitrine`
}

/**
 * Card de empreendedor, o mesmo para os dois planos: a estrutura, as medidas e
 * o comportamento são iguais; o plano (emDestaque, vindo da assinatura real)
 * muda só as cores. Essencial: branco, anil e detalhes dourados. Destaque:
 * anil escuro, moldura e botão dourados e o selo "Destaque" (o plano nunca é
 * indicado só pela cor). A reputação vem das avaliações reais e é a mesma em
 * qualquer plano; o Destaque muda só o acabamento das estrelas.
 * Espera o formato de GET /api/empreendedores (`_count.produtos` e `avaliacoes` opcionais).
 */
function EmpreendedorCard({ empreendedor }) {
  const { id, nomeNegocio, responsavel, descricao, categoria, cidade, bairro, fotoUrl, emDestaque, publicadoDesde, _count, avaliacoes } =
    empreendedor
  const totalItens = _count?.produtos
  // Foto com link quebrado vira o mesmo placeholder de quem não tem foto
  const [fotoFalhou, setFotoFalhou] = useState(false)
  const temFoto = Boolean(fotoUrl) && !fotoFalhou
  const local = [bairro, cidade].filter(Boolean).join(', ')
  const perfil = `/empreendedores/${id}`

  return (
    // Negócio do plano Destaque: cartão premium, em anil e dourado, com reflexo ao passar
    <article className={`empreendedor-card ${emDestaque ? 'empreendedor-card--destaque reflexo-ao-passar' : ''}`}>
      <Link to={perfil} className="empreendedor-card__foto-wrapper" tabIndex={-1} aria-hidden="true">
        {temFoto ? (
          <Foto
            className="empreendedor-card__foto"
            valor={fotoUrl}
            foco={empreendedor.fotoFoco}
            alt=""
            sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1100px) 50vw, 380px"
            onError={() => setFotoFalhou(true)}
          />
        ) : (
          <span className="empreendedor-card__sem-foto">
            <Icone nome="storefront" tamanho={44} />
            <span>Foto em breve</span>
          </span>
        )}
      </Link>

      <div className="empreendedor-card__corpo">
        <div className="empreendedor-card__etiquetas">
          <Tag variante="categoria">{categoria}</Tag>
          {emDestaque && <SeloDestaque compacto />}
          {ehNovidade(publicadoDesde) && <SeloNovo compacto />}
        </div>
        <h3 className="empreendedor-card__nome" title={nomeNegocio}>
          <Link to={perfil} className="empreendedor-card__link">
            <span className="nome-letreiro">{nomeNegocio}</span>
          </Link>
        </h3>
        <p className="empreendedor-card__meta">
          {responsavel && (
            <span>
              <Icone nome="person" tamanho={16} />
              {responsavel}
            </span>
          )}
          {local && (
            <span>
              <Icone nome="location_on" tamanho={16} />
              {local}
            </span>
          )}
        </p>

        {avaliacoes && (
          <p className="empreendedor-card__reputacao" aria-label={descricaoDaReputacao(avaliacoes.media, avaliacoes.total)}>
            <Estrelas valor={avaliacoes.media} total={avaliacoes.total} tamanho={15} destaque={emDestaque} />
            {avaliacoes.total ? (
              <span aria-hidden="true">
                <strong>{formatarMedia(avaliacoes.media)}</strong> ({avaliacoes.total})
              </span>
            ) : (
              <span aria-hidden="true">Ainda sem avaliações</span>
            )}
          </p>
        )}

        {descricao && <p className="empreendedor-card__descricao">{descricao}</p>}

        <div className="empreendedor-card__rodape">
          {typeof totalItens === 'number' && (
            <span className="empreendedor-card__itens">
              <Icone nome="inventory_2" tamanho={18} />
              {textoDosItens(totalItens)}
            </span>
          )}
          <Link to={perfil} className="empreendedor-card__botao" aria-label={`Conhecer ${nomeNegocio}`}>
            Conhecer negócio
            <Icone nome="arrow_forward" tamanho={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default EmpreendedorCard
