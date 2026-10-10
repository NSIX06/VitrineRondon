import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CardSwap, { Card } from '../ui/CardSwap/CardSwap'
import Icone from '../ui/Icone/Icone'
import SeloDestaque from '../ui/SeloDestaque/SeloDestaque'
import imagemPadrao from '../../assets/imagem-padrao.svg'
import { urlImagem } from '../../services/imagens'
import { estiloDoFoco } from '../../services/enquadramento'
import SeloNovo from '../ui/SeloNovo/SeloNovo'
import { ehNovidade } from '../../services/novidades'
import './PilhaDeNegocios.css'

// Tamanho dos cartões conforme o espaço que a pilha tem (e não a tela: no topo
// da Home ela divide a largura com o texto)
const MEDIDAS = [
  { ate: 360, largura: 250, altura: 320, distanciaX: 12, distanciaY: 20 },
  { ate: 480, largura: 270, altura: 340, distanciaX: 20, distanciaY: 26 },
  { ate: Infinity, largura: 320, altura: 380, distanciaX: 36, distanciaY: 42 },
]
// Sombra amarela do cartão, que fica para fora dele
const FOLGA_SOMBRA = 10

/** Medidas para o espaço disponível: o cartão encolhe para a pilha caber inteira */
function medir(quantidade, disponivel) {
  const base = MEDIDAS.find((m) => disponivel <= m.ate)
  const espalhamento = base.distanciaX * Math.max(quantidade - 1, 0)
  const largura = Math.max(200, Math.min(base.largura, disponivel - FOLGA_SOMBRA - espalhamento))
  return { ...base, largura }
}

/** Largura do elemento, acompanhando as mudanças (tela girada, janela redimensionada) */
function useLarguraDe(ref) {
  const [largura, setLargura] = useState(null)
  useEffect(() => {
    const no = ref.current
    if (!no) return undefined
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.round(entrada.contentRect.width)))
    observador.observe(no)
    return () => observador.disconnect()
  }, [ref])
  return largura
}

/**
 * Pilha animada de negócios da Home: cada cartão é um link para a página do
 * negócio. Os do plano Destaque vêm primeiro e com o selo.
 * - `negocios`: lista já na ordem de exibição
 */
function PilhaDeNegocios({ negocios }) {
  const area = useRef(null)
  const disponivel = useLarguraDe(area)

  // A área é sempre o mesmo elemento: é ela que o ResizeObserver acompanha
  return (
    <div ref={area} className="pilha-negocios__area">
      {/* Antes de medir o espaço, só a área vazia (um quadro): nada pula depois */}
      {disponivel && <Pilha negocios={negocios} disponivel={disponivel} />}
    </div>
  )
}

function Pilha({ negocios, disponivel }) {
  const { largura, altura, distanciaX, distanciaY } = medir(negocios.length, disponivel)
  // Espaço para os cartões de trás, que saem para cima e para a direita
  const espalhamentoX = distanciaX * (negocios.length - 1)
  const espalhamentoY = distanciaY * (negocios.length - 1)

  return (
    // A pilha é o atalho visual para o mouse; teclado e leitor de tela usam a
    // lista de nomes ao lado (cartões de trás ficam meio escondidos e o foco
    // cairia neles fora de vista)
    <div
      className="pilha-negocios"
      style={{ paddingTop: espalhamentoY, paddingRight: espalhamentoX }}
      aria-hidden="true"
    >
      <CardSwap largura={largura} altura={altura} distanciaX={distanciaX} distanciaY={distanciaY} intervalo={4500}>
        {negocios.map((negocio) => (
          <Card
            key={negocio.id}
            className={`pilha-negocios__cartao ${negocio.emDestaque ? 'pilha-negocios__cartao--destaque' : ''}`}
          >
            <Link to={`/empreendedores/${negocio.id}`} className="pilha-negocios__link" tabIndex={-1}>
              <span className="pilha-negocios__foto">
                <img
                  src={urlImagem(negocio.fotoUrl) || imagemPadrao}
                  style={estiloDoFoco(negocio.fotoFoco)}
                  alt=""
                  decoding="async"
                  onError={(evento) => {
                    evento.currentTarget.src = imagemPadrao
                  }}
                />
              </span>
              <span className="pilha-negocios__corpo">
                <span className="pilha-negocios__etiquetas">
                  <span className="tag tag--categoria">{negocio.categoria}</span>
                  {negocio.emDestaque && <SeloDestaque compacto />}
                  {ehNovidade(negocio.publicadoDesde) && <SeloNovo compacto />}
                </span>
                <strong className="pilha-negocios__nome">{negocio.nomeNegocio}</strong>
                <span className="pilha-negocios__local">
                  {[negocio.bairro, negocio.cidade].filter(Boolean).join(', ')}
                </span>
                {negocio.descricao && <span className="pilha-negocios__descricao">{negocio.descricao}</span>}
                <span className="pilha-negocios__acao">
                  Conhecer negócio
                  <Icone nome="arrow_forward" tamanho={18} />
                </span>
              </span>
            </Link>
          </Card>
        ))}
      </CardSwap>
    </div>
  )
}

export default PilhaDeNegocios
