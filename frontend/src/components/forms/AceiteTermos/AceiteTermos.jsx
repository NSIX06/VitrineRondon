import { useState } from 'react'
import DocumentoLegalModal from '../../legal/DocumentoLegalModal/DocumentoLegalModal'
import './AceiteTermos.css'

/**
 * Seção de aceite obrigatório dos Termos de Uso e da Política de Privacidade.
 * Controlado pelo pai: `valores` = { termosDeUso, politicaPrivacidade }.
 * Os dois iniciam desmarcados; a validação final é feita também no backend.
 */
function AceiteTermos({ valores, onChange, erros = {}, versao }) {
  // O documento abre por cima do formulário: em outra aba, a pessoa saía do
  // cadastro no meio e, no celular, nem sempre achava o caminho de volta
  const [documentoAberto, setDocumentoAberto] = useState(null)

  const alternar = (campo) => (evento) => {
    onChange({ ...valores, [campo]: evento.target.checked })
  }

  // O botão fica dentro do rótulo da caixa: sem o preventDefault, ler o
  // documento também marcaria o aceite
  const abrir = (tipo) => (evento) => {
    evento.preventDefault()
    setDocumentoAberto(tipo)
  }

  return (
    <fieldset className="aceite">
      <legend className="aceite__legenda">
        Termos e privacidade{versao && <span className="aceite__versao">versão {versao}</span>}
      </legend>

      <div className={`aceite__item ${erros.termosDeUso ? 'aceite__item--erro' : ''}`}>
        <input
          id="aceite-termos"
          type="checkbox"
          checked={Boolean(valores.termosDeUso)}
          onChange={alternar('termosDeUso')}
          aria-describedby={erros.termosDeUso ? 'aceite-termos-erro' : undefined}
        />
        <label htmlFor="aceite-termos">
          Li e concordo com os{' '}
          <button type="button" className="link-em-texto" onClick={abrir('TERMOS_DE_USO')}>
            Termos de Uso
          </button>{' '}
          do VitrineLocal.
        </label>
        {erros.termosDeUso && (
          <span id="aceite-termos-erro" className="campo__erro">
            {erros.termosDeUso}
          </span>
        )}
      </div>

      <div className={`aceite__item ${erros.politicaPrivacidade ? 'aceite__item--erro' : ''}`}>
        <input
          id="aceite-privacidade"
          type="checkbox"
          checked={Boolean(valores.politicaPrivacidade)}
          onChange={alternar('politicaPrivacidade')}
          aria-describedby={erros.politicaPrivacidade ? 'aceite-privacidade-erro' : undefined}
        />
        <label htmlFor="aceite-privacidade">
          Li e estou ciente da{' '}
          <button type="button" className="link-em-texto" onClick={abrir('POLITICA_PRIVACIDADE')}>
            Política de Privacidade
          </button>{' '}
          e do tratamento dos meus dados.
        </label>
        {erros.politicaPrivacidade && (
          <span id="aceite-privacidade-erro" className="campo__erro">
            {erros.politicaPrivacidade}
          </span>
        )}
      </div>

      <DocumentoLegalModal tipo={documentoAberto} aoFechar={() => setDocumentoAberto(null)} />
    </fieldset>
  )
}


export default AceiteTermos
