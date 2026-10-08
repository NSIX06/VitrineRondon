import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CardSwap, { Card } from '../ui/CardSwap/CardSwap'
import Icone from '../ui/Icone/Icone'
import SeloDestaque from '../ui/SeloDestaque/SeloDestaque'
import imagemPadrao from '../../assets/imagem-padrao.svg'
import { urlImagem } from '../../services/imagens'
import './PilhaDeNegocios.css'

// Tamanho dos cartões e da pilha conforme a largura da tela
const MEDIDAS = [
  { ate: 480, largura: 260, altura: 330, distanciaX: 12, distanciaY: 22 },
  { ate: 900, largura: 290, altura: 360, distanciaX: 30, distanciaY: 34 },
  { ate: Infinity, largura: 320, altura: 380, distanciaX: 44, distanciaY: 48 },
]
// Margem lateral da página (16px de cada lado) e a sombra amarela do cartão
const FOLGA_LATERAL = 40

/** Medidas para a largura de tela: o cartão encolhe para a pilha caber sem rolagem lateral */
function medir(quantidade, larguraTela) {
  const base = MEDIDAS.find((m) => larguraTela <= m.ate)
  const espalhamento = base.distanciaX * Math.max(quantidade - 1, 0)
  const largura = Math.min(base.largura, larguraTela - FOLGA_LATERAL - espalhamento)
  return { ...base, largura }
}

function useLarguraTela() {
  const [largura, setLargura] = useState(() => window.innerWidth)
  useEffect(() => {
    const aoRedimensionar = () => setLargura(window.innerWidth)
    window.addEventListener('resize', aoRedimensionar)
    return () => window.removeEventListener('resize', aoRedimensionar)
  }, [])
  return largura
}

/**
 * Pilha animada de negócios da Home: cada cartão é um link para a página do
 * negócio. Os do plano Destaque vêm primeiro e com o selo.
 * - `negocios`: lista já na ordem de exibição
 */
function PilhaDeNegocios({ negocios }) {
  const { largura, altura, distanciaX, distanciaY } = medir(negocios.length, useLarguraTela())
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
