import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { aoPerderSessao, definirToken, obterToken } from '../services/api'
import { AuthContext, PERFIS } from './auth'

/**
 * Sessão do usuário. O token fica no localStorage e o usuário é
 * recarregado do servidor a cada abertura da aplicação.
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  // true enquanto verifica se o token guardado ainda vale
  const [carregando, setCarregando] = useState(() => Boolean(obterToken()))

  const sair = useCallback(async ({ avisarServidor = true } = {}) => {
    if (avisarServidor && obterToken()) {
      try {
        await api.post('/auth/logout')
      } catch {
        // mesmo sem resposta do servidor a sessão local é encerrada
      }
    }
    definirToken(null)
    setUsuario(null)
  }, [])

  // Recupera a sessão ao abrir a aplicação
  useEffect(() => {
    if (!obterToken()) return undefined
    let ativo = true
    api
      .get('/auth/me')
      .then((resposta) => {
        if (ativo) setUsuario(resposta.data)
      })
      .catch(() => {
        definirToken(null)
        if (ativo) setUsuario(null)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  // Servidor respondeu 401 em alguma chamada: derruba a sessão local
  useEffect(() => aoPerderSessao(() => sair({ avisarServidor: false })), [sair])

  const entrar = useCallback((dadosSessao) => {
    definirToken(dadosSessao.token)
    setUsuario(dadosSessao.usuario)
  }, [])

  const atualizarUsuario = useCallback((parcial) => {
    setUsuario((anterior) => (anterior ? { ...anterior, ...parcial } : anterior))
  }, [])

  const valor = useMemo(
    () => ({
      usuario,
      carregando,
      autenticado: Boolean(usuario),
      ehAdmin: usuario?.perfil === PERFIS.ADMIN,
      ehEmpreendedor: usuario?.perfil === PERFIS.EMPREENDEDOR,
      entrar,
      sair,
      atualizarUsuario,
    }),
    [usuario, carregando, entrar, sair, atualizarUsuario]
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
