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
import { marcarSossego } from './services/sossego.js'
import { adiantarPagina } from './services/adiantamentos.js'

// Entrou pela página inicial: dados e código dela já começam a vir agora, e a
// abertura da primeira visita espera por eles (até o máximo dela)
const homeAdiantada = window.location.pathname === '/' ? adiantarHome() : undefined

// As outras páginas: código da tela e dados começam já, em paralelo
// (login, Meu negócio, Admin, Vitrine, Empreendedores, perfil e item)
if (window.location.pathname !== '/') adiantarPagina()
encerrarAbertura(homeAdiantada)
// Enfeites animados só depois que a página sossega (services/sossego.js)
marcarSossego()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
