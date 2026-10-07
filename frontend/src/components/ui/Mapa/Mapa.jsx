import { useEffect, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icone from '../Icone/Icone'
import { coordenadasDoEndereco, montarEnderecoTexto } from '../../../services/geocodificacao'
import './Mapa.css'

const ZOOM_EXATO = 16
const ZOOM_REGIAO = 14
// Quando o endereço é privado, o mapa mostra uma área em vez de um ponto
const RAIO_REGIAO = 600

// Alfinete desenhado nas cores da marca: evita depender das imagens do Leaflet
const alfinete = L.divIcon({
  className: 'mapa__alfinete',
  html: `<svg viewBox="0 0 24 32" width="30" height="40" aria-hidden="true">
    <path d="M12 0C5.9 0 1 4.9 1 11c0 8 11 21 11 21s11-13 11-21c0-6.1-4.9-11-11-11z" fill="#17346E" stroke="#FFC93C" stroke-width="2"/>
    <circle cx="12" cy="11" r="4" fill="#FFC93C"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -36],
})

/**
 * As propriedades do MapContainer não mudam depois do primeiro desenho, então
 * recentralizar é feito aqui. O `invalidateSize` avisa o Leaflet quando a área
 * do mapa muda de tamanho: sem isso os ladrilhos ficam fora do lugar e a tela
 * aparece vazia.
 */
function Ajustar({ posicao, zoom }) {
  const mapa = useMap()
  useEffect(() => {
    mapa.setView(posicao, zoom)
    mapa.invalidateSize()
    const observador = new ResizeObserver(() => mapa.invalidateSize())
    observador.observe(mapa.getContainer())
    return () => observador.disconnect()
  }, [mapa, posicao, zoom])
  return null
}

/**
 * Mapa do negócio, com OpenStreetMap e Leaflet (sem chave de API).
 *
 * - Com latitude e longitude salvas, marca o ponto exato.
 * - Sem coordenadas, procura o endereço no Nominatim; o resultado fica em cache
 *   enquanto a página está aberta.
 * - Com o endereço privado (`exibirEndereco` desmarcado), mostra só uma área do
 *   bairro, sem alfinete.
 * - `buscarPeloEndereco={false}` desliga a busca: usado no formulário, que só
 *   desenha o mapa depois de o empreendedor confirmar as coordenadas.
 */
function Mapa({
  latitude,
  longitude,
  endereco,
  exibirEndereco = true,
  titulo,
  buscarPeloEndereco = true,
  altura,
  aoAbrir,
}) {
  // Cuidado: Number(null) e Number('') valem 0, e o ponto (0, 0) fica no oceano.
  // Coordenada ausente precisa continuar ausente.
  const numero = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor))
  const lat = numero(latitude)
  const lng = numero(longitude)
  const temCoordenadas = Number.isFinite(lat) && Number.isFinite(lng)

  // Endereço reduzido ao bairro quando o dono prefere não divulgar o número
  const alvo = exibirEndereco ? endereco : { ...endereco, endereco: null, numero: null, cep: null }
  const textoEndereco = montarEnderecoTexto(alvo)
  const vaiBuscar = !temCoordenadas && buscarPeloEndereco && Boolean(textoEndereco)

  const [estado, setEstado] = useState(() => ({
    chave: textoEndereco,
    situacao: vaiBuscar ? 'procurando' : null,
    encontrado: null,
  }))
  // Trocou o endereço: recomeça a busca sem efeito, como o React recomenda
  if (estado.chave !== textoEndereco) {
    setEstado({ chave: textoEndereco, situacao: vaiBuscar ? 'procurando' : null, encontrado: null })
  }

  useEffect(() => {
    if (!vaiBuscar) return undefined
    let ativo = true
    coordenadasDoEndereco(alvo)
      .then((resultado) => {
        if (!ativo) return
        setEstado((atual) =>
          atual.chave === textoEndereco
            ? { ...atual, encontrado: resultado, situacao: resultado ? null : 'nao-encontrado' }
            : atual
        )
      })
      .catch(() => {
        if (!ativo) return
        setEstado((atual) => (atual.chave === textoEndereco ? { ...atual, situacao: 'falhou' } : atual))
      })
    return () => {
      ativo = false
    }
    // O endereço em texto representa todos os campos usados na busca
  }, [textoEndereco, vaiBuscar]) // eslint-disable-line react-hooks/exhaustive-deps

  const busca = estado.situacao
  const ponto = temCoordenadas
    ? [lat, lng]
    : estado.encontrado
      ? [estado.encontrado.latitude, estado.encontrado.longitude]
      : null
  const zoom = exibirEndereco ? ZOOM_EXATO : ZOOM_REGIAO
  const estilo = altura ? { height: altura } : undefined

  if (!ponto) {
    return (
      <div className="mapa mapa--vazio" style={estilo}>
        <Icone nome={busca === 'procurando' ? 'travel_explore' : 'location_off'} tamanho={28} />
        <p>
          {busca === 'procurando' && 'Procurando o endereço no mapa...'}
          {busca === 'nao-encontrado' && 'Não encontramos este endereço no mapa.'}
          {busca === 'falhou' && 'Não foi possível carregar o mapa agora.'}
          {busca === null && 'Informe o endereço e use "Localizar no mapa" para ver a prévia.'}
        </p>
        {textoEndereco && busca !== 'procurando' && (
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(textoEndereco)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={aoAbrir}
          >
            Procurar no OpenStreetMap
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="mapa" style={estilo}>
      <MapContainer
        center={ponto}
        zoom={zoom}
        // A roda do mouse continua rolando a página, e não dando zoom
        scrollWheelZoom={false}
        className="mapa__tela"
      >
        <TileLayer
          attribution='&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {exibirEndereco ? (
          <Marker position={ponto} icon={alfinete}>
            <Popup>
              <strong>{titulo}</strong>
              {textoEndereco && <span className="mapa__popup-endereco">{textoEndereco}</span>}
            </Popup>
          </Marker>
        ) : (
          <Circle
            center={ponto}
            radius={RAIO_REGIAO}
            pathOptions={{ color: '#17346E', fillColor: '#17346E', fillOpacity: 0.15, weight: 2 }}
          />
        )}
        <Ajustar posicao={ponto} zoom={zoom} />
      </MapContainer>

      <a
        className="mapa__abrir"
        href={`https://www.openstreetmap.org/?mlat=${ponto[0]}&mlon=${ponto[1]}#map=${zoom}/${ponto[0]}/${ponto[1]}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={aoAbrir}
      >
        <Icone nome="open_in_new" tamanho={16} />
        Abrir no OpenStreetMap
      </a>
    </div>
  )
}

export default Mapa
