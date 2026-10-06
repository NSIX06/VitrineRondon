import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth, rotaInicialPorPerfil } from '../../contexts/auth'
import Button from '../../components/ui/Button/Button'
import Icone from '../../components/ui/Icone/Icone'
import CampoSenha from '../../components/forms/CampoSenha/CampoSenha'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import './Login.css'
import Voltar from '../../components/ui/Voltar/Voltar'

function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Página que exigiu login, se houver (ver RotaProtegida)
  const destinoOriginal = location.state?.de

  const [valores, setValores] = useState({ email: '', senha: '' })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const atualizar = (evento) => {
    const { name, value } = evento.target
    setValores((anterior) => ({ ...anterior, [name]: value }))
    if (erros[name]) setErros((anterior) => ({ ...anterior, [name]: undefined }))
  }

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)
    const novosErros = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email.trim())) novosErros.email = 'Informe um e-mail válido'
    if (!valores.senha) novosErros.senha = 'Informe a senha'
    if (Object.keys(novosErros).length) {
      setErros(novosErros)
      return
    }
    setEnviando(true)
    try {
      const resposta = await api.post('/auth/login', {
        email: valores.email.trim().toLowerCase(),
        senha: valores.senha,
      })
      entrar(resposta.data)
      navigate(destinoOriginal || rotaInicialPorPerfil(resposta.data.usuario), { replace: true })
    } catch (erro) {
      setErroGeral(erro.message || 'Não foi possível entrar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="container secao login">
      <div className="login__caixa">
        <Voltar para="/" rotulo="Início" />
        <span className="pagina-cabecalho__marca">Acesso</span>
        <h1 className="login__titulo">Entrar</h1>
        <p className="login__texto">Acesse sua conta para gerenciar seu negócio ou o painel.</p>

        {erroGeral && (
          <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
            {erroGeral}
          </StatusMessage>
        )}

        <form className="formulario" onSubmit={aoEnviar} noValidate>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="login-email">
              E-mail
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              className={`campo__entrada ${erros.email ? 'campo__entrada--erro' : ''}`}
              value={valores.email}
              onChange={atualizar}
              autoComplete="email"
              autoFocus
            />
            {erros.email && <span className="campo__erro">{erros.email}</span>}
          </div>
          <CampoSenha
            id="login-senha"
            name="senha"
            rotulo="Senha"
            valor={valores.senha}
            onChange={atualizar}
            erro={erros.senha}
            autoComplete="current-password"
          />
          <Button type="submit" disabled={enviando} className="login__botao">
            <Icone nome="login" tamanho={18} />
            {enviando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="login__rodape">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
        <p className="login__rodape login__rodape--nota">
          Esqueceu a senha? Fale com a equipe pela página de <Link to="/contato">contato</Link>.
        </p>
      </div>
    </section>
  )
}

export default Login
