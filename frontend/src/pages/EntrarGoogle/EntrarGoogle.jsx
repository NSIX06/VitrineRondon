import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/auth'
import { MENSAGENS_DO_RETORNO, lerRetorno } from '../../services/loginSocial'
import BotaoGoogle from '../../components/auth/BotaoGoogle/BotaoGoogle'
import CampoSenha from '../../components/forms/CampoSenha/CampoSenha'
import Button from '../../components/ui/Button/Button'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import './EntrarGoogle.css'

/**
 * Volta do login com Google. O servidor manda, no fragmento (#):
 * - `codigo`: uso único, trocado aqui pela sessão; depois volta ao `destino`;
 * - `vincular`: o e-mail do Google já tem conta aqui. Nada é ligado sozinho:
 *   a pessoa entra com a senha dessa conta para ligar o Google a ela;
 * - `erro`: cancelado, expirado, desativada... com a opção de tentar de novo.
 * O fragmento é apagado da barra de endereço assim que é lido.
 */
function EntrarGoogle() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [retorno] = useState(() => lerRetorno(window.location.hash))
  const [erro, setErro] = useState(retorno.erro ? MENSAGENS_DO_RETORNO[retorno.erro] ?? MENSAGENS_DO_RETORNO.falhou : null)
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const trocou = useRef(false)

  useEffect(() => {
    // O código não fica no histórico do navegador
    window.history.replaceState(window.history.state, '', window.location.pathname)
    if (!retorno.codigo || trocou.current) return
    trocou.current = true
    api
      .post('/auth/google/sessao', { codigo: retorno.codigo })
      .then((resposta) => {
        entrar(resposta.data)
        navigate(retorno.destino, { replace: true })
      })
      .catch((falha) => setErro(falha.message || MENSAGENS_DO_RETORNO.falhou))
  }, [retorno, entrar, navigate])

  const vincular = async (evento) => {
    evento.preventDefault()
    if (!senha) {
      setErro('Informe a senha da sua conta')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      const resposta = await api.post('/auth/google/vincular', { vinculo: retorno.vincular, senha })
      entrar(resposta.data)
      navigate(retorno.destino, { replace: true })
    } catch (falha) {
      setErro(falha.message || 'Não foi possível ligar o Google à sua conta.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="container secao entrar-google">
      <div className="entrar-google__cartao">
        {retorno.codigo && !erro && <Spinner texto="Entrando com o Google..." />}

        {retorno.vincular && (
          <>
            <span className="pagina-cabecalho__marca">Ligar o Google à sua conta</span>
            <h1 className="entrar-google__titulo">Você já tem conta com este e-mail</h1>
            <p className="entrar-google__texto">
              O e-mail <strong>{retorno.email}</strong> já tem uma conta no VitrineRondon. Para ligar o Google a ela,
              confirme a senha dessa conta. Depois disso, o Google entra direto nela.
            </p>
            {erro && (
              <StatusMessage tipo="erro" onFechar={() => setErro(null)}>
                {erro}
              </StatusMessage>
            )}
            <form className="formulario" onSubmit={vincular} noValidate>
              <CampoSenha
                id="vincular-senha"
                name="senha"
                rotulo="Senha da sua conta"
                valor={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              <div className="entrar-google__acoes">
                <Link to="/esqueci-senha" state={{ email: retorno.email }} className="entrar-google__link">
                  Esqueci a senha
                </Link>
                <Button type="submit" variante="destaque" disabled={enviando}>
                  {enviando ? 'Ligando...' : 'Ligar e entrar'}
                </Button>
              </div>
            </form>
          </>
        )}

        {!retorno.vincular && erro && (
          <>
            <h1 className="entrar-google__titulo">Não deu para entrar</h1>
            <StatusMessage tipo="aviso">{erro}</StatusMessage>
            <BotaoGoogle destino={retorno.destino} aviso={false} />
            <Link to={retorno.destino} className="entrar-google__link">
              Voltar para onde eu estava
            </Link>
          </>
        )}
      </div>
    </section>
  )
}

export default EntrarGoogle
