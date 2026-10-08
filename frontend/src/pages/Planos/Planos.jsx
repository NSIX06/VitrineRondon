import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/auth'
import { useConsulta } from '../../hooks/useConsulta'
import { porCiclo, precoEmReais } from '../../services/planos'
import Button from '../../components/ui/Button/Button'
import Icone from '../../components/ui/Icone/Icone'
import Modal from '../../components/ui/Modal/Modal'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import SeloDestaque from '../../components/ui/SeloDestaque/SeloDestaque'
import Voltar from '../../components/ui/Voltar/Voltar'
import './Planos.css'

// Linhas da comparação. O que cada plano libera vem dos campos do plano
// (destaque, metricasAmpliadas, divulgacao), e não do nome dele.
const COMPARACAO = [
  { rotulo: 'Publicação do negócio na vitrine', tem: () => true },
  { rotulo: 'Perfil comercial com fotos, produtos e serviços', tem: () => true },
  { rotulo: 'Botão direto para o WhatsApp e redes sociais', tem: () => true },
  { rotulo: 'Presença na busca, nas categorias e no mapa', tem: () => true },
  { rotulo: 'Estatísticas básicas (totais do mês)', tem: () => true },
  { rotulo: 'Selo "Negócio em Destaque"', tem: (p) => p.destaque },
  { rotulo: 'Prioridade na ordem das listas e da busca', tem: (p) => p.destaque },
  { rotulo: 'Prioridade na vitrine animada da página inicial', tem: (p) => p.destaque },
  { rotulo: 'Possibilidade de divulgação nas redes oficiais', tem: (p) => p.divulgacao },
  { rotulo: 'Estatísticas ampliadas (por dia e por produto)', tem: (p) => p.metricasAmpliadas },
]

/**
 * Página de planos: Essencial e Destaque lado a lado, com a escolha levando
 * ao checkout do gateway (modo de teste na demonstração). Um dos dois é
 * obrigatório para divulgar um negócio; navegar pela vitrine é gratuito.
 */
function Planos() {
  const { usuario, carregando: carregandoSessao } = useAuth()
  const consulta = useConsulta('/planos')
  const planos = consulta.dados?.data ?? []
  const modoTeste = consulta.dados?.modoTeste

  // Situação de quem está logado: { semNegocio } | dados de /assinaturas/minha
  const [minha, setMinha] = useState(null)
  const [escolhido, setEscolhido] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!usuario) return undefined
    let ativo = true
    api
      .get('/assinaturas/minha')
      .then((resposta) => ativo && setMinha(resposta.data))
      .catch((falha) => ativo && setMinha(falha.status === 404 ? { semNegocio: true } : null))
    return () => {
      ativo = false
    }
  }, [usuario])

  // Sem sessão, o que foi lido de outra conta não vale (ex.: depois de sair)
  const situacao = usuario ? minha : null
  const atual = situacao?.assinatura
  const planoAtivo = atual?.status === 'ATIVA' ? atual.plano.nome : null
  const pendente = situacao?.trocaPendente ?? (atual?.status === 'PENDENTE' ? atual : null)

  const irParaPagamento = async () => {
    setErro(null)
    setEnviando(true)
    try {
      // Já tem plano ativo: é troca (o atual segue até o novo ser pago)
      const resposta = planoAtivo
        ? await api.put('/assinaturas/minha', { plano: escolhido.nome })
        : await api.post('/assinaturas', { plano: escolhido.nome })
      window.location.assign(resposta.data.checkoutUrl)
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  /** Botão de cada plano, conforme a situação de quem está vendo */
  const acaoDoPlano = (plano) => {
    const variante = plano.destaque ? 'destaque' : 'primario'
    if (carregandoSessao) return null
    if (!usuario) {
      // Sem conta: o cadastro termina na escolha do plano, já marcado
      return (
        <Button to={`/cadastro?plano=${plano.nome}`} variante={variante}>
          Criar conta e assinar
        </Button>
      )
    }
    if (situacao?.semNegocio) {
      return (
        <Button to="/meu-negocio" variante="secundario">
          Cadastre seu negócio primeiro
        </Button>
      )
    }
    if (!situacao) return null
    if (planoAtivo === plano.nome) {
      return (
        <Button variante="secundario" disabled>
          <Icone nome="check_circle" tamanho={18} />
          Seu plano atual
        </Button>
      )
    }
    if (pendente?.plano.nome === plano.nome && pendente.checkoutUrl) {
      return (
        <Button href={pendente.checkoutUrl} variante={variante} target="_self" rel={undefined}>
          Continuar pagamento
        </Button>
      )
    }
    return (
      <Button onClick={() => setEscolhido(plano)} variante={variante}>
        {planoAtivo ? 'Mudar para este plano' : `Assinar o ${plano.titulo.replace(/^VitrineRondon /, '')}`}
      </Button>
    )
  }

  return (
    <>
      <header className="pagina-cabecalho">
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Para quem vende</span>
          <h1>Planos do VitrineRondon</h1>
          <p>
            Para divulgar seu negócio no VitrineRondon, escolha um dos planos mensais. Navegar pela
            vitrine continua gratuito para todo mundo.
          </p>
        </div>
      </header>

      <section className="container secao planos">
        {modoTeste && (
          <StatusMessage tipo="aviso" titulo="Ambiente de testes">
            <p>
              Os pagamentos desta página são simulados: nada é cobrado. Para testar, use o cartão{' '}
              <strong>4242 4242 4242 4242</strong>, com qualquer validade futura e qualquer CVV.
            </p>
          </StatusMessage>
        )}

        {consulta.carregando && <Spinner texto="Carregando os planos..." />}
        {consulta.erro && (
          <StatusMessage tipo="erro" titulo="Não foi possível carregar os planos">
            <p>{consulta.erro.message}</p>
          </StatusMessage>
        )}

        {planos.length > 0 && (
          <>
            {!usuario && !carregandoSessao && (
              <p className="planos__nota">
                Já tem conta? <Link to="/login" state={{ de: '/planos' }}>Entre</Link> para assinar ou renovar.
              </p>
            )}
            <ul className="planos__lista">
              {planos.map((plano) => (
                <li key={plano.nome} className={`planos__cartao ${plano.destaque ? 'planos__cartao--destaque' : ''}`}>
                  {plano.destaque && <span className="planos__popular">Mais popular</span>}
                  <h2 className="planos__titulo">{plano.titulo.replace(/^VitrineRondon /, '')}</h2>
                  <p className="planos__chamada">{plano.chamada}</p>
                  <p className="planos__preco">
                    <strong>{precoEmReais(plano.precoCentavos)}</strong>
                    <span>{porCiclo(plano.ciclo)}</span>
                  </p>
                  {plano.destaque && <SeloDestaque className="planos__selo" />}
                  <ul className="planos__beneficios">
                    {plano.beneficios.map((beneficio) => (
                      <li key={beneficio}>
                        <Icone nome="check" tamanho={18} />
                        {beneficio}
                      </li>
                    ))}
                  </ul>
                  <div className="planos__acao">{acaoDoPlano(plano)}</div>
                  {pendente?.plano.nome === plano.nome && planoAtivo && (
                    <p className="planos__nota">Troca iniciada: seu plano atual segue até este pagamento ser confirmado.</p>
                  )}
                </li>
              ))}
            </ul>

            <div className="planos__comparacao">
              <h2>Compare os planos</h2>
              <div className="planos__tabela-rolagem">
                <table className="planos__tabela">
                  <thead>
                    <tr>
                      <th scope="col">O que você recebe</th>
                      {planos.map((plano) => (
                        <th scope="col" key={plano.nome}>
                          {plano.titulo.replace(/^VitrineRondon /, '')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARACAO.map((linha) => (
                      <tr key={linha.rotulo}>
                        <th scope="row">{linha.rotulo}</th>
                        {planos.map((plano) => (
                          <td key={plano.nome}>
                            {linha.tem(plano) ? (
                              <span className="planos__sim">
                                <Icone nome="check" tamanho={18} />
                                <span className="visualmente-oculto">Incluído</span>
                              </span>
                            ) : (
                              <span className="planos__nao">
                                <span aria-hidden="true">—</span>
                                <span className="visualmente-oculto">Não incluído</span>
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="planos__transparencia">
              <Icone nome="info" tamanho={22} />
              <div>
                <h2>Transparência</h2>
                <p>
                  O plano Destaque aumenta a <strong>oportunidade de exposição</strong> do seu negócio dentro
                  da vitrine. Ele não garante número de visitas, contatos ou vendas, nem a primeira posição
                  em todas as buscas: isso depende do seu negócio e de quem procura. Os negócios no
                  Essencial continuam aparecendo na busca e nas listas normalmente.
                </p>
                <p>
                  O negócio fica publicado enquanto a assinatura estiver em dia. Se você cancelar, ele
                  continua no ar até o fim do período já pago; depois sai da vitrine, e seus dados,
                  produtos e fotos ficam guardados para quando quiser voltar.
                </p>
                <p>
                  A divulgação nas redes oficiais acontece conforme o calendário editorial, a relevância do
                  conteúdo e a sua autorização. Não há quantidade fixa de publicações. Você pode trocar de
                  plano ou cancelar quando quiser, pelo painel do seu negócio.
                </p>
              </div>
            </aside>
          </>
        )}
      </section>

      <Modal aberto={Boolean(escolhido)} titulo="Confirmar plano" onFechar={() => !enviando && setEscolhido(null)} tamanho="sm">
        {escolhido && (
          <div className="planos__confirmacao">
            <p>
              Você vai assinar o plano <strong>{escolhido.titulo}</strong> por{' '}
              <strong>
                {precoEmReais(escolhido.precoCentavos)} {porCiclo(escolhido.ciclo)}
              </strong>
              .
            </p>
            {planoAtivo && (
              <p>
                Seu plano atual continua valendo até o pagamento do novo ser confirmado. Depois disso, o
                anterior é cancelado automaticamente.
              </p>
            )}
            <p>Na próxima tela você conclui o pagamento com segurança, pelo AbacatePay.</p>
            {modoTeste && <p className="planos__nota">Ambiente de testes: o pagamento é simulado.</p>}
            {erro && (
              <StatusMessage tipo="erro" onFechar={() => setErro(null)}>
                {erro}
              </StatusMessage>
            )}
            <div className="formulario__acoes">
              <Button variante="secundario" onClick={() => setEscolhido(null)} disabled={enviando}>
                Voltar
              </Button>
              <Button variante={escolhido.destaque ? 'destaque' : 'primario'} onClick={irParaPagamento} disabled={enviando}>
                {enviando ? 'Abrindo o pagamento...' : 'Ir para o pagamento'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

export default Planos
