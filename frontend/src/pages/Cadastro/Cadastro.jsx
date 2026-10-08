import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/auth'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import ContaForm from '../../components/forms/ContaForm/ContaForm'
import DocumentoLegalModal from '../../components/legal/DocumentoLegalModal/DocumentoLegalModal'
import EmpreendedorForm from '../../components/forms/EmpreendedorForm/EmpreendedorForm'
import EscolhaDePlano from '../../components/planos/EscolhaDePlano'
import './Cadastro.css'
import Voltar from '../../components/ui/Voltar/Voltar'

/**
 * Cadastro de quem quer divulgar um negócio, em três etapas:
 * 1. conta + aceite (guardada em memória);
 * 2. dados do negócio (EmpreendedorForm). Conta, aceite e negócio vão ao
 *    servidor numa única requisição: não existe conta sem negócio nem aceite
 *    órfão. O negócio nasce como rascunho, fora da vitrine;
 * 3. escolha do plano e pagamento. Só com o pagamento confirmado o negócio é
 *    publicado. Quem para aqui encontra o rascunho salvo no "Meu negócio".
 *
 * Navegar pela vitrine não exige conta, então não há cadastro de visitante.
 */
function Cadastro() {
  const { entrar } = useAuth()
  // Plano escolhido na página de planos antes de criar a conta
  const [parametros] = useSearchParams()
  const planoPedido = parametros.get('plano') || ''

  const [versaoTermos, setVersaoTermos] = useState('')
  // Etapa 1 guardada até a etapa 2 concluir
  const [contaPendente, setContaPendente] = useState(null)
  const [erroNegocio, setErroNegocio] = useState(null)
  // Conta e negócio criados: falta só o plano
  const [cadastrado, setCadastrado] = useState(false)
  const [documentoAberto, setDocumentoAberto] = useState(null)

  useEffect(() => {
    api
      .get('/termos')
      .then((resposta) => setVersaoTermos(resposta.data.versao))
      .catch(() => {})
  }, [])

  const guardarConta = async (dados) => {
    setContaPendente(dados)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cadastrarEmpreendedor = async (negocio) => {
    setErroNegocio(null)
    try {
      const resposta = await api.post('/auth/registrar-empreendedor', {
        conta: contaPendente.conta,
        negocio,
        aceites: contaPendente.aceites,
      })
      entrar(resposta.data)
      setCadastrado(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (erro) {
      // Erro na conta (ex.: e-mail duplicado) volta para a etapa 1 com a mensagem
      const errosConta = erro.data?.errors?.filter((e) => e.campo.startsWith('conta.'))
      if (errosConta?.length || erro.status === 409) {
        setErroNegocio(erro.message)
        setContaPendente(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      throw erro // erros do negócio ficam no EmpreendedorForm
    }
  }

  const etapaNegocio = Boolean(contaPendente) && !cadastrado
  const etapaConta = !contaPendente && !cadastrado
  const classeEtapa = (ativa, feita) => (ativa ? 'cadastro__etapa--ativa' : feita ? 'cadastro__etapa--feita' : '')

  return (
    <>
      <header className="pagina-cabecalho">
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Criar conta</span>
          <h1>Quero divulgar meu negócio</h1>
          <p>
            Crie sua conta e cadastre seu negócio. Para publicar na plataforma, escolha um dos planos
            Essencial ou Destaque, com cobrança mensal ou anual.
          </p>
        </div>
      </header>

      <section className="container secao cadastro">
        <div className="cadastro__principal">
          <ol className="cadastro__etapas" aria-label="Etapas do cadastro">
            <li className={classeEtapa(etapaConta, !etapaConta)}>
              <span>1</span> Sua conta
            </li>
            <li className={classeEtapa(etapaNegocio, cadastrado)}>
              <span>2</span> Seu negócio
            </li>
            <li className={classeEtapa(cadastrado, false)}>
              <span>3</span> Plano e pagamento
            </li>
          </ol>

          {erroNegocio && (
            <StatusMessage tipo="erro" onFechar={() => setErroNegocio(null)}>
              {erroNegocio}
            </StatusMessage>
          )}

          <div className="cadastro__formulario">
            {etapaConta && (
              <ContaForm
                onSubmit={guardarConta}
                textoBotao="Continuar"
                versaoTermos={versaoTermos}
                valoresIniciais={contaPendente}
              />
            )}

            {etapaNegocio && (
              <>
                <p className="cadastro__ola">
                  Conta de <strong>{contaPendente.conta.nome}</strong> ({contaPendente.conta.email}).{' '}
                  <button type="button" className="cadastro__voltar" onClick={() => setContaPendente(null)}>
                    Editar dados da conta
                  </button>
                </p>
                <EmpreendedorForm
                  initialData={{
                    responsavel: contaPendente.conta.nome,
                    whatsapp: contaPendente.conta.telefone,
                  }}
                  onSubmit={cadastrarEmpreendedor}
                  onCancelar={() => setContaPendente(null)}
                  textoEnviar="Continuar"
                  textoCancelar="Voltar"
                />
              </>
            )}

            {cadastrado && (
              <>
                <StatusMessage tipo="sucesso" titulo="Conta e negócio cadastrados">
                  <p>Falta pouco: escolha o plano e conclua o pagamento para publicar seu negócio na vitrine.</p>
                </StatusMessage>
                <EscolhaDePlano planoInicial={planoPedido} />
              </>
            )}
          </div>
        </div>

        <aside className="cadastro__lateral">
          <div className="cadastro__caixa">
            <h2>Só quer olhar a vitrine?</h2>
            <p>
              Navegar, buscar e falar com quem faz não exige conta. A vitrine é aberta para toda a
              cidade.
            </p>
            <Link to="/vitrine" className="botao botao--secundario botao--md">
              Ver a vitrine
            </Link>
          </div>
          <div className="cadastro__caixa">
            <h2>Já tem conta?</h2>
            <p>Entre para gerenciar seu negócio e seus produtos.</p>
            <Link to="/login" className="botao botao--secundario botao--md">
              Entrar
            </Link>
          </div>
          <div className="cadastro__caixa">
            <h2>O que você aceita ao se cadastrar</h2>
            <p>
              Os{' '}
              <button type="button" className="link-em-texto" onClick={() => setDocumentoAberto('TERMOS_DE_USO')}>
                Termos de Uso
              </button>{' '}
              explicam as regras da plataforma. A{' '}
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

export default Cadastro
