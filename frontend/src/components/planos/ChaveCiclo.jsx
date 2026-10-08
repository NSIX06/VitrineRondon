import Icone from '../ui/Icone/Icone'
import './ChaveCiclo.css'

const OPCOES = [
  ['MONTHLY', 'Mensal'],
  ['ANNUALLY', 'Anual'],
]

/**
 * Chave mensal/anual dos planos, com o selo dos meses de presente do anual.
 * - `valor`: 'MONTHLY' | 'ANNUALLY'
 * - `aoMudar(ciclo)`
 * - `mesesDePresente`: quantos meses o anual dá de presente (sem ele, sem selo)
 */
function ChaveCiclo({ valor, aoMudar, mesesDePresente }) {
  return (
    <div className="chave-ciclo">
      <div className="chave-ciclo__trilho" role="radiogroup" aria-label="Forma de cobrança">
        {OPCOES.map(([ciclo, rotulo]) => (
          <button
            key={ciclo}
            type="button"
            role="radio"
            aria-checked={valor === ciclo}
            className={`chave-ciclo__opcao ${valor === ciclo ? 'chave-ciclo__opcao--ativa' : ''}`}
            onClick={() => aoMudar(ciclo)}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {mesesDePresente > 0 && (
        <span className="chave-ciclo__presente">
          <Icone nome="redeem" tamanho={16} />
          Anual: {mesesDePresente} meses de presente
        </span>
      )}
    </div>
  )
}

export default ChaveCiclo
