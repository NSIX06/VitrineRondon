import ReactMarkdown from 'react-markdown'
import './DocumentoLegal.css'

/** Texto de um documento legal (markdown vindo da API), com a tipografia do site */
function DocumentoLegal({ conteudo }) {
  return (
    <article className="documento-legal">
      <ReactMarkdown>{conteudo}</ReactMarkdown>
    </article>
  )
}

export default DocumentoLegal
