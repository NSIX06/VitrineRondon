import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  montarEnderecoTexto,
  geocodificarEndereco,
  coordenadasDoEndereco,
} from '../../frontend/src/services/geocodificacao.js'

const ENDERECO = {
  endereco: 'Rua Fernando Corrêa da Costa',
  numero: '1200',
  bairro: 'Centro',
  cidade: 'Rondonópolis',
  estado: 'MT',
}

const achou = (lat = '-16.4673', lon = '-54.6372') => ({
  ok: true,
  status: 200,
  json: async () => [{ lat, lon, display_name: 'Rondonópolis, Mato Grosso, Brasil' }],
})
const naoAchou = { ok: true, status: 200, json: async () => [] }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('montarEnderecoTexto', () => {
  it('escreve o endereço em uma linha', () => {
    expect(montarEnderecoTexto(ENDERECO)).toBe(
      'Rua Fernando Corrêa da Costa, 1200, Centro, Rondonópolis, MT'
    )
  })

  it('pula os campos que o empreendedor não preencheu', () => {
    expect(montarEnderecoTexto({ cidade: 'Rondonópolis', estado: 'MT' })).toBe('Rondonópolis, MT')
  })

  it('devolve texto vazio quando não há endereço nenhum', () => {
    expect(montarEnderecoTexto({})).toBe('')
  })
})

describe('geocodificarEndereco', () => {
  it('devolve as coordenadas encontradas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(achou()))
    const local = await geocodificarEndereco(ENDERECO)
    expect(local).toEqual({
      latitude: -16.4673,
      longitude: -54.6372,
      descricao: 'Rondonópolis, Mato Grosso, Brasil',
    })
  })

  it('procura só no Brasil e traz um resultado', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(achou())
    vi.stubGlobal('fetch', fetchFalso)
    await geocodificarEndereco(ENDERECO)
    const url = fetchFalso.mock.calls[0][0]
    expect(url).toContain('countrycodes=br')
    expect(url).toContain('limit=1')
  })

  it('arredonda a coordenada em seis casas, que já são poucos metros', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(achou('-16.46731234567', '-54.63721234567')))
    const local = await geocodificarEndereco(ENDERECO)
    expect(local.latitude).toBe(-16.467312)
  })

  it('tenta de novo, com o endereço inteiro, quando a busca por campos não acha', async () => {
    const fetchFalso = vi.fn().mockResolvedValueOnce(naoAchou).mockResolvedValueOnce(achou())
    vi.stubGlobal('fetch', fetchFalso)
    const local = await geocodificarEndereco(ENDERECO)
    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(fetchFalso.mock.calls[1][0]).toContain('q=')
    expect(local.latitude).toBe(-16.4673)
  })

  it('devolve nulo quando nem a segunda tentativa acha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(naoAchou))
    // Endereço não encontrado não vira coordenada inventada: a página avisa
    expect(await geocodificarEndereco(ENDERECO)).toBeNull()
  })

  it('avisa quando o serviço responde erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }))
    await expect(geocodificarEndereco(ENDERECO)).rejects.toThrow(/429/)
  })
})

describe('coordenadasDoEndereco', () => {
  it('consulta o serviço uma vez só para o mesmo endereço', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(achou())
    vi.stubGlobal('fetch', fetchFalso)
    const unico = { ...ENDERECO, bairro: 'Vila Aurora' }
    await coordenadasDoEndereco(unico)
    await coordenadasDoEndereco({ ...unico })
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })

  it('não consulta nada quando não há endereço', async () => {
    const fetchFalso = vi.fn()
    vi.stubGlobal('fetch', fetchFalso)
    expect(await coordenadasDoEndereco({})).toBeNull()
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('não guarda a falha: o próximo acesso tenta de novo', async () => {
    const fetchFalso = vi
      .fn()
      .mockRejectedValueOnce(new Error('sem rede'))
      .mockResolvedValue(achou())
    vi.stubGlobal('fetch', fetchFalso)
    const outro = { ...ENDERECO, bairro: 'Jardim Iguaçu' }
    await expect(coordenadasDoEndereco(outro)).rejects.toThrow('sem rede')
    await expect(coordenadasDoEndereco(outro)).resolves.toMatchObject({ latitude: -16.4673 })
  })
})
