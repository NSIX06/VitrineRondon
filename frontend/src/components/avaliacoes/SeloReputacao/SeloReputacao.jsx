import Estrelas from '../Estrelas/Estrelas'
import { descricaoDaReputacao, formatarMedia, textoDaQuantidade } from '../../../services/avaliacoes'
import './SeloReputacao.css'

/**
 * Reputação no topo do perfil: estrelas, média e quantidade, com link para a
 * seção de comentários. Sem avaliações, diz isso (nunca mostra nota zero nem
 * trata o negócio como mal avaliado). No plano Destaque o selo ganha moldura
 * dourada; os números são os mesmos de qualquer plano.
 */
function SeloReputacao({ resumo, destaque = false, alvo = '#avaliacoes' }) {
  const total = resumo?.total ?? 0
  const media = resumo?.media ?? null

  if (!total) {
    return (
      <a href={alvo} className="selo-reputacao selo-reputacao--vazio">
        <Estrelas valor={0} total={0} tamanho={16} />
        <span>Ainda sem avaliações</span>
      </a>
    )
  }

  return (
    <a
      href={alvo}
      className={`selo-reputacao ${destaque ? 'selo-reputacao--destaque' : ''}`}
      aria-label={`${descricaoDaReputacao(media, total)}. Ver as avaliações`}
    >
      <Estrelas valor={media} total={total} tamanho={18} destaque={destaque} />
      <strong className="selo-reputacao__media">{formatarMedia(media)}</strong>
      <span className="selo-reputacao__total">· {textoDaQuantidade(total)}</span>
    </a>
  )
}

export default SeloReputacao
