import { useEffect, useId, useLayoutEffect, useRef, memo } from 'react'
import './DotField.css'

/**
 * Campo de pontos que estufa em volta do cursor (adaptado do DotField do
 * React Bits, em JavaScript). Mudanças para o site:
 * - mede o próprio contêiner (ResizeObserver), não a janela;
 * - só anima enquanto está na tela e para de desenhar quando o mouse fica parado;
 * - com "reduzir movimento" ligado, desenha os pontos uma vez e não anima.
 */
const TWO_PI = Math.PI * 2

const DotField = memo(function DotField({
  dotRadius = 1.5,
  dotSpacing = 14,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = 'rgba(168, 85, 247, 0.35)',
  gradientTo = 'rgba(180, 151, 207, 0.25)',
  glowColor = '#120F17',
  className = '',
}) {
  const canvasRef = useRef(null)
  const glowRef = useRef(null)
  const propsRef = useRef({})
  // O laço de desenho lê as props mais recentes sem reiniciar a animação
  useLayoutEffect(() => {
    propsRef.current = { dotRadius, dotSpacing, cursorRadius, cursorForce, bulgeOnly, bulgeStrength, sparkle, waveAmplitude, gradientFrom, gradientTo }
  })
  const glowId = `dot-field-glow-${useId().replace(/:/g, '')}`

  useEffect(() => {
    const canvas = canvasRef.current
    const glowEl = glowRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!ctx) return undefined
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 }
    let dots = []
    let size = { w: 0, h: 0 }
    let engagement = 0
    let glowOpacity = 0
    let frameCount = 0
    let raf = null
    let visivel = false
    let ocioso = false

    function buildDots(w, h) {
      const p = propsRef.current
      const step = p.dotRadius + p.dotSpacing
      const cols = Math.floor(w / step)
      const rows = Math.floor(h / step)
      const padX = (w % step) / 2
      const padY = (h % step) / 2
      dots = new Array(rows * cols)
      let idx = 0
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2
          const ay = padY + row * step + step / 2
          dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay }
        }
      }
    }

    function redimensionar() {
      const rect = canvas.parentElement.getBoundingClientRect()
      size = { w: rect.width, h: rect.height }
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildDots(rect.width, rect.height)
      ocioso = false
      desenhar()
    }

    function aoMover(evento) {
      // Medido a cada movimento: a página pode ter mudado de altura desde o início
      const rect = canvas.getBoundingClientRect()
      mouse.x = evento.clientX - rect.left
      mouse.y = evento.clientY - rect.top
      if (ocioso) {
        ocioso = false
        iniciar()
      }
    }

    function medirVelocidade() {
      const dx = mouse.prevX - mouse.x
      const dy = mouse.prevY - mouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      mouse.speed += (dist - mouse.speed) * 0.5
      if (mouse.speed < 0.001) mouse.speed = 0
      mouse.prevX = mouse.x
      mouse.prevY = mouse.y
    }

    function desenhar() {
      const p = propsRef.current
      const { w, h } = size
      const t = frameCount * 0.02
      const eng = engagement
      ctx.clearRect(0, 0, w, h)
      const grad = ctx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, p.gradientFrom)
      grad.addColorStop(1, p.gradientTo)
      ctx.fillStyle = grad
      const cr = p.cursorRadius
      const crSq = cr * cr
      const rad = p.dotRadius / 2
      const isBulge = p.bulgeOnly
      let mexendo = false

      ctx.beginPath()
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]
        const dx = mouse.x - d.ax
        const dy = mouse.y - d.ay
        const distSq = dx * dx + dy * dy

        if (distSq < crSq && eng > 0.01) {
          const dist = Math.sqrt(distSq)
          const angle = Math.atan2(dy, dx)
          if (isBulge) {
            const k = 1 - dist / cr
            const push = k * k * p.bulgeStrength * eng
            d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15
            d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15
          } else {
            const move = (500 / dist) * (mouse.speed * p.cursorForce)
            d.vx += Math.cos(angle) * -move
            d.vy += Math.sin(angle) * -move
          }
        } else if (isBulge) {
          d.sx += (d.ax - d.sx) * 0.1
          d.sy += (d.ay - d.sy) * 0.1
        }
        if (!isBulge) {
          d.vx *= 0.9
          d.vy *= 0.9
          d.x = d.ax + d.vx
          d.y = d.ay + d.vy
          d.sx += (d.x - d.sx) * 0.1
          d.sy += (d.y - d.sy) * 0.1
        }
        if (Math.abs(d.sx - d.ax) > 0.05 || Math.abs(d.sy - d.ay) > 0.05) mexendo = true

        let drawX = d.sx
        let drawY = d.sy
        if (p.waveAmplitude > 0 && !parado) {
          drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude
          drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5
        }
        const r = p.sparkle && !parado && (((i * 2654435761) ^ (frameCount >> 3)) >>> 0) % 100 < 3 ? rad * 1.8 : rad
        ctx.moveTo(drawX + r, drawY)
        ctx.arc(drawX, drawY, r, 0, TWO_PI)
      }
      ctx.fill()
      return mexendo
    }

    function tick() {
      raf = null
      if (!visivel) return
      frameCount++
      const alvo = Math.min(mouse.speed / 5, 1)
      engagement += (alvo - engagement) * 0.06
      if (engagement < 0.001) engagement = 0
      glowOpacity += (engagement - glowOpacity) * 0.08
      if (glowEl) {
        glowEl.setAttribute('cx', String(mouse.x))
        glowEl.setAttribute('cy', String(mouse.y))
        glowEl.style.opacity = String(glowOpacity)
      }
      const mexendo = desenhar()
      const p = propsRef.current
      // Mouse parado e pontos no lugar: para de desenhar até o próximo movimento
      if (!mexendo && engagement === 0 && glowOpacity < 0.002 && !p.sparkle && !(p.waveAmplitude > 0)) {
        ocioso = true
        return
      }
      raf = requestAnimationFrame(tick)
    }

    function iniciar() {
      if (!parado && visivel && raf === null) raf = requestAnimationFrame(tick)
    }

    const observadorTamanho = new ResizeObserver(redimensionar)
    observadorTamanho.observe(canvas.parentElement)
    const observadorTela = new IntersectionObserver(([entrada]) => {
      visivel = entrada.isIntersecting
      if (visivel) iniciar()
    })
    observadorTela.observe(canvas)
    redimensionar()

    let intervalo = null
    if (!parado) {
      intervalo = setInterval(medirVelocidade, 20)
      window.addEventListener('pointermove', aoMover, { passive: true })
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      clearInterval(intervalo)
      observadorTamanho.disconnect()
      observadorTela.disconnect()
      window.removeEventListener('pointermove', aoMover)
    }
  }, [dotRadius, dotSpacing])

  return (
    <div className={`dot-field-container ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="dot-field__canvas" />
      <svg className="dot-field__brilho">
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle ref={glowRef} cx="-9999" cy="-9999" r={glowRadius} fill={`url(#${glowId})`} style={{ opacity: 0 }} />
      </svg>
    </div>
  )
})

export default DotField
