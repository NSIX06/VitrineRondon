// Cliente HTTP centralizado da aplicação (Fetch nativo)
// Todas as chamadas ao backend passam por aqui. O token de sessão, quando
// existe, é enviado no cabeçalho Authorization.

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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
// Erros 5xx conhecidos que a API identifica por código: o texto é daqui, e
// não da resposta, que acima de 500 nunca é aproveitada
const MENSAGENS_POR_CODIGO = {
  PAGAMENTO_INDISPONIVEL:
    'O pagamento está indisponível no momento. Seu negócio continua salvo; tente de novo mais tarde.',
}
const TEMPO_LIMITE_MS = 90_000

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

// Pedidos que passaram de LENTO_MS sem resposta: em geral é a API gratuita
// acordando (até 1 minuto). A tela mostra um aviso enquanto houver algum, em
// vez de parecer travada.
const LENTO_MS = 3000
let pedidosLentos = 0
const ouvintesLentidao = new Set()
const avisarLentidao = () => ouvintesLentidao.forEach((ouvinte) => ouvinte(pedidosLentos > 0))

/** Assina o aviso de lentidão: `ouvinte(true)` quando algum pedido passa de 3 s, `false` quando todos terminam */
export function aoMudarLentidao(ouvinte) {
  ouvintesLentidao.add(ouvinte)
  ouvinte(pedidosLentos > 0)
  return () => ouvintesLentidao.delete(ouvinte)
}

/**
 * Faz uma requisição à API e devolve o JSON de resposta.
 * Lança um Error com `status` e `data` quando a resposta não é 2xx
 * ou quando há falha de rede.
 */
async function request(caminho, { method = 'GET', body, headers = {}, respostaPronta } = {}) {
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

  // Sem limite, uma resposta que nunca chega deixava o botão em "Salvando..."
  // para sempre. 90s cobre o servidor gratuito acordando (cerca de 1 minuto).
  const controle = new AbortController()
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)
  opcoes.signal = controle.signal
  let ficouLento = false
  const relogioLento = setTimeout(() => {
    ficouLento = true
    pedidosLentos++
    avisarLentidao()
  }, LENTO_MS)

  let response
  let texto
  try {
    // respostaPronta: pedido já feito pelo script da abertura (index.html)
    response = await (respostaPronta ?? fetch(`${BASE_URL}${caminho}`, opcoes))
    texto = await response.text()
  } catch (falha) {
    if (controle.signal.aborted) {
      const erroTempo = new Error(
        'O servidor demorou demais para responder. Confira sua conexão e tente de novo em instantes.'
      )
      erroTempo.status = 0
      erroTempo.data = null
      erroTempo.tempoEsgotado = true
      throw erroTempo
    }
    // Falha de rede: servidor fora do ar, sem conexão, CORS etc. O motivo
    // técnico só aparece no console de quem desenvolve.
    if (import.meta.env.DEV) console.warn('Falha de rede em', caminho, falha)
    const erroRede = new Error(
      'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.'
    )
    erroRede.status = 0
    erroRede.data = null
    throw erroRede
  } finally {
    clearTimeout(relogio)
    clearTimeout(relogioLento)
    if (ficouLento) {
      pedidosLentos--
      avisarLentidao()
    }
  }

  // Respostas sem corpo (ex.: 204)
  let data = null
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
    const erro = new Error(MENSAGENS_POR_CODIGO[data?.codigo] ?? mensagemSegura(data?.message, response.status))
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

// Leituras a caminho: o mesmo GET pedido de novo antes de a resposta chegar
// (pré-carga da Home e a própria Home, duas telas com o mesmo dado) espera a
// mesma resposta, em vez de bater no servidor duas vezes
const leiturasEmAndamento = new Map()

// Leituras adiantadas na abertura do site (main.jsx): a tela que pedir o mesmo
// endereço logo depois recebe essa resposta, mesmo que ela já tenha chegado.
// Vale uma vez só e por pouco tempo, para nunca servir dado velho.
const leiturasAdiantadas = new Map()
const VALIDADE_ADIANTADA_MS = 10_000

/**
 * Pedido que o script da abertura (dentro do index.html, gerado no build) já
 * começou antes de este arquivo chegar: { resposta: Promise<Response>, ate }.
 * Vale uma vez só e até `ate`. A chave é a mesma das outras leituras.
 */
function pedidoDaAbertura(chave, caminhoComQuery) {
  const leituras = globalThis.__leiturasDaAbertura
  const pronta = leituras?.[chave]
  if (!pronta) return null
  delete leituras[chave]
  if (Date.now() > pronta.ate) return null
  return request(caminhoComQuery, { respostaPronta: pronta.resposta })
}

/** Começa já uma leitura que uma tela vai pedir assim que montar */
export function adiantarLeitura(caminhoComQuery) {
  const chave = `${obterToken() ?? ''} ${caminhoComQuery}`
  const pedido = pedidoDaAbertura(chave, caminhoComQuery) ?? request(caminhoComQuery)
  pedido.catch(() => {})
  leiturasAdiantadas.set(chave, { pedido, ate: Date.now() + VALIDADE_ADIANTADA_MS })
}

function lerUmaVez(caminhoComQuery) {
  // O token entra na chave: troca de sessão no meio do caminho não reaproveita
  const chave = `${obterToken() ?? ''} ${caminhoComQuery}`
  const adiantada = leiturasAdiantadas.get(chave)
  if (adiantada) {
    leiturasAdiantadas.delete(chave)
    if (Date.now() < adiantada.ate) return adiantada.pedido
  }
  if (!leiturasEmAndamento.has(chave)) {
    const pedido = (pedidoDaAbertura(chave, caminhoComQuery) ?? request(caminhoComQuery)).finally(() =>
      leiturasEmAndamento.delete(chave)
    )
    leiturasEmAndamento.set(chave, pedido)
  }
  return leiturasEmAndamento.get(chave)
}

const api = {
  get: (caminho, params) => lerUmaVez(`${caminho}${montarQuery(params)}`),
  post: (caminho, body) => request(caminho, { method: 'POST', body }),
  put: (caminho, body) => request(caminho, { method: 'PUT', body }),
  patch: (caminho, body) => request(caminho, { method: 'PATCH', body }),
  delete: (caminho) => request(caminho, { method: 'DELETE' }),
  /** Envia uma imagem do computador; a resposta traz `data.url` para salvar no cadastro */
  enviarImagem: (arquivo) => request('/uploads/imagem', { method: 'POST', body: arquivo }),
}

export default api
