// Contexto de sessão e utilitários de perfil (separados do provider para o
// fast-refresh do Vite funcionar no AuthContext.jsx)
import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export const PERFIS = {
  COMUM: 'COMUM',
  EMPREENDEDOR: 'EMPREENDEDOR',
  ADMIN: 'ADMIN',
}

/** Para onde cada perfil vai depois de entrar */
export function rotaInicialPorPerfil(usuario) {
  if (!usuario) return '/'
  if (usuario.perfil === PERFIS.ADMIN) return '/admin'
  if (usuario.perfil === PERFIS.EMPREENDEDOR) return '/meu-negocio'
  return '/'
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return contexto
}
