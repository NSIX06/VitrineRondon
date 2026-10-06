import { useId, useState } from 'react'
import Icone from '../Icone/Icone'
import './Acordeao.css'

/**
 * Lista de perguntas que abrem e fecham, uma aberta por vez.
 * - `itens`: [{ id, titulo, conteudo, rotulo? }]
 * O conteúdo é texto puro: o React escapa tudo, e as quebras de linha que a
 * administração digitou são mantidas pelo CSS.
 */
function Acordeao({ itens }) {
  const prefixo = useId()
  const [aberto, setAberto] = useState(null)

  return (
    <ul className="acordeao">
      {itens.map((item) => {
        const estaAberto = aberto === item.id
        const idBotao = `${prefixo}-botao-${item.id}`
        const idPainel = `${prefixo}-painel-${item.id}`
        return (
          <li key={item.id} className={`acordeao__item ${estaAberto ? 'acordeao__item--aberto' : ''}`}>
            <h3 className="acordeao__titulo">
              <button
                type="button"
                id={idBotao}
                className="acordeao__botao"
                aria-expanded={estaAberto}
                aria-controls={idPainel}
                onClick={() => setAberto(estaAberto ? null : item.id)}
              >
                <span className="acordeao__texto">
                  {item.rotulo && <span className="acordeao__rotulo">{item.rotulo}</span>}
                  {item.titulo}
                </span>
                <Icone nome="expand_more" tamanho={22} className="acordeao__seta" />
              </button>
            </h3>
            <div
              id={idPainel}
              role="region"
              aria-labelledby={idBotao}
              className="acordeao__painel"
              hidden={!estaAberto}
            >
              <p className="acordeao__conteudo">{item.conteudo}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default Acordeao
