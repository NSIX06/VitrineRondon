import { Link } from 'react-router-dom'
import { urlDoGoogle, useProvedores } from '../../../services/loginSocial'
import './BotaoGoogle.css'

/**
 * "Continuar com Google": quem avalia entra sem cadastro nem senha. A conta
 * é criada no primeiro login, com o aceite dos documentos avisado aqui.
 * - `destino`: página para voltar depois (ex.: "/empreendedores/3#avaliacoes")
 */
function BotaoGoogle({ destino = '/', aviso = true }) {
  const provedores = useProvedores()
  const disponivel = provedores?.google

  return (
    <div className="botao-google__bloco">
      {disponivel === false ? (
        <p className="botao-google__indisponivel">O login com o Google ainda não está disponível.</p>
      ) : (
        <a
          href={urlDoGoogle(destino)}
          className="botao-google"
          aria-disabled={!provedores}
          onClick={(evento) => {
            if (!provedores) evento.preventDefault()
          }}
        >
          {/* Logotipo oficial do Google (quatro cores), como pede a marca */}
          <svg className="botao-google__logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continuar com Google
        </a>
      )}
      {aviso && disponivel !== false && (
        <p className="botao-google__aviso">
          Ao continuar, você aceita os <Link to="/termos">Termos de Uso</Link> e a{' '}
          <Link to="/privacidade">Política de Privacidade</Link>. Confirmamos só o seu nome e e-mail; você não
          precisa criar senha.
        </p>
      )}
    </div>
  )
}

export default BotaoGoogle
