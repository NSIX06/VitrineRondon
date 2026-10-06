import { useState } from 'react'
import Icone from '../../ui/Icone/Icone'
import './CampoSenha.css'

/**
 * Campo de senha com a opção de ver o que foi digitado.
 * O botão fica dentro do campo e diz, para leitores de tela, se a senha está
 * visível. Cada campo controla a própria visibilidade.
 */
function CampoSenha({
  id,
  name,
  valor,
  onChange,
  rotulo,
  obrigatorio = false,
  erro,
  ajuda,
  autoComplete = 'current-password',
  maxLength,
  autoFocus,
}) {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="campo">
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
        {obrigatorio && <span className="campo__obrigatorio">*</span>}
      </label>

      <div className="campo-senha">
        <input
          id={id}
          name={name}
          type={visivel ? 'text' : 'password'}
          className={`campo__entrada campo-senha__entrada ${erro ? 'campo__entrada--erro' : ''}`}
          value={valor}
          onChange={onChange}
          autoComplete={autoComplete}
          maxLength={maxLength}
          autoFocus={autoFocus}
          aria-invalid={Boolean(erro)}
        />
        <button
          type="button"
          className="campo-senha__ver"
          onClick={() => setVisivel((atual) => !atual)}
          aria-pressed={visivel}
          aria-label={visivel ? 'Ocultar a senha' : 'Mostrar a senha'}
          title={visivel ? 'Ocultar a senha' : 'Mostrar a senha'}
        >
          <Icone nome={visivel ? 'visibility_off' : 'visibility'} tamanho={20} />
        </button>
      </div>

      {erro ? (
        <span className="campo__erro">{erro}</span>
      ) : (
        ajuda && <span className="campo__ajuda">{ajuda}</span>
      )}
    </div>
  )
}

export default CampoSenha
