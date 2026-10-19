// Pilha de cartões que se revezam, adaptada do CardSwap do React Bits
// (https://reactbits.dev, licença MIT) para o projeto: JavaScript, pausa com
// o mouse ou o foco do teclado em cima, fora da tela e com a aba escondida.
// Para quem pede menos movimento ao sistema, a pilha fica parada.
//
// A posição inicial dos cartões vem do CSS, já na primeira pintura, e o gsap
// só é baixado quando o revezamento começa: antes, ele era baixado e rodava no
// carregamento só para posicionar cartões parados, e medir os cartões
// (xPercent) obrigava o navegador a recalcular o layout no meio da tarefa.
import { Children, cloneElement, createRef, forwardRef, isValidElement, useEffect, useMemo, useRef } from 'react'
import { quandoSossegar } from '../../../services/sossego'
import './CardSwap.css'

/** O gsap (cerca de 27 KiB comprimidos), baixado uma vez, quando a pilha começa a se mexer */
let carregandoGsap = null
const carregarGsap = () => (carregandoGsap ??= import('gsap').then((modulo) => modulo.default))

export const Card = forwardRef(function Card({ className = '', ...resto }, ref) {
  return <div ref={ref} {...resto} className={`card-swap__cartao ${className}`.trim()} />
})

/** Posição de cada cartão na pilha: o da frente em 0, os de trás subindo à direita */
const posicao = (i, distX, distY, total) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
})

/** A mesma posição em CSS puro, para a primeira pintura (sem gsap e sem medir nada) */
const transformDe = (slot, inclinacao) =>
  `translate(-50%, -50%) translate3d(${slot.x}px, ${slot.y}px, ${slot.z}px) skewY(${inclinacao}deg)`

const colocar = (gsap, el, slot, inclinacao) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: inclinacao,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true,
  })

const MOVIMENTO = {
  elastico: { ease: 'elastic.out(0.6,0.9)', desce: 2, move: 2, volta: 2, sobreposicao: 0.9, atrasoVolta: 0.05 },
  suave: { ease: 'power1.inOut', desce: 0.8, move: 0.8, volta: 0.8, sobreposicao: 0.45, atrasoVolta: 0.2 },
}

/**
 * - `largura`, `altura`: tamanho de cada cartão (px)
 * - `distanciaX`, `distanciaY`: deslocamento entre os cartões da pilha
 * - `intervalo`: ms entre uma troca e outra
 * - `inclinacao`: graus de inclinação dos cartões
 * - `movimento`: 'elastico' | 'suave'
 */
function CardSwap({
  largura = 340,
  altura = 380,
  distanciaX = 50,
  distanciaY = 55,
  intervalo = 5000,
  inclinacao = 4,
  movimento = 'elastico',
  children,
}) {
  const cartoes = useMemo(() => Children.toArray(children), [children])
  const total = cartoes.length
  const refs = useMemo(() => Array.from({ length: total }, () => createRef()), [total])
  const palco = useRef(null)

  useEffect(() => {
    const config = MOVIMENTO[movimento] ?? MOVIMENTO.elastico
    let ordem = Array.from({ length: total }, (_, i) => i)
    let gsap = null
    let ativo = true

    // Menos movimento: a pilha fica parada, com o primeiro cartão na frente
    // (trocar sozinha a cada poucos segundos é movimento que a pessoa não pediu)
    if (total < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let linhaDoTempo = null
    let relogio = 0
    let pausado = false
    let comecou = false
    let foraDaTela = false

    const trocar = () => {
      const [frente, ...resto] = ordem
      const elFrente = refs[frente].current
      const tl = gsap.timeline()
      linhaDoTempo = tl

      tl.to(elFrente, { y: '+=500', duration: config.desce, ease: config.ease })
      tl.addLabel('promove', `-=${config.desce * config.sobreposicao}`)
      resto.forEach((idx, i) => {
        const slot = posicao(i, distanciaX, distanciaY, total)
        tl.set(refs[idx].current, { zIndex: slot.zIndex }, 'promove')
        tl.to(
          refs[idx].current,
          { x: slot.x, y: slot.y, z: slot.z, duration: config.move, ease: config.ease },
          `promove+=${i * 0.15}`
        )
      })

      const fundo = posicao(total - 1, distanciaX, distanciaY, total)
      tl.addLabel('volta', `promove+=${config.move * config.atrasoVolta}`)
      tl.call(() => gsap.set(elFrente, { zIndex: fundo.zIndex }), undefined, 'volta')
      tl.to(elFrente, { x: fundo.x, y: fundo.y, z: fundo.z, duration: config.volta, ease: config.ease }, 'volta')
      tl.call(() => {
        ordem = [...resto, frente]
      })
    }

    const iniciar = () => {
      relogio = window.setInterval(trocar, intervalo)
    }
    const pausar = () => {
      if (pausado) return
      pausado = true
      linhaDoTempo?.pause()
      window.clearInterval(relogio)
    }
    const retomar = () => {
      if (!pausado) return
      pausado = false
      // Antes de começar (ou do gsap chegar), retomar não inicia nada
      if (!comecou || !gsap) return
      linhaDoTempo?.play()
      iniciar()
    }
    // O foco só sai de verdade quando vai para fora da pilha
    const aoSairOFoco = (evento) => {
      if (!palco.current?.contains(evento.relatedTarget) && !foraDaTela) retomar()
    }

    const no = palco.current
    // Fora da tela (ou com a aba escondida) a pilha descansa: não gasta
    // bateria nem processador de celular simples animando o que ninguém vê
    const aoMudarVisibilidade = () => {
      if (foraDaTela || document.hidden) pausar()
      else if (!no.matches(':hover') && !no.contains(document.activeElement)) retomar()
    }
    const observador = new IntersectionObserver(([entrada]) => {
      foraDaTela = !entrada.isIntersecting
      aoMudarVisibilidade()
    })
    observador.observe(no)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)

    // O revezamento só começa depois que a página sossega (services/sossego.js):
    // rodando no carregamento, a animação travava a página. Até lá, o cartão
    // da frente fica parado no lugar, com o mesmo visual.
    const comecar = () => {
      if (!ativo || comecou) return
      comecou = true
      carregarGsap()
        .then((biblioteca) => {
          if (!ativo) return
          gsap = biblioteca
          // O gsap assume a posição que o CSS já mostrava (mesmos valores)
          refs.forEach((r, i) => colocar(gsap, r.current, posicao(i, distanciaX, distanciaY, total), inclinacao))
          if (pausado) return
          trocar()
          iniciar()
        })
        .catch(() => {
          // Sem o gsap (rede caiu), a pilha só fica parada
        })
    }
    quandoSossegar().then(comecar)

    no.addEventListener('mouseenter', pausar)
    no.addEventListener('mouseleave', retomar)
    no.addEventListener('focusin', pausar)
    no.addEventListener('focusout', aoSairOFoco)
    return () => {
      ativo = false
      observador.disconnect()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.clearInterval(relogio)
      linhaDoTempo?.kill()
      gsap?.killTweensOf(refs.map((r) => r.current))
      no.removeEventListener('mouseenter', pausar)
      no.removeEventListener('mouseleave', retomar)
      no.removeEventListener('focusin', pausar)
      no.removeEventListener('focusout', aoSairOFoco)
    }
  }, [refs, total, distanciaX, distanciaY, intervalo, inclinacao, movimento])

  return (
    <div ref={palco} className="card-swap" style={{ width: largura, height: altura }}>
      {cartoes.map((cartao, i) =>
        isValidElement(cartao)
          ? cloneElement(cartao, {
              ref: refs[i],
              style: {
                width: largura,
                height: altura,
                // Posição inicial na pilha, já na primeira pintura
                transform: transformDe(posicao(i, distanciaX, distanciaY, total), inclinacao),
                zIndex: total - i,
                ...(cartao.props.style ?? {}),
              },
            })
          : cartao
      )}
    </div>
  )
}

export default CardSwap
