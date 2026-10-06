import { Link } from 'react-router-dom'
import Icone from '../../ui/Icone/Icone'
import './Footer.css'

const redesSociais = [
  {
    nome: 'Instagram',
    href: 'https://instagram.com/vitrinelocal',
    caminho:
      'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.2-.1 1.6-.1 4.8-.1zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z',
  },
  {
    nome: 'WhatsApp',
    href: 'https://wa.me/5519990000000',
    caminho:
      'M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.004.57 1.777.783 2.806.783 3.182 0 5.768-2.587 5.768-5.766.001-3.18-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.823 0-3.539-.493-5.013-1.353l-6.987 1.83 1.875-6.84c-.958-1.536-1.506-3.344-1.506-5.284 0-5.514 4.486-10 10-10 5.514 0 10 4.486 10 10z',
  },
  {
    nome: 'Facebook',
    href: 'https://facebook.com/vitrinelocal',
    caminho:
      'M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.2H7.3V14h2.8v8z',
  },
  {
    nome: 'YouTube',
    href: 'https://youtube.com/@vitrinelocal',
    caminho:
      'M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z',
  },
]

function Footer() {
  const anoAtual = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="serrilha" aria-hidden="true" />
      <div className="container">
        <div className="footer__colunas">
          <div className="footer__coluna">
            <span className="footer__marca">
              <span className="letreiro letreiro--claro" data-texto="Vitrine">Vitrine</span>
              <span className="letreiro letreiro--ouro" data-texto="Local">Local</span>
            </span>
            <p className="footer__texto">
              Uma vitrine digital para quem produz e trabalha perto de você. Feito para
              microempreendedores que ainda não têm presença na internet.
            </p>
            <ul className="footer__redes" aria-label="Redes sociais">
              {redesSociais.map((rede) => (
                <li key={rede.nome}>
                  <a href={rede.href} target="_blank" rel="noopener noreferrer" aria-label={rede.nome} title={rede.nome}>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path fill="currentColor" d={rede.caminho} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav className="footer__coluna" aria-label="Links do rodapé">
            <span className="footer__titulo">Navegue</span>
            <Link to="/vitrine">Vitrine de produtos</Link>
            <Link to="/empreendedores">Empreendedores do bairro</Link>
            <Link to="/contato">Contato e Ajuda</Link>
            <Link to="/sobre">Sobre o projeto</Link>
          </nav>

          <div className="footer__coluna">
            <span className="footer__titulo">Compromisso social</span>
            <div className="footer__ods">
              <span className="footer__ods-selo">
                <Icone nome="handshake" tamanho={22} />
                ODS 8 ONU
              </span>
              <p className="footer__texto">
                Projeto alinhado ao ODS 8 da ONU: trabalho decente e crescimento econômico local
                sustentável.
              </p>
            </div>
          </div>
        </div>

        <div className="footer__base">
          <small>&copy; {anoAtual} VitrineLocal. Fomento ao comércio de bairro. Todos os direitos reservados.</small>
          <span className="footer__slogan">Feito para a economia popular</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
