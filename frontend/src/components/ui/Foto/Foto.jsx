import { useEffect, useRef, useState } from 'react'
import imagemPadrao from '../../../assets/imagem-padrao.svg'
import { fontesDaImagem } from '../../../services/imagens'
import { estiloDoFoco } from '../../../services/enquadramento'
import './Foto.css'

/**
 * Foto dos negócios e dos itens, em todos os lugares onde ela aparece.
 * - pede ao Cloudinary a versão do tamanho da tela (srcset + `sizes`), em vez
 *   da original de 1600 px;
 * - enquanto carrega, o lugar mostra um brilho passando; ao chegar, a foto
 *   esmaece para dentro, sem "pular" na tela;
 * - aplica o enquadramento (`foco`: "x% y%" e zoom opcional);
 * - foto quebrada vira a ilustração padrão, sem o corte da original, ou chama
 *   `onError` quando quem usa tem outro plano (ex.: as iniciais do negócio).
 * - `sizes`: largura que a foto ocupa, como no atributo HTML ("(max-width: 600px) 100vw, 350px")
 * - `prioridade`: foto do topo da página; carrega já, sem esperar a rolagem
 */
function Foto({ valor, foco, alt = '', className = '', sizes, prioridade = false, onError }) {
  const img = useRef(null)
  const [estado, setEstado] = useState('carregando')
  const [falhou, setFalhou] = useState(false)
  const [valorAtual, setValorAtual] = useState(valor)

  // Trocou a foto: volta a mostrar o brilho até a nova chegar (ajuste feito
  // durante a renderização, sem efeito, como o React recomenda)
  if (valorAtual !== valor) {
    setValorAtual(valor)
    setFalhou(false)
    setEstado('carregando')
  }

  const { src, srcSet } = falhou || !valor ? { src: imagemPadrao } : fontesDaImagem(valor)

  // Foto que já estava no cache pode terminar antes de o React ouvir o "load"
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth) setEstado('pronta')
  }, [src])

  const aoFalhar = () => {
    if (onError) {
      onError()
      return
    }
    if (!falhou && valor) setFalhou(true)
    else setEstado('pronta')
  }

  return (
    <img
      ref={img}
      className={`foto foto--${estado} ${className}`.trim()}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      // Sem foto (ou quebrada), a ilustração fica sem o corte e o zoom da original
      style={valor && !falhou ? estiloDoFoco(foco) : undefined}
      alt={alt}
      loading={prioridade ? 'eager' : 'lazy'}
      fetchPriority={prioridade ? 'high' : undefined}
      decoding="async"
      onLoad={() => setEstado('pronta')}
      onError={aoFalhar}
    />
  )
}

export default Foto
