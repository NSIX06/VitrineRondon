import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth, rotaInicialPorPerfil } from '../../contexts/auth'
import Button from '../../components/ui/Button/Button'
import Icone from '../../components/ui/Icone/Icone'
import CampoSenha from '../../components/forms/CampoSenha/CampoSenha'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import PainelAcesso from './PainelAcesso'
import './Login.css'
import Voltar from '../../components/ui/Voltar/Voltar'

/**
 * Painel ao lado do formulário: foto do comércio de bairro, campo de pontos e
 * uma frase escrita letra por letra. Muda com a aba (entrar ou criar conta).
 */
const PAINEIS = {
  entrar: {
    foto: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200',
    frase: 'Que bom te ver de novo. Seu negócio continua do jeito que você deixou.',
    autor: 'Equipe VitrineRondon',
  },
  criar: {
    foto: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200',
    frase: 'Quem faz no bairro merece ser encontrado por quem mora perto.',
    autor: 'Comércio de Rondonópolis',
  },
}

const PASSOS_DO_CADASTRO = [
  ['person_add', 'Sua conta', 'Nome, e-mail e senha.'],
  ['storefront', 'Seu negócio', 'O que você faz, onde atende e o WhatsApp.'],
  ['workspace_premium', 'Plano', 'Essencial ou Destaque, mensal ou anual.'],
]

function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Página que exigiu login, se houver (ver RotaProtegida)
  const destinoOriginal = location.state?.de

  const [aba, setAba] = useState('entrar')
  const [valores, setValores] = useState({ email: '', senha: '' })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const painel = PAINEIS[aba]

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
      <div className="login__moldura">
        <div className="login__lado">
          <Voltar para="/" rotulo="Início" />

          <div className="login__chave" role="tablist" aria-label="Entrar ou criar conta">
            {[
              ['entrar', 'Já tenho conta'],
              ['criar', 'Quero criar'],
            ].map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                id={`aba-${valor}`}
                aria-selected={aba === valor}
                aria-controls={`painel-${valor}`}
                className={`login__chave-opcao ${aba === valor ? 'login__chave-opcao--ativa' : ''}`}
                onClick={() => setAba(valor)}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {/* As duas abas ficam montadas no mesmo lugar e só a ativa aparece: o cartão
              mantém a altura da maior e a troca esmaece, sem o cartão "esticar" */}
          <div className="login__abas">
            <div
              id="painel-entrar"
              role="tabpanel"
              aria-labelledby="aba-entrar"
              className={`login__conteudo ${aba === 'entrar' ? 'login__conteudo--ativa' : ''}`}
              inert={aba !== 'entrar'}
            >
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
                    placeholder="voce@email.com"
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
                <Link to="/esqueci-senha" state={{ email: valores.email.trim() }} className="login__esqueci">
                  Esqueci a senha
                </Link>
                <Button type="submit" disabled={enviando} className="login__botao">
                  <Icone nome="login" tamanho={18} />
                  {enviando ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              <p className="login__rodape">
                Ainda não tem conta?{' '}
                <button type="button" className="login__trocar" onClick={() => setAba('criar')}>
                  Criar agora
                </button>
              </p>
            </div>
            <div
              id="painel-criar"
              role="tabpanel"
              aria-labelledby="aba-criar"
              className={`login__conteudo ${aba === 'criar' ? 'login__conteudo--ativa' : ''}`}
              inert={aba !== 'criar'}
            >
              <span className="pagina-cabecalho__marca">Para quem produz no bairro</span>
              <h1 className="login__titulo">Criar conta</h1>
              <p className="login__texto">O cadastro tem três etapas e leva poucos minutos.</p>

              <ol className="login__passos">
                {PASSOS_DO_CADASTRO.map(([icone, titulo, texto], indice) => (
                  <li key={titulo} className="login__passo" style={{ '--atraso': `${indice * 90}ms` }}>
                    <span className="login__passo-numero">{indice + 1}</span>
                    <span>
                      <strong>
                        <Icone nome={icone} tamanho={18} />
                        {titulo}
                      </strong>
                      {texto}
                    </span>
                  </li>
                ))}
              </ol>

              <Button to="/cadastro" variante="destaque" className="login__botao">
                Começar o cadastro
                <Icone nome="arrow_forward" tamanho={18} />
              </Button>
              <p className="login__rodape">
                Já tem conta?{' '}
                <button type="button" className="login__trocar" onClick={() => setAba('entrar')}>
                  Entrar
                </button>
              </p>
              <p className="login__rodape login__rodape--nota">
                Só quer olhar? Navegar é gratuito: <Link to="/vitrine">ver a vitrine</Link>.
              </p>
            </div>
          </div>
        </div>

        <PainelAcesso
          fotos={{ entrar: PAINEIS.entrar.foto, criar: PAINEIS.criar.foto }}
          ativa={aba}
          frase={painel.frase}
          reserva={[PAINEIS.entrar.frase, PAINEIS.criar.frase].reduce((a, b) => (b.length > a.length ? b : a))}
          autor={painel.autor}
        />
      </div>
    </section>
  )
}

export default Login
