import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useConsulta } from '../../hooks/useConsulta'
import Button from '../ui/Button/Button'
import Icone from '../ui/Icone/Icone'
import Spinner from '../ui/Spinner/Spinner'
import StatusMessage from '../ui/StatusMessage/StatusMessage'
import { formatarNumero } from '../../services/formatos'
import './Painel.css'

const diaCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const diaLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })

/** Números do período: o que o empreendedor procura primeiro */
function Cartoes({ totais, ampliado }) {
  const cartoes = [
    { rotulo: 'Visitas ao perfil', valor: totais.VISUALIZACAO_PERFIL, icone: 'visibility' },
    { rotulo: 'Cliques no WhatsApp', valor: totais.CLIQUE_WHATSAPP, icone: 'chat' },
    { rotulo: 'Cliques no telefone, endereço e Instagram', valor: totais.CLIQUE_TELEFONE + totais.CLIQUE_ENDERECO + totais.CLIQUE_INSTAGRAM, icone: 'touch_app' },
    { rotulo: 'Visualizações de produtos', valor: totais.VISUALIZACAO_PRODUTO, icone: 'inventory_2' },
  ]
  if (ampliado) cartoes.push({ rotulo: 'Vezes na seção de destaques', valor: totais.IMPRESSAO_DESTAQUE, icone: 'star' })
  return (
    <ul className="desempenho__cartoes">
      {cartoes.map((c) => (
        <li key={c.rotulo} className="desempenho__cartao">
          <Icone nome={c.icone} tamanho={20} />
          <strong>{formatarNumero(c.valor)}</strong>
          <span>{c.rotulo}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Visitas ao perfil por dia: uma série só (o título diz qual), barras finas
 * com topo arredondado partindo da base, grade discreta e dica ao passar o
 * mouse ou focar a barra. A tabela logo abaixo traz os mesmos números.
 */
function GraficoVisitas({ serie }) {
  const [focado, setFocado] = useState(null)
  const maximo = Math.max(1, ...serie.map((d) => d.VISUALIZACAO_PERFIL))
  // Grade em números redondos: 0, metade e o topo
  const topo = maximo <= 4 ? maximo : Math.ceil(maximo / 2) * 2
  const altura = 160
  const largura = 640
  const passo = largura / serie.length
  const barra = Math.max(4, Math.min(16, passo - 4))
  const y = (valor) => altura - (valor / topo) * altura
  const ativo = focado === null ? null : serie[focado]

  return (
    <figure className="desempenho__grafico">
      <figcaption>Visitas ao perfil por dia</figcaption>
      <div className="desempenho__area">
        <svg viewBox={`-34 -8 ${largura + 40} ${altura + 30}`} role="img" aria-label="Visitas ao perfil por dia nos últimos 30 dias">
          {[0, topo / 2, topo].map((v) => (
            <g key={v}>
              <line x1="0" x2={largura} y1={y(v)} y2={y(v)} className="desempenho__grade" />
              <text x="-8" y={y(v) + 4} textAnchor="end" className="desempenho__eixo">
                {formatarNumero(Math.round(v))}
              </text>
            </g>
          ))}
          {serie.map((d, i) => {
            const valor = d.VISUALIZACAO_PERFIL
            const h = Math.max(valor > 0 ? 3 : 0, altura - y(valor))
            const x = i * passo + (passo - barra) / 2
            return (
              <g key={d.dia}>
                {/* Área de toque maior que a barra */}
                <rect
                  x={i * passo}
                  y={-8}
                  width={passo}
                  height={altura + 8}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${diaLongo.format(new Date(d.dia))}: ${valor} visitas`}
                  onMouseEnter={() => setFocado(i)}
                  onMouseLeave={() => setFocado(null)}
                  onFocus={() => setFocado(i)}
                  onBlur={() => setFocado(null)}
                />
                {h > 0 && (
                  <path
                    d={`M${x},${altura} V${altura - h + 4} q0,-4 4,-4 h${barra - 8} q4,0 4,4 V${altura} Z`}
                    className={`desempenho__barra ${focado === i ? 'desempenho__barra--ativa' : ''}`}
                  />
                )}
                {/* Um rótulo por semana, contando de hoje para trás: o último dia
                    sempre aparece e dois rótulos nunca ficam colados */}
                {(serie.length - 1 - i) % 7 === 0 && (
                  <text x={i * passo + passo / 2} y={altura + 18} textAnchor="middle" className="desempenho__eixo">
                    {diaCurto.format(new Date(d.dia))}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {ativo && (
          <div
            className="desempenho__dica"
            style={{ left: `${((focado + 0.5) / serie.length) * 100}%` }}
            role="status"
          >
            <strong>{diaLongo.format(new Date(ativo.dia))}</strong>
            <span>{formatarNumero(ativo.VISUALIZACAO_PERFIL)} visitas</span>
            <span>
              {formatarNumero(ativo.CLIQUE_WHATSAPP + ativo.CLIQUE_TELEFONE + ativo.CLIQUE_ENDERECO + ativo.CLIQUE_INSTAGRAM)}{' '}
              cliques de contato
            </span>
          </div>
        )}
      </div>
      <details className="desempenho__tabela">
        <summary>Ver os números em tabela</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">Visitas</th>
              <th scope="col">Cliques de contato</th>
              <th scope="col">Produtos vistos</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((d) => (
              <tr key={d.dia}>
                <th scope="row">{diaLongo.format(new Date(d.dia))}</th>
                <td>{d.VISUALIZACAO_PERFIL}</td>
                <td>{d.CLIQUE_WHATSAPP + d.CLIQUE_TELEFONE + d.CLIQUE_ENDERECO + d.CLIQUE_INSTAGRAM}</td>
                <td>{d.VISUALIZACAO_PRODUTO}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** Desempenho do negócio: básico no Essencial, ampliado no Destaque */
function PainelDesempenho() {
  const consulta = useConsulta('/metricas/meu-negocio', { dias: 30 })
  const dados = consulta.dados?.data

  if (consulta.carregando) return <Spinner texto="Carregando suas estatísticas..." />
  if (consulta.erro) {
    return (
      <StatusMessage tipo="erro" titulo="Não foi possível carregar as estatísticas" acao={<Button tamanho="sm" onClick={consulta.recarregar}>Tentar de novo</Button>}>
        <p>{consulta.erro.message}</p>
      </StatusMessage>
    )
  }
  if (!dados?.disponivel) {
    return (
      <div className="painel__convite">
        <Icone nome="monitoring" tamanho={30} />
        <div>
          <h3>Estatísticas do seu perfil</h3>
          <p>
            Com um plano você acompanha quantas pessoas visitaram seu perfil e clicaram para falar com
            você. No Destaque, vê também a evolução dia a dia e os produtos mais vistos.
          </p>
        </div>
        <Button to="/planos" variante="destaque">
          Ver os planos
        </Button>
      </div>
    )
  }

  return (
    <div className="painel desempenho">
      <p className="painel__detalhe">
        Últimos {dados.periodo.dias} dias. As visitas do próprio negócio não entram na conta, e cada pessoa
        conta uma vez a cada meia hora.
      </p>
      <Cartoes totais={dados.totais} ampliado={dados.ampliado} />

      {dados.ampliado ? (
        <>
          <GraficoVisitas serie={dados.serie} />
          <div className="desempenho__produtos">
            <h3>Produtos mais vistos</h3>
            {dados.produtosMaisVistos.length === 0 ? (
              <p className="painel__detalhe">Nenhum produto foi aberto no período.</p>
            ) : (
              <ol>
                {dados.produtosMaisVistos.map((p) => (
                  <li key={p.id}>
                    <span>{p.nome}</span>
                    <strong>{formatarNumero(p.visualizacoes)}</strong>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      ) : (
        <p className="painel__detalhe">
          A evolução dia a dia e os produtos mais vistos fazem parte do plano Destaque.{' '}
          <Link to="/planos">Conhecer o Destaque</Link>
        </p>
      )}
    </div>
  )
}

export default PainelDesempenho
