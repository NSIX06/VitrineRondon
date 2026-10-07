import { describe, it, expect, vi, afterEach } from 'vitest'
import api, { ORIGEM_API } from '../../frontend/src/services/api.js'
import {
  ehImagemEnviada,
  ehLinkDeImagem,
  problemaNoArquivo,
  urlImagem,
} from '../../frontend/src/services/imagens.js'

const ENVIADA = '/uploads/3f2b8c1e-9a4d-4e7f-8b2a-1c5d6e7f8a9b.webp'

/** Arquivo de mentira: o suficiente para a checagem antes do envio */
const arquivo = (type, size = 1000) => ({ type, size })

describe('urlImagem', () => {
  it('aponta a imagem enviada para o servidor da API, sem o /api', () => {
    expect(ORIGEM_API).not.toMatch(/\/api$/)
    expect(urlImagem(ENVIADA)).toBe(`${ORIGEM_API}${ENVIADA}`)
  })

  it('deixa o link externo das imagens antigas do jeito que está', () => {
    expect(urlImagem('https://exemplo.com/bolo.jpg')).toBe('https://exemplo.com/bolo.jpg')
  })

  it.each([null, undefined, ''])('devolve %s sem mexer, para cair na imagem padrão', (vazio) => {
    expect(urlImagem(vazio)).toBe(vazio)
  })
})

describe('ehImagemEnviada e ehLinkDeImagem', () => {
  it('separam arquivo enviado de link', () => {
    expect(ehImagemEnviada(ENVIADA)).toBe(true)
    expect(ehLinkDeImagem(ENVIADA)).toBe(false)
    expect(ehLinkDeImagem('https://exemplo.com/a.jpg')).toBe(true)
    expect(ehImagemEnviada('https://exemplo.com/a.jpg')).toBe(false)
  })

  it('trata a foto guardada no Cloudinary como enviada, e o endereço passa intacto', () => {
    const naNuvem = 'https://res.cloudinary.com/conta/image/upload/v1/vitrinelocal/abc.webp'
    expect(ehImagemEnviada(naNuvem)).toBe(true)
    expect(urlImagem(naNuvem)).toBe(naNuvem)
  })

  it('não confunde texto solto com link', () => {
    expect(ehLinkDeImagem('foto.png')).toBe(false)
    expect(ehLinkDeImagem('javascript:alert(1)')).toBe(false)
  })
})

describe('problemaNoArquivo', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('aceita %s', (tipo) => {
    expect(problemaNoArquivo(arquivo(tipo))).toBeNull()
  })

  it('recusa SVG e PDF antes de enviar', () => {
    expect(problemaNoArquivo(arquivo('image/svg+xml'))).toMatch(/Formato não aceito/)
    expect(problemaNoArquivo(arquivo('application/pdf'))).toMatch(/Formato não aceito/)
  })

  it('recusa arquivo acima de 5 MB', () => {
    expect(problemaNoArquivo(arquivo('image/jpeg', 5 * 1024 * 1024 + 1))).toMatch(/5 MB/)
  })

  it('pede um arquivo quando nada foi escolhido', () => {
    expect(problemaNoArquivo(undefined)).toBe('Escolha uma imagem.')
  })
})

describe('api.enviarImagem', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('manda o arquivo cru, com o tipo dele, e não como JSON', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { url: ENVIADA } }), { status: 201 })
    )
    vi.stubGlobal('fetch', fetchFalso)
    const foto = new Blob(['pixels'], { type: 'image/png' })

    const resposta = await api.enviarImagem(foto)

    const [endereco, opcoes] = fetchFalso.mock.calls[0]
    expect(endereco).toMatch(/\/uploads\/imagem$/)
    expect(opcoes.method).toBe('POST')
    expect(opcoes.headers['Content-Type']).toBe('image/png')
    expect(opcoes.body).toBe(foto)
    expect(resposta.data.url).toBe(ENVIADA)
  })
})
