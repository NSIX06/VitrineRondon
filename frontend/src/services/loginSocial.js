// Login com Google pelo servidor (ver backend/src/controllers/loginSocialController.js).
// O botão é um link comum: o navegador vai até a API, que leva ao Google e
// volta para /entrar/google com um código de uso único no fragmento (#).
import { useEffect, useState } from 'react'
import api, { BASE_URL } from './api'

/** Endereço que começa o login com Google e volta para `destino` depois */
export function urlDoGoogle(destino = '/') {
  const parametros = new URLSearchParams({ destino, origem: window.location.origin })
  return `${BASE_URL}/auth/google/iniciar?${parametros.toString()}`
}

/** Lê o fragmento do retorno: { codigo, destino } | { vincular, email, destino } | { erro } */
export function lerRetorno(hash) {
  const parametros = new URLSearchParams(String(hash || '').replace(/^#/, ''))
  const destino = parametros.get('destino') || '/'
  // Só caminhos do próprio site (o servidor já confere; aqui é a segunda trava)
  const destinoSeguro = destino.startsWith('/') && !destino.startsWith('//') ? destino : '/'
  if (parametros.get('codigo')) return { codigo: parametros.get('codigo'), destino: destinoSeguro }
  if (parametros.get('vincular')) {
    return { vincular: parametros.get('vincular'), email: parametros.get('email') || '', destino: destinoSeguro }
  }
  return { erro: parametros.get('erro') || 'falhou', destino: destinoSeguro }
}

export const MENSAGENS_DO_RETORNO = {
  cancelado: 'O login com o Google foi cancelado. Você pode tentar de novo quando quiser.',
  expirado: 'O login demorou demais ou começou em outra aba. Tente de novo.',
  desativada: 'Esta conta está desativada. Fale com a administração.',
  indisponivel: 'O login com o Google ainda não está disponível. Tente mais tarde.',
  falhou: 'Não foi possível confirmar o login com o Google. Tente de novo.',
}

let provedores = null

/** Quais logins externos o servidor tem configurados ({ google: true }) */
export function useProvedores() {
  const [estado, setEstado] = useState(provedores)
  useEffect(() => {
    if (provedores) return undefined
    let ativo = true
    api
      .get('/auth/provedores')
      .then((resposta) => {
        provedores = resposta.data
        if (ativo) setEstado(provedores)
      })
      .catch(() => {
        if (ativo) setEstado({ google: false })
      })
    return () => {
      ativo = false
    }
  }, [])
  return estado
}
