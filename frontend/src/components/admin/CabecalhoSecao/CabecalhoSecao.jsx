import './CabecalhoSecao.css'

/**
 * Cabeçalho de cada aba do admin, no mesmo desenho do "Meu negócio": título
 * e uma linha de explicação à esquerda, a ação principal (ex.: "Novo produto")
 * à direita, na mesma linha. No celular a ação desce para baixo do texto.
 * - `titulo`, `texto`: o que é a seção
 * - `acao`: botão opcional
 */
function CabecalhoSecao({ titulo, texto, acao }) {
  return (
    <div className="cabecalho-secao">
      <div className="cabecalho-secao__textos">
        <h2 className="cabecalho-secao__titulo">{titulo}</h2>
        {texto && <p className="cabecalho-secao__texto">{texto}</p>}
      </div>
      {acao && <div className="cabecalho-secao__acao">{acao}</div>}
    </div>
  )
}

export default CabecalhoSecao
