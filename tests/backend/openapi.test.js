import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'node:module'

// "API não termina quando o endpoint funciona": o contrato publicado em
// /api/docs precisa bater com o que o Express de fato atende. Este teste
// registra cada rota no momento em que os roteadores são montados e compara
// com o documento OpenAPI nos dois sentidos.

vi.mock('../../backend/src/config/prisma.js', () => ({ default: {} }))

const doBackend = createRequire(new URL('../../backend/package.json', import.meta.url))
const { Router } = doBackend('express')

// Antes de carregar as rotas: anota, para cada roteador, as rotas e as montagens
const registro = new Map()
const anotar = (roteador, item) => {
  if (!registro.has(roteador)) registro.set(roteador, [])
  registro.get(roteador).push(item)
}
const rotaOriginal = Router.prototype.route
Router.prototype.route = function (caminho) {
  const rota = rotaOriginal.call(this, caminho)
  anotar(this, { caminho, rota })
  return rota
}
const useOriginal = Router.prototype.use
Router.prototype.use = function (...args) {
  const caminho = typeof args[0] === 'string' ? args[0] : '/'
  for (const handler of args.flat()) {
    if (handler instanceof Router) anotar(this, { caminho, filho: handler })
  }
  return useOriginal.apply(this, args)
}

const { default: rotasDaApi } = await import('../../backend/src/routes/index.js')
const { default: rotasDeWebhook } = await import('../../backend/src/routes/webhookRoutes.js')
const { especificacaoOpenApi, ENDPOINTS } = await import('../../backend/src/docs/openapi.js')

const juntar = (prefixo, caminho) => `${prefixo}/${caminho}`.replace(/\/+/g, '/').replace(/(.)\/$/, '$1')
const paraOpenApi = (caminho) => caminho.replace(/:(\w+)/g, '{$1}')

/** "get /produtos/{id}" de cada rota registrada a partir de um roteador */
function rotasDe(roteador, prefixo = '') {
  const saida = []
  for (const item of registro.get(roteador) ?? []) {
    if (item.filho) {
      saida.push(...rotasDe(item.filho, juntar(prefixo, item.caminho)))
      continue
    }
    for (const metodo of Object.keys(item.rota.methods).filter((m) => m !== '_all')) {
      saida.push(`${metodo} ${paraOpenApi(juntar(prefixo, item.caminho))}`)
    }
  }
  return saida
}

const registradas = [...rotasDe(rotasDaApi), ...rotasDe(rotasDeWebhook, '/webhooks')].sort()
const documento = especificacaoOpenApi()
const documentadas = Object.entries(documento.paths)
  .flatMap(([caminho, operacoes]) => Object.keys(operacoes).map((metodo) => `${metodo} ${caminho}`))
  .sort()

describe('contrato OpenAPI x rotas do Express', () => {
  it('encontrou as rotas da API (o registro funcionou)', () => {
    expect(registradas.length).toBeGreaterThan(50)
    expect(registradas).toContain('get /produtos/{id}')
    expect(registradas).toContain('post /empreendedores/{id}/avaliacoes')
  })

  it('toda rota registrada está documentada', () => {
    expect(registradas.filter((rota) => !documentadas.includes(rota))).toEqual([])
  })

  it('todo endpoint documentado existe de verdade', () => {
    expect(documentadas.filter((rota) => !registradas.includes(rota))).toEqual([])
  })

  it('cada método + URI aparece uma vez só', () => {
    const chaves = ENDPOINTS.map(([metodo, caminho]) => `${metodo} ${caminho}`)
    expect(new Set(chaves).size).toBe(chaves.length)
  })
})

describe('padrão REST: recurso na URI, intenção no método', () => {
  // Verbos que denunciam RPC na URI (/getProdutos, /deletarProduto). As
  // operações de autenticação e as simulações de pagamento são ações, não
  // recursos, e estão documentadas como tal.
  const ACOES_PERMITIDAS = /^\/(auth\/|assinaturas\/\{id\}\/simular-)/
  const VERBOS = /\/(get|listar|buscar|cadastrar|criar|alterar|atualizar|deletar|excluir|remover|salvar)/i

  it('nenhuma URI de recurso carrega verbo de CRUD', () => {
    const comVerbo = Object.keys(documento.paths).filter((c) => !ACOES_PERMITIDAS.test(c) && VERBOS.test(c))
    expect(comVerbo).toEqual([])
  })

  it('recursos no plural e em minúsculas, sem barra no fim', () => {
    for (const caminho of Object.keys(documento.paths)) {
      expect(caminho).toBe(caminho.toLowerCase().replace(/\{(\w+)\}/g, (_, p) => `{${p}}`).replace(/\/$/, '') || '/')
    }
  })

  it('POST que cria recurso responde 201; DELETE e PUT não respondem 201', () => {
    for (const [caminho, operacoes] of Object.entries(documento.paths)) {
      if (operacoes.delete) expect(operacoes.delete.responses['201'], `delete ${caminho}`).toBeUndefined()
      if (operacoes.put) expect(operacoes.put.responses['201'], `put ${caminho}`).toBeUndefined()
    }
    const criacoes = ['/produtos', '/empreendedores', '/contatos', '/faq', '/divulgacoes', '/empreendedores/{id}/avaliacoes']
    for (const caminho of criacoes) expect(documento.paths[caminho].post.responses['201'], caminho).toBeDefined()
  })
})

describe('respostas e segurança documentadas', () => {
  const operacoes = Object.entries(documento.paths).flatMap(([caminho, ops]) =>
    Object.entries(ops).map(([metodo, op]) => ({ rota: `${metodo} ${caminho}`, op }))
  )

  it('toda operação documenta o erro inesperado (500)', () => {
    expect(operacoes.filter(({ op }) => !op.responses['500']).map(({ rota }) => rota)).toEqual([])
  })

  it('operação com corpo JSON documenta 422 (dados inválidos) e 400 (corpo ilegível)', () => {
    // O webhook lê o corpo cru para conferir a assinatura HMAC: não passa por Zod
    const comCorpo = operacoes.filter(
      ({ rota, op }) => op.requestBody?.content['application/json'] && !rota.includes('/webhooks/')
    )
    expect(comCorpo.length).toBeGreaterThan(20)
    const semRespostas = comCorpo.filter(({ op }) => !op.responses['422'] || !op.responses['400'])
    expect(semRespostas.map(({ rota }) => rota)).toEqual([])
  })

  it('operação protegida exige o token e documenta 401 e 403', () => {
    const protegidas = operacoes.filter(({ op }) => op.security?.length)
    expect(protegidas.length).toBeGreaterThan(30)
    for (const { rota, op } of protegidas) {
      expect(op.security, rota).toEqual([{ bearerAuth: [] }])
      expect(op.responses['401'], rota).toBeDefined()
      expect(op.responses['403'], rota).toBeDefined()
    }
  })

  it('o erro de validação segue o formato { message, errors: { campo: [mensagens] } }', () => {
    const { ErroValidacao } = documento.components.schemas
    expect(ErroValidacao.required).toEqual(['success', 'message', 'errors'])
    expect(ErroValidacao.properties.errors.additionalProperties).toEqual({ type: 'array', items: { type: 'string' } })
  })

  it('os corpos vêm das regras de validação reais (Zod), com limites e obrigatórios', () => {
    const corpo = documento.paths['/produtos'].post.requestBody.content['application/json'].schema
    expect(corpo.properties.nome).toMatchObject({ type: 'string', minLength: 2 })
    expect(corpo.properties.preco).toMatchObject({ type: 'number', minimum: 0, exclusiveMinimum: true })
    expect(corpo.required).toEqual(expect.arrayContaining(['nome', 'preco']))
  })
})
