import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/auth'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import ContaForm from '../../components/forms/ContaForm/ContaForm'
import { errosDoServidor } from '../../services/validacoes'
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
 * Navegar pela vitrine não exige conta, e quem só quer avaliar entra com o
 * Google, sem cadastro. Quem já está logado (por exemplo, um cliente que
 * avaliou e agora quer anunciar) não cria outra conta aqui: cadastra o negócio
 * na conta atual, em "Meu negócio".
 */
function Cadastro() {
  const { entrar, usuario, sair, atualizarUsuario } = useAuth()
  // Plano escolhido na página de planos antes de criar a conta
  const [parametros] = useSearchParams()
  const planoPedido = parametros.get('plano') || ''

  const [versaoTermos, setVersaoTermos] = useState('')
  // Etapa 1 guardada até a etapa 2 concluir
  const [contaPendente, setContaPendente] = useState(null)
  const [erroNegocio, setErroNegocio] = useState(null)
  // Conta recusada pelo servidor no fim da etapa 2: volta à etapa 1 com o que
  // foi digitado e o erro no campo certo (antes voltava vazia, só com
  // "Dados inválidos")
  const [contaParaCorrigir, setContaParaCorrigir] = useState(null)
  // Conta e negócio criados: falta só o plano
  const [cadastrado, setCadastrado] = useState(false)
  // Fotos escolhidas no cadastro que não chegaram a ser enviadas
  const [fotosFalharam, setFotosFalharam] = useState(false)
  const [documentoAberto, setDocumentoAberto] = useState(null)

  useEffect(() => {
    api
      .get('/termos')
      .then((resposta) => setVersaoTermos(resposta.data.versao))
      .catch(() => {})
  }, [])

  // A etapa 1 só avança depois de o servidor conferir a conta com as mesmas
  // regras do cadastro (senha comum, e-mail, e-mail já cadastrado...). Se ele
  // recusar, o ContaForm mostra o erro no campo, sem sair da etapa.
  const guardarConta = async (dados) => {
    await api.post('/auth/conferir-conta', dados)
    setErroNegocio(null)
    setContaParaCorrigir(null)
    setContaPendente(dados)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * Envia as fotos escolhidas na etapa do negócio. Só agora dá: o envio exige
   * login, e a conta acabou de ser criada. Falhar aqui não desfaz o cadastro;
   * a pessoa vê um aviso e coloca as fotos depois, no "Meu negócio".
   */
  const enviarFotosPendentes = async (empreendedorId, pendentes = {}) => {
    const campos = Object.entries(pendentes)
    if (!empreendedorId || campos.length === 0) return
    const alteracoes = {}
    let falhou = false
    for (const [campo, { arquivo, foco }] of campos) {
      try {
        const resposta = await api.enviarImagem(arquivo)
        alteracoes[campo] = resposta.data.url
        alteracoes[campo === 'fotoUrl' ? 'fotoFoco' : 'logoFoco'] = foco
      } catch {
        falhou = true
      }
    }
    try {
      if (Object.keys(alteracoes).length) await api.put(`/empreendedores/${empreendedorId}`, alteracoes)
    } catch {
      falhou = true
    }
    setFotosFalharam(falhou)
  }

  // Voltar da etapa 2 para a 1 sem perder o que foi digitado
  const voltarParaConta = () => {
    setContaParaCorrigir({ dados: contaPendente, erros: null })
    setContaPendente(null)
  }

  const cadastrarEmpreendedor = async (negocio, pendentes) => {
    setErroNegocio(null)
    try {
      const resposta = await api.post('/auth/registrar-empreendedor', {
        conta: contaPendente.conta,
        negocio,
        aceites: contaPendente.aceites,
      })
      entrar(resposta.data)
      await enviarFotosPendentes(resposta.data.usuario?.empreendedorId, pendentes)
      setCadastrado(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (erro) {
      // "Já cadastrado" logo depois de uma tentativa que pareceu falhar: a
      // primeira chegou a gravar conta e negócio, só a resposta se perdeu
      // (rede ou servidor acordando). Com o e-mail e a senha que a pessoa
      // acabou de digitar, entra direto e segue para o plano.
      if (erro.status === 409) {
        try {
          const sessao = await api.post('/auth/login', {
            email: contaPendente.conta.email,
            senha: contaPendente.conta.senha,
          })
          if (sessao.data?.usuario?.empreendedorId) {
            entrar(sessao.data)
            await enviarFotosPendentes(sessao.data.usuario.empreendedorId, pendentes)
            setCadastrado(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }
          // A senha confere e a conta ainda não tem negócio (conta de cliente
          // criada antes): o negócio entra nessa mesma conta, que vira de
          // empreendedor. Antes, o cadastro travava em "e-mail já cadastrado".
          if (sessao.data?.usuario) {
            entrar(sessao.data)
            const criado = await api.post('/empreendedores/meu', negocio)
            atualizarUsuario({ perfil: 'EMPREENDEDOR', empreendedorId: criado.data.id })
            await enviarFotosPendentes(criado.data.id, pendentes)
            setCadastrado(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }
        } catch {
          // Senha não confere: é mesmo de outra pessoa; segue o caminho normal
        }
      }
      // Erro na conta (ex.: e-mail duplicado) volta para a etapa 1 com a mensagem
      const errosConta = erro.data?.errors?.filter((e) => e.campo.startsWith('conta.'))
      if (errosConta?.length || erro.status === 409) {
        setErroNegocio(
          erro.status === 409
            ? `${erro.message}. Se a conta é sua, entre com ela e cadastre o negócio em "Meu negócio".`
            : 'Confira os dados da sua conta: algum campo não foi aceito.'
        )
        setContaParaCorrigir({ dados: contaPendente, erros: errosDoServidor(erro, ['conta.', 'aceites.']) })
        setContaPendente(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      throw erro // erros do negócio ficam no EmpreendedorForm
    }
  }

  const etapaNegocio = Boolean(contaPendente) && !cadastrado
  // Já logado ao abrir: não cria outra conta por cima da sessão atual
  const jaConectado = Boolean(usuario) && !contaPendente && !cadastrado
  const etapaConta = !contaPendente && !cadastrado && !jaConectado
  const classeEtapa = (ativa, feita) => (ativa ? 'cadastro__etapa--ativa' : feita ? 'cadastro__etapa--feita' : '')

  return (
    <>
      <header className="pagina-cabecalho faixa faixa--ceu">
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
            {jaConectado && (
              <StatusMessage tipo="info" titulo={`Você já entrou como ${usuario.nome}`}>
                <p>
                  {usuario.empreendedorId
                    ? 'Esta conta já tem um negócio. Gerencie-o em "Meu negócio".'
                    : 'Cadastre o negócio nesta mesma conta: ela passa a ser de empreendedor e suas avaliações continuam com você.'}
                </p>
                <div className="cadastro__conectado-acoes">
                  <Link to="/meu-negocio" className="botao botao--destaque botao--md">
                    {usuario.empreendedorId ? 'Ir para Meu negócio' : 'Cadastrar o negócio nesta conta'}
                  </Link>
                  <button type="button" className="botao botao--secundario botao--md" onClick={() => sair()}>
                    Sair e criar outra conta
                  </button>
                </div>
              </StatusMessage>
            )}

            {etapaConta && (
              <ContaForm
                onSubmit={guardarConta}
                textoBotao="Continuar"
                versaoTermos={versaoTermos}
                valoresIniciais={contaPendente ?? contaParaCorrigir?.dados}
                errosIniciais={contaParaCorrigir?.erros}
              />
            )}

            {etapaNegocio && (
              <>
                <p className="cadastro__ola">
                  Conta de <strong>{contaPendente.conta.nome}</strong> ({contaPendente.conta.email}).{' '}
                  <button type="button" className="cadastro__voltar" onClick={voltarParaConta}>
                    Editar dados da conta
                  </button>
                </p>
                <EmpreendedorForm
                  initialData={{
                    responsavel: contaPendente.conta.nome,
                    whatsapp: contaPendente.conta.telefone,
                  }}
                  onSubmit={cadastrarEmpreendedor}
                  adiarEnvioDeImagens
                  onCancelar={voltarParaConta}
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
                {fotosFalharam && (
                  <StatusMessage tipo="aviso" titulo="As fotos não foram enviadas">
                    <p>Seu cadastro está salvo. Coloque as fotos depois, em Meu negócio.</p>
                  </StatusMessage>
                )}
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
            <p>Entre com ela para cadastrar o negócio na mesma conta ou gerenciar o que já tem.</p>
            <Link to="/login" state={{ de: '/meu-negocio' }} className="botao botao--secundario botao--md">
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
