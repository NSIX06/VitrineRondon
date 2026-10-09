import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  lerRemetente,
  configuracaoDeEmail,
  enviarEmail,
  emailDeRecuperacao,
} from '../../backend/src/services/email.js'

const MENSAGEM = { para: 'ana@exemplo.com', assunto: 'Assunto', html: '<p>Oi</p>', texto: 'Oi' }
const respostaOk = () => Promise.resolve({ ok: true, status: 200 })

afterEach(() => vi.restoreAllMocks())

describe('lerRemetente', () => {
  it('separa nome e e-mail', () => {
    expect(lerRemetente('VitrineRondon <nao-responda@vitrine.com.br>')).toEqual({
      nome: 'VitrineRondon',
      email: 'nao-responda@vitrine.com.br',
      formatado: 'VitrineRondon <nao-responda@vitrine.com.br>',
    })
  })

  it('aceita só o e-mail', () => {
    expect(lerRemetente('contato@vitrine.com.br')).toMatchObject({ nome: '', email: 'contato@vitrine.com.br' })
  })
})

describe('configuracaoDeEmail', () => {
  it('pede provedor conhecido, a chave dele e o remetente', () => {
    const base = { EMAIL_REMETENTE: 'a@b.com' }
    expect(configuracaoDeEmail({ ...base })).toBeNull()
    expect(configuracaoDeEmail({ ...base, EMAIL_PROVEDOR: 'resend' })).toBeNull()
    expect(configuracaoDeEmail({ ...base, EMAIL_PROVEDOR: 'outro', RESEND_API_KEY: 'x' })).toBeNull()
    // A chave tem que ser a do provedor escolhido
    expect(configuracaoDeEmail({ ...base, EMAIL_PROVEDOR: 'brevo', RESEND_API_KEY: 'x' })).toBeNull()
    expect(configuracaoDeEmail({ ...base, EMAIL_PROVEDOR: 'Resend', RESEND_API_KEY: 'x' })).toMatchObject({ nome: 'resend' })
  })
})

describe('enviarEmail', () => {
  it('Resend: Bearer no cabeçalho e o formato from/to/subject', async () => {
    const buscar = vi.fn(respostaOk)
    const env = { EMAIL_PROVEDOR: 'resend', RESEND_API_KEY: 're_teste', EMAIL_REMETENTE: 'Vitrine <a@b.com>' }
    expect(await enviarEmail(MENSAGEM, { env, buscar })).toEqual({ enviado: true })
    const [url, opcoes] = buscar.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(opcoes.headers.Authorization).toBe('Bearer re_teste')
    expect(JSON.parse(opcoes.body)).toEqual({
      from: 'Vitrine <a@b.com>',
      to: ['ana@exemplo.com'],
      subject: 'Assunto',
      html: '<p>Oi</p>',
      text: 'Oi',
    })
  })

  it('Brevo: chave em api-key e o formato sender/to/htmlContent', async () => {
    const buscar = vi.fn(respostaOk)
    const env = { EMAIL_PROVEDOR: 'brevo', BREVO_API_KEY: 'xkeysib-teste', EMAIL_REMETENTE: 'Vitrine <a@b.com>' }
    await enviarEmail(MENSAGEM, { env, buscar })
    const [url, opcoes] = buscar.mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(opcoes.headers['api-key']).toBe('xkeysib-teste')
    expect(JSON.parse(opcoes.body)).toEqual({
      sender: { name: 'Vitrine', email: 'a@b.com' },
      to: [{ email: 'ana@exemplo.com' }],
      subject: 'Assunto',
      htmlContent: '<p>Oi</p>',
      textContent: 'Oi',
    })
  })

  it('recusa do provedor vira { enviado: false } e o log não mostra a chave', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = { EMAIL_PROVEDOR: 'resend', RESEND_API_KEY: 're_segredo', EMAIL_REMETENTE: 'a@b.com' }
    const resultado = await enviarEmail(MENSAGEM, { env, buscar: () => Promise.resolve({ ok: false, status: 403 }) })
    expect(resultado).toEqual({ enviado: false, motivo: 'http-403' })
    expect(erro.mock.calls.flat().join(' ')).not.toContain('re_segredo')
  })

  it('falha de rede não derruba quem chamou', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = { EMAIL_PROVEDOR: 'brevo', BREVO_API_KEY: 'k', EMAIL_REMETENTE: 'a@b.com' }
    const resultado = await enviarEmail(MENSAGEM, { env, buscar: () => Promise.reject(new TypeError('fetch failed')) })
    expect(resultado).toEqual({ enviado: false, motivo: 'falha-de-rede' })
  })

  it('sem provedor: fora de produção só mostra no log; em produção avisa e não envia', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const buscar = vi.fn()
    expect(await enviarEmail(MENSAGEM, { env: { NODE_ENV: 'development' }, buscar })).toEqual({
      enviado: false,
      motivo: 'simulado',
    })
    expect(info).toHaveBeenCalled()
    expect(await enviarEmail(MENSAGEM, { env: { NODE_ENV: 'production' }, buscar })).toEqual({
      enviado: false,
      motivo: 'sem-configuracao',
    })
    expect(aviso).toHaveBeenCalled()
    expect(buscar).not.toHaveBeenCalled()
  })
})

describe('emailDeRecuperacao', () => {
  it('traz o link no HTML e no texto, com o prazo', () => {
    const { assunto, html, texto } = emailDeRecuperacao({
      nome: 'Ana Souza',
      link: 'http://site/redefinir-senha?codigo=abc',
      minutos: 30,
    })
    expect(assunto).toMatch(/nova senha/i)
    expect(texto).toContain('Olá, Ana!')
    expect(texto).toContain('http://site/redefinir-senha?codigo=abc')
    expect(texto).toContain('30 minutos')
    expect(html).toContain('href="http://site/redefinir-senha?codigo=abc"')
  })

  it('escapa o nome no HTML', () => {
    const { html } = emailDeRecuperacao({ nome: '<script>x</script>', link: 'http://s', minutos: 30 })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
