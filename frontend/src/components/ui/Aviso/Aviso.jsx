import { useEffect } from 'react'
import StatusMessage from '../StatusMessage/StatusMessage'
import './Aviso.css'

const TEMPO_SUCESSO = 5000

/**
 * Aviso flutuante no canto da tela, para o resultado de uma ação.
 * Não mexe na rolagem: a pessoa continua onde estava na lista.
 * - `aviso`: { tipo, mensagem } ou null
 * - `onFechar`: chamado ao fechar ou quando o sucesso some sozinho
 * Erros ficam até a pessoa fechar; sucessos somem depois de alguns segundos.
 */
function Aviso({ aviso, onFechar }) {
  useEffect(() => {
    if (!aviso || aviso.tipo !== 'sucesso') return undefined
    const relogio = setTimeout(onFechar, TEMPO_SUCESSO)
    return () => clearTimeout(relogio)
  }, [aviso, onFechar])

  if (!aviso) return null
  return (
    <div className="aviso">
      <StatusMessage tipo={aviso.tipo} onFechar={onFechar}>
        {aviso.mensagem}
      </StatusMessage>
    </div>
  )
}

export default Aviso
