import { SITUACAO_NEGOCIO } from '../../services/planos'
import Button from '../ui/Button/Button'
import StatusMessage from '../ui/StatusMessage/StatusMessage'

const TIPO_DA_MENSAGEM = {
  RASCUNHO: 'aviso',
  AGUARDANDO_PAGAMENTO: 'aviso',
  ASSINATURA_EXPIRADA: 'erro',
  SUSPENSO: 'erro',
}

/**
 * Aviso no topo do "Meu negócio" quando ele não está na vitrine, com o próximo
 * passo: escolher ou renovar o plano, concluir o pagamento ou falar com a equipe.
 * Negócio publicado não mostra nada.
 * - `aoVerPagamento`: abre a aba do plano (onde está o link do checkout)
 */
function AvisoSituacao({ situacao, aoVerPagamento }) {
  const info = SITUACAO_NEGOCIO[situacao]
  if (!info || situacao === 'ATIVO') return null

  const acoes = {
    RASCUNHO: (
      <Button to="/planos" variante="destaque" tamanho="sm">
        Escolher um plano
      </Button>
    ),
    AGUARDANDO_PAGAMENTO: (
      <Button onClick={aoVerPagamento} variante="destaque" tamanho="sm">
        Concluir o pagamento
      </Button>
    ),
    ASSINATURA_EXPIRADA: (
      <Button to="/planos" variante="destaque" tamanho="sm">
        Renovar assinatura
      </Button>
    ),
    SUSPENSO: (
      <Button to="/contato" variante="secundario" tamanho="sm">
        Falar com a equipe
      </Button>
    ),
  }

  return (
    <StatusMessage tipo={TIPO_DA_MENSAGEM[situacao]} titulo={info.titulo} acao={acoes[situacao]}>
      <p>
        {info.texto} Enquanto isso, o negócio fica fora da vitrine, mas você pode editar os dados e o catálogo.
      </p>
    </StatusMessage>
  )
}

export default AvisoSituacao
