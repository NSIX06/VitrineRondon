import { Suspense, lazy, useEffect } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  Route,
  RouterProvider,
  ScrollRestoration,
  useLocation,
} from 'react-router-dom'
import Navbar from './components/layout/Navbar/Navbar'
import Footer from './components/layout/Footer/Footer'
import Spinner from './components/ui/Spinner/Spinner'
import PaginaErro from './components/ui/PaginaErro/PaginaErro'
import RotaProtegida from './components/auth/RotaProtegida/RotaProtegida'
import { PERFIS } from './contexts/auth'
import './App.css'

// Cargas das telas, para baixar em segundo plano depois que o site abre
const cargasDasTelas = []
const tela = (carregar) => {
  cargasDasTelas.push(carregar)
  return carregar
}

/* Cada tela vira um arquivo à parte, baixado só quando alguém entra nela: quem
   só olha a vitrine não carrega o painel do administrador nem o mapa. A home
   fica de fora porque é a porta de entrada e precisa aparecer de imediato. */
// A Home também carrega sob demanda: quem chega por outra página não baixa a Home
const Home = lazy(tela(() => import('./pages/Home/Home')))
const Vitrine = lazy(tela(() => import('./pages/Vitrine/Vitrine')))
const ProdutoDetalhe = lazy(tela(() => import('./pages/ProdutoDetalhe/ProdutoDetalhe')))
const Empreendedores = lazy(tela(() => import('./pages/Empreendedores/Empreendedores')))
const EmpreendedorDetalhe = lazy(tela(() => import('./pages/EmpreendedorDetalhe/EmpreendedorDetalhe')))
const Contato = lazy(tela(() => import('./pages/Contato/Contato')))
const Sobre = lazy(tela(() => import('./pages/Sobre/Sobre')))
const Admin = lazy(tela(() => import('./pages/Admin/Admin')))
const MeuNegocio = lazy(tela(() => import('./pages/MeuNegocio/MeuNegocio')))
const Login = lazy(tela(() => import('./pages/Login/Login')))
const EsqueciSenha = lazy(tela(() => import('./pages/RecuperarSenha/EsqueciSenha')))
const RedefinirSenha = lazy(tela(() => import('./pages/RecuperarSenha/RedefinirSenha')))
const Cadastro = lazy(tela(() => import('./pages/Cadastro/Cadastro')))
const Termos = lazy(tela(() => import('./pages/Termos/Termos')))
const Planos = lazy(tela(() => import('./pages/Planos/Planos')))

/** Layout comum: Navbar + conteúdo da rota + Footer */
function Layout() {
  const { pathname } = useLocation()

  // Com o site aberto e o navegador ocioso, baixa as outras telas aos poucos:
  // o clique seguinte já não para em "Carregando a tela...", que fazia a
  // página encolher e o rodapé subir no meio da troca
  useEffect(() => {
    const ocioso = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 1500))
    const cancelar = window.cancelIdleCallback ?? window.clearTimeout
    let fila = [...cargasDasTelas]
    let pedido = 0
    const proxima = () => {
      const carregar = fila.shift()
      if (!carregar) return
      carregar()
        .catch(() => {})
        .finally(() => {
          pedido = ocioso(proxima)
        })
    }
    pedido = ocioso(proxima)
    return () => {
      fila = []
      cancelar(pedido)
    }
  }, [])

  return (
    <div className="app">
      <Navbar />
      <main className="app__conteudo">
        <Suspense fallback={<div className="app__carregando"><Spinner texto="Carregando a tela..." /></div>}>
          {/* A tela nova entra com um esmaecimento curto (a chave é o caminho:
              trocar de aba por ?aba= não repete a entrada) */}
          <div key={pathname} className="app__tela">
            <Outlet />
          </div>
        </Suspense>
      </main>
      <Footer />
      {/* Página nova abre no topo; o botão voltar devolve a rolagem de antes */}
      <ScrollRestoration />
    </div>
  )
}

// Roteador em modo de dados: é o que permite restaurar a rolagem entre páginas
const router = createBrowserRouter(
  createRoutesFromElements(
    /* São dois níveis de propósito. O de fora pega falhas da Navbar e do Footer,
       que ficam fora das telas, e por isso ocupa a página inteira. O de dentro
       pega falhas de uma tela e continua desenhado no meio do site, com o menu
       por cima, para a pessoa seguir navegando. Sem eles, o React Router mostra
       a pilha de chamadas para o visitante. */
    <Route errorElement={<PaginaErro />}>
      <Route element={<Layout />}>
        <Route errorElement={<PaginaErro />}>
          <Route path="/" element={<Home />} />
          <Route path="/vitrine" element={<Vitrine />} />
          <Route path="/produtos/:id" element={<ProdutoDetalhe />} />
          <Route path="/empreendedores" element={<Empreendedores />} />
          <Route path="/empreendedores/:id" element={<EmpreendedorDetalhe />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/termos" element={<Termos key="termos" tipo="TERMOS_DE_USO" />} />
          <Route path="/privacidade" element={<Termos key="privacidade" tipo="POLITICA_PRIVACIDADE" />} />
          {/* Área do empreendedor: qualquer usuário logado entra; quem ainda
              não tem negócio cadastra o seu aqui e vira EMPREENDEDOR */}
          <Route
            path="/meu-negocio"
            element={
              <RotaProtegida>
                <MeuNegocio />
              </RotaProtegida>
            }
          />
          <Route
            path="/admin"
            element={
              <RotaProtegida perfis={[PERFIS.ADMIN]}>
                <Admin />
              </RotaProtegida>
            }
          />
          <Route path="*" element={<PaginaErro naoEncontrada />} />
        </Route>
      </Route>
    </Route>
  )
)

function App() {
  return <RouterProvider router={router} />
}

export default App
