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

// Sem tela adiante no histórico, o Avançar segue o caminho do menu do site,
// e não fica apagado sem levar a lugar nenhum
const SEQUENCIA = [
  ['/', '/vitrine', 'Vitrine'],
  ['/vitrine', '/empreendedores', 'Empreendedores'],
  ['/produtos/', '/empreendedores', 'Empreendedores'],
  ['/empreendedores/', '/planos', 'Planos'],
  ['/empreendedores', '/planos', 'Planos'],
  ['/planos', '/contato', 'Contato'],
  ['/cadastro', '/planos', 'Planos'],
  ['/contato', '/sobre', 'Sobre'],
  ['/sobre', '/', 'Início'],
  ['/termos', '/privacidade', 'Política de Privacidade'],
  ['/privacidade', '/contato', 'Contato'],
  ['/esqueci-senha', '/login', 'Entrar'],
]

/** Próxima tela do caminho do site para o endereço atual */
function proximaDoSite(caminho) {
  const achada = SEQUENCIA.find(([base]) => (base.endsWith('/') && base !== '/' ? caminho.startsWith(base) : caminho === base))
  return achada ? { para: achada[1], rotulo: achada[2] } : { para: '/vitrine', rotulo: 'Vitrine' }
}

/**
 * Setas para ir e voltar entre as telas.
 * - Voltar: volta no histórico; quem chegou por um link de fora ou abriu o
 *   endereço direto não tem tela anterior no site, e aí vai para `para`.
 *   No roteador de dados, a primeira entrada do histórico tem a chave "default".
 * - Avançar: refaz o caminho depois de um Voltar; sem tela adiante, segue para
 *   a próxima do site (ou `proxima`, quando a tela informa a dela).
 */
function Voltar({ para = '/', rotulo = 'Voltar', proxima }) {
  const navigate = useNavigate()
  const location = useLocation()
  const temPaginaAnterior = location.key !== 'default'
  const podeAvancar = usePodeAvancar()
  const seguinte = proxima ?? proximaDoSite(location.pathname)
  const dicaAvancar = podeAvancar ? 'Ir para a tela seguinte' : `Avançar para ${seguinte.rotulo}`

  return (
    <nav className="navegacao" aria-label="Navegação entre telas">
      {temPaginaAnterior ? (
        <button type="button" className="navegacao__tecla voltar" onClick={() => navigate(-1)}>
          <Icone nome="arrow_back" tamanho={18} />
          Voltar
        </button>
      ) : (
        <Link to={para} className="navegacao__tecla voltar">
          <Icone nome="arrow_back" tamanho={18} />
          {rotulo}
        </Link>
      )}

      <button
        type="button"
        className="navegacao__tecla avancar"
        onClick={() => (podeAvancar ? navigate(1) : navigate(seguinte.para))}
        title={dicaAvancar}
        aria-label={dicaAvancar}
      >
        Avançar
        <Icone nome="arrow_forward" tamanho={18} />
      </button>
    </nav>
  )
}

export default Voltar
