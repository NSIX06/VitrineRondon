import Button from '../../ui/Button/Button'
import './DataTable.css'

/**
 * Tabela de dados genérica.
 * - `colunas`: [{ chave, titulo, render?: (registro) => ReactNode, largura? }]
 * - `dados`: array de registros (cada um precisa ter `id`)
 * - `acoes`: [{ rotulo, onClick: (registro) => void, variante?, ocultarSe?: (registro) => bool }]
 * - `mensagemVazia`: texto exibido quando não há dados
 */
function DataTable({ colunas, dados, acoes = [], mensagemVazia = 'Nenhum registro.' }) {
  const totalColunas = colunas.length + (acoes.length > 0 ? 1 : 0)

  return (
    <div className="data-table__wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna.chave} scope="col" style={{ width: coluna.largura }}>
                {coluna.titulo}
              </th>
            ))}
            {acoes.length > 0 && (
              <th scope="col" className="data-table__col-acoes">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 ? (
            <tr>
              <td colSpan={totalColunas} className="data-table__vazio">
                {mensagemVazia}
              </td>
            </tr>
          ) : (
            dados.map((registro) => (
              <tr key={registro.id}>
                {colunas.map((coluna) => (
                  <td key={coluna.chave} data-titulo={coluna.titulo}>
                    {coluna.render ? coluna.render(registro) : registro[coluna.chave]}
                  </td>
                ))}
                {acoes.length > 0 && (
                  // Os botões ficam numa caixa dentro da célula: uma célula com
                  // display:flex deixa de ser célula, sai do alinhamento das
                  // colunas e escapa para fora da tabela
                  <td className="data-table__col-acoes" data-titulo="Ações">
                    <div className="data-table__acoes">
                      {acoes
                        .filter((acao) => !acao.ocultarSe?.(registro))
                        .map((acao) => (
                          <Button
                            key={acao.rotulo}
                            tamanho="sm"
                            variante={acao.variante || 'secundario'}
                            onClick={() => acao.onClick(registro)}
                          >
                            {acao.rotulo}
                          </Button>
                        ))}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
