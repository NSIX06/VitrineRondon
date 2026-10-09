import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../services/api'
import Button from '../../components/ui/Button/Button'
import Icone from '../../components/ui/Icone/Icone'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Voltar from '../../components/ui/Voltar/Voltar'
import PainelAcesso from '../Login/PainelAcesso'
import '../Login/Login.css'

const FOTO = 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200'

/**
 * Primeiro passo da recuperação: pede o e-mail e manda o link. A resposta é a
 * mesma exista a conta ou não (o servidor não revela quem é cadastrado).
 */
function EsqueciSenha() {
  const location = useLocation()
  // O login passa o e-mail que já estava digitado
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [erro, setErro] = useState(null)
  const [erroGeral, setErroGeral] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(null)

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('Informe um e-mail válido')
      return
    }
    setEnviando(true)
    try {
      const resposta = await api.post('/auth/esqueci-senha', { email: email.trim().toLowerCase() })
      setEnviado(resposta.message)
    } catch (falha) {
      setErroGeral(falha.message || 'Não foi possível enviar agora. Tente de novo em instantes.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="container secao login">
      <div className="login__moldura">
        <div className="login__lado">
          <Voltar para="/login" rotulo="Voltar ao login" />
          <div className="login__conteudo">
            <span className="pagina-cabecalho__marca">Recuperar acesso</span>
            <h1 className="login__titulo">Esqueci a senha</h1>

            {enviado ? (
              <div className="login__aviso" role="status">
                <span className="login__aviso-icone">
                  <Icone nome="mark_email_read" tamanho={28} />
                </span>
                <p>
                  <strong>Pronto.</strong> {enviado}
                </p>
                <p>O link vale por 30 minutos e funciona uma vez só.</p>
                <Button to="/login" variante="secundario">
                  <Icone nome="login" tamanho={18} />
                  Voltar ao login
                </Button>
                <button type="button" className="login__trocar" onClick={() => setEnviado(null)}>
                  Não chegou? Pedir de novo
                </button>
              </div>
            ) : (
              <>
                <p className="login__texto">
                  Digite o e-mail da sua conta. Vamos mandar um link para você criar uma nova senha.
                </p>
                {erroGeral && (
                  <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
                    {erroGeral}
                  </StatusMessage>
                )}
                <form className="formulario" onSubmit={aoEnviar} noValidate>
                  <div className="campo">
                    <label className="campo__rotulo" htmlFor="recuperar-email">
                      E-mail
                    </label>
                    <input
                      id="recuperar-email"
                      name="email"
                      type="email"
                      className={`campo__entrada ${erro ? 'campo__entrada--erro' : ''}`}
                      value={email}
                      onChange={(evento) => {
                        setEmail(evento.target.value)
                        setErro(null)
                      }}
                      autoComplete="email"
                      placeholder="voce@email.com"
                      autoFocus
                    />
                    {erro && <span className="campo__erro">{erro}</span>}
                  </div>
                  <Button type="submit" disabled={enviando} className="login__botao">
                    <Icone nome="send" tamanho={18} />
                    {enviando ? 'Enviando...' : 'Enviar o link'}
                  </Button>
                </form>
                <p className="login__rodape">
                  Lembrou a senha? <Link to="/login">Entrar</Link>
                </p>
                <p className="login__rodape login__rodape--nota">
                  Não tem mais acesso a esse e-mail? Fale com a equipe pela página de <Link to="/contato">contato</Link>.
                </p>
              </>
            )}
          </div>
        </div>

        <PainelAcesso
          fotos={{ unica: FOTO }}
          ativa="unica"
          frase="Acontece com todo mundo. Em poucos minutos você volta para a sua vitrine."
          autor="Equipe VitrineRondon"
        />
      </div>
    </section>
  )
}

export default EsqueciSenha
