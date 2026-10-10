import Icone from '../../ui/Icone/Icone'
import './ResumoDeErros.css'

/**
 * Aviso junto do botão de enviar: quantos campos precisam de atenção e um
 * atalho até o primeiro. O botão fica no fim do formulário e os erros podem
 * estar bem acima, fora da tela, principalmente no celular.
 * - `erros`: objeto campo -> mensagem (valores vazios não contam)
 * - `aoIr`: leva até o primeiro campo com erro
 */
function ResumoDeErros({ erros, aoIr }) {
  const quantidade = Object.values(erros ?? {}).filter(Boolean).length
  if (!quantidade) return null
  return (
    <div className="resumo-erros" role="alert">
      <Icone nome="error" tamanho={18} />
      <span>
        {quantidade === 1 ? 'Falta corrigir 1 campo' : `Faltam corrigir ${quantidade} campos`} para continuar.
      </span>
      <button type="button" className="resumo-erros__ir" onClick={aoIr}>
        Mostrar
      </button>
    </div>
  )
}

export default ResumoDeErros
