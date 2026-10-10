import { describe, it, expect } from 'vitest'
import {
  FUSO,
  DIAS,
  paraMinutos,
  agoraNoFuso,
  intervalosDoDia,
  situacaoAtendimento,
  detalheDaSituacao,
  textoDoDia,
  errosDosHorarios,
  expedienteDoDia,
  intervalosDoExpediente,
  nomeDaPausa,
  problemaDoExpediente,
} from '../../frontend/src/services/horarios.js'

const intervalo = (diaSemana, abre, fecha) => ({ diaSemana, abre, fecha })
// Segunda a sexta, 08:00–12:00 e 13:00–17:00
const COMERCIAL = [1, 2, 3, 4, 5].flatMap((dia) => [
  intervalo(dia, '08:00', '12:00'),
  intervalo(dia, '13:00', '17:00'),
])

/** Instante em Rondonópolis (UTC-4, sem horário de verão) */
const em = (dataIso) => new Date(`${dataIso}-04:00`)

describe('fuso e dias', () => {
  it('calcula no fuso de Rondonópolis, não no do visitante', () => {
    expect(FUSO).toBe('America/Cuiaba')
  })

  it('lista a semana começando na segunda, para leitura', () => {
    expect(DIAS.map((d) => d.curto)).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])
  })

  it('guarda o domingo como 0, igual ao banco', () => {
    expect(DIAS.at(-1)).toMatchObject({ indice: 0, nome: 'domingo' })
  })
})

describe('paraMinutos', () => {
  it.each([
    ['00:00', 0],
    ['08:30', 510],
    ['12:00', 720],
    ['23:59', 1439],
  ])('converte %s em %i minutos', (hora, esperado) => {
    expect(paraMinutos(hora)).toBe(esperado)
  })
})

describe('agoraNoFuso', () => {
  it('lê o dia e a hora locais do negócio', () => {
    const { dia, hora } = agoraNoFuso(em('2026-09-23T14:30:00'))
    expect(dia).toBe(3) // quarta
    expect(hora).toBe('14:30')
  })

  it('usa o horário de Rondonópolis mesmo quando o instante vem em UTC', () => {
    // 02:00 UTC de quinta ainda é quarta, 22:00, em Rondonópolis
    const { dia, hora } = agoraNoFuso(new Date('2026-09-24T02:00:00Z'))
    expect(dia).toBe(3)
    expect(hora).toBe('22:00')
  })
})

describe('intervalosDoDia', () => {
  it('devolve os intervalos do dia em ordem', () => {
    const fora = [intervalo(1, '13:00', '17:00'), intervalo(1, '08:00', '12:00'), intervalo(2, '09:00', '10:00')]
    expect(intervalosDoDia(fora, 1)).toEqual([
      { abre: '08:00', fecha: '12:00' },
      { abre: '13:00', fecha: '17:00' },
    ])
  })

  it('junta intervalos encostados, para dizer a hora real de fechar', () => {
    const colados = [intervalo(1, '08:00', '12:00'), intervalo(1, '12:00', '14:00')]
    expect(intervalosDoDia(colados, 1)).toEqual([{ abre: '08:00', fecha: '14:00' }])
  })

  it('devolve lista vazia em dia sem atendimento', () => {
    expect(intervalosDoDia(COMERCIAL, 0)).toEqual([])
  })

  it('aguenta lista vazia', () => {
    expect(intervalosDoDia([], 1)).toEqual([])
  })
})

describe('situacaoAtendimento', () => {
  it('diz aberto no meio do expediente', () => {
    const situacao = situacaoAtendimento(COMERCIAL, em('2026-09-23T10:00:00'))
    expect(situacao.aberto).toBe(true)
    expect(situacao.fechaAs).toBe('12:00')
  })

  it('atende no minuto da abertura', () => {
    expect(situacaoAtendimento(COMERCIAL, em('2026-09-23T08:00:00')).aberto).toBe(true)
  })

  it('já está fechado no minuto de fechar', () => {
    // 08:00–12:00 atende às 11:59, não às 12:00
    expect(situacaoAtendimento(COMERCIAL, em('2026-09-23T12:00:00')).aberto).toBe(false)
  })

  it('fecha no horário de almoço e avisa a volta', () => {
    const situacao = situacaoAtendimento(COMERCIAL, em('2026-09-23T12:30:00'))
    expect(situacao.aberto).toBe(false)
    expect(situacao.proxima).toMatchObject({ abre: '13:00', emDias: 0 })
  })

  it('depois do expediente, aponta o dia seguinte', () => {
    const situacao = situacaoAtendimento(COMERCIAL, em('2026-09-23T18:00:00'))
    expect(situacao.proxima).toMatchObject({ dia: 4, abre: '08:00', emDias: 1 })
  })

  it('no fim de semana, aponta a segunda-feira', () => {
    const situacao = situacaoAtendimento(COMERCIAL, em('2026-09-26T10:00:00')) // sábado
    expect(situacao.aberto).toBe(false)
    expect(situacao.proxima).toMatchObject({ dia: 1, emDias: 2 })
  })

  it('negócio sem horário publicado fica indisponível, e não fechado', () => {
    const situacao = situacaoAtendimento([], em('2026-09-23T10:00:00'))
    expect(situacao).toEqual({ aberto: false, semHorario: true, fechaAs: null, proxima: null })
  })

  it('atende de madrugada quando é isso que está publicado', () => {
    const padaria = [intervalo(3, '04:00', '09:00')]
    expect(situacaoAtendimento(padaria, em('2026-09-23T05:00:00')).aberto).toBe(true)
  })

  it('negócio que atende só um dia por semana aponta a semana seguinte', () => {
    const feira = [intervalo(6, '06:00', '12:00')]
    const situacao = situacaoAtendimento(feira, em('2026-09-26T13:00:00')) // sábado, depois de fechar
    expect(situacao.proxima).toMatchObject({ dia: 6, emDias: 7 })
  })
})

describe('detalheDaSituacao', () => {
  it('diz a hora de fechar quando está aberto', () => {
    expect(detalheDaSituacao(situacaoAtendimento(COMERCIAL, em('2026-09-23T10:00:00')))).toBe('Fecha às 12:00')
  })

  it('diz "hoje" quando ainda abre no mesmo dia', () => {
    expect(detalheDaSituacao(situacaoAtendimento(COMERCIAL, em('2026-09-23T12:30:00')))).toBe('Abre hoje às 13:00')
  })

  it('diz "amanhã" para o dia seguinte', () => {
    expect(detalheDaSituacao(situacaoAtendimento(COMERCIAL, em('2026-09-23T18:00:00')))).toBe('Abre amanhã às 08:00')
  })

  it('usa "na" para dias da semana', () => {
    expect(detalheDaSituacao(situacaoAtendimento(COMERCIAL, em('2026-09-26T10:00:00')))).toBe(
      'Abre na segunda às 08:00'
    )
  })

  it('usa "no" para sábado e domingo', () => {
    const feira = [intervalo(6, '06:00', '12:00')]
    expect(detalheDaSituacao(situacaoAtendimento(feira, em('2026-09-23T10:00:00')))).toBe('Abre no sábado às 06:00')
  })

  it('avisa quando o negócio não informou horário', () => {
    expect(detalheDaSituacao(situacaoAtendimento([]))).toBe('Horário de atendimento não informado')
  })
})

describe('textoDoDia', () => {
  it('escreve o expediente com a pausa do almoço', () => {
    expect(textoDoDia(COMERCIAL, 1)).toBe('08:00 às 17:00 · almoço 12:00–13:00')
  })

  it('sem pausa, só abre e fecha', () => {
    expect(textoDoDia([intervalo(6, '08:00', '12:00')], 6)).toBe('08:00 às 12:00')
  })

  it('com almoço e outro intervalo', () => {
    const dia = [intervalo(2, '08:00', '12:00'), intervalo(2, '13:00', '15:00'), intervalo(2, '15:30', '18:00')]
    expect(textoDoDia(dia, 2)).toBe('08:00 às 18:00 · almoço 12:00–13:00 · intervalo 15:00–15:30')
  })

  it('escreve "Fechado" em dia sem atendimento', () => {
    expect(textoDoDia(COMERCIAL, 0)).toBe('Fechado')
  })
})

describe('expediente com pausas', () => {
  const doDia = [
    { abre: '08:00', fecha: '12:00' },
    { abre: '13:00', fecha: '18:00' },
  ]

  it('intervalos viram abre, fecha e a pausa entre eles', () => {
    expect(expedienteDoDia(doDia)).toEqual({ abre: '08:00', fecha: '18:00', pausas: [{ inicio: '12:00', fim: '13:00' }] })
  })

  it('e voltam a ser os mesmos intervalos', () => {
    expect(intervalosDoExpediente(expedienteDoDia(doDia))).toEqual(doDia)
  })

  it('dia sem pausa é um intervalo só; dia sem intervalo é fechado', () => {
    expect(intervalosDoExpediente({ abre: '09:00', fecha: '17:00', pausas: [] })).toEqual([{ abre: '09:00', fecha: '17:00' }])
    expect(expedienteDoDia([])).toBeNull()
  })

  it('a primeira pausa é o almoço; as outras, intervalos', () => {
    expect([0, 1, 2].map(nomeDaPausa)).toEqual(['Almoço', 'Intervalo', 'Intervalo'])
  })

  it.each([
    [{ abre: '08:00', fecha: '18:00', pausas: [{ inicio: '12:00', fim: '13:00' }] }, null],
    [{ abre: '', fecha: '18:00', pausas: [] }, /abre e a que fecha/],
    [{ abre: '18:00', fecha: '08:00', pausas: [] }, /fechar precisa ser depois/],
    [{ abre: '08:00', fecha: '18:00', pausas: [{ inicio: '13:00', fim: '12:00' }] }, /fim do almoço/],
    [{ abre: '08:00', fecha: '18:00', pausas: [{ inicio: '07:00', fim: '08:30' }] }, /almoço precisa começar depois que o negócio abre/],
    [{ abre: '08:00', fecha: '18:00', pausas: [{ inicio: '17:00', fim: '19:00' }] }, /terminar antes de fechar/],
    [
      { abre: '08:00', fecha: '18:00', pausas: [{ inicio: '12:00', fim: '13:00' }, { inicio: '12:30', fim: '14:00' }] },
      /intervalo precisa começar depois da pausa anterior/,
    ],
  ])('explica o problema em linguagem simples (%#)', (expediente, esperado) => {
    const problema = problemaDoExpediente(expediente)
    if (esperado === null) expect(problema).toBeNull()
    else expect(problema).toMatch(esperado)
  })
})

describe('errosDosHorarios', () => {
  it('não reclama de uma semana bem preenchida', () => {
    expect(errosDosHorarios(COMERCIAL)).toEqual({})
  })

  it('cobra os dois horários do intervalo', () => {
    expect(errosDosHorarios([intervalo(1, '', '12:00')])).toEqual({ 0: 'Preencha início e fim' })
  })

  it('recusa hora inexistente', () => {
    expect(errosDosHorarios([intervalo(1, '25:00', '26:00')])[0]).toBe('Preencha início e fim')
  })

  it('recusa fim antes do início', () => {
    expect(errosDosHorarios([intervalo(1, '18:00', '09:00')])[0]).toBe('O fim precisa ser depois do início')
  })

  it('aponta a sobreposição no segundo intervalo, que é o que o editor marca', () => {
    const erros = errosDosHorarios([intervalo(1, '08:00', '12:00'), intervalo(1, '11:00', '15:00')])
    expect(erros).toEqual({ 1: 'Este intervalo se sobrepõe ao anterior' })
  })

  it('não confunde dias diferentes', () => {
    expect(errosDosHorarios([intervalo(1, '08:00', '12:00'), intervalo(2, '08:00', '12:00')])).toEqual({})
  })

  it('aceita intervalos encostados', () => {
    expect(errosDosHorarios([intervalo(1, '08:00', '12:00'), intervalo(1, '12:00', '18:00')])).toEqual({})
  })

  it('combina com a validação do servidor', async () => {
    // As duas pontas precisam recusar a mesma coisa, ou a tela deixa salvar o
    // que a API vai devolver como erro
    const { horariosSchema } = await import('../../backend/src/services/horarios.js')
    const sobrepostos = [intervalo(1, '08:00', '12:00'), intervalo(1, '11:00', '15:00')]
    expect(Object.keys(errosDosHorarios(sobrepostos))).toHaveLength(1)
    expect(horariosSchema.safeParse(sobrepostos).success).toBe(false)
  })
})
