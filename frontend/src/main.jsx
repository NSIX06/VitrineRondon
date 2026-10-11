import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { adiantarHome } from './pages/Home/consultas.js'

// Entrou pela página inicial: dados e código dela já começam a vir agora
if (window.location.pathname === '/') adiantarHome()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
