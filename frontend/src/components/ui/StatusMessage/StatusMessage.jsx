import './StatusMessage.css'

/**
 * Mensagem de status para feedback ao usuário.
 * - `tipo`: "sucesso" | "erro" | "aviso" | "info" | "vazio"
 * - `titulo` opcional; `children` é o corpo da mensagem.
 * - `onFechar` opcional exibe um botão de fechar.
 * - `acao` opcional: elemento renderizado abaixo do texto (ex.: botão de tentar novamente).
 */
function StatusMessage({ tipo = 'info', titulo, children, onFechar, acao }) {
  const ehVazio = tipo === 'vazio'
  return (
    <div
      className={`status status--${tipo}`}
      role={tipo === 'erro' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {ehVazio ? (
        <svg className="status__icone" viewBox="0 0 72 60" aria-hidden="true">
          <rect x="8" y="24" width="46" height="30" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M4 14h54l3 9H1z" fill="var(--cor-ouro)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M24 54V38h14v16" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      ) : (
        <span className="status__marca" aria-hidden="true" />
      )}
      <div className="status__conteudo">
        {titulo && <strong className="status__titulo">{titulo}</strong>}
        <div className="status__texto">{children}</div>
        {acao && <div className="status__acao">{acao}</div>}
      </div>
      {onFechar && (
        <button
          type="button"
          className="status__fechar"
          onClick={onFechar}
          aria-label="Fechar mensagem"
        >
          &times;
        </button>
      )}
    </div>
  )
}

export default StatusMessage
