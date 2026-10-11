import { useRef } from 'react'
import Icone from '../../ui/Icone/Icone'
import { ZOOM_MAXIMO, ZOOM_MINIMO, escreverFoco, estiloDoFoco, lerFoco } from '../../../services/enquadramento'
import './AjusteEnquadramento.css'

/**
 * Enquadramento da foto: mostra a imagem nos formatos em que ela vai aparecer
 * (ex.: faixa larga da página e cartão da vitrine) e deixa a pessoa arrastar
 * para escolher o ponto que fica à vista no corte. Setas do teclado também
 * movem (Shift para passos maiores).
 * - `src`: endereço da imagem já resolvido
 * - `foco` / `onChange(novoFoco)`: "x% y%"
 * - `formatos`: [{ rotulo, proporcao: '3 / 1', redondo? }]
 * - `comZoom`: mostra o controle "Aproximar" (o zoom vai junto no foco: "x% y% 1.4")
 */
function AjusteEnquadramento({ src, foco, onChange, formatos, comZoom = false }) {
  const arrasto = useRef(null)
  const atual = lerFoco(foco)

  const comecar = (evento) => {
    evento.currentTarget.setPointerCapture(evento.pointerId)
    const caixa = evento.currentTarget.getBoundingClientRect()
    arrasto.current = { x0: evento.clientX, y0: evento.clientY, foco: atual, largura: caixa.width, altura: caixa.height }
  }

  const mover = (evento) => {
    const a = arrasto.current
    if (!a) return
    // Arrastar a foto para a direita mostra mais do lado esquerdo: o foco anda
    // ao contrário. Com zoom, a foto anda mais devagar sob o dedo.
    onChange(
      escreverFoco({
        ...a.foco,
        x: a.foco.x - ((evento.clientX - a.x0) / a.largura / a.foco.zoom) * 100,
        y: a.foco.y - ((evento.clientY - a.y0) / a.altura / a.foco.zoom) * 100,
      })
    )
  }

  const soltar = () => {
    arrasto.current = null
  }

  const teclado = (evento) => {
    const passo = evento.shiftKey ? 10 : 2
    const delta = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[evento.key]
    if (!delta) return
    evento.preventDefault()
    onChange(escreverFoco({ ...atual, x: atual.x + delta[0], y: atual.y + delta[1] }))
  }

  return (
    <div className="enquadramento">
      <div className="enquadramento__topo">
        <span className="enquadramento__titulo">
          <Icone nome="crop" tamanho={16} />
          Arraste a foto para escolher o que aparece
        </span>
        <button
          type="button"
          className="enquadramento__centralizar"
          onClick={() => onChange(escreverFoco({ x: 50, y: 50, zoom: 1 }))}
          disabled={atual.x === 50 && atual.y === 50 && atual.zoom === 1}
        >
          <Icone nome="center_focus_strong" tamanho={16} />
          Restaurar
        </button>
      </div>
      {comZoom && (
        <label className="enquadramento__zoom">
          <Icone nome="zoom_out" tamanho={18} />
          <span className="visualmente-oculto">Aproximar a foto</span>
          <input
            type="range"
            min={ZOOM_MINIMO}
            max={ZOOM_MAXIMO}
            step={0.1}
            value={atual.zoom}
            onChange={(evento) => onChange(escreverFoco({ ...atual, zoom: Number(evento.target.value) }))}
            aria-valuetext={`${Math.round(atual.zoom * 100)}%`}
          />
          <Icone nome="zoom_in" tamanho={18} />
          <span className="enquadramento__zoom-valor">{Math.round(atual.zoom * 100)}%</span>
        </label>
      )}
      <div className="enquadramento__previas">
        {formatos.map((formato) => (
          <figure key={formato.rotulo} className="enquadramento__previa">
            <div
              className={`enquadramento__moldura ${formato.redondo ? 'enquadramento__moldura--redonda' : ''}`}
              style={{ aspectRatio: formato.proporcao }}
              role="slider"
              tabIndex={0}
              aria-label={`Enquadramento: ${formato.rotulo}. Use as setas para mover a foto`}
              aria-valuetext={`horizontal ${atual.x}%, vertical ${atual.y}%`}
              onPointerDown={comecar}
              onPointerMove={mover}
              onPointerUp={soltar}
              onPointerCancel={soltar}
              onKeyDown={teclado}
            >
              <img src={src} alt="" draggable={false} style={estiloDoFoco(foco)} />
              <span className="enquadramento__mao" aria-hidden="true">
                <Icone nome="open_with" tamanho={18} />
              </span>
            </div>
            <figcaption>{formato.rotulo}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

export default AjusteEnquadramento
