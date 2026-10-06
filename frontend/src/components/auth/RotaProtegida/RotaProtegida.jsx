import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../contexts/auth'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import Button from '../../ui/Button/Button'

/**
 * Protege uma rota por login e, opcionalmente, por perfil.
 * Quem não está logado vai para /login e volta para cá depois de entrar.
 * Quem está logado mas não tem o perfil exigido recebe um aviso, sem redirecionar
 * (para não parecer que a página não existe).
 */
function RotaProtegida({ perfis, children }) {
  const { usuario, carregando } = useAuth()
  const location = useLocation()

  // Ainda verificando o token guardado
  if (carregando) return <Spinner texto="Verificando seu acesso..." />

  if (!usuario) {
    return <Navigate to="/login" state={{ de: location.pathname + location.search }} replace />
  }

  if (perfis && !perfis.includes(usuario.perfil)) {
    return (
      <section className="container secao">
        <StatusMessage tipo="erro" titulo="Acesso restrito">
          <p>
            Esta área é exclusiva para {perfis.join(' ou ').toLowerCase()}. Sua conta é do tipo{' '}
            {usuario.perfil.toLowerCase()}.
          </p>
          <Button to="/" variante="secundario" tamanho="sm">
            Voltar para o início
          </Button>
        </StatusMessage>
      </section>
    )
  }

  return children
}

export default RotaProtegida
