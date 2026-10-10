import { useState } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import Button from '../ui/Button/Button'
import Icone from '../ui/Icone/Icone'
import Spinner from '../ui/Spinner/Spinner'
import StatusMessage from '../ui/StatusMessage/StatusMessage'
import { formatarNumero } from '../../services/formatos'
import './Painel.css'
import './Desempenho.css'

const diaCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const diaLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
const NOMES_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const PERIODOS = [7, 30, 90]

const contatos = (t) => t.CLIQUE_WHATSAPP + t.CLIQUE_TELEFONE + t.CLIQUE_ENDERECO + t.CLIQUE_INSTAGRAM

// Métricas que o gráfico diário pode mostrar (uma por vez: um eixo só)
const METRICAS = {
  visitas: { rotulo: 'Visitas', titulo: 'Visitas ao perfil por dia', valor: (d) => d.VISUALIZACAO_PERFIL, unidade: ['visita', 'visitas'] },
  contatos: { rotulo: 'Contatos', titulo: 'Cliques de contato por dia', valor: contatos, unidade: ['contato', 'contatos'] },
  produtos: { rotulo: 'Produtos vistos', titulo: 'Produtos vistos por dia', valor: (d) => d.VISUALIZACAO_PRODUTO, unidade: ['produto visto', 'produtos vistos'] },
}

const plural = (n, [um, varios]) => `${formatarNumero(n)} ${n === 1 ? um : varios}`

/** Variação em relação ao período anterior: ícone + texto, nunca só cor */
function Variacao({ atual, anterior, dias }) {
  if (!anterior && !atual) return <span className="desempenho__variacao">Sem movimento nos {dias} dias anteriores</span>
  if (!anterior) {
    return (
      <span className="desempenho__variacao desempenho__variacao--sobe">
        <Icone nome="trending_up" tamanho={16} /> Novo: nada nos {dias} dias anteriores
      </span>
    )
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (pct === 0) {
    return (
      <span className="desempenho__variacao">
        <Icone nome="trending_flat" tamanho={16} /> Igual aos {dias} dias anteriores
      </span>
    )
  }
  const sobe = pct > 0
  return (
    <span className={`desempenho__variacao desempenho__variacao--${sobe ? 'sobe' : 'desce'}`}>
      <Icone nome={sobe ? 'trending_up' : 'trending_down'} tamanho={16} />
      {sobe ? '+' : ''}
      {pct}% vs. {dias} dias anteriores
    </span>
  )
}

/** Números do período, com a comparação: o que o empreendedor procura primeiro */
function Cartoes({ totais, anterior, dias, ampliado }) {
  const taxa = totais.VISUALIZACAO_PERFIL ? Math.round((contatos(totais) / totais.VISUALIZACAO_PERFIL) * 100) : 0
  const taxaAntes = anterior.VISUALIZACAO_PERFIL ? Math.round((contatos(anterior) / anterior.VISUALIZACAO_PERFIL) * 100) : 0
  const cartoes = [
    { rotulo: 'Visitas ao perfil', valor: totais.VISUALIZACAO_PERFIL, antes: anterior.VISUALIZACAO_PERFIL, icone: 'visibility' },
    { rotulo: 'Cliques de contato', valor: contatos(totais), antes: contatos(anterior), icone: 'chat' },
    { rotulo: 'Produtos vistos', valor: totais.VISUALIZACAO_PRODUTO, antes: anterior.VISUALIZACAO_PRODUTO, icone: 'inventory_2' },
    {
      rotulo: 'Taxa de contato',
      texto: `${taxa}%`,
      detalhe: 'de quem visitou clicou para falar com você',
      valor: taxa,
      antes: taxaAntes,
      icone: 'percent',
    },
  ]
  if (ampliado) {
    cartoes.push({ rotulo: 'Vezes nos destaques', valor: totais.IMPRESSAO_DESTAQUE, antes: anterior.IMPRESSAO_DESTAQUE, icone: 'star' })
  }
  return (
    <ul className="desempenho__cartoes">
      {cartoes.map((c) => (
        <li key={c.rotulo} className="desempenho__cartao">
          <span className="desempenho__cartao-topo">
            <Icone nome={c.icone} tamanho={18} />
            {c.rotulo}
          </span>
          <strong>{c.texto ?? formatarNumero(c.valor)}</strong>
          {c.detalhe && <span className="desempenho__cartao-detalhe">{c.detalhe}</span>}
          <Variacao atual={c.valor} anterior={c.antes} dias={dias} />
        </li>
      ))}
    </ul>
  )
}

/** Barras horizontais com rótulo e número: canais de contato, produtos, dias da semana */
function ListaDeBarras({ itens, unidade }) {
  const maximo = Math.max(1, ...itens.map((i) => i.valor))
  const total = itens.reduce((soma, i) => soma + i.valor, 0)
  return (
    <ul className="desempenho__barras">
      {itens.map((item) => (
        <li key={item.rotulo}>
          <span className="desempenho__barras-rotulo">
            {item.icone && <Icone nome={item.icone} tamanho={16} />}
            {item.rotulo}
          </span>
          <span className="desempenho__barras-trilho" aria-hidden="true">
            <span className="desempenho__barras-valor" style={{ width: `${(item.valor / maximo) * 100}%` }} />
          </span>
          <strong className="desempenho__barras-numero">
            {formatarNumero(item.valor)}
            {unidade === '%' && total > 0 && <small> ({Math.round((item.valor / total) * 100)}%)</small>}
          </strong>
        </li>
      ))}
    </ul>
  )
}

/**
 * Evolução dia a dia de uma métrica por vez (um eixo só), com linha da média e
 * o melhor dia marcado. Toque (celular), mouse ou teclado mostram o dia inteiro.
 */
function GraficoDiario({ serie, metrica, aoTrocarMetrica }) {
  const [focado, setFocado] = useState(null)
  const m = METRICAS[metrica]
  const valores = serie.map(m.valor)
  const maximo = Math.max(1, ...valores)
  const topo = maximo <= 4 ? maximo : Math.ceil(maximo / 2) * 2
  const media = valores.reduce((a, b) => a + b, 0) / Math.max(1, valores.length)
  const melhor = valores.indexOf(Math.max(...valores))
  const altura = 170
  const largura = 640
  const passo = largura / serie.length
  const barra = Math.max(2, Math.min(16, passo - (passo > 8 ? 4 : 1)))
  const y = (valor) => altura - (valor / topo) * altura
  // Rótulos de data contando de hoje para trás: todo dia na semana, um a cada
  // 7 dias no mês e a cada 14 no período de 90
  const cadaQuantos = serie.length <= 7 ? 1 : serie.length <= 14 ? 2 : serie.length > 45 ? 14 : 7
  const ativo = focado === null ? null : serie[focado]

  return (
    <figure className="desempenho__grafico">
      <div className="desempenho__grafico-topo">
        <figcaption>{m.titulo}</figcaption>
        <div className="desempenho__chips" role="group" aria-label="Métrica do gráfico">
          {Object.entries(METRICAS).map(([chave, info]) => (
            <button
              key={chave}
              type="button"
              className={`desempenho__chip ${chave === metrica ? 'desempenho__chip--ativo' : ''}`}
              aria-pressed={chave === metrica}
              onClick={() => aoTrocarMetrica(chave)}
            >
              {info.rotulo}
            </button>
          ))}
        </div>
      </div>

      <p className="desempenho__resumo-grafico">
        Média de <strong>{media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong> por dia
        {valores[melhor] > 0 && (
          <>
            {' '}
            · melhor dia: <strong>{diaLongo.format(new Date(serie[melhor].dia))}</strong> ({plural(valores[melhor], m.unidade)})
          </>
        )}
      </p>

      <div className="desempenho__area">
        <svg viewBox={`-34 -8 ${largura + 40} ${altura + 30}`} role="img" aria-label={`${m.titulo}, últimos ${serie.length} dias`}>
          {[0, topo / 2, topo].map((v) => (
            <g key={v}>
              <line x1="0" x2={largura} y1={y(v)} y2={y(v)} className="desempenho__grade" />
              <text x="-8" y={y(v) + 4} textAnchor="end" className="desempenho__eixo">
                {formatarNumero(Math.round(v))}
              </text>
            </g>
          ))}
          {media > 0 && <line x1="0" x2={largura} y1={y(media)} y2={y(media)} className="desempenho__media" />}
          {serie.map((d, i) => {
            const valor = valores[i]
            const h = Math.max(valor > 0 ? 3 : 0, altura - y(valor))
            const x = i * passo + (passo - barra) / 2
            const raio = Math.min(4, barra / 2)
            return (
              <g key={d.dia}>
                {/* Área de toque e foco maior que a barra */}
                <rect
                  x={i * passo}
                  y={-8}
                  width={passo}
                  height={altura + 8}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${diaLongo.format(new Date(d.dia))}: ${plural(valor, m.unidade)}`}
                  onMouseEnter={() => setFocado(i)}
                  onMouseLeave={() => setFocado(null)}
                  onFocus={() => setFocado(i)}
                  onBlur={() => setFocado(null)}
                  onClick={() => setFocado((atual) => (atual === i ? null : i))}
                />
                {h > 0 && (
                  <path
                    d={`M${x},${altura} V${altura - h + raio} q0,-${raio} ${raio},-${raio} h${barra - 2 * raio} q${raio},0 ${raio},${raio} V${altura} Z`}
                    className={`desempenho__barra ${focado === i ? 'desempenho__barra--ativa' : ''} ${i === melhor && valor > 0 ? 'desempenho__barra--melhor' : ''}`}
                  />
                )}
                {(serie.length - 1 - i) % cadaQuantos === 0 && (
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
            style={{ left: `${Math.min(85, Math.max(15, ((focado + 0.5) / serie.length) * 100))}%` }}
            role="status"
          >
            <strong>{diaLongo.format(new Date(ativo.dia))}</strong>
            <span>{plural(ativo.VISUALIZACAO_PERFIL, METRICAS.visitas.unidade)}</span>
            <span>{plural(contatos(ativo), METRICAS.contatos.unidade)}</span>
            <span>{plural(ativo.VISUALIZACAO_PRODUTO, METRICAS.produtos.unidade)}</span>
          </div>
        )}
      </div>
      <p className="desempenho__legenda-media">
        <span className="desempenho__traco" aria-hidden="true" /> Linha tracejada: média do período ·
        <span className="desempenho__quadrado" aria-hidden="true" /> Barra amarela: melhor dia
      </p>

      <details className="desempenho__tabela">
        <summary>Ver os números em tabela</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">Visitas</th>
              <th scope="col">Contatos</th>
              <th scope="col">Produtos vistos</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((d) => (
              <tr key={d.dia}>
                <th scope="row">{diaLongo.format(new Date(d.dia))}</th>
                <td>{d.VISUALIZACAO_PERFIL}</td>
                <td>{contatos(d)}</td>
                <td>{d.VISUALIZACAO_PRODUTO}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** Visitas por dia da semana (média de cada dia): ajuda a decidir quando postar e atender */
function DiasDaSemana({ serie }) {
  const soma = Array(7).fill(0)
  const quantos = Array(7).fill(0)
  for (const d of serie) {
    const dia = new Date(d.dia).getUTCDay()
    soma[dia] += d.VISUALIZACAO_PERFIL
    quantos[dia] += 1
  }
  // Segunda primeiro, como o calendário do comércio
  const ordem = [1, 2, 3, 4, 5, 6, 0]
  const itens = ordem.map((dia) => ({
    rotulo: NOMES_SEMANA[dia],
    valor: quantos[dia] ? Math.round((soma[dia] / quantos[dia]) * 10) / 10 : 0,
  }))
  if (itens.every((i) => i.valor === 0)) return null
  return (
    <section className="desempenho__bloco">
      <h3>Dias com mais visitas</h3>
      <p className="painel__detalhe">Média de visitas ao perfil em cada dia da semana, no período.</p>
      <ListaDeBarras itens={itens} />
    </section>
  )
}

/** Desempenho do negócio: básico no Essencial, ampliado no Destaque */
function PainelDesempenho() {
  const [dias, setDias] = useState(30)
  const [metrica, setMetrica] = useState('visitas')
  const consulta = useConsulta('/metricas/meu-negocio', { dias })
  const dados = consulta.dados?.data

  if (consulta.carregando) return <Spinner texto="Carregando suas estatísticas..." />
  if (consulta.erro && !dados) {
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
            Com o negócio publicado por um plano, você acompanha quantas pessoas visitaram seu perfil e
            clicaram para falar com você. No Destaque, vê também a evolução dia a dia e os produtos
            mais vistos.
          </p>
        </div>
      </div>
    )
  }

  const { totais, anterior, ampliado } = dados
  const canais = [
    { rotulo: 'WhatsApp', valor: totais.CLIQUE_WHATSAPP, icone: 'chat' },
    { rotulo: 'Telefone', valor: totais.CLIQUE_TELEFONE, icone: 'call' },
    { rotulo: 'Endereço / mapa', valor: totais.CLIQUE_ENDERECO, icone: 'location_on' },
    { rotulo: 'Instagram', valor: totais.CLIQUE_INSTAGRAM, icone: 'photo_camera' },
  ]

  return (
    <div className={`painel desempenho ${consulta.atualizando ? 'desempenho--atualizando' : ''}`}>
      <div className="desempenho__cabecalho">
        <p className="painel__detalhe">
          Visitas do próprio negócio não entram na conta, e cada pessoa conta uma vez a cada meia hora.
        </p>
        <div className="desempenho__periodos" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              className={`desempenho__periodo ${p === dias ? 'desempenho__periodo--ativo' : ''}`}
              aria-pressed={p === dias}
              onClick={() => setDias(p)}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      <Cartoes totais={totais} anterior={anterior ?? {}} dias={dados.periodo.dias} ampliado={ampliado} />

      <div className="desempenho__duas-colunas">
        <section className="desempenho__bloco">
          <h3>De onde vêm os contatos</h3>
          {contatos(totais) === 0 ? (
            <p className="painel__detalhe">Ninguém clicou para falar com você no período.</p>
          ) : (
            <ListaDeBarras itens={canais} unidade="%" />
          )}
        </section>

        {ampliado ? (
          <section className="desempenho__bloco">
            <h3>Produtos mais vistos</h3>
            {dados.produtosMaisVistos.length === 0 ? (
              <p className="painel__detalhe">Nenhum produto foi aberto no período.</p>
            ) : (
              <ListaDeBarras itens={dados.produtosMaisVistos.map((p) => ({ rotulo: p.nome, valor: p.visualizacoes }))} />
            )}
          </section>
        ) : (
          <section className="desempenho__bloco desempenho__bloco--convite">
            <Icone nome="lock" tamanho={22} />
            <h3>Quer ver dia a dia?</h3>
            <p className="painel__detalhe">
              No Destaque você vê a evolução diária de cada número, os dias da semana com mais visitas e os
              produtos mais vistos. Dá para trocar de plano na aba Plano.
            </p>
          </section>
        )}
      </div>

      {ampliado && (
        <>
          <GraficoDiario serie={dados.serie} metrica={metrica} aoTrocarMetrica={setMetrica} />
          <DiasDaSemana serie={dados.serie} />
        </>
      )}
    </div>
  )
}

export default PainelDesempenho
