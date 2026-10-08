import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useConsulta } from '../../hooks/useConsulta'
import { linkWhatsapp, numeroInternacional } from '../../services/whatsapp'
import {
  DIAS,
  agoraNoFuso,
  detalheDaSituacao,
  situacaoAtendimento,
  textoDoDia,
} from '../../services/horarios'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Button from '../../components/ui/Button/Button'
import Tag from '../../components/ui/Tag/Tag'
import Icone from '../../components/ui/Icone/Icone'
import Mapa from '../../components/ui/Mapa/MapaPreguicoso'
import { SITUACAO_NEGOCIO } from '../../services/planos'
import { METRICAS, registrarMetrica } from '../../services/metricas'
import ProdutoCard from '../../components/cards/ProdutoCard/ProdutoCard'
import imagemPadrao from '../../assets/imagem-padrao.svg'
import { useRelogio } from '../../hooks/useRelogio'
import SeloNovo from '../../components/ui/SeloNovo/SeloNovo'
import { ehNovidade } from '../../services/novidades'
import './EmpreendedorDetalhe.css'
import Voltar from '../../components/ui/Voltar/Voltar'
import { urlImagem } from '../../services/imagens'

/** Monta o link do WhatsApp com mensagem inicial */
function montarLinkWhatsapp(numero, nomeNegocio, mensagem) {
  return linkWhatsapp(
    numero,
    mensagem || `Olá! Vi o ${nomeNegocio} no VitrineRondon e gostaria de mais informações.`
  )
}

/** Formata o número para exibição: (19) 99123-4567 */
function formatarTelefone(numero) {
  const digitos = String(numero || '').replace(/\D/g, '')
  const local = digitos.startsWith('55') && digitos.length >= 12 ? digitos.slice(2) : digitos
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return numero
}

function EmpreendedorDetalhe() {
  const { id } = useParams()
  // Com cache: voltar a um empreendedor já visto é imediato. Sem manter o anterior,
  // para nunca mostrar outro empreendedor com o endereço deste
  const consulta = useConsulta(`/empreendedores/${id}`, undefined, { manterAnterior: false })
  const empreendedor = consulta.dados?.data ?? null
  const { carregando, erro } = consulta
  const negocioId = empreendedor?.id

  // Uma visualização por perfil aberto (o servidor ignora repetição e o dono)
  useEffect(() => {
    if (negocioId) registrarMetrica(negocioId, METRICAS.VISUALIZACAO_PERFIL)
  }, [negocioId])
  const contar = (tipo) => () => registrarMetrica(negocioId, tipo)
  // O selo de atendimento troca sozinho quando o horário começa ou termina
  const agora = useRelogio()

  if (carregando) return <Spinner texto="Carregando o negócio..." />

  if (erro) {
    const naoEncontrado = erro.status === 404 || erro.status === 400
    return (
      <section className="container secao">
        <StatusMessage
          tipo={naoEncontrado ? 'vazio' : 'erro'}
          titulo={naoEncontrado ? 'Empreendedor não encontrado' : 'Não foi possível carregar'}
        >
          <p>{naoEncontrado ? 'Esse negócio não existe ou não está publicado no momento.' : erro.message}</p>
          <Button to="/empreendedores" variante="secundario" tamanho="sm">
            Ver todos os empreendedores
          </Button>
        </StatusMessage>
      </section>
    )
  }

  const {
    nomeNegocio,
    responsavel,
    descricao,
    categoria,
    cidade,
    whatsapp,
    instagram,
    fotoUrl,
    ativo,
    horarios = [],
    produtos,
    endereco,
    numero,
    complemento,
    bairro,
    estado,
    cep,
    latitude,
    longitude,
    exibirEndereco,
    emDestaque,
    publicadoDesde,
    // Só vem para o dono e a administração: o público nunca recebe negócio fora da vitrine
    situacao: situacaoDoNegocio,
  } = empreendedor
  const novo = ehNovidade(publicadoDesde)
  const previa = situacaoDoNegocio && situacaoDoNegocio !== 'ATIVO' ? SITUACAO_NEGOCIO[situacaoDoNegocio] : null

  const resumoEmpreendedor = { id: empreendedor.id, nomeNegocio, cidade, whatsapp }
  const produtosComEmpreendedor = produtos.map((produto) => ({
    ...produto,
    empreendedor: resumoEmpreendedor,
  }))
  const instagramUsuario = instagram ? instagram.replace(/^@/, '') : null
  const primeiroNome = responsavel.split(' ')[0]
  const ehServico = produtos.some((p) => p.tipo === 'servico')
  const linkWhatsapp = montarLinkWhatsapp(whatsapp, nomeNegocio)
  // Base do link usada pelos cards: a mensagem do item é anexada ao final
  const linkWhatsappBase = `https://wa.me/${numeroInternacional(whatsapp)}?text=${encodeURIComponent(
    `Olá, ${primeiroNome}! Vi o ${nomeNegocio} no VitrineRondon.`
  )}`

  // Localização: com coordenadas confirmadas o mapa é exato; sem elas, usa o
  // endereço digitado. Quando o empreendedor não quer divulgar o endereço,
  // o mapa mostra apenas o bairro/cidade.
  const temCoordenadas = latitude != null && longitude != null
  const enderecoCompleto = [
    [endereco, numero].filter(Boolean).join(', '),
    complemento,
    bairro,
    `${cidade}${estado ? ` - ${estado}` : ''}`,
    cep,
  ]
    .filter(Boolean)
    .join(', ')
  const enderecoPublico = exibirEndereco && endereco
  const localResumo = [bairro, cidade].filter(Boolean).join(', ')
  // Disponível só dentro dos horários informados pelo dono (fuso de Rondonópolis)
  const situacao = situacaoAtendimento(horarios, agora)
  const atendeAgora = ativo && situacao.aberto
  const diaDeHoje = agoraNoFuso(agora).dia


  return (
    <div className={`detalhe ${emDestaque ? 'detalhe--destaque' : ''}`}>
      <div className="detalhe__migalhas">
        <div className="container detalhe__migalhas-conteudo">
          <Voltar para="/empreendedores" rotulo="Ver empreendedores" />
          <nav aria-label="Você está em" className="detalhe__migalhas-nav">
            <Link to="/">Início</Link>
            <span aria-hidden="true">/</span>
            <Link to="/empreendedores">Empreendedores</Link>
            <span aria-hidden="true">/</span>
            <span className="detalhe__migalhas-atual">{nomeNegocio}</span>
          </nav>
        </div>
      </div>

      {previa && (
        <div className="container detalhe__previa">
          <StatusMessage tipo="aviso" titulo={`Prévia: ${previa.rotulo.toLowerCase()}`}>
            <p>
              Este negócio não está na vitrine: só você e a administração veem esta página. {previa.texto}
            </p>
          </StatusMessage>
        </div>
      )}

      <div className="detalhe__capa">
        <img
          decoding="async"
          src={urlImagem(fotoUrl) || imagemPadrao}
          alt=""
          onError={(evento) => {
            evento.currentTarget.src = imagemPadrao
          }}
        />
        <div className="detalhe__capa-sombra" />
      </div>

      <div className="container detalhe__corpo">
        {/* Cabeçalho do perfil sobre a capa: quem é, onde fica e se atende agora */}
        <header className="detalhe__cabecalho">
          {emDestaque && (
            <span className="detalhe__fita" title="Negócio com o plano Destaque do VitrineRondon">
              <Icone nome="star" tamanho={16} />
              Negócio Destaque
            </span>
          )}
          <div className="detalhe__selos">
            <Tag variante={emDestaque ? 'ouro' : 'servico'}>{categoria}</Tag>
            {novo && <SeloNovo compacto claro={emDestaque} />}
            <span className="detalhe__verificado">
              <Icone nome="verified" tamanho={16} />
              Perfil verificado
            </span>
            {!ativo && <Tag variante="alerta">Inativo no momento</Tag>}
          </div>
          <h1 className="detalhe__nome">{nomeNegocio}</h1>
          <p className="detalhe__meta">
            <span>
              <Icone nome="person_check" tamanho={20} />
              {responsavel}
            </span>
            <span>
              <Icone nome="location_on" tamanho={20} />
              {localResumo || cidade}
            </span>
          </p>
          {descricao && <p className="detalhe__descricao">{descricao}</p>}
          <ul className="detalhe__fatos">
            {/* Só o dono liga a disponibilidade no cadastro; sem isso, e com o
                negócio inativo, o selo fica vermelho */}
            <li className={`detalhe__disponivel ${!atendeAgora ? 'detalhe__disponivel--inativo' : ''}`}>
              <span className="detalhe__ponto" aria-hidden="true" />
              {atendeAgora ? 'Aberto agora' : 'Fechado agora'}
              {ativo && !situacao.semHorario && (
                <span className="detalhe__disponivel-quando">· {detalheDaSituacao(situacao)}</span>
              )}
            </li>
            <li>
              <Icone nome={ehServico ? 'handyman' : 'sell'} tamanho={18} />
              {produtos.length} {produtos.length === 1 ? 'item na vitrine' : 'itens na vitrine'}
            </li>
            <li>
              <Icone nome="handshake" tamanho={18} />
              Sem intermediários nem comissão
            </li>
          </ul>
        </header>

        <div className="detalhe__grade">
          <section className="detalhe__catalogo" aria-labelledby="titulo-catalogo">
            <div className="detalhe__secao-topo">
              <span className="pagina-cabecalho__marca">Catálogo de {ehServico ? 'serviços' : 'produtos'}</span>
              <h2 id="titulo-catalogo">O que {nomeNegocio} oferece</h2>
              <p className="secao__subtitulo">
                {produtos.length === 0
                  ? 'Nenhum item cadastrado por enquanto.'
                  : 'Itens disponíveis para pedido direto pelo WhatsApp.'}
              </p>
            </div>

            {produtos.length === 0 ? (
              <StatusMessage tipo="vazio" titulo="Vitrine vazia">
                <p>Este empreendedor ainda não cadastrou produtos ou serviços.</p>
              </StatusMessage>
            ) : (
              <ul className="grade-cards detalhe__cards">
                {produtosComEmpreendedor.map((produto) => (
                  <li key={produto.id}>
                    <ProdutoCard produto={produto} linkWhatsapp={linkWhatsappBase} />
                  </li>
                ))}
              </ul>
            )}

            <p className="detalhe__outro">
              <span className="detalhe__outro-icone">
                <Icone nome="info" tamanho={20} />
              </span>
              <span>
                <strong>Precisa de algo que não está na lista?</strong> {primeiroNome} também atende pedidos sob
                consulta.{' '}
                <a
                  href={montarLinkWhatsapp(
                    whatsapp,
                    nomeNegocio,
                    `Olá, ${primeiroNome}! Tenho uma dúvida sobre um pedido específico.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={contar(METRICAS.CLIQUE_WHATSAPP)}
                >
                  Perguntar pelo WhatsApp
                </a>
              </span>
            </p>
          </section>

          <aside className="detalhe__contato" aria-labelledby="titulo-contato">
            <div className="detalhe__contato-cabecalho">
              <span className="detalhe__contato-selo">Contato direto</span>
              <h2 id="titulo-contato" className="detalhe__contato-titulo">
                Fale direto com quem faz
              </h2>
            </div>
            <p className="detalhe__contato-texto">
              Converse com {primeiroNome} no WhatsApp para pedir orçamento, encomendar ou agendar.
            </p>
            <div className="detalhe__telefone-caixa">
              <span className="detalhe__telefone-rotulo">Telefone e WhatsApp comercial</span>
              <a
                className="detalhe__telefone"
                href={`tel:${String(whatsapp).replace(/\D/g, '')}`}
                onClick={contar(METRICAS.CLIQUE_TELEFONE)}
              >
                {formatarTelefone(whatsapp)}
              </a>
            </div>
            <Button
              href={linkWhatsapp}
              variante="whatsapp"
              onClick={contar(METRICAS.CLIQUE_WHATSAPP)}
              className="detalhe__whatsapp"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.004.57 1.777.783 2.806.783 3.182 0 5.768-2.587 5.768-5.766.001-3.18-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.823 0-3.539-.493-5.013-1.353l-6.987 1.83 1.875-6.84c-.958-1.536-1.506-3.344-1.506-5.284 0-5.514 4.486-10 10-10 5.514 0 10 4.486 10 10z"
                />
              </svg>
              Chamar no WhatsApp
            </Button>
            {instagramUsuario && (
              <a
                className="detalhe__instagram"
                onClick={contar(METRICAS.CLIQUE_INSTAGRAM)}
                href={`https://instagram.com/${instagramUsuario}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.2-.1 1.6-.1 4.8-.1zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"
                  />
                </svg>
                @{instagramUsuario}
              </a>
            )}
            <Link to={`/contato?empreendedor=${empreendedor.id}`} className="detalhe__mensagem">
              Ou deixe uma mensagem pelo site
            </Link>
            <ul className="detalhe__confianca">
              <li>
                <Icone nome="shield" tamanho={16} />
                Cadastro conferido pela equipe
              </li>
              <li>
                <Icone nome="payments" tamanho={16} />
                Pagamento combinado com {primeiroNome}
              </li>
            </ul>
          </aside>

          <div className="detalhe__info">
            <section className="detalhe__horarios" aria-labelledby="titulo-horarios">
              <div className="detalhe__horarios-topo">
                <h2 id="titulo-horarios" className="detalhe__horarios-titulo">
                  <Icone nome="schedule" tamanho={20} />
                  Horário
                </h2>
                <span className={`detalhe__situacao ${atendeAgora ? 'detalhe__situacao--aberto' : ''}`}>
                  <span className="detalhe__ponto" aria-hidden="true" />
                  {atendeAgora ? 'Aberto agora' : 'Fechado agora'}
                </span>
              </div>
              {situacao.semHorario ? (
                <p className="detalhe__horarios-vazio">
                  {primeiroNome} ainda não informou o horário de atendimento. Combine pelo WhatsApp.
                </p>
              ) : (
                <dl className="detalhe__semana">
                  {DIAS.map((dia) => (
                    <div
                      key={dia.indice}
                      className={`detalhe__semana-dia ${dia.indice === diaDeHoje ? 'detalhe__semana-dia--hoje' : ''}`}
                    >
                      <dt>
                        {dia.curto}
                        {dia.indice === diaDeHoje && <span className="detalhe__hoje">hoje</span>}
                      </dt>
                      <dd>{textoDoDia(horarios, dia.indice)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="detalhe__horarios-fuso">Horário de Rondonópolis (MT).</p>
            </section>

            <section className="detalhe__local" aria-labelledby="titulo-local">
              <h2 id="titulo-local" className="detalhe__horarios-titulo">
                <Icone nome="location_on" tamanho={20} />
                {enderecoPublico ? 'Como chegar' : `Atende em ${localResumo || cidade}`}
              </h2>
              <p className="detalhe__local-texto">
                {enderecoPublico
                  ? enderecoCompleto
                  : `${primeiroNome} não divulga o endereço exato. Entrega, retirada ou visita são combinadas pelo WhatsApp.`}
              </p>
              <div className="detalhe__mapa">
                <Mapa
                  latitude={latitude}
                  longitude={longitude}
                  endereco={{ endereco, numero, bairro, cidade, estado, cep }}
                  exibirEndereco={enderecoPublico}
                  titulo={nomeNegocio}
                  aoAbrir={contar(METRICAS.CLIQUE_ENDERECO)}
                />
              </div>
              <p className="detalhe__local-aviso">
                {enderecoPublico && !temCoordenadas
                  ? 'Posição no mapa aproximada a partir do endereço. '
                  : ''}
                Confirme o horário pelo WhatsApp antes de ir.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmpreendedorDetalhe
