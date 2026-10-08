// Pilha de cartões que se revezam, adaptada do CardSwap do React Bits
// (https://reactbits.dev, licença MIT) para o projeto: JavaScript, gsap só
// quando a pilha aparece (a página importa este arquivo sob demanda) e pausa
// com o mouse ou o foco do teclado em cima. Para quem pede menos movimento ao
// sistema, os cartões continuam se revezando, mas só trocam de lugar com um
// esmaecimento rápido, sem cair nem deslizar.
import { Children, cloneElement, createRef, forwardRef, isValidElement, useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import './CardSwap.css'

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

const colocar = (el, slot, inclinacao) =>
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
    refs.forEach((r, i) => colocar(r.current, posicao(i, distanciaX, distanciaY, total), inclinacao))

    if (total < 2) return undefined
    const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let linhaDoTempo = null
    let relogio = 0
    let pausado = false

    // Menos movimento: a pilha se reorganiza no lugar, escondida por um instante
    const trocarSemMovimento = () => {
      const [frente, ...resto] = ordem
      const todos = refs.map((r) => r.current)
      const tl = gsap.timeline()
      linhaDoTempo = tl
      tl.to(todos, { opacity: 0, duration: 0.25, ease: 'none' })
      tl.call(() => {
        ordem = [...resto, frente]
        ordem.forEach((idx, i) => colocar(refs[idx].current, posicao(i, distanciaX, distanciaY, total), inclinacao))
      })
      tl.to(todos, { opacity: 1, duration: 0.25, ease: 'none' })
    }

    const trocarComMovimento = () => {
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

    const trocar = reduzMovimento ? trocarSemMovimento : trocarComMovimento
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
      linhaDoTempo?.play()
      iniciar()
    }
    // O foco só sai de verdade quando vai para fora da pilha
    const aoSairOFoco = (evento) => {
      if (!palco.current?.contains(evento.relatedTarget)) retomar()
    }

    const no = palco.current
    // Com movimento, a primeira troca já acontece ao abrir; sem, espera o intervalo
    if (!reduzMovimento) trocar()
    iniciar()
    no.addEventListener('mouseenter', pausar)
    no.addEventListener('mouseleave', retomar)
    no.addEventListener('focusin', pausar)
    no.addEventListener('focusout', aoSairOFoco)
    return () => {
      window.clearInterval(relogio)
      linhaDoTempo?.kill()
      gsap.killTweensOf(refs.map((r) => r.current))
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
              style: { width: largura, height: altura, ...(cartao.props.style ?? {}) },
            })
          : cartao
      )}
    </div>
  )
}

export default CardSwap
