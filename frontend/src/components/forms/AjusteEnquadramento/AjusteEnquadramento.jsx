import { useRef } from 'react'
import Icone from '../../ui/Icone/Icone'
import { FOCO_PADRAO, escreverFoco, lerFoco } from '../../../services/enquadramento'
import './AjusteEnquadramento.css'

/**
 * Enquadramento da foto: mostra a imagem nos formatos em que ela vai aparecer
 * (ex.: faixa larga da página e cartão da vitrine) e deixa a pessoa arrastar
 * para escolher o ponto que fica à vista no corte. Setas do teclado também
 * movem (Shift para passos maiores).
 * - `src`: endereço da imagem já resolvido
 * - `foco` / `onChange(novoFoco)`: "x% y%"
 * - `formatos`: [{ rotulo, proporcao: '3 / 1', redondo? }]
 */
function AjusteEnquadramento({ src, foco, onChange, formatos }) {
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
    // Arrastar a foto para a direita mostra mais do lado esquerdo: o foco anda ao contrário
    onChange(
      escreverFoco({
        x: a.foco.x - ((evento.clientX - a.x0) / a.largura) * 100,
        y: a.foco.y - ((evento.clientY - a.y0) / a.altura) * 100,
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
    onChange(escreverFoco({ x: atual.x + delta[0], y: atual.y + delta[1] }))
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
          onClick={() => onChange(FOCO_PADRAO)}
          disabled={foco === FOCO_PADRAO || !foco}
        >
          <Icone nome="center_focus_strong" tamanho={16} />
          Centralizar
        </button>
      </div>
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
              <img src={src} alt="" draggable={false} style={{ objectPosition: escreverFoco(atual) }} />
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
