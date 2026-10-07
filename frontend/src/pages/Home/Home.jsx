import { Link } from 'react-router-dom'
import { useConsulta } from '../../hooks/useConsulta'
import { CATEGORIAS } from '../../services/constantes'
import { FONTES } from '../../services/fontes'
import Button from '../../components/ui/Button/Button'
import Icone from '../../components/ui/Icone/Icone'
import Fonte from '../../components/ui/Fonte/Fonte'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import ProdutoCard from '../../components/cards/ProdutoCard/ProdutoCard'
import EmpreendedorCard from '../../components/cards/EmpreendedorCard/EmpreendedorCard'
import imagemPadrao from '../../assets/imagem-padrao.svg'
import { urlImagem } from '../../services/imagens'
import './Home.css'

const LIMITE_PRODUTOS = 6
const LIMITE_EMPREENDEDORES = 3

const funcionalidades = [
  { icone: 'storefront', texto: 'Página simples por empreendedor' },
  { icone: 'money_off', texto: 'Sem taxa de cadastro' },
  { icone: 'handshake', texto: 'Sem comissão por venda feita pela plataforma' },
  { icone: 'search', texto: 'Busca por segmento e bairro' },
  { icone: 'chat', texto: 'Contato direto com o cliente pelo WhatsApp' },
  { icone: 'map', texto: 'Filtro por região de Rondonópolis' },
  { icone: 'handyman', texto: 'Seção de serviços: conserto, corte e manutenção' },
  { icone: 'campaign', texto: 'Divulgação de produtos e serviços locais' },
]

function Home() {
  // Leituras guardadas em cache: ao voltar para a página inicial, tudo aparece na hora
  const consultaProdutos = useConsulta('/produtos')
  const consultaEmpreendedores = useConsulta('/empreendedores')
  const consultaBanner = useConsulta('/configuracoes/banner')
  // Negócios com o plano Destaque, em rodízio (o servidor embaralha a cada consulta)
  const consultaDestaques = useConsulta('/empreendedores/destaques', { limite: 3 })
  const destaques = consultaDestaques.dados?.data ?? []

  const carregando = consultaProdutos.carregando || consultaEmpreendedores.carregando
  const erro = consultaProdutos.erro || consultaEmpreendedores.erro
  const todosEmpreendedores = consultaEmpreendedores.dados?.data ?? []
  const produtos = (consultaProdutos.dados?.data ?? []).slice(0, LIMITE_PRODUTOS)
  const empreendedores = todosEmpreendedores.slice(0, LIMITE_EMPREENDEDORES)
  const totais = {
    produtos: consultaProdutos.dados?.total ?? 0,
    empreendedores: consultaEmpreendedores.dados?.total ?? 0,
    bairros: new Set(todosEmpreendedores.map((e) => e.bairro).filter(Boolean)).size,
  }
  // Banner escolhido pela administração; sem ele, a foto do item mais recente
  const banner = consultaBanner.dados?.data?.imagemUrl ? consultaBanner.dados.data : null
  // Só desenha a foto quando já se sabe qual é: evita trocar uma imagem pela outra
  const cartazPronto =
    !consultaBanner.carregando && (Boolean(banner) || !consultaProdutos.carregando)

  // O cartaz do herói mostra o banner da administração ou, sem ele,
  // o item mais recente da vitrine
  const destaque = produtos[0]
  const imagemCartaz = urlImagem(banner?.imagemUrl || destaque?.imagem) || imagemPadrao
  const legendaCartaz = banner
    ? banner.legenda || 'Comércio de bairro em Rondonópolis'
    : destaque
      ? `${destaque.empreendedor?.nomeNegocio}, ${destaque.empreendedor?.bairro || destaque.empreendedor?.cidade}`
      : 'Produção local'

  return (
    <>
      <section className="hero">
        <div className="container hero__conteudo">
          <div className="hero__texto-bloco">
            <span className="hero__selo">Comércio de bairro • Rondonópolis-MT</span>
            <h1 className="hero__titulo">
              Seu negócio existe.
              <br />
              Ninguém encontra.
            </h1>
            <p className="hero__texto">
              O comércio e os serviços de Rondonópolis movimentam cerca de R$ 93 milhões em um dia
              útil típico. Mas muito negócio de bairro ainda depende de indicação e de grupo de
              WhatsApp. Sem canal digital, o alcance para na esquina.
            </p>
            <Fonte fonte={FONTES.movimento} rotulo="Dado: Folha do Estado, com a CDL" />
            <div className="hero__acoes">
              <Button to="/vitrine" variante="destaque">
                Ver a vitrine
              </Button>
              <a
                href="#como-funciona"
                className="botao botao--claro botao--md"
                onClick={(evento) => {
                  const alvo = document.getElementById('como-funciona')
                  if (!alvo) return
                  evento.preventDefault()
                  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  alvo.scrollIntoView({ behavior: menosMovimento ? 'auto' : 'smooth', block: 'start' })
                }}
              >
                Como funciona
              </a>
            </div>
          </div>

          <div className="hero__cartaz">
            <div className="hero__cartaz-foto">
              {cartazPronto && (
              <img
                decoding="async"
                src={imagemCartaz}
                alt={banner ? legendaCartaz : destaque ? destaque.nome : ''}
                onError={(evento) => {
                  evento.currentTarget.src = imagemPadrao
                }}
              />
              )}
            </div>
            <div className="hero__cartaz-legenda">
              <span>{legendaCartaz}</span>
              <span className="hero__cartaz-etiqueta">Autêntico</span>
            </div>
          </div>
        </div>
      </section>

      {!carregando && !erro && (
        <section className="numeros">
          <dl className="container numeros__lista">
            <div className="numeros__item">
              <dd>{totais.empreendedores}</dd>
              <dt>Negócios cadastrados</dt>
            </div>
            <div className="numeros__item">
              <dd>{totais.produtos}</dd>
              <dt>Produtos e serviços</dt>
            </div>
            <div className="numeros__item">
              <dd>{totais.bairros}</dd>
              <dt>Bairros atendidos</dt>
            </div>
          </dl>
        </section>
      )}

      <section className="para-quem">
        <div className="container para-quem__conteudo">
          <div>
            <span className="pagina-cabecalho__marca para-quem__marca">Para quem é</span>
            <h2>Feito para quem faz a cidade girar</h2>
          </div>
          <div className="para-quem__texto">
            <p>
              Micro e pequenos empreendedores: autônomos, feirantes, artesãos, prestadores de
              serviço e donos de lojas de bairro.
            </p>
            <p>
              Quem não tem capital para investir em marketing digital e não quer pagar comissão por
              venda.
            </p>
          </div>
        </div>
      </section>

      <section className="container categorias">
        <h2 className="visualmente-oculto">Categorias</h2>
        <ul className="categorias__lista">
          <li>
            <Link to="/vitrine" className="categorias__item categorias__item--ativo">
              Todas
            </Link>
          </li>
          {CATEGORIAS.map((categoria) => (
            <li key={categoria}>
              <Link
                to={`/vitrine?categoria=${encodeURIComponent(categoria)}`}
                className="categorias__item"
              >
                {categoria}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {carregando && <Spinner texto="Buscando destaques..." />}

      {erro && (
        <div className="container">
          <StatusMessage tipo="erro" titulo="Não foi possível carregar os destaques">
            <p>{erro.message}</p>
          </StatusMessage>
        </div>
      )}

      {!carregando && !erro && (
        <>
          {destaques.length > 0 && (
            <section className="container secao destaques" aria-labelledby="titulo-destaques">
              <div className="secao__cabecalho">
                <div>
                  <h2 id="titulo-destaques">Negócios em Destaque</h2>
                  <p className="secao__subtitulo">
                    Negócios com o plano Destaque. A ordem muda a cada visita.
                  </p>
                </div>
                <Link to="/planos" className="secao__link">
                  Como aparecer aqui
                </Link>
              </div>
              <ul className="grade-cards">
                {destaques.map((empreendedor) => (
                  <li key={empreendedor.id}>
                    <EmpreendedorCard empreendedor={empreendedor} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="container secao">
            <div className="secao__cabecalho">
              <div>
                <h2>Novidades na vitrine</h2>
                <p className="secao__subtitulo">Os itens cadastrados mais recentemente.</p>
              </div>
              <Link to="/vitrine" className="secao__link">
                Ver todos
              </Link>
            </div>

            {produtos.length === 0 ? (
              <StatusMessage tipo="vazio" titulo="A vitrine ainda está vazia">
                <p>Assim que um empreendedor cadastrar um produto, ele aparece aqui.</p>
              </StatusMessage>
            ) : (
              <ul className="grade-cards">
                {produtos.map((produto) => (
                  <li key={produto.id}>
                    <ProdutoCard produto={produto} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="feira">
            <div className="container">
              <div className="secao__cabecalho feira__cabecalho">
                <div>
                  <h2>Quem está na feira</h2>
                  <p className="secao__subtitulo">Conheça alguns dos negócios cadastrados.</p>
                </div>
                <Link to="/empreendedores" className="secao__link secao__link--claro">
                  Ver todos
                </Link>
              </div>

              {empreendedores.length === 0 ? (
                <StatusMessage tipo="vazio" titulo="Nenhum empreendedor cadastrado">
                  <p>Seja o primeiro a montar sua barraca no VitrineRondon.</p>
                </StatusMessage>
              ) : (
                <ul className="grade-cards">
                  {empreendedores.map((empreendedor) => (
                    <li key={empreendedor.id}>
                      <EmpreendedorCard empreendedor={empreendedor} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      <section className="container secao" id="o-que-fazemos">
        <div className="secao__cabecalho">
          <div>
            <span className="pagina-cabecalho__marca">O que fazemos</span>
            <h2>Sua vitrine, sem intermediário</h2>
          </div>
        </div>
        <ul className="funcionalidades">
          {funcionalidades.map((item) => (
            <li key={item.texto} className="funcionalidades__item">
              <Icone nome={item.icone} tamanho={22} />
              <span>{item.texto}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="container secao" id="como-funciona">
        <div className="como-funciona">
          <div className="como-funciona__intro">
            <span className="pagina-cabecalho__marca">Transparência</span>
            <h2>Como funciona</h2>
          </div>
          <div className="como-funciona__colunas como-funciona__colunas--unica">
            <ul className="como-funciona__regras">
              <li>
                <Icone nome="check_circle" tamanho={20} />
                Sem comissão sobre as vendas, conforme o modelo definido para o projeto.
              </li>
              <li>
                <Icone nome="check_circle" tamanho={20} />
                Sem taxa de cadastro, conforme a política definida para o projeto.
              </li>
              <li>
                <Icone nome="check_circle" tamanho={20} />
                Dados dos usuários tratados de acordo com a LGPD.
              </li>
              <li>
                <Icone nome="check_circle" tamanho={20} />
                Tecnologia feita para aproximar consumidores e empreendedores locais.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
