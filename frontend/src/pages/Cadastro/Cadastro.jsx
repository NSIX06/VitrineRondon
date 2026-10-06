import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth, rotaInicialPorPerfil } from '../../contexts/auth'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import ContaForm from '../../components/forms/ContaForm/ContaForm'
import DocumentoLegalModal from '../../components/legal/DocumentoLegalModal/DocumentoLegalModal'
import EmpreendedorForm from '../../components/forms/EmpreendedorForm/EmpreendedorForm'
import './Cadastro.css'
import Voltar from '../../components/ui/Voltar/Voltar'

/**
 * Cadastro de quem quer publicar um negócio, em duas etapas:
 * etapa 1 (conta + aceite, guardada em memória) e etapa 2 (dados do negócio,
 * reutilizando o EmpreendedorForm). Tudo vai ao servidor em uma única
 * requisição, para não existir conta sem negócio nem aceite órfão.
 *
 * Quem só quer navegar pela vitrine não precisa de conta, então não há
 * cadastro de visitante aqui.
 */
function Cadastro() {
  const { entrar } = useAuth()
  const navigate = useNavigate()

  const [versaoTermos, setVersaoTermos] = useState('')
  // Etapa 1 guardada até a etapa 2 concluir
  const [contaPendente, setContaPendente] = useState(null)
  const [erroNegocio, setErroNegocio] = useState(null)
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
      navigate(rotaInicialPorPerfil(resposta.data.usuario), { replace: true, state: { boasVindas: true } })
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

  const etapaNegocio = Boolean(contaPendente)

  return (
    <>
      <header className="pagina-cabecalho">
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Criar conta</span>
          <h1>Quero publicar meu negócio</h1>
          <p>
            Cadastre sua loja, serviço ou produção e apareça na vitrine do bairro. Leva menos de dois
            minutos, sem taxa de cadastro e sem comissão.
          </p>
        </div>
      </header>

      <section className="container secao cadastro">
        <div className="cadastro__principal">
          <ol className="cadastro__etapas" aria-label="Etapas do cadastro">
            <li className={!etapaNegocio ? 'cadastro__etapa--ativa' : 'cadastro__etapa--feita'}>
              <span>1</span> Sua conta
            </li>
            <li className={etapaNegocio ? 'cadastro__etapa--ativa' : ''}>
              <span>2</span> Seu negócio
            </li>
          </ol>

          {erroNegocio && (
            <StatusMessage tipo="erro" onFechar={() => setErroNegocio(null)}>
              {erroNegocio}
            </StatusMessage>
          )}

          <div className="cadastro__formulario">
            {!etapaNegocio && (
              <ContaForm
                onSubmit={guardarConta}
                textoBotao="Continuar para o negócio"
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
                  textoEnviar="Concluir cadastro"
                  textoCancelar="Voltar"
                />
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
