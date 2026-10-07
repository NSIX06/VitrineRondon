import { Suspense, lazy } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  Route,
  RouterProvider,
  ScrollRestoration,
} from 'react-router-dom'
import Navbar from './components/layout/Navbar/Navbar'
import Footer from './components/layout/Footer/Footer'
import Spinner from './components/ui/Spinner/Spinner'
import PaginaErro from './components/ui/PaginaErro/PaginaErro'
import Home from './pages/Home/Home'
import RotaProtegida from './components/auth/RotaProtegida/RotaProtegida'
import { PERFIS } from './contexts/auth'
import './App.css'

/* Cada tela vira um arquivo à parte, baixado só quando alguém entra nela: quem
   só olha a vitrine não carrega o painel do administrador nem o mapa. A home
   fica de fora porque é a porta de entrada e precisa aparecer de imediato. */
const Vitrine = lazy(() => import('./pages/Vitrine/Vitrine'))
const ProdutoDetalhe = lazy(() => import('./pages/ProdutoDetalhe/ProdutoDetalhe'))
const Empreendedores = lazy(() => import('./pages/Empreendedores/Empreendedores'))
const EmpreendedorDetalhe = lazy(() => import('./pages/EmpreendedorDetalhe/EmpreendedorDetalhe'))
const Contato = lazy(() => import('./pages/Contato/Contato'))
const Sobre = lazy(() => import('./pages/Sobre/Sobre'))
const Admin = lazy(() => import('./pages/Admin/Admin'))
const MeuNegocio = lazy(() => import('./pages/MeuNegocio/MeuNegocio'))
const Login = lazy(() => import('./pages/Login/Login'))
const Cadastro = lazy(() => import('./pages/Cadastro/Cadastro'))
const Termos = lazy(() => import('./pages/Termos/Termos'))
const Planos = lazy(() => import('./pages/Planos/Planos'))

/** Layout comum: Navbar + conteúdo da rota + Footer */
function Layout() {
  return (
    <div className="app">
      <Navbar />
      <main className="app__conteudo">
        <Suspense fallback={<div className="app__carregando"><Spinner texto="Carregando a tela..." /></div>}>
          <Outlet />
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
