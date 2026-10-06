import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import Icone from '../Icone/Icone'
import './Voltar.css'

/* Recarregar a página zera o que sabemos do histórico: um avançar aceso que
   não leva a lugar nenhum confunde mais do que um apagado, então recomeçamos
   da posição atual em vez de lembrar a de antes. */
let maiorPosicao = window.history.state?.idx ?? 0

/**
 * O roteador guarda a posição da tela atual dentro do histórico em
 * `history.state.idx`. Comparando com a maior posição já visitada dá para saber
 * se existe tela adiante: só existe depois de voltar. Abrir um link novo apaga
 * o que havia à frente, e é isso que o tipo PUSH indica.
 *
 * A maior posição fica fora do componente porque cada tela monta o seu próprio
 * par de setas: guardada aqui dentro, ela se perderia justamente na troca de
 * tela que precisamos medir. A conta é idempotente, então pode acontecer
 * durante o render.
 */
function usePodeAvancar() {
  const tipo = useNavigationType()
  const posicao = window.history.state?.idx ?? 0
  // A conta depende só da posição atual e dá sempre o mesmo resultado, então
  // repetir o render não muda nada.
  // oxlint-disable-next-line react/globals
  maiorPosicao = tipo === 'PUSH' ? posicao : Math.max(maiorPosicao, posicao)
  return posicao < maiorPosicao
}

/**
 * Setas para ir e voltar entre as telas já vistas.
 * Quando a pessoa chegou por um link de fora ou abriu o endereço direto, não há
 * página anterior dentro do site: aí a seta leva para `para`, um caminho seguro.
 * No roteador de dados, a primeira entrada do histórico tem a chave "default".
 */
function Voltar({ para = '/', rotulo = 'Voltar' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const temPaginaAnterior = location.key !== 'default'
  const podeAvancar = usePodeAvancar()

  return (
    <nav className="navegacao" aria-label="Navegação entre telas">
      {temPaginaAnterior ? (
        <button type="button" className="voltar" onClick={() => navigate(-1)}>
          <Icone nome="arrow_back" tamanho={18} />
          Voltar
        </button>
      ) : (
        <Link to={para} className="voltar">
          <Icone nome="arrow_back" tamanho={18} />
          {rotulo}
        </Link>
      )}

      <button
        type="button"
        className="avancar"
        onClick={() => navigate(1)}
        disabled={!podeAvancar}
        title={podeAvancar ? 'Ir para a tela seguinte' : 'Não há tela seguinte'}
      >
        Avançar
        <Icone nome="arrow_forward" tamanho={18} />
      </button>
    </nav>
  )
}

export default Voltar
