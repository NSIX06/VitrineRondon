import { useEffect, useState } from 'react'
import Icone from '../../components/ui/Icone/Icone'
import Datilografo from '../../components/ui/Datilografo/Datilografo'
import FundoDePontos from '../../components/ui/DotField/FundoDePontos'

/**
 * Painel ao lado dos formulários de acesso (entrar, esqueci a senha, nova
 * senha): foto do comércio de bairro, campo de pontos e uma frase escrita
 * letra por letra. Com várias fotos, só a da `ativa` aparece (as outras
 * esmaecem), o que dá a troca suave entre as abas do login.
 */
// Larguras pedidas ao Unsplash: no celular o painel é uma faixa de ~230 px
// de altura na largura da tela; no computador, metade da tela
const LARGURAS = [480, 640, 720, 960, 1200]

/** Endereço do Unsplash com largura, formato moderno (WebP/AVIF) e compressão */
function fotoNoTamanho(url, largura) {
  try {
    const endereco = new URL(url)
    if (endereco.hostname !== 'images.unsplash.com') return url
    endereco.searchParams.set('w', String(largura))
    endereco.searchParams.set('q', '50')
    endereco.searchParams.set('auto', 'format')
    endereco.searchParams.set('fit', 'crop')
    return endereco.toString()
  } catch {
    return url
  }
}

/** Verdadeiro quando a página terminou de carregar */
function usePaginaCarregada() {
  const [carregada, setCarregada] = useState(() => document.readyState === 'complete')
  useEffect(() => {
    if (carregada) return undefined
    const marcar = () => setCarregada(true)
    window.addEventListener('load', marcar, { once: true })
    return () => window.removeEventListener('load', marcar)
  }, [carregada])
  return carregada
}

function PainelAcesso({ fotos, ativa, frase, autor, reserva = frase }) {
  // A foto escondida (a da outra aba) só é pedida depois de a página carregar:
  // antes, as duas fotos de 1200 px (509 KiB) disputavam a rede no celular
  const paginaCarregada = usePaginaCarregada()
  return (
    <aside className="login__painel com-pontos" aria-label="VitrineRondon">
      {Object.entries(fotos).map(([chave, foto]) => {
        const visivel = chave === ativa
        if (!visivel && !paginaCarregada) return null
        return (
          <img
            key={chave}
            className={`login__painel-foto ${visivel ? 'login__painel-foto--ativa' : ''}`}
            src={fotoNoTamanho(foto, 720)}
            srcSet={LARGURAS.map((largura) => `${fotoNoTamanho(foto, largura)} ${largura}w`).join(', ')}
            sizes="(max-width: 860px) 60vw, 50vw"
            alt=""
            decoding="async"
            fetchPriority={visivel ? 'high' : 'low'}
          />
        )
      })}
      <div className="login__painel-sombra" aria-hidden="true" />
      <FundoDePontos tom="anil" />
      <ul className="login__selos">
        <li>
          <Icone nome="handshake" tamanho={16} />
          Sem comissão
        </li>
        <li>
          <Icone nome="chat" tamanho={16} />
          Contato direto pelo WhatsApp
        </li>
        <li>
          <Icone nome="location_on" tamanho={16} />
          Rondonópolis-MT
        </li>
      </ul>
      <blockquote className="login__citacao">
        {/* A cópia invisível da frase mais longa (reserva) segura a altura: o painel
            não cresce enquanto a frase é escrita nem muda ao trocar de aba */}
        <p className="login__citacao-frase">
          <span className="login__citacao-reserva" aria-hidden="true">
            “{reserva}”
          </span>
          <span className="login__citacao-texto">
            {/* As aspas de fechamento entram no fim da digitação: fora dela, ficavam
                soltas na posição final enquanto o resto da frase estava invisível */}
            “<Datilografo key={frase} texto={`${frase}”`} />
          </span>
        </p>
        <cite>— {autor}</cite>
      </blockquote>
    </aside>
  )
}

export default PainelAcesso
