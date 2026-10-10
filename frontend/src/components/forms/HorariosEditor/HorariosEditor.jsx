import { useState } from 'react'
import Icone from '../../ui/Icone/Icone'
import {
  DIAS,
  agoraNoFuso,
  detalheDaSituacao,
  errosDosHorarios,
  expedienteDoDia,
  intervalosDoExpediente,
  nomeDaPausa,
  problemaDoExpediente,
  situacaoAtendimento,
} from '../../../services/horarios'
import { useRelogio } from '../../../hooks/useRelogio'
import CaixaDeMarcar from '../../ui/CaixaDeMarcar/CaixaDeMarcar'
import './HorariosEditor.css'

// O mais comum no comércio de bairro: das 8 às 18, com uma hora de almoço
const PADRAO_DO_DIA = { abre: '08:00', fecha: '18:00', pausas: [{ inicio: '12:00', fim: '13:00' }] }
const DIAS_UTEIS = [1, 2, 3, 4, 5]
const MAXIMO_PAUSAS = 3

const paraHora = (minutos) => {
  const limitado = Math.max(0, Math.min(minutos, 23 * 60 + 59))
  return `${String(Math.floor(limitado / 60)).padStart(2, '0')}:${String(limitado % 60).padStart(2, '0')}`
}
const minutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))

/** Campo de hora com rótulo visível ("Abre às", "Fecha às"...) */
function CampoHora({ rotulo, valor, onChange, rotuloAcessivel, erro }) {
  return (
    <label className="horarios-editor__campo">
      <span className="horarios-editor__campo-rotulo">{rotulo}</span>
      <input
        type="time"
        step="300"
        className={`campo__entrada ${erro ? 'campo__entrada--erro' : ''}`}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        aria-label={rotuloAcessivel}
      />
    </label>
  )
}

/**
 * Editor da semana de atendimento, no jeito que o comércio fala: cada dia tem
 * "abre às", "fecha às" e as pausas (almoço e outros intervalos).
 * - `valor`: lista de { diaSemana, abre, fecha } (0 = domingo ... 6 = sábado);
 *   é o formato do banco, e as pausas são o espaço entre os intervalos
 * - `onChange(novaLista)`
 * - `errosServidor`: mensagens vindas da API, por índice do intervalo
 * A prévia no rodapé mostra o que a página pública exibiria agora.
 */
function HorariosEditor({ valor = [], onChange, errosServidor = {} }) {
  // Relógio da prévia: recalcula a cada 30 segundos
  const agora = useRelogio()
  // Rascunho de cada dia enquanto a pessoa digita: um horário pela metade
  // (pausa depois do fechamento, por exemplo) não reorganiza a tela sozinho
  const [rascunhos, setRascunhos] = useState({})

  const intervalosDe = (dia) => valor.filter((h) => h.diaSemana === dia).map(({ abre, fecha }) => ({ abre, fecha }))
  const expedienteDe = (dia) => rascunhos[dia] ?? expedienteDoDia(intervalosDe(dia))

  /** Troca o expediente de um dia (null = fechado) e avisa o formulário */
  const definirDia = (dia, expediente) => {
    setRascunhos((anteriores) => ({ ...anteriores, [dia]: expediente ?? undefined }))
    const outros = valor.filter((h) => h.diaSemana !== dia)
    const doDia = expediente ? intervalosDoExpediente(expediente).map((h) => ({ diaSemana: dia, ...h })) : []
    onChange([...outros, ...doDia])
  }

  // Ao abrir um dia, repete o dia aberto mais próximo antes dele; se não houver, o padrão
  const modeloPara = (dia) => {
    const ordem = DIAS.map((d) => d.indice)
    const posicao = ordem.indexOf(dia)
    for (let passo = 1; passo < 7; passo++) {
      const anterior = expedienteDe(ordem[(posicao - passo + 7) % 7])
      if (anterior) return structuredClone(anterior)
    }
    return structuredClone(PADRAO_DO_DIA)
  }

  const alterar = (dia, mudanca) => definirDia(dia, { ...expedienteDe(dia), ...mudanca })

  const alterarPausa = (dia, posicao, campo, hora) => {
    const atual = expedienteDe(dia)
    alterar(dia, { pausas: atual.pausas.map((p, i) => (i === posicao ? { ...p, [campo]: hora } : p)) })
  }

  const adicionarPausa = (dia) => {
    const atual = expedienteDe(dia)
    // Sem pausa ainda: almoço ao meio-dia. Já com pausas: meia hora depois da última
    const ultima = atual.pausas.at(-1)
    const inicio = ultima ? minutos(ultima.fim) + 120 : 12 * 60
    const nova = { inicio: paraHora(inicio), fim: paraHora(inicio + (ultima ? 15 : 60)) }
    alterar(dia, { pausas: [...atual.pausas, nova] })
  }

  const removerPausa = (dia, posicao) => {
    const atual = expedienteDe(dia)
    alterar(dia, { pausas: atual.pausas.filter((_, i) => i !== posicao) })
  }

  /** Copia o horário de um dia para todos os outros dias que já estão abertos */
  const repetirNosAbertos = (origem) => {
    const modelo = expedienteDe(origem)
    const abertos = DIAS.map((d) => d.indice).filter((dia) => dia !== origem && expedienteDe(dia))
    setRascunhos({})
    const lista = valor.filter((h) => !abertos.includes(h.diaSemana))
    for (const dia of abertos) lista.push(...intervalosDoExpediente(modelo).map((h) => ({ diaSemana: dia, ...h })))
    onChange(lista)
  }

  const aplicarComercial = () => {
    setRascunhos({})
    onChange(DIAS_UTEIS.flatMap((dia) => intervalosDoExpediente(PADRAO_DO_DIA).map((h) => ({ diaSemana: dia, ...h }))))
  }

  const limparSemana = () => {
    setRascunhos({})
    onChange([])
  }

  const temErro = Object.keys({ ...errosServidor, ...errosDosHorarios(valor) }).length > 0
  const situacao = situacaoAtendimento(temErro ? [] : valor, agora)
  const relogio = agoraNoFuso(agora)
  const hoje = DIAS.find((d) => d.indice === relogio.dia)
  const diasAbertos = DIAS.filter((d) => expedienteDe(d.indice)).length

  return (
    <fieldset className="horarios-editor">
      <legend className="horarios-editor__titulo">
        <Icone nome="schedule" tamanho={18} />
        Horário de atendimento
      </legend>

      <p className="horarios-editor__explica">
        Marque os dias em que você atende, a hora que abre e a que fecha. Se para no almoço ou em
        outro intervalo, adicione a pausa: nesse período a página mostra <strong>Indisponível</strong>,
        no horário de Rondonópolis.
      </p>

      <div className="horarios-editor__atalhos">
        <button type="button" className="horarios-editor__atalho" onClick={aplicarComercial}>
          Seg a sex, 08:00 às 18:00 com almoço 12:00–13:00
        </button>
        {valor.length > 0 && (
          <button type="button" className="horarios-editor__atalho horarios-editor__atalho--limpar" onClick={limparSemana}>
            Limpar semana
          </button>
        )}
      </div>

      <ul className="horarios-editor__dias">
        {DIAS.map((dia) => {
          const expediente = expedienteDe(dia.indice)
          const atende = Boolean(expediente)
          const idDia = `horario-dia-${dia.indice}`
          const problema = atende ? problemaDoExpediente(expediente) : null
          return (
            <li
              key={dia.indice}
              className={`horarios-editor__dia ${atende ? '' : 'horarios-editor__dia--fechado'} ${
                dia.indice === relogio.dia ? 'horarios-editor__dia--hoje' : ''
              }`}
            >
              <label className="horarios-editor__nome" htmlFor={idDia}>
                <CaixaDeMarcar
                  tamanho="sm"
                  id={idDia}
                  checked={atende}
                  onChange={(evento) => definirDia(dia.indice, evento.target.checked ? modeloPara(dia.indice) : null)}
                />
                {dia.curto}
              </label>

              {!atende ? (
                <span className="horarios-editor__fechado">Fechado</span>
              ) : (
                <div className="horarios-editor__expediente">
                  <div className="horarios-editor__linha">
                    <CampoHora
                      rotulo="Abre às"
                      valor={expediente.abre}
                      onChange={(hora) => alterar(dia.indice, { abre: hora })}
                      rotuloAcessivel={`Hora que abre na ${dia.nome}`}
                      erro={Boolean(problema)}
                    />
                    <CampoHora
                      rotulo="Fecha às"
                      valor={expediente.fecha}
                      onChange={(hora) => alterar(dia.indice, { fecha: hora })}
                      rotuloAcessivel={`Hora que fecha na ${dia.nome}`}
                      erro={Boolean(problema)}
                    />
                  </div>

                  {expediente.pausas.map((pausa, posicao) => (
                    <div key={posicao} className="horarios-editor__pausa">
                      <span className="horarios-editor__pausa-nome">
                        <Icone nome={posicao === 0 ? 'restaurant' : 'coffee'} tamanho={16} />
                        {nomeDaPausa(posicao)}
                      </span>
                      <CampoHora
                        rotulo="das"
                        valor={pausa.inicio}
                        onChange={(hora) => alterarPausa(dia.indice, posicao, 'inicio', hora)}
                        rotuloAcessivel={`Começo do ${nomeDaPausa(posicao).toLowerCase()} na ${dia.nome}`}
                        erro={Boolean(problema)}
                      />
                      <CampoHora
                        rotulo="às"
                        valor={pausa.fim}
                        onChange={(hora) => alterarPausa(dia.indice, posicao, 'fim', hora)}
                        rotuloAcessivel={`Fim do ${nomeDaPausa(posicao).toLowerCase()} na ${dia.nome}`}
                        erro={Boolean(problema)}
                      />
                      <button
                        type="button"
                        className="horarios-editor__remover"
                        onClick={() => removerPausa(dia.indice, posicao)}
                        aria-label={`Tirar o ${nomeDaPausa(posicao).toLowerCase()} da ${dia.nome}`}
                      >
                        <Icone nome="close" tamanho={16} />
                      </button>
                    </div>
                  ))}

                  {problema && <span className="campo__erro">{problema}</span>}

                  <div className="horarios-editor__acoes-dia">
                    {expediente.pausas.length < MAXIMO_PAUSAS && (
                      <button type="button" className="horarios-editor__adicionar" onClick={() => adicionarPausa(dia.indice)}>
                        <Icone nome="add" tamanho={16} />
                        {expediente.pausas.length === 0 ? 'Pausa para almoço' : 'Outro intervalo'}
                      </button>
                    )}
                    {diasAbertos > 1 && !problema && (
                      <button type="button" className="horarios-editor__copiar" onClick={() => repetirNosAbertos(dia.indice)}>
                        <Icone nome="content_copy" tamanho={16} />
                        Usar este horário nos outros dias marcados
                      </button>
                    )}
                  </div>
                </div>
              )}
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
