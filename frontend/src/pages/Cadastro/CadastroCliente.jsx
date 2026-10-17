import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/auth'
import ContaForm from '../../components/forms/ContaForm/ContaForm'
import DocumentoLegalModal from '../../components/legal/DocumentoLegalModal/DocumentoLegalModal'
import Voltar from '../../components/ui/Voltar/Voltar'
import './Cadastro.css'

/**
 * Conta de cliente: para avaliar os negócios da vitrine. Navegar e falar com
 * quem vende continuam sem exigir conta; ela só é pedida para avaliar, para
 * cada avaliação ter um autor de verdade (uma por pessoa por negócio).
 * Depois de criar, volta para a página de onde a pessoa veio (o perfil que
 * ela queria avaliar).
 */
function CadastroCliente() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = location.state?.de || '/empreendedores'
  const [versaoTermos, setVersaoTermos] = useState('')
  const [documentoAberto, setDocumentoAberto] = useState(null)

  useEffect(() => {
    api
      .get('/termos')
      .then((resposta) => setVersaoTermos(resposta.data.versao))
      .catch(() => {})
  }, [])

  const criarConta = async ({ conta, aceites }) => {
    const resposta = await api.post('/auth/registrar', { ...conta, aceites })
    entrar(resposta.data)
    navigate(destino, { replace: true })
  }

  return (
    <>
      <header className="pagina-cabecalho faixa faixa--ceu">
        <div className="container">
          <Voltar rotulo="Voltar" />
          <span className="pagina-cabecalho__marca">Conta de cliente</span>
          <h1>Criar conta para avaliar</h1>
          <p>
            Com a conta você dá nota e comenta os negócios que já te atenderam. Seu nome aparece só como
            primeiro nome e inicial do sobrenome.
          </p>
        </div>
      </header>

      <section className="container secao cadastro">
        <div className="cadastro__principal">
          <div className="cadastro__formulario">
            <ContaForm onSubmit={criarConta} textoBotao="Criar conta" versaoTermos={versaoTermos} />
          </div>
        </div>

        <aside className="cadastro__lateral">
          <div className="cadastro__caixa">
            <h2>Já tem conta?</h2>
            <p>Entre com o seu e-mail e senha para avaliar.</p>
            <Link to="/login" state={location.state} className="botao botao--secundario botao--md">
              Entrar
            </Link>
          </div>
          <div className="cadastro__caixa">
            <h2>Quer divulgar um negócio?</h2>
            <p>O cadastro de empreendedor tem outras etapas: dados do negócio e escolha do plano.</p>
            <Link to="/cadastro" className="botao botao--secundario botao--md">
              Cadastrar meu negócio
            </Link>
          </div>
          <div className="cadastro__caixa">
            <h2>O que você aceita ao se cadastrar</h2>
            <p>
              Os{' '}
              <button type="button" className="link-em-texto" onClick={() => setDocumentoAberto('TERMOS_DE_USO')}>
                Termos de Uso
              </button>{' '}
              explicam as regras da plataforma, inclusive das avaliações. A{' '}
              <button
                type="button"
                className="link-em-texto"
                onClick={() => setDocumentoAberto('POLITICA_PRIVACIDADE')}
              >
                Política de Privacidade
              </button>{' '}
              explica quais dados guardamos e por quê, conforme a LGPD.
            </p>
            {versaoTermos && <p className="cadastro__versao">Versão vigente: {versaoTermos}</p>}
          </div>
        </aside>
      </section>

      <DocumentoLegalModal tipo={documentoAberto} aoFechar={() => setDocumentoAberto(null)} />
    </>
  )
}

export default CadastroCliente
