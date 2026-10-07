import Icone from '../../ui/Icone/Icone'
import {
  DIAS,
  agoraNoFuso,
  detalheDaSituacao,
  errosDosHorarios,
  paraMinutos,
  situacaoAtendimento,
} from '../../../services/horarios'
import { useRelogio } from '../../../hooks/useRelogio'
import './HorariosEditor.css'

// O exemplo mais comum no comércio de bairro: manhã e tarde com pausa para o almoço
const PADRAO_DO_DIA = [
  { abre: '08:00', fecha: '12:00' },
  { abre: '13:00', fecha: '17:00' },
]
const DIAS_UTEIS = [1, 2, 3, 4, 5]

const paraHora = (minutos) => {
  const limitado = Math.min(minutos, 23 * 60 + 59)
  return `${String(Math.floor(limitado / 60)).padStart(2, '0')}:${String(limitado % 60).padStart(2, '0')}`
}

const ORDINAIS = ['1º', '2º', '3º', '4º']
const MAXIMO_POR_DIA = 4

/**
 * Editor da semana de atendimento.
 * - `valor`: lista de { diaSemana, abre, fecha } (0 = domingo ... 6 = sábado)
 * - `onChange(novaLista)`
 * - `errosServidor`: mensagens vindas da API, por índice do intervalo
 * A prévia no rodapé mostra o que a página pública exibiria agora.
 */
function HorariosEditor({ valor = [], onChange, errosServidor = {} }) {
  // Relógio da prévia: recalcula a cada 30 segundos
  const agora = useRelogio()

  const erros = { ...errosServidor, ...errosDosHorarios(valor) }
  const comIndice = valor.map((h, indice) => ({ ...h, indice }))
  const doDia = (dia) =>
    comIndice.filter((h) => h.diaSemana === dia).sort((a, b) => a.abre.localeCompare(b.abre))

  // Ao abrir um dia, repete o dia aberto mais próximo antes dele; se não houver, usa o padrão
  const modeloPara = (dia) => {
    const ordem = DIAS.map((d) => d.indice)
    const posicao = ordem.indexOf(dia)
    for (let passo = 1; passo < 7; passo++) {
      const anterior = ordem[(posicao - passo + 7) % 7]
      const intervalos = doDia(anterior)
      if (intervalos.length) return intervalos.map(({ abre, fecha }) => ({ abre, fecha }))
    }
    return PADRAO_DO_DIA
  }

  const alternarDia = (dia, atende) => {
    const semODia = valor.filter((h) => h.diaSemana !== dia)
    onChange(atende ? [...semODia, ...modeloPara(dia).map((h) => ({ diaSemana: dia, ...h }))] : semODia)
  }

  const alterarIntervalo = (indice, campo, hora) => {
    onChange(valor.map((h, i) => (i === indice ? { ...h, [campo]: hora } : h)))
  }

  const removerIntervalo = (indice) => onChange(valor.filter((_, i) => i !== indice))

  const adicionarIntervalo = (dia) => {
    const ultimo = doDia(dia).at(-1)
    const inicio = ultimo ? paraMinutos(ultimo.fecha) + 60 : 8 * 60
    onChange([...valor, { diaSemana: dia, abre: paraHora(inicio), fecha: paraHora(inicio + 120) }])
  }

  const aplicarComercial = () => {
    onChange(DIAS_UTEIS.flatMap((dia) => PADRAO_DO_DIA.map((h) => ({ diaSemana: dia, ...h }))))
  }

  const temErro = Object.keys(erros).length > 0
  const situacao = situacaoAtendimento(temErro ? [] : valor, agora)
  const relogio = agoraNoFuso(agora)
  const hoje = DIAS.find((d) => d.indice === relogio.dia)

  return (
    <fieldset className="horarios-editor">
      <legend className="horarios-editor__titulo">
        <Icone nome="schedule" tamanho={18} />
        Horário de atendimento
      </legend>

      <p className="horarios-editor__explica">
        Sua página mostra <strong>Disponível</strong> dentro destes horários e{' '}
        <strong>Indisponível</strong> fora deles, sozinha, no horário de Rondonópolis.
      </p>

      <div className="horarios-editor__atalhos">
        <button type="button" className="horarios-editor__atalho" onClick={aplicarComercial}>
          Seg a sex, 08:00–12:00 e 13:00–17:00
        </button>
        {valor.length > 0 && (
          <button
            type="button"
            className="horarios-editor__atalho horarios-editor__atalho--limpar"
            onClick={() => onChange([])}
          >
            Limpar semana
          </button>
        )}
      </div>

      <ul className="horarios-editor__dias">
        {DIAS.map((dia) => {
          const intervalos = doDia(dia.indice)
          const atende = intervalos.length > 0
          const idDia = `horario-dia-${dia.indice}`
          return (
            <li
              key={dia.indice}
              className={`horarios-editor__dia ${atende ? '' : 'horarios-editor__dia--fechado'} ${
                dia.indice === relogio.dia ? 'horarios-editor__dia--hoje' : ''
              }`}
            >
              <label className="horarios-editor__nome" htmlFor={idDia}>
                <input
                  id={idDia}
                  type="checkbox"
                  checked={atende}
                  onChange={(evento) => alternarDia(dia.indice, evento.target.checked)}
                />
                {dia.curto}
              </label>

              <div className="horarios-editor__intervalos">
                {!atende && <span className="horarios-editor__fechado">Fechado</span>}

                {intervalos.map((h, posicao) => (
                  <div key={h.indice} className="horarios-editor__intervalo">
                    <div className="horarios-editor__horas">
                      <input
                        type="time"
                        step="300"
                        className={`campo__entrada ${erros[h.indice] ? 'campo__entrada--erro' : ''}`}
                        value={h.abre}
                        onChange={(evento) => alterarIntervalo(h.indice, 'abre', evento.target.value)}
                        aria-label={`Início do ${ORDINAIS[posicao]} intervalo de ${dia.nome}`}
                        data-dia={dia.indice}
                        data-campo="abre"
                      />
                      <span aria-hidden="true">às</span>
                      <input
                        type="time"
                        step="300"
                        className={`campo__entrada ${erros[h.indice] ? 'campo__entrada--erro' : ''}`}
                        value={h.fecha}
                        onChange={(evento) => alterarIntervalo(h.indice, 'fecha', evento.target.value)}
                        aria-label={`Fim do ${ORDINAIS[posicao]} intervalo de ${dia.nome}`}
                        data-dia={dia.indice}
                        data-campo="fecha"
                      />
                      <button
                        type="button"
                        className="horarios-editor__remover"
                        onClick={() => removerIntervalo(h.indice)}
                        aria-label={`Remover o ${ORDINAIS[posicao]} intervalo de ${dia.nome}`}
                      >
                        <Icone nome="close" tamanho={16} />
                      </button>
                    </div>
                    {erros[h.indice] && <span className="campo__erro">{erros[h.indice]}</span>}
                  </div>
                ))}

                {atende && intervalos.length < MAXIMO_POR_DIA && (
                  <button
                    type="button"
                    className="horarios-editor__adicionar"
                    onClick={() => adicionarIntervalo(dia.indice)}
                  >
                    <Icone nome="add" tamanho={16} />
                    Intervalo
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Prévia do selo, com o relógio de Rondonópolis */}
      <div
        className={`horarios-editor__previa ${situacao.aberto ? 'horarios-editor__previa--aberto' : ''}`}
        aria-live="polite"
      >
        <span className="horarios-editor__ponto" aria-hidden="true" />
        <div>
          <strong>
            {temErro
              ? 'Corrija os horários marcados para ver a prévia'
              : situacao.aberto
                ? 'Disponível para atendimento'
                : 'Indisponível para atendimento'}
          </strong>
          <span>
            Agora em Rondonópolis: {hoje?.nome}, {relogio.hora}
            {!temErro && ` · ${detalheDaSituacao(situacao)}`}
          </span>
        </div>
      </div>
    </fieldset>
  )
}

export default HorariosEditor
