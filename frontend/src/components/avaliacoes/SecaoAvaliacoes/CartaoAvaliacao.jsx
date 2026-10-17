import { useState } from 'react'
import Icone from '../../ui/Icone/Icone'
import Estrelas from '../Estrelas/Estrelas'
import { ROTULOS_DAS_NOTAS } from '../../../services/avaliacoes'

const dataLonga = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Iniciais do avaliador para o avatar: "Maria S." -> "MS" */
const iniciaisDe = (autor) =>
  String(autor || '?')
    .replace(/\./g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('')

/**
 * Um comentário publicado. O texto aparece como texto puro (o React escapa
 * qualquer HTML), com as quebras de linha que a pessoa digitou.
 * - `podeDenunciar`: mostra "Denunciar" (contas logadas, menos o autor)
 * - `onDenunciar(motivo)`: Promise com a mensagem do servidor
 */
function CartaoAvaliacao({ avaliacao, destaque, podeDenunciar, onDenunciar, acoes }) {
  const [denunciando, setDenunciando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resposta, setResposta] = useState(null)

  const enviarDenuncia = async (evento) => {
    evento.preventDefault()
    setEnviando(true)
    try {
      const mensagem = await onDenunciar(motivo.trim())
      setResposta({ tipo: 'ok', texto: mensagem })
      setDenunciando(false)
    } catch (erro) {
      setResposta({ tipo: 'erro', texto: erro.message || 'Não foi possível enviar a denúncia.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <article className={`cartao-avaliacao ${avaliacao.minha ? 'cartao-avaliacao--minha' : ''}`}>
      <header className="cartao-avaliacao__topo">
        <span className="cartao-avaliacao__avatar" aria-hidden="true">
          {iniciaisDe(avaliacao.autor)}
        </span>
        <div className="cartao-avaliacao__quem">
          <strong>
            {avaliacao.autor}
            {avaliacao.minha && <span className="cartao-avaliacao__sua">Sua avaliação</span>}
          </strong>
          <span className="cartao-avaliacao__data">
            <time dateTime={avaliacao.criadaEm}>{dataLonga.format(new Date(avaliacao.criadaEm))}</time>
            {avaliacao.editadaEm && ' · editada'}
          </span>
        </div>
        <span className="cartao-avaliacao__nota">
          <Estrelas
            valor={avaliacao.nota}
            tamanho={16}
            destaque={destaque}
            rotulo={`${avaliacao.nota} de 5 estrelas, ${ROTULOS_DAS_NOTAS[avaliacao.nota]}`}
          />
        </span>
      </header>

      <p className="cartao-avaliacao__texto">{avaliacao.comentario}</p>

      {(acoes || podeDenunciar) && (
        <footer className="cartao-avaliacao__rodape">
          {acoes}
          {podeDenunciar && !denunciando && resposta?.tipo !== 'ok' && (
            <button type="button" className="cartao-avaliacao__denunciar" onClick={() => setDenunciando(true)}>
              <Icone nome="flag" tamanho={16} />
              Denunciar
            </button>
          )}
        </footer>
      )}

      {denunciando && (
        <form className="cartao-avaliacao__denuncia" onSubmit={enviarDenuncia}>
          <label className="campo__rotulo" htmlFor={`denuncia-${avaliacao.id}`}>
            O que há de errado nesta avaliação? (opcional)
          </label>
          <input
            id={`denuncia-${avaliacao.id}`}
            className="campo__entrada"
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            maxLength={300}
            placeholder="Ex.: ofensiva, falsa, propaganda"
          />
          <div className="cartao-avaliacao__denuncia-acoes">
            <button type="button" className="cartao-avaliacao__link" onClick={() => setDenunciando(false)}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--perigo botao--sm" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar denúncia'}
            </button>
          </div>
        </form>
      )}
      {resposta && (
        <p
          className={`cartao-avaliacao__resposta cartao-avaliacao__resposta--${resposta.tipo}`}
          role={resposta.tipo === 'erro' ? 'alert' : 'status'}
        >
          {resposta.texto}
        </p>
      )}
    </article>
  )
}

export default CartaoAvaliacao
