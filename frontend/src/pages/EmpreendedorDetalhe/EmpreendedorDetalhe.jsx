import { useEffect, useState } from 'react'
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
import SeloDestaque from '../../components/ui/SeloDestaque/SeloDestaque'
import { METRICAS, registrarMetrica } from '../../services/metricas'
import ProdutoCard from '../../components/cards/ProdutoCard/ProdutoCard'
import imagemPadrao from '../../assets/imagem-padrao.svg'
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
  // Relógio da página: o selo troca sozinho quando o horário de atendimento
  // começa ou termina, sem precisar recarregar
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 30000)
    return () => clearInterval(relogio)
  }, [])

  if (carregando) return <Spinner texto="Carregando o negócio..." />

  if (erro) {
    const naoEncontrado = erro.status === 404 || erro.status === 400
    return (
      <section className="container secao">
        <StatusMessage
          tipo={naoEncontrado ? 'vazio' : 'erro'}
          titulo={naoEncontrado ? 'Empreendedor não encontrado' : 'Não foi possível carregar'}
        >
          <p>{naoEncontrado ? 'Esse cadastro não existe ou foi removido.' : erro.message}</p>
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
  } = empreendedor

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
  const chips = produtos.slice(0, 3).map((p) => p.nome)

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
    <>
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
          <div className="detalhe__utilidades">
            {/* Só o dono liga a disponibilidade no cadastro; sem isso, e com o
                negócio inativo, o selo fica vermelho */}
            <span className={`detalhe__disponivel ${!atendeAgora ? 'detalhe__disponivel--inativo' : ''}`}>
              <span className="detalhe__ponto" aria-hidden="true" />
              {atendeAgora ? 'Disponível para atendimento' : 'Indisponível para atendimento'}
              {ativo && !situacao.semHorario && (
                <span className="detalhe__disponivel-quando">· {detalheDaSituacao(situacao)}</span>
              )}
            </span>
            <span className="detalhe__regiao">{localResumo || cidade}</span>
          </div>
        </div>
      </div>

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
        <div className="container detalhe__capa-selos">
          {emDestaque && <SeloDestaque claro className="detalhe__selo-destaque" />}
          <span className="detalhe__selo detalhe__selo--verificado">
            <Icone nome="verified" tamanho={18} />
            Perfil verificado pelo VitrineRondon
          </span>
          <span className="detalhe__selo detalhe__selo--local">
            <Icone nome="location_on" tamanho={18} />
            {bairro ? `${bairro}, ${cidade}` : cidade}
          </span>
        </div>
      </div>
      <div className="serrilha" aria-hidden="true" />

      <section className="container detalhe__conteudo">
        <div className="detalhe__identidade">
          <div className="detalhe__tags">
            <Tag variante="servico">{categoria}</Tag>
            {chips.map((chip) => (
              <span key={chip} className="detalhe__chip">
                <Icone nome={ehServico ? 'handyman' : 'sell'} tamanho={16} />
                {chip}
              </span>
            ))}
            {!ativo && <Tag variante="alerta">Inativo no momento</Tag>}
          </div>
          <h1 className="detalhe__nome">{nomeNegocio}</h1>
          <p className="detalhe__meta">
            <Icone nome="person_check" tamanho={26} />
            {responsavel}, {localResumo || cidade}
          </p>
          {descricao && <p className="detalhe__descricao">{descricao}</p>}

          <div className="detalhe__confianca">
            <div className="detalhe__confianca-topo">
              <Icone nome="home_pin" tamanho={24} />
              <div>
                <p className="detalhe__confianca-titulo">
                  {enderecoPublico ? 'Endereço' : 'Onde atende'}
                </p>
                <p className="detalhe__confianca-texto">
                  {enderecoPublico
                    ? enderecoCompleto
                    : `${localResumo || cidade}. O endereço exato é combinado pelo WhatsApp.`}
                </p>
              </div>
            </div>
            <ul className="detalhe__confianca-lista">
              <li>
                <Icone nome="schedule" tamanho={18} />
                Resposta direta pelo WhatsApp
              </li>
              <li>
                <Icone nome="shield" tamanho={18} />
                Cadastro conferido pela equipe
              </li>
              <li>
                <Icone nome="payments" tamanho={18} />
                Pagamento combinado com o empreendedor
              </li>
            </ul>
          </div>

          <section className="detalhe__horarios" aria-labelledby="titulo-horarios">
            <div className="detalhe__horarios-topo">
              <h2 id="titulo-horarios" className="detalhe__horarios-titulo">
                <Icone nome="schedule" tamanho={20} />
                Horário de atendimento
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
        </div>

        <aside className="detalhe__contato">
          <div className="detalhe__contato-cabecalho">
            <span className="detalhe__contato-selo">Contato direto</span>
            <h2 className="detalhe__contato-titulo">Fale direto com quem faz</h2>
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
          <Link to={`/contato?empreendedor=${empreendedor.id}`} className="detalhe__mensagem">
            Ou deixe uma mensagem pelo site
          </Link>
          <span className="detalhe__garantia">
            <Icone nome="handshake" tamanho={16} />
            Comércio de bairro: sem intermediários ou comissões
          </span>
        </aside>
      </section>

      <div className="serrilha" aria-hidden="true" />

      <section className="detalhe__itens">
        <div className="container secao">
          <div className="secao__cabecalho detalhe__itens-cabecalho">
            <div>
              <span className="pagina-cabecalho__marca">Catálogo de {ehServico ? 'serviços' : 'produtos'}</span>
              <h2>O que {nomeNegocio} oferece</h2>
              <p className="secao__subtitulo">
                {produtos.length === 0
                  ? 'Nenhum item cadastrado por enquanto.'
                  : 'Itens disponíveis para pedido direto pelo WhatsApp.'}
              </p>
            </div>
            {produtos.length > 0 && (
              <span className="detalhe__itens-contagem">
                <Icone nome="verified" tamanho={18} />
                {produtos.length} {produtos.length === 1 ? 'item tabelado' : 'itens tabelados'}
              </span>
            )}
          </div>

          {produtos.length === 0 ? (
            <StatusMessage tipo="vazio" titulo="Vitrine vazia">
              <p>Este empreendedor ainda não cadastrou produtos ou serviços.</p>
            </StatusMessage>
          ) : (
            <ul className="grade-cards">
              {produtosComEmpreendedor.map((produto) => (
                <li key={produto.id}>
                  <ProdutoCard produto={produto} linkWhatsapp={linkWhatsappBase} />
                </li>
              ))}
            </ul>
          )}

          <div className="detalhe__outro">
            <div className="detalhe__outro-texto">
              <span className="detalhe__outro-icone">
                <Icone nome="info" tamanho={20} />
              </span>
              <div>
                <p className="detalhe__outro-titulo">Precisa de algo que não está na lista?</p>
                <p>{primeiroNome} também atende pedidos sob consulta. Pergunte pelo WhatsApp.</p>
              </div>
            </div>
            <Button
              href={montarLinkWhatsapp(whatsapp, nomeNegocio, `Olá, ${primeiroNome}! Tenho uma dúvida sobre um pedido específico.`)}
              variante="secundario"
              onClick={contar(METRICAS.CLIQUE_WHATSAPP)}
            >
              Consultar outro pedido
            </Button>
          </div>
        </div>
      </section>

      <section className="container secao detalhe__local">
        <div className="detalhe__local-texto">
          <span className="detalhe__selo detalhe__selo--verificado detalhe__selo--solto">Localização</span>
          <h3>{enderecoPublico ? 'Como chegar' : `Atende em ${localResumo || cidade}`}</h3>
          <p>
            {enderecoPublico
              ? 'Endereço informado pelo empreendedor. Confirme horário e disponibilidade pelo WhatsApp antes de ir.'
              : `${primeiroNome} não divulga o endereço exato. Entrega, retirada ou visita são combinadas pelo WhatsApp.`}
          </p>
          <ul className="detalhe__local-lista">
            {enderecoPublico && (
              <li>
                <Icone nome="home_pin" tamanho={18} />
                <span>
                  <strong>Endereço:</strong> {enderecoCompleto}
                </span>
              </li>
            )}
            {bairro && (
              <li>
                <Icone nome="check_box" tamanho={18} />
                <span>
                  <strong>Bairro:</strong> {bairro}
                </span>
              </li>
            )}
            <li>
              <Icone nome="check_box" tamanho={18} />
              <span>
                <strong>Cidade:</strong> {cidade}
                {estado ? ` - ${estado}` : ''}
              </span>
            </li>
            {!temCoordenadas && enderecoPublico && (
              <li className="detalhe__local-aviso">
                <Icone nome="info" tamanho={18} />
                <span>Posição no mapa aproximada a partir do endereço.</span>
              </li>
            )}
          </ul>
        </div>
        <div className="detalhe__mapa">
          <Mapa
            latitude={latitude}
            longitude={longitude}
            endereco={{ endereco, numero, bairro, cidade, estado, cep }}
            exibirEndereco={enderecoPublico}
            titulo={nomeNegocio}
            aoAbrir={contar(METRICAS.CLIQUE_ENDERECO)}
          />
          <div className="detalhe__mapa-legenda">
            <strong>{localResumo || cidade}</strong>
            {emDestaque && <SeloDestaque compacto />}
            <span>{enderecoPublico ? 'Local do negócio' : 'Região de atendimento'}</span>
          </div>
        </div>
      </section>

      <section className="detalhe__cta">
        <div className="container detalhe__cta-conteudo">
          <div className="detalhe__cta-texto">
            <span className="detalhe__cta-icone">
              <Icone nome="support_agent" tamanho={28} />
            </span>
            <div>
              <h4>Quer falar agora com {primeiroNome}?</h4>
              <p>Chame no WhatsApp para checar disponibilidade e combinar os detalhes.</p>
            </div>
          </div>
          <Button href={linkWhatsapp} variante="whatsapp" onClick={contar(METRICAS.CLIQUE_WHATSAPP)}>
            <Icone nome="chat" tamanho={20} />
            Enviar WhatsApp agora
          </Button>
        </div>
      </section>
    </>
  )
}

export default EmpreendedorDetalhe
