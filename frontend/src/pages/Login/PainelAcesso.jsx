import Icone from '../../components/ui/Icone/Icone'
import Datilografo from '../../components/ui/Datilografo/Datilografo'
import FundoDePontos from '../../components/ui/DotField/FundoDePontos'

/**
 * Painel ao lado dos formulários de acesso (entrar, esqueci a senha, nova
 * senha): foto do comércio de bairro, campo de pontos e uma frase escrita
 * letra por letra. Com várias fotos, só a da `ativa` aparece (as outras
 * esmaecem), o que dá a troca suave entre as abas do login.
 */
function PainelAcesso({ fotos, ativa, frase, autor }) {
  return (
    <aside className="login__painel com-pontos" aria-label="VitrineRondon">
      {Object.entries(fotos).map(([chave, foto]) => (
        <img
          key={chave}
          className={`login__painel-foto ${chave === ativa ? 'login__painel-foto--ativa' : ''}`}
          src={foto}
          alt=""
          decoding="async"
        />
      ))}
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
        <p>
          “<Datilografo key={frase} texto={frase} />”
        </p>
        <cite>— {autor}</cite>
      </blockquote>
    </aside>
  )
}

export default PainelAcesso
