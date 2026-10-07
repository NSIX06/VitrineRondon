import { Link } from 'react-router-dom'
import Icone from '../../components/ui/Icone/Icone'
import Fonte from '../../components/ui/Fonte/Fonte'
import { FONTES, LISTA_FONTES, CREDITO_BANDEIRA } from '../../services/fontes'
import './Sobre.css'

import bandeira from '../../assets/bandeira-rondonopolis.jpg'
import Voltar from '../../components/ui/Voltar/Voltar'

// Cada item aponta para a publicação que sustenta a afirmação.
const problemas = [
  {
    icone: 'trending_down',
    titulo: 'Custos que sobem, crédito que falta',
    texto:
      'Juros elevados, aumento dos custos operacionais, dificuldade de acesso ao crédito e endividamento estão entre as causas apontadas para o fechamento de 20 empresas na cidade entre janeiro e agosto de 2026.',
    fonte: FONTES.fechamento,
  },
  {
    icone: 'local_parking',
    titulo: 'Acesso físico como barreira',
    texto:
      'A pesquisa Jornada do Consumidor Rondonopolitano, da CDL, ouviu 152 moradores economicamente ativos e identificou que a falta de vagas de estacionamento e a dificuldade de acesso às lojas na região central fazem o consumidor desistir da compra.',
    fonte: FONTES.consumidor,
  },
  {
    icone: 'balance',
    titulo: 'Concorrência desleal',
    texto:
      'Ambulantes irregulares ocupam calçadas, dificultam a passagem de pedestres e não cumprem os mesmos encargos das empresas formalizadas. A CDL levou o problema à Prefeitura e ao Ministério Público de Mato Grosso.',
    fonte: FONTES.ambulantes,
  },
  {
    icone: 'shield',
    titulo: 'Segurança',
    texto:
      'Empresários relatam arrombamentos e roubos recorrentes. Um comerciante com 35 anos de atividade na cidade contou que quatro de suas cinco lojas já foram alvo de criminosos.',
    fonte: FONTES.seguranca,
  },
  {
    icone: 'visibility_off',
    titulo: 'Invisibilidade digital',
    texto:
      'O consumidor pesquisa em sites de busca, redes sociais e vitrines virtuais antes de comprar, e o WhatsApp cresce como canal de venda. Sem presença online, o alcance do negócio para na esquina.',
    fonte: FONTES.consumidor,
  },
]

const passos = [
  { titulo: '1. Cadastro', texto: 'Sem cartão de crédito, sem CNPJ obrigatório, sem mensalidade.' },
  { titulo: '2. Vitrine', texto: 'Páginas por negócio, com busca por nome, categoria e bairro.' },
  { titulo: '3. Contato', texto: 'O cliente clica e cai direto na conversa de WhatsApp de quem faz.' },
]

const ods = [
  {
    numero: 'ODS 8',
    papel: 'Pilar central',
    titulo: 'Trabalho decente e crescimento econômico',
    texto: 'Estimular o faturamento de produtores locais e abrir oportunidades comerciais sem precarizar o trabalho.',
  },
  {
    numero: 'ODS 1',
    papel: 'Interdependente',
    titulo: 'Erradicação da pobreza',
    texto: 'Fazer a renda gerada na vizinhança circular dentro da própria comunidade.',
  },
  {
    numero: 'ODS 10',
    papel: 'Interdependente',
    titulo: 'Redução das desigualdades',
    texto: 'Democratizar o acesso à divulgação na internet, sem depender de orçamento para anúncios.',
  },
]

const ficha = [
  ['Interface', 'React 19, Vite e React Router'],
  ['Servidor', 'Node.js, Express e Prisma'],
  ['Banco de dados', 'MySQL com três tabelas relacionadas (Empreendedores, Produtos/Serviços, Mensagens)'],
  ['Validação', 'Zod no servidor e formulários controlados no cliente'],
  ['Mapas', 'Google Maps (embed) e OpenStreetMap Nominatim'],
  ['Tipografia', 'Bricolage Grotesque e Inter'],
  ['Arquitetura', 'API REST sem intermediação financeira'],
]

function Sobre() {
  return (
    <>
      <header className="container sobre__cabecalho">
        <Voltar para="/" rotulo="Início" />
        <div className="sobre__eyebrow">
          <span className="sobre__eyebrow-marca" />
          <span className="sobre__eyebrow-texto">Manifesto e documentação pública</span>
          <span className="sobre__eyebrow-sep">/</span>
          <span className="sobre__eyebrow-meta">Caderno 01</span>
        </div>
        <h1>Sobre o projeto.</h1>
        <p>Por que o VitrineRondon existe e para quem ele foi feito.</p>
        <div className="sobre__regua" />
      </header>

      <div className="container sobre">
        <article className="sobre__texto">
          <section className="sobre__bloco">
            <div className="sobre__bloco-rotulo">
              <span>01 // Diagnóstico de campo</span>
              <span className="sobre__bloco-meta">Território e visibilidade</span>
            </div>
            <h2>O problema</h2>
            <p className="sobre__citacao">
              Muita gente que trabalha por conta própria vende bem no boca a boca, mas não tem site,
              não sabe como aparecer nos buscadores e depende de recados no grupo do bairro. Sem um
              canal digital, o alcance para de crescer na esquina.
            </p>
            <p>
              Em Rondonópolis, a economia real pulsa por meio de habilidades individuais: o conserto
              de fogão no mesmo dia, o bolo de encomenda, o corte sob medida. O comércio e os
              serviços da cidade movimentam cerca de R$ 93 milhões em um dia útil típico{' '}
              <Fonte fonte={FONTES.movimento} />, mas boa parte dessas iniciativas fica invisível
              para além de duzentos metros.
            </p>
          </section>

          {/* O que está acontecendo: justificativa com as fontes */}
          <section className="sobre__bloco">
            <div className="sobre__bloco-rotulo">
              <span>01.1 // O que está acontecendo</span>
              <span className="sobre__bloco-meta">Dados verificados</span>
            </div>
            <h2>O que trava o comércio de bairro em Rondonópolis</h2>

            <div className="contexto__topo">
              <div className="contexto__intro">
                <p>
                  A pressão sobre o varejo local não é fenômeno de grande rede. Ela atinge o dono de
                  loja de bairro, o prestador de serviço e o pequeno comerciante que abre as portas
                  de manhã e mesmo assim não fecha o mês. Os motivos são concretos e estão
                  documentados.
                </p>
              </div>

              <figure className="contexto__figura">
                <img decoding="async" src={bandeira} alt="Bandeira do município de Rondonópolis" loading="lazy" />
                <figcaption>
                  <strong>{CREDITO_BANDEIRA.titulo}.</strong> {CREDITO_BANDEIRA.autor}.{' '}
                  <a href={CREDITO_BANDEIRA.url} target="_blank" rel="noopener noreferrer">
                    {CREDITO_BANDEIRA.licenca}
                  </a>
                  .
                </figcaption>
              </figure>
            </div>

            <ol className="contexto__lista">
              {problemas.map((item) => (
                <li key={item.titulo} className="contexto__item">
                  <span className="contexto__icone">
                    <Icone nome={item.icone} tamanho={24} />
                  </span>
                  <div className="contexto__texto">
                    <h3>{item.titulo}</h3>
                    <p>
                      {item.texto} <Fonte fonte={item.fonte} />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="sobre__bloco">
            <div className="sobre__bloco-rotulo">
              <span>02 // Arquitetura da solução</span>
              <span className="sobre__bloco-meta">Sem pedágio</span>
            </div>
            <h2>O que a vitrine faz</h2>
            <p className="sobre__paragrafo-grande">
              O VitrineRondon é um catálogo público, com cadastro gratuito. O empreendedor cadastra o negócio,
              os produtos ou serviços e o número de WhatsApp. Quem mora na cidade navega pelas
              categorias, encontra o que precisa e fala direto com quem faz.
            </p>
            <ol className="sobre__passos">
              {passos.map((passo) => (
                <li key={passo.titulo}>
                  <strong>{passo.titulo}</strong>
                  <p>{passo.texto}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="sobre__bloco">
            <div className="sobre__bloco-rotulo">
              <span>03 // Público vocacional</span>
              <span className="sobre__bloco-meta">Inclusão real</span>
            </div>
            <h2>Para quem</h2>
            <div className="sobre__destaque">
              <span className="sobre__destaque-rotulo">Quem movimenta esta praça:</span>
              <p>
                Artesãos, doceiras, costureiras, cabeleireiras, eletricistas, jardineiros e qualquer
                microempreendedor individual ou informal que ainda não tem presença na internet.
              </p>
            </div>
            <p>
              O projeto parte dos aparelhos e da linguagem que esses profissionais já dominam: o
              celular simples com plano de dados básico e o aplicativo de mensagens. Nada de painéis
              corporativos complicados.
            </p>
          </section>

          <section className="sobre__ods">
            <div className="sobre__ods-cabecalho">
              <div className="sobre__ods-titulo">
                <span className="sobre__ods-numero">8</span>
                <h2>Compromisso com os ODS da ONU</h2>
              </div>
              <span className="sobre__ods-agenda">Agenda 2030</span>
            </div>
            <p>
              A tecnologia pública deve responder a desafios concretos. Por isso o VitrineRondon
              adota como bússola de impacto as metas das Nações Unidas para o desenvolvimento
              territorial sustentável.
            </p>
            <ul className="sobre__ods-lista">
              {ods.map((item) => (
                <li key={item.numero} className="sobre__ods-item">
                  <div className="sobre__ods-item-topo">
                    <strong>{item.numero}</strong>
                    <span>{item.papel}</span>
                  </div>
                  <span className="sobre__ods-item-titulo">{item.titulo}</span>
                  <p>{item.texto}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="sobre__bloco">
            <div className="sobre__bloco-rotulo">
              <span>05 // Referências</span>
              <span className="sobre__bloco-meta">Dados verificados</span>
            </div>
            <h2>Fontes</h2>
            <p>
              Os dados sobre o comércio de Rondonópolis citados neste site vêm das publicações
              abaixo. Cada afirmação exibida na página inicial traz o link para a fonte
              correspondente.
            </p>
            <ol className="sobre__fontes">
              {LISTA_FONTES.map((fonte) => (
                <li key={fonte.id}>
                  <a href={fonte.url} target="_blank" rel="noopener noreferrer">
                    {fonte.titulo}
                  </a>
                  <span className="sobre__fontes-meta">
                    {fonte.veiculo}, {fonte.data}
                  </span>
                </li>
              ))}
            </ol>
            <p className="sobre__credito-imagem">
              <Icone nome="image" tamanho={16} />
              Imagem da bandeira municipal: {CREDITO_BANDEIRA.autor}.{' '}
              <a href={CREDITO_BANDEIRA.url} target="_blank" rel="noopener noreferrer">
                {CREDITO_BANDEIRA.licenca}
              </a>
              .
            </p>
          </section>
        </article>

        <aside className="sobre__lateral">
          <div className="sobre__caixa">
            <div className="sobre__caixa-rotulo">
              <span>Ficha técnica</span>
              <span className="sobre__bloco-meta">Especificações</span>
            </div>
            <h3>Como o projeto foi feito</h3>
            <p>Arquitetura enxuta, código auditável e nenhum intermediário financeiro ou biblioteca de rastreamento.</p>
            <dl className="sobre__ficha">
              {ficha.map(([termo, valor]) => (
                <div key={termo}>
                  <dt>{termo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="sobre__caixa sobre__caixa--media">
            <span className="sobre__caixa-selo">
              <Icone nome="verified_user" tamanho={22} />
              Garantia comunitária
            </span>
            <h3>100% sem comissões nem taxas bancárias</h3>
            <p>
              A plataforma não cobra taxa de intermediação nem retém valores das vendas, pois todo
              negócio é fechado diretamente no WhatsApp.
            </p>
            <div className="sobre__nota">
              <strong>Sem retenção:</strong> o dinheiro do cliente vai integralmente para quem presta
              o serviço, sem o desconto de 15% a 30% comum em marketplaces.
            </div>
          </div>

          <div className="sobre__caixa sobre__caixa--alta">
            <span className="sobre__caixa-selo">Participe</span>
            <h3 className="sobre__caixa-titulo-grande">Quer aparecer aqui?</h3>
            <p>Veja como os negócios estão cadastrados e monte a sua barraca virtual.</p>
            <Link to="/vitrine" className="sobre__botao">
              Explorar a vitrine
              <Icone nome="arrow_forward" tamanho={18} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  )
}

export default Sobre
