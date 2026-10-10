// Horário de atendimento: dias, intervalos e o cálculo de "aberto agora".
//
// Todo cálculo usa o fuso de Rondonópolis (America/Cuiaba, UTC-4, sem horário
// de verão), e não o do aparelho de quem visita. Assim um visitante em outro
// estado vê o mesmo "Disponível" que um vizinho do negócio.

export const FUSO = 'America/Cuiaba'

// Ordem de exibição: segunda a domingo. `indice` segue o Date.getDay()
// (0 = domingo), que é o mesmo número guardado no banco.
export const DIAS = [
  { indice: 1, curto: 'Seg', nome: 'segunda' },
  { indice: 2, curto: 'Ter', nome: 'terça' },
  { indice: 3, curto: 'Qua', nome: 'quarta' },
  { indice: 4, curto: 'Qui', nome: 'quinta' },
  { indice: 5, curto: 'Sex', nome: 'sexta' },
  { indice: 6, curto: 'Sáb', nome: 'sábado' },
  { indice: 0, curto: 'Dom', nome: 'domingo' },
]

const NOME_DO_DIA = Object.fromEntries(DIAS.map((d) => [d.indice, d.nome]))
const INDICE_EM_INGLES = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const partesNoFuso = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "08:30" -> 510 */
export const paraMinutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))

/** Dia da semana e minuto do dia no fuso de Rondonópolis */
export function agoraNoFuso(data = new Date()) {
  const partes = Object.fromEntries(partesNoFuso.formatToParts(data).map((p) => [p.type, p.value]))
  return {
    dia: INDICE_EM_INGLES[partes.weekday],
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
    hora: `${partes.hour}:${partes.minute}`,
  }
}

/**
 * Intervalos de um dia, em ordem, com os que se encostam unidos
 * (08:00–12:00 e 12:00–14:00 viram 08:00–14:00 para dizer "fecha às 14:00").
 */
export function intervalosDoDia(horarios = [], dia) {
  const doDia = horarios
    .filter((h) => h.diaSemana === dia)
    .map((h) => ({ abre: h.abre, fecha: h.fecha }))
    .sort((a, b) => a.abre.localeCompare(b.abre))
  const unidos = []
  for (const intervalo of doDia) {
    const ultimo = unidos[unidos.length - 1]
    if (ultimo && intervalo.abre <= ultimo.fecha) {
      if (intervalo.fecha > ultimo.fecha) ultimo.fecha = intervalo.fecha
    } else {
      unidos.push({ ...intervalo })
    }
  }
  return unidos
}

/**
 * Situação de atendimento em um instante.
 * Aberto quando o minuto atual está em algum intervalo do dia: início incluso,
 * fim excluso (08:00–12:00 atende às 08:00 e às 11:59, não às 12:00).
 *
 * @returns {{ aberto: boolean, semHorario: boolean, fechaAs: string|null,
 *            proxima: { dia: number, abre: string, emDias: number }|null }}
 */
export function situacaoAtendimento(horarios = [], data = new Date()) {
  if (!horarios.length) return { aberto: false, semHorario: true, fechaAs: null, proxima: null }

  const { dia, minutos } = agoraNoFuso(data)
  const hoje = intervalosDoDia(horarios, dia)

  const atual = hoje.find((h) => paraMinutos(h.abre) <= minutos && minutos < paraMinutos(h.fecha))
  if (atual) return { aberto: true, semHorario: false, fechaAs: atual.fecha, proxima: null }

  // Próxima abertura: ainda hoje, ou no primeiro dia seguinte que atender
  const maisTardeHoje = hoje.find((h) => paraMinutos(h.abre) > minutos)
  if (maisTardeHoje) {
    return { aberto: false, semHorario: false, fechaAs: null, proxima: { dia, abre: maisTardeHoje.abre, emDias: 0 } }
  }
  for (let emDias = 1; emDias <= 7; emDias++) {
    const outroDia = (dia + emDias) % 7
    const primeiro = intervalosDoDia(horarios, outroDia)[0]
    if (primeiro) {
      return { aberto: false, semHorario: false, fechaAs: null, proxima: { dia: outroDia, abre: primeiro.abre, emDias } }
    }
  }
  return { aberto: false, semHorario: true, fechaAs: null, proxima: null }
}

/** Frase curta para acompanhar o selo: "fecha às 12:00", "abre amanhã às 08:00" */
export function detalheDaSituacao(situacao) {
  if (situacao.semHorario) return 'Horário de atendimento não informado'
  if (situacao.aberto) return `Fecha às ${situacao.fechaAs}`
  const { proxima } = situacao
  if (proxima.emDias === 0) return `Abre hoje às ${proxima.abre}`
  if (proxima.emDias === 1) return `Abre amanhã às ${proxima.abre}`
  const artigo = proxima.dia === 0 || proxima.dia === 6 ? 'no' : 'na'
  return `Abre ${artigo} ${NOME_DO_DIA[proxima.dia]} às ${proxima.abre}`
}

/**
 * Intervalos de um dia vistos como expediente: abre, fecha e as pausas entre
 * eles. [08–12, 13–18] -> { abre: '08:00', fecha: '18:00', pausas: [{ inicio: '12:00', fim: '13:00' }] }
 * É assim que o comércio fala ("abre às 8, fecha às 18, almoço do meio-dia à
 * uma"); no banco continuam os intervalos.
 */
export function expedienteDoDia(intervalos = []) {
  if (!intervalos.length) return null
  const pausas = []
  for (let k = 1; k < intervalos.length; k++) {
    pausas.push({ inicio: intervalos[k - 1].fecha, fim: intervalos[k].abre })
  }
  return { abre: intervalos[0].abre, fecha: intervalos.at(-1).fecha, pausas }
}

/** O caminho de volta: expediente com pausas -> intervalos para salvar */
export function intervalosDoExpediente({ abre, fecha, pausas = [] }) {
  const intervalos = []
  let inicio = abre
  for (const pausa of pausas) {
    intervalos.push({ abre: inicio, fecha: pausa.inicio })
    inicio = pausa.fim
  }
  intervalos.push({ abre: inicio, fecha })
  return intervalos
}

/** Nome da pausa na tela: a primeira é o almoço, as outras são intervalos */
export const nomeDaPausa = (posicao) => (posicao === 0 ? 'Almoço' : 'Intervalo')

/**
 * Problema do expediente em linguagem de balcão, ou null. Usado pelo editor
 * para explicar o erro no próprio dia, em vez de "intervalo 2 inválido".
 */
export function problemaDoExpediente({ abre, fecha, pausas = [] }) {
  if (!HORA.test(abre ?? '') || !HORA.test(fecha ?? '')) return 'Preencha a hora que abre e a que fecha'
  if (abre >= fecha) return 'A hora de fechar precisa ser depois da de abrir'
  let anterior = abre
  for (const [posicao, pausa] of pausas.entries()) {
    const nome = nomeDaPausa(posicao).toLowerCase()
    if (!HORA.test(pausa.inicio ?? '') || !HORA.test(pausa.fim ?? '')) return `Preencha o começo e o fim do ${nome}`
    if (pausa.inicio >= pausa.fim) return `O fim do ${nome} precisa ser depois do começo`
    if (pausa.inicio <= anterior) {
      return posicao === 0
        ? `O ${nome} precisa começar depois que o negócio abre`
        : `O ${nome} precisa começar depois da pausa anterior`
    }
    if (pausa.fim >= fecha) return `O ${nome} precisa terminar antes de fechar`
    anterior = pausa.fim
  }
  return null
}

/** "08:00 às 18:00 · almoço 12:00–13:00" (sem pausa: "08:00 às 18:00") */
export function textoDoDia(horarios, dia) {
  const expediente = expedienteDoDia(intervalosDoDia(horarios, dia))
  if (!expediente) return 'Fechado'
  const pausas = expediente.pausas.map(
    (p, i) => `${nomeDaPausa(i).toLowerCase()} ${p.inicio}–${p.fim}`
  )
  return [`${expediente.abre} às ${expediente.fecha}`, ...pausas].join(' · ')
}

/**
 * Erros de preenchimento por intervalo, para o editor mostrar ao lado do campo.
 * Chave: índice do intervalo na lista; valor: mensagem.
 */
export function errosDosHorarios(horarios = []) {
  const erros = {}
  horarios.forEach((h, indice) => {
    if (!HORA.test(h.abre) || !HORA.test(h.fecha)) erros[indice] = 'Preencha início e fim'
    else if (h.abre >= h.fecha) erros[indice] = 'O fim precisa ser depois do início'
  })
  for (let dia = 0; dia < 7; dia++) {
    const doDia = horarios
      .map((h, indice) => ({ ...h, indice }))
      .filter((h) => h.diaSemana === dia && !erros[h.indice])
      .sort((a, b) => a.abre.localeCompare(b.abre))
    for (let k = 1; k < doDia.length; k++) {
      if (doDia[k].abre < doDia[k - 1].fecha) erros[doDia[k].indice] = 'Este intervalo se sobrepõe ao anterior'
    }
  }
  return erros
}
