// Registro das estatísticas do painel do empreendedor (visualizações e cliques).
//
// Vai direto pelo fetch, e não pelo cliente da API, por dois motivos:
// - keepalive: o clique no WhatsApp abre outra aba ou sai da página, e o
//   registro precisa terminar mesmo assim;
// - o cliente da API limpa o cache de leitura a cada POST, e uma contagem não
//   deve fazer a vitrine buscar tudo de novo.
// Falha aqui nunca aparece para o visitante: estatística não pode quebrar a página.
// O servidor não conta o dono do negócio, então o token vai junto quando existe.
import { BASE_URL, obterToken } from './api'

export const METRICAS = Object.freeze({
  VISUALIZACAO_PERFIL: 'VISUALIZACAO_PERFIL',
  CLIQUE_WHATSAPP: 'CLIQUE_WHATSAPP',
  CLIQUE_TELEFONE: 'CLIQUE_TELEFONE',
  CLIQUE_ENDERECO: 'CLIQUE_ENDERECO',
  CLIQUE_INSTAGRAM: 'CLIQUE_INSTAGRAM',
  VISUALIZACAO_PRODUTO: 'VISUALIZACAO_PRODUTO',
})

export function registrarMetrica(empreendedorId, tipo, produtoId) {
  if (!empreendedorId || !tipo) return
  try {
    const token = obterToken()
    fetch(`${BASE_URL}/metricas`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ empreendedorId, tipo, ...(produtoId ? { produtoId } : {}) }),
    }).catch(() => {})
  } catch {
    // fetch indisponível: segue sem contar
  }
}
