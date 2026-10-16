import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Primeiro de tudo: a política de Trusted Types precisa existir antes de
// qualquer biblioteca escrever HTML (o Leaflet faz isso ao carregar)
import './services/trustedTypes.js'
// Fontes servidas pelo próprio site (geradas por scripts/baixar-fontes.mjs)
import './fontes.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { adiantarHome } from './pages/Home/consultas.js'
import { encerrarAbertura } from './services/abertura.js'
import { adiantarLeitura, obterToken } from './services/api.js'

// Entrou pela página inicial: dados e código dela já começam a vir agora, e a
// abertura da primeira visita espera por eles (até o máximo dela)
const homeAdiantada = window.location.pathname === '/' ? adiantarHome() : undefined

// Vai cair no login (a própria página, ou uma área restrita sem sessão): a
// tela de login começa a baixar já, em vez de esperar o React decidir o
// redirecionamento (a foto dela é o maior elemento da tela no celular)
const caminho = window.location.pathname
const semSessao = !obterToken()
if (caminho === '/login' || (semSessao && /^\/(meu-negocio|admin)(\/|$)/.test(caminho))) {
  import('./pages/Login/Login.jsx').catch(() => {})
}

// Área do empreendedor ou do admin com sessão: o código da tela e os dados
// começam a vir junto com a confirmação da sessão, e não um depois do outro
if (!semSessao && /^\/meu-negocio(\/|$)/.test(caminho)) {
  import('./pages/MeuNegocio/MeuNegocio.jsx').catch(() => {})
  adiantarLeitura('/auth/me')
  adiantarLeitura('/empreendedores/meu')
  const aba = new URLSearchParams(window.location.search).get('aba')
  if (aba === 'plano') adiantarLeitura('/assinaturas/minha')
  if (aba === 'desempenho') adiantarLeitura('/metricas/meu-negocio?dias=30')
}
if (!semSessao && /^\/admin(\/|$)/.test(caminho)) {
  import('./pages/Admin/Admin.jsx').catch(() => {})
  adiantarLeitura('/auth/me')
}
encerrarAbertura(homeAdiantada)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
