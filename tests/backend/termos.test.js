import { describe, it, expect, afterEach } from 'vitest'
import { TIPOS_TERMO, versaoVigente, lerTermo, montarAceites } from '../../backend/src/services/termos.js'

const versaoOriginal = process.env.TERMOS_VERSAO

afterEach(() => {
  if (versaoOriginal === undefined) delete process.env.TERMOS_VERSAO
  else process.env.TERMOS_VERSAO = versaoOriginal
})

describe('TIPOS_TERMO', () => {
  it('conhece os dois documentos legais do projeto', () => {
    expect(Object.keys(TIPOS_TERMO).sort()).toEqual(['POLITICA_PRIVACIDADE', 'TERMOS_DE_USO'])
  })
})

describe('versaoVigente', () => {
  it('usa a versão configurada no ambiente', () => {
    process.env.TERMOS_VERSAO = '2.1'
    expect(versaoVigente()).toBe('2.1')
  })

  it('cai em 1.0 quando não há configuração', () => {
    delete process.env.TERMOS_VERSAO
    expect(versaoVigente()).toBe('1.0')
  })
})

describe('lerTermo', () => {
  it.each(['TERMOS_DE_USO', 'POLITICA_PRIVACIDADE'])('lê o documento %s do disco', async (tipo) => {
    const termo = await lerTermo(tipo)
    expect(termo.tipo).toBe(tipo)
    expect(termo.titulo).toBe(TIPOS_TERMO[tipo].titulo)
    expect(termo.conteudo.length).toBeGreaterThan(200)
  })

  it('devolve a versão vigente junto do conteúdo', async () => {
    process.env.TERMOS_VERSAO = '3.0'
    expect((await lerTermo('TERMOS_DE_USO')).versao).toBe('3.0')
  })

  it('devolve nulo para tipo desconhecido, sem tocar no disco', async () => {
    expect(await lerTermo('QUALQUER_COISA')).toBeNull()
  })

  it('não aceita caminho de arquivo como tipo', async () => {
    // O tipo é uma chave conhecida, nunca um caminho: sem isso daria para pedir
    // qualquer arquivo do servidor
    expect(await lerTermo('../../backend/.env')).toBeNull()
    expect(await lerTermo('/etc/passwd')).toBeNull()
  })
})

describe('montarAceites', () => {
  it('registra um aceite para cada documento', () => {
    const aceites = montarAceites({ ip: '203.0.113.7', userAgent: 'Navegador' })
    expect(aceites.map((a) => a.tipoTermo).sort()).toEqual(['POLITICA_PRIVACIDADE', 'TERMOS_DE_USO'])
  })

  it('grava a versão vigente, o ip e o navegador de quem aceitou', () => {
    process.env.TERMOS_VERSAO = '1.5'
    const [primeiro] = montarAceites({ ip: '203.0.113.7', userAgent: 'Navegador' })
    expect(primeiro).toMatchObject({ versao: '1.5', aceito: true, ip: '203.0.113.7', userAgent: 'Navegador' })
  })

  it('aceita requisição sem ip nem navegador conhecidos', () => {
    const [primeiro] = montarAceites({ ip: null, userAgent: null })
    expect(primeiro.aceito).toBe(true)
    expect(primeiro.ip).toBeNull()
  })
})
