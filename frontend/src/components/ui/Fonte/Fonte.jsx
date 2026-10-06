import Icone from '../Icone/Icone'
import './Fonte.css'

/**
 * Link para a fonte de uma afirmação exibida no site.
 * - `fonte`: objeto de services/fontes.js
 * - `rotulo`: texto opcional (padrão: veículo e data)
 */
function Fonte({ fonte, rotulo }) {
  return (
    <a
      className="fonte"
      href={fonte.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${fonte.titulo} — ${fonte.veiculo}, ${fonte.data}`}
    >
      {rotulo || `${fonte.veiculo}, ${fonte.data}`}
      <Icone nome="open_in_new" tamanho={13} />
    </a>
  )
}

export default Fonte
