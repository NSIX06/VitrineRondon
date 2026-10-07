// Cliente HTTP centralizado da aplicação (Fetch nativo)
// Todas as chamadas ao backend passam por aqui. O token de sessão, quando
// existe, é enviado no cabeçalho Authorization.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/** Endereço do servidor sem o /api: é de onde vêm as imagens enviadas */
export const ORIGEM_API = new URL(BASE_URL).origin
const CHAVE_TOKEN = 'vitrinelocal.token'

// Texto mostrado quando a resposta não traz uma mensagem que possamos exibir
const MENSAGENS_POR_STATUS = {
  400: 'Confira os dados informados e tente de novo.',
  401: 'Faça login para continuar.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Não encontramos o que você procurava.',
  409: 'Já existe um registro com esses dados.',
  413: 'O conteúdo enviado é grande demais.',
  429: 'Muitas tentativas seguidas. Espere um instante e tente de novo.',
  503: 'O serviço está fora do ar por um instante. Tente de novo em alguns segundos.',
}
const MENSAGEM_PADRAO = 'Não foi possível concluir a operação. Tente novamente.'

/**
 * Escolhe o que mostrar na tela a partir da mensagem que veio na resposta.
 * Só aceitamos uma frase curta, de uma linha: pilha de chamadas, HTML e
 * caminho de arquivo contam como o sistema é feito por dentro e ficam de fora,
 * mesmo que a resposta venha de um servidor no meio do caminho.
 */
export function mensagemSegura(mensagem, status) {
  const padrao = MENSAGENS_POR_STATUS[status] || MENSAGEM_PADRAO
  if (typeof mensagem !== 'string') return padrao
  // Acima de 500 a resposta pode nem ter saído da nossa API: um proxy ou o
  // próprio runtime respondem por conta própria, e o texto deles descreve a
  // infraestrutura. Nesses casos nunca aproveitamos a mensagem.
  if (status >= 500) return padrao
  const limpa = mensagem.trim()
  const pareceTecnica =
    /[<>\n\r]|\bat \b|https?:\/\/|\.(js|jsx|ts|tsx|sql):?\d*|\d{1,3}(\.\d{1,3}){3}|:\d{2,5}\b/i
  // Sem a marca `i`: são códigos do sistema operacional, sempre em maiúsculas
  // (ECONNREFUSED, ENOENT). Com ela, qualquer palavra como "expirada" casaria.
  const codigoDeSistema = /\bE[A-Z]{3,}\b/
  if (!limpa || limpa.length > 160) return padrao
  if (pareceTecnica.test(limpa) || codigoDeSistema.test(limpa)) return padrao
  return limpa
}

export function obterToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

// Guarda a última resposta de cada GET. As telas mostram o que já tinham na
// hora e atualizam por trás, em vez de apagar tudo e exibir "Carregando".
// Qualquer alteração (POST, PUT, PATCH, DELETE) ou troca de sessão limpa o
// cache, para ninguém ver dado velho de outra conta ou de antes de salvar.
const cacheDeLeitura = new Map()

/** Última resposta guardada para esse caminho com query, ou undefined */
export function lerDoCache(caminhoComQuery) {
  return cacheDeLeitura.get(caminhoComQuery)
}

export function limparCache() {
  cacheDeLeitura.clear()
}

export function definirToken(token) {
  limparCache()
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // armazenamento indisponível (modo privado, etc.): a sessão dura só a página
  }
}

// Avisa a aplicação quando o servidor responde 401 (sessão expirada ou inválida)
const ouvintesSessaoInvalida = new Set()
export function aoPerderSessao(ouvinte) {
  ouvintesSessaoInvalida.add(ouvinte)
  return () => ouvintesSessaoInvalida.delete(ouvinte)
}

/**
 * Faz uma requisição à API e devolve o JSON de resposta.
 * Lança um Error com `status` e `data` quando a resposta não é 2xx
 * ou quando há falha de rede.
 */
async function request(caminho, { method = 'GET', body, headers = {} } = {}) {
  const opcoes = {
    method,
    headers: { Accept: 'application/json', ...headers },
  }

  const token = obterToken()
  if (token) opcoes.headers.Authorization = `Bearer ${token}`

  if (body instanceof Blob) {
    // Arquivo (imagem do computador): vai como está, com o tipo dele
    opcoes.headers['Content-Type'] = body.type || 'application/octet-stream'
    opcoes.body = body
  } else if (body !== undefined) {
    opcoes.headers['Content-Type'] = 'application/json'
    opcoes.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${caminho}`, opcoes)
  } catch (falha) {
    // Falha de rede: servidor fora do ar, sem conexão, CORS etc. O motivo
    // técnico só aparece no console de quem desenvolve.
    if (import.meta.env.DEV) console.warn('Falha de rede em', caminho, falha)
    const erroRede = new Error(
      'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.'
    )
    erroRede.status = 0
    erroRede.data = null
    throw erroRede
  }

  // Respostas sem corpo (ex.: 204)
  let data = null
  const texto = await response.text()
  if (texto) {
    try {
      data = JSON.parse(texto)
    } catch {
      // Corpo que não é JSON não vem da nossa API: pode ser a página de erro de
      // um proxy, com endereços e versões de servidor. Guardamos só o registro.
      if (import.meta.env.DEV) console.warn('Resposta fora do formato em', caminho, texto.slice(0, 300))
      data = null
    }
  }

  // Alteração bem-sucedida ou não, o que estava guardado pode ter mudado
  if (method !== 'GET') limparCache()

  if (!response.ok) {
    // Sessão inválida: só avisa quando havia token (evita disparar em login errado)
    if (response.status === 401 && token && !caminho.startsWith('/auth/login')) {
      ouvintesSessaoInvalida.forEach((ouvinte) => ouvinte())
    }
    const erro = new Error(mensagemSegura(data?.message, response.status))
    erro.status = response.status
    erro.data = data
    throw erro
  }

  if (method === 'GET') cacheDeLeitura.set(caminho, data)
  return data
}

/**
 * Monta uma query string a partir de um objeto, ignorando valores vazios.
 */
export function montarQuery(params = {}) {
  const entradas = Object.entries(params).filter(
    ([, valor]) => valor !== undefined && valor !== null && valor !== ''
  )
  if (entradas.length === 0) return ''
  return `?${new URLSearchParams(entradas).toString()}`
}

const api = {
  get: (caminho, params) => request(`${caminho}${montarQuery(params)}`),
  post: (caminho, body) => request(caminho, { method: 'POST', body }),
  put: (caminho, body) => request(caminho, { method: 'PUT', body }),
  patch: (caminho, body) => request(caminho, { method: 'PATCH', body }),
  delete: (caminho) => request(caminho, { method: 'DELETE' }),
  /** Envia uma imagem do computador; a resposta traz `data.url` para salvar no cadastro */
  enviarImagem: (arquivo) => request('/uploads/imagem', { method: 'POST', body: arquivo }),
}

export default api
