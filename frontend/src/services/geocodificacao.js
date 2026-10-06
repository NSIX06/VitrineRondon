// Geocodificação de endereços com o Nominatim (OpenStreetMap).
// Serviço público, sem chave. Uso leve e com identificação da aplicação,
// conforme a política de uso do Nominatim.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

/** Monta uma linha de endereço legível a partir dos campos do formulário */
export function montarEnderecoTexto(campos) {
  const rua = [campos.endereco, campos.numero].filter(Boolean).join(', ')
  return [rua, campos.bairro, campos.cidade, campos.estado].filter(Boolean).join(', ')
}

/**
 * Procura as coordenadas de um endereço.
 * Retorna { latitude, longitude, descricao } ou null quando não encontra.
 * Lança erro em falha de rede.
 */
export async function geocodificarEndereco(campos) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'br',
    'accept-language': 'pt-BR',
    street: [campos.numero, campos.endereco].filter(Boolean).join(' '),
    city: campos.cidade || '',
    state: campos.estado || '',
    postalcode: campos.cep || '',
  })

  const resposta = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!resposta.ok) throw new Error(`Nominatim respondeu ${resposta.status}`)

  let resultados = await resposta.json()

  // Segunda tentativa, mais flexível: consulta livre com o endereço inteiro
  if (!Array.isArray(resultados) || resultados.length === 0) {
    const livre = new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'br',
      'accept-language': 'pt-BR',
      q: `${montarEnderecoTexto(campos)}, Brasil`,
    })
    const segunda = await fetch(`${NOMINATIM_URL}?${livre.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    if (!segunda.ok) throw new Error(`Nominatim respondeu ${segunda.status}`)
    resultados = await segunda.json()
  }

  if (!Array.isArray(resultados) || resultados.length === 0) return null

  const [primeiro] = resultados
  return {
    latitude: Number(Number(primeiro.lat).toFixed(6)),
    longitude: Number(Number(primeiro.lon).toFixed(6)),
    descricao: primeiro.display_name,
  }
}

// Cache por endereço: a página do negócio pode ser aberta várias vezes, e o
// Nominatim pede uso leve (no máximo uma consulta por segundo)
const cache = new Map()

/** Como geocodificarEndereco, mas guarda o resultado enquanto a página vive */
export function coordenadasDoEndereco(campos) {
  const chave = montarEnderecoTexto(campos)
  if (!chave) return Promise.resolve(null)
  if (!cache.has(chave)) {
    cache.set(chave, geocodificarEndereco(campos).catch((erro) => {
      cache.delete(chave)
      throw erro
    }))
  }
  return cache.get(chave)
}
