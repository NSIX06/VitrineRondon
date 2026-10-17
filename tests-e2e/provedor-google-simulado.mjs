// Provedor OpenID Connect simulado, no lugar do Google, para os testes de
// ponta a ponta do login social. Faz o que o Google faz no fluxo
// "authorization code" com PKCE: confere cliente, segredo, endereço de
// retorno e o verificador PKCE, e assina o id_token (RS256) com a chave que
// publica em /chaves. A API só aceita apontar para cá fora de produção.
//
// Suba a API com (PowerShell):
//   $env:GOOGLE_CLIENT_ID='cliente-simulado'; $env:GOOGLE_CLIENT_SECRET='segredo-simulado'
//   $env:GOOGLE_URL_AUTORIZACAO='http://localhost:3999/autorizar'
//   $env:GOOGLE_URL_TOKEN='http://localhost:3999/token'
//   $env:GOOGLE_URL_CHAVES='http://localhost:3999/chaves'
//   $env:GOOGLE_EMISSOR='http://localhost:3999'; node src/server.js
import { createHash, generateKeyPairSync, randomBytes, createSign } from 'node:crypto'
import { createServer } from 'node:http'

export const PORTA = 3999
export const CLIENTE = 'cliente-simulado'
export const SEGREDO = 'segredo-simulado'
const EMISSOR = `http://localhost:${PORTA}`

const b64 = (dados) => Buffer.from(typeof dados === 'string' ? dados : JSON.stringify(dados)).toString('base64url')

export function iniciarProvedor() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: `simulada-${randomBytes(6).toString('hex')}`, alg: 'RS256', use: 'sig' }
  const codigos = new Map()
  const fila = []
  let padrao = null

  const assinar = (dados) => {
    const cabecalho = b64({ alg: 'RS256', typ: 'JWT', kid: jwk.kid })
    const corpo = b64(dados)
    const assinatura = createSign('RSA-SHA256').update(`${cabecalho}.${corpo}`).sign(privateKey).toString('base64url')
    return `${cabecalho}.${corpo}.${assinatura}`
  }

  const servidor = createServer(async (req, res) => {
    const url = new URL(req.url, EMISSOR)
    const responder = (codigo, corpo, cabecalhos = {}) => {
      res.writeHead(codigo, { 'Content-Type': 'application/json', ...cabecalhos })
      res.end(corpo === undefined ? '' : JSON.stringify(corpo))
    }

    if (url.pathname === '/chaves') return responder(200, { keys: [jwk] })

    if (url.pathname === '/autorizar') {
      const p = url.searchParams
      const voltar = new URL(p.get('redirect_uri'))
      voltar.searchParams.set('state', p.get('state'))
      const perfil = fila.shift() || padrao
      if (p.get('client_id') !== CLIENTE || p.get('code_challenge_method') !== 'S256' || !perfil) {
        voltar.searchParams.set('error', 'invalid_request')
      } else if (perfil.cancelar) {
        voltar.searchParams.set('error', 'access_denied')
      } else {
        const codigo = randomBytes(16).toString('hex')
        codigos.set(codigo, { perfil, nonce: p.get('nonce'), desafio: p.get('code_challenge'), retorno: p.get('redirect_uri') })
        voltar.searchParams.set('code', codigo)
      }
      res.writeHead(302, { Location: voltar.toString() })
      return res.end()
    }

    if (url.pathname === '/token' && req.method === 'POST') {
      let texto = ''
      for await (const parte of req) texto += parte
      const p = new URLSearchParams(texto)
      const pedido = codigos.get(p.get('code'))
      codigos.delete(p.get('code'))
      const verificadorConfere =
        pedido && createHash('sha256').update(p.get('code_verifier') || '').digest('base64url') === pedido.desafio
      if (!pedido || p.get('client_id') !== CLIENTE || p.get('client_secret') !== SEGREDO || p.get('redirect_uri') !== pedido.retorno || !verificadorConfere) {
        return responder(400, { error: 'invalid_grant' })
      }
      const agora = Math.floor(Date.now() / 1000)
      return responder(200, {
        access_token: 'simulado',
        token_type: 'Bearer',
        id_token: assinar({
          iss: EMISSOR,
          aud: CLIENTE,
          sub: pedido.perfil.sub,
          email: pedido.perfil.email,
          email_verified: true,
          name: pedido.perfil.nome,
          nonce: pedido.nonce,
          iat: agora,
          exp: agora + 300,
        }),
      })
    }
    responder(404, { error: 'not_found' })
  })

  return new Promise((pronto) => {
    servidor.listen(PORTA, () =>
      pronto({
        /** Próxima pessoa que "entra no Google" (ou { cancelar: true }) */
        proxima: (perfil) => fila.push(perfil),
        /** Pessoa usada quando a fila está vazia (logins simultâneos) */
        padrao: (perfil) => {
          padrao = perfil
        },
        parar: () => new Promise((fim) => servidor.close(fim)),
      })
    )
  })
}
