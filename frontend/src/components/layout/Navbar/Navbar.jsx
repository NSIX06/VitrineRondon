import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import Icone from '../../ui/Icone/Icone'
import { useAuth, PERFIS } from '../../../contexts/auth'
import logo from '../../../assets/logo.svg'
import './Navbar.css'

const links = [
  { para: '/', rotulo: 'Início', exato: true },
  { para: '/vitrine', rotulo: 'Vitrine' },
  { para: '/empreendedores', rotulo: 'Empreendedores' },
  { para: '/planos', rotulo: 'Planos' },
  { para: '/contato', rotulo: 'Contato' },
  { para: '/sobre', rotulo: 'Sobre' },
]

/** Ação principal de cada perfil, exibida ao lado do menu do usuário */
function acaoDoPerfil(usuario) {
  if (usuario.perfil === PERFIS.ADMIN) return { para: '/admin', rotulo: 'Admin', icone: 'lock' }
  if (usuario.perfil === PERFIS.EMPREENDEDOR) {
    return { para: '/meu-negocio', rotulo: 'Meu negócio', icone: 'storefront' }
  }
  return { para: '/meu-negocio', rotulo: 'Cadastrar meu negócio', icone: 'add_business' }
}

function Navbar() {
  const { usuario, autenticado, sair } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const [contaAberta, setContaAberta] = useState(false)
  const [rotaAtual, setRotaAtual] = useState(location.pathname)
  const contaRef = useRef(null)

  // Trocou de página (inclusive pelo botão voltar do navegador): fecha os menus.
  // Ajuste durante a renderização, sem efeito, para não disparar render extra.
  if (rotaAtual !== location.pathname) {
    setRotaAtual(location.pathname)
    setMenuAberto(false)
    setContaAberta(false)
  }

  const fecharMenu = () => {
    setMenuAberto(false)
    setContaAberta(false)
  }

  // Fecha o menu da conta ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!contaAberta) return undefined
    const aoClicar = (evento) => {
      if (contaRef.current && !contaRef.current.contains(evento.target)) setContaAberta(false)
    }
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') setContaAberta(false)
    }
    document.addEventListener('mousedown', aoClicar)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicar)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [contaAberta])

  const aoSair = async () => {
    fecharMenu()
    // Sai da rota antes de encerrar a sessão: se a página atual for protegida,
    // a RotaProtegida mandaria o usuário para /login em vez da home.
    navigate('/', { replace: true })
    await sair()
  }

  const acao = autenticado ? acaoDoPerfil(usuario) : null
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? ''

  return (
    <header className="navbar">
      <div className="serrilha" aria-hidden="true" />
      <div className="container navbar__conteudo">
        <Link to="/" className="navbar__marca" onClick={fecharMenu}>
          <img src={logo} alt="" width="64" height="49" className="navbar__logo" />
          <span className="navbar__divisor" aria-hidden="true" />
          <span className="navbar__nome">
            <span className="letreiro">Vitrine</span>
            <span className="letreiro letreiro--ouro letreiro--brilho">Rondon</span>
          </span>
        </Link>

        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <span className="visualmente-oculto">{menuAberto ? 'Fechar menu' : 'Abrir menu'}</span>
          <Icone nome={menuAberto ? 'close' : 'menu'} tamanho={26} />
        </button>

        <nav
          id="menu-principal"
          className={`navbar__menu ${menuAberto ? 'navbar__menu--aberto' : ''}`}
          aria-label="Navegação principal"
        >
          <div className="navbar__links">
            {links.map(({ para, rotulo, exato }) => (
              <NavLink
                key={para}
                to={para}
                end={exato}
                className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--ativo' : ''}`}
                onClick={fecharMenu}
              >
                {rotulo}
              </NavLink>
            ))}
          </div>

          <div className="navbar__acoes">
            {!autenticado && (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `navbar__link navbar__link--entrar ${isActive ? 'navbar__link--ativo' : ''}`
                  }
                  onClick={fecharMenu}
                >
                  Entrar
                </NavLink>
                {/* As palavras se alternam; leitores de tela ouvem só "Cadastre-se" */}
                <Link
                  to="/cadastro"
                  className="navbar__cadastrar"
                  onClick={fecharMenu}
                  aria-label="Cadastre-se"
                >
                  <span className="navbar__cadastrar-janela" aria-hidden="true">
                    <span className="navbar__cadastrar-palavras">
                      <span>Vire empreendedor</span>
                      <span>Cadastre-se</span>
                      {/* Repete a primeira para o giro recomeçar sem salto */}
                      <span>Vire empreendedor</span>
                    </span>
                  </span>
                </Link>
              </>
            )}

            {autenticado && (
              <>
                <NavLink
                  to={acao.para}
                  className={({ isActive }) =>
                    `navbar__link navbar__link--admin ${isActive ? 'navbar__link--ativo' : ''}`
                  }
                  onClick={fecharMenu}
                >
                  <Icone nome={acao.icone} tamanho={16} />
                  {acao.rotulo}
                </NavLink>

                <div className="navbar__conta" ref={contaRef}>
                  <button
                    type="button"
                    className="navbar__conta-botao"
                    aria-expanded={contaAberta}
                    aria-haspopup="true"
                    /* Em telas estreitas o nome some da tela e o botão ficaria sem rótulo */
                    aria-label={`Menu da conta de ${usuario.nome}`}
                    onClick={() => setContaAberta((aberta) => !aberta)}
                  >
                    <span className="navbar__avatar">
                      <Icone nome="person" tamanho={18} />
                    </span>
                    <span className="navbar__conta-nome">{primeiroNome}</span>
                    <Icone nome={contaAberta ? 'expand_less' : 'expand_more'} tamanho={18} />
                  </button>

                  <div
                    className={`navbar__conta-menu ${contaAberta ? 'navbar__conta-menu--aberta' : ''}`}
                    role="menu"
                  >
                      <div className="navbar__conta-info">
                        <strong>{usuario.nome}</strong>
                        <span>{usuario.email}</span>
                        <span className="navbar__conta-perfil">{usuario.perfil}</span>
                      </div>
                      <button type="button" className="navbar__conta-item navbar__sair" role="menuitem" onClick={aoSair}>
                        <Icone nome="logout" tamanho={18} />
                        Sair
                      </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
