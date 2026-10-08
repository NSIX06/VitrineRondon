import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/auth'
import { useConsulta } from '../../hooks/useConsulta'
import { economiaAnual, nomeDoPlano, porCiclo, precoEmReais } from '../../services/planos'
import Button from '../../components/ui/Button/Button'
import Icone from '../../components/ui/Icone/Icone'
import Modal from '../../components/ui/Modal/Modal'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Voltar from '../../components/ui/Voltar/Voltar'
import ChaveCiclo from '../../components/planos/ChaveCiclo'
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

// Ícone de cada benefício do Destaque, pelo assunto do texto (os textos vêm
// do servidor, em backend/prisma/planos.js)
const ICONES_BENEFICIO = [
  [/selo/i, 'verified'],
  [/ordem das listas/i, 'trending_up'],
  [/vitrine animada|página inicial/i, 'view_carousel'],
  [/campanhas|redes/i, 'campaign'],
  [/estatísticas/i, 'monitoring'],
]
const iconeDoBeneficio = (texto) => ICONES_BENEFICIO.find(([regra]) => regra.test(texto))?.[1] ?? 'check'

// Garantias da faixa azul: só o que o sistema cumpre de verdade
const GARANTIAS = [
  {
    icone: 'event_busy',
    cor: 'ouro',
    titulo: 'Sem fidelidade',
    texto: 'Cancele quando quiser pelo painel. O negócio segue no ar até o fim do período já pago.',
  },
  {
    icone: 'percent',
    cor: 'verde',
    titulo: '0% sobre as vendas',
    texto: 'O pagamento do cliente vai direto para você, combinado pelo WhatsApp.',
  },
  {
    icone: 'bolt',
    cor: 'branco',
    titulo: 'No ar ao confirmar',
    texto: 'Pagamento aprovado, negócio publicado na hora, sem esperar análise.',
  },
]

/**
 * Página de planos: Essencial e Destaque lado a lado, com a escolha levando
 * ao checkout do gateway (modo de teste na demonstração). Um dos dois é
 * obrigatório para divulgar um negócio; navegar pela vitrine é gratuito.
 */
function Planos() {
  const { usuario, carregando: carregandoSessao } = useAuth()
  const consulta = useConsulta('/planos')
  const todosOsPlanos = consulta.dados?.data ?? []
  // Mensal ou anual, guardado na URL (?ciclo=anual) para o link levar a escolha
  const [parametros, setParametros] = useSearchParams()
  const ciclo = parametros.get('ciclo') === 'anual' ? 'ANNUALLY' : 'MONTHLY'
  const escolherCiclo = (novo) =>
    setParametros(
      (atual) => {
        const proximo = new URLSearchParams(atual)
        if (novo === 'ANNUALLY') proximo.set('ciclo', 'anual')
        else proximo.delete('ciclo')
        return proximo
      },
      { replace: true, preventScrollReset: true }
    )
  const planos = todosOsPlanos.filter((p) => p.ciclo === ciclo)
  const temAnual = todosOsPlanos.some((p) => p.ciclo === 'ANNUALLY')
  // Meses de presente do anual (o mesmo para todos os planos)
  const presenteAnual = todosOsPlanos.map((p) => economiaAnual(p, todosOsPlanos)).find(Boolean)
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
          <Icone nome={plano.destaque ? 'rocket_launch' : 'arrow_forward'} tamanho={18} />
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
        {planoAtivo
          ? 'Mudar para este plano'
          : `Assinar o ${nomeDoPlano(plano)}${plano.ciclo === 'ANNUALLY' ? ' anual' : ''}`}
        <Icone nome={plano.destaque ? 'rocket_launch' : 'arrow_forward'} tamanho={18} />
      </Button>
    )
  }

  return (
    <>
      <header className="planos-topo">
        <div className="container planos-topo__conteudo">
          <Voltar para="/" rotulo="Início" />
          <div className="planos-topo__chips">
            <span className="planos-topo__chip planos-topo__chip--ouro">
              <Icone nome="storefront" tamanho={16} />
              Planos para o comércio de bairro
            </span>
            <span className="planos-topo__chip">
              <Icone nome="handshake" tamanho={16} />
              Sem comissão sobre as vendas
            </span>
          </div>
          <h1 className="planos-topo__titulo">
            Escolha o plano para o seu <span className="planos-topo__marca-texto">negócio aparecer</span>
          </h1>
          <p className="planos-topo__texto">
            Para divulgar seu negócio no VitrineRondon, escolha um dos planos, com cobrança mensal ou anual. Sem intermediários
            nem porcentagem sobre as vendas: o cliente fala direto com você pelo{' '}
            <strong className="planos-topo__whatsapp">WhatsApp</strong>. Navegar pela vitrine continua
            gratuito para todo mundo.
          </p>
          {temAnual ? (
            <ChaveCiclo valor={ciclo} aoMudar={escolherCiclo} mesesDePresente={presenteAnual?.meses} />
          ) : (
            <span className="planos-topo__ciclo">
              <Icone nome="event_repeat" tamanho={16} />
              Cobrança mensal, sem fidelidade
            </span>
          )}
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
                <li
                  key={plano.nome}
                  className={`planos__cartao reflexo-ao-passar ${plano.destaque ? 'planos__cartao--destaque' : ''}`}
                >
                  {plano.destaque && (
                    <span className="planos__fita">
                      <Icone nome="workspace_premium" tamanho={16} />
                      Mais popular
                    </span>
                  )}

                  <div className="planos__topo">
                    <span className="planos__chip">
                      {plano.destaque && <Icone nome="star" tamanho={14} />}
                      {plano.destaque ? 'Negócio em destaque' : 'Para quem está começando'}
                    </span>
                    <span className="planos__icone" aria-hidden="true">
                      <Icone nome={plano.destaque ? 'campaign' : 'storefront'} tamanho={22} />
                    </span>
                  </div>

                  <div className="planos__nome">
                    <h2 className="planos__titulo">{nomeDoPlano(plano)}</h2>
                    <span className="planos__etiqueta">
                      {plano.destaque ? 'Prioridade nas listas' : 'Presença local'}
                    </span>
                  </div>
                  <p className="planos__chamada">{plano.chamada}</p>

                  <div className="planos__preco-caixa">
                    <p className="planos__preco">
                      <strong>{precoEmReais(plano.precoCentavos)}</strong>
                      <span>{porCiclo(plano.ciclo)}</span>
                    </p>
                    {economiaAnual(plano, todosOsPlanos) && (
                      <span className="planos__preco-equivale">
                        Equivale a {precoEmReais(Math.round(plano.precoCentavos / 12))} por mês ·{' '}
                        <strong>economia de {precoEmReais(economiaAnual(plano, todosOsPlanos).centavos)}</strong>
                      </span>
                    )}
                    <span className="planos__preco-nota">
                      <Icone nome={plano.destaque ? 'star' : 'event_available'} tamanho={16} />
                      {plano.destaque
                        ? 'Tudo do Essencial, com mais exposição'
                        : `Cobrança ${plano.ciclo === 'ANNUALLY' ? 'anual' : 'mensal'}, sem fidelidade`}
                    </span>
                  </div>

                  {plano.destaque && plano.beneficios[0]?.startsWith('Tudo') && (
                    <p className="planos__inclui">
                      <Icone nome="done_all" tamanho={18} />
                      {plano.beneficios[0]}, e mais:
                    </p>
                  )}
                  <ul className="planos__beneficios">
                    {plano.beneficios
                      .filter((beneficio, i) => !(plano.destaque && i === 0 && beneficio.startsWith('Tudo')))
                      .map((beneficio) => (
                        <li key={beneficio}>
                          <span className="planos__beneficio-icone" aria-hidden="true">
                            <Icone nome={plano.destaque ? iconeDoBeneficio(beneficio) : 'check'} tamanho={16} />
                          </span>
                          <span>{beneficio}</span>
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

          </>
        )}
      </section>

      {planos.length > 0 && (
        <section className="planos-garantias" aria-label="Garantias dos planos">
          <ul className="container planos-garantias__lista">
            {GARANTIAS.map((g) => (
              <li key={g.titulo} className="planos-garantias__item">
                <span className={`planos-garantias__icone planos-garantias__icone--${g.cor}`} aria-hidden="true">
                  <Icone nome={g.icone} tamanho={24} />
                </span>
                <div>
                  <strong>{g.titulo}</strong>
                  <p>{g.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container secao planos planos--depois">
        {planos.length > 0 && (
          <>
            <div className="planos__comparacao">
              <h2>Compare os planos</h2>
              <div className="planos__tabela-rolagem">
                <table className="planos__tabela">
                  <thead>
                    <tr>
                      <th scope="col">O que você recebe</th>
                      {planos.map((plano) => (
                        <th scope="col" key={plano.nome}>
                          {nomeDoPlano(plano)}
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
