import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { adiantarHome } from './pages/Home/consultas.js'
import { encerrarAbertura } from './services/abertura.js'

// Entrou pela página inicial: dados e código dela já começam a vir agora, e a
// abertura da primeira visita espera por eles (até o máximo dela)
const homeAdiantada = window.location.pathname === '/' ? adiantarHome() : undefined
encerrarAbertura(homeAdiantada)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
