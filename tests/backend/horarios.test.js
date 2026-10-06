import { describe, it, expect } from 'vitest'
import {
  DIAS_DA_SEMANA,
  horariosSchema,
  incluirHorarios,
  comHorariosParaPrisma,
} from '../../backend/src/services/horarios.js'

const intervalo = (diaSemana, abre, fecha) => ({ diaSemana, abre, fecha })
const manhaETarde = [intervalo(1, '08:00', '12:00'), intervalo(1, '13:00', '17:00')]

/** Mensagens de erro de uma lista recusada */
const erros = (lista) => horariosSchema.safeParse(lista).error.issues.map((i) => i.message)

describe('DIAS_DA_SEMANA', () => {
  it('segue a ordem do getDay() do JavaScript, começando no domingo', () => {
    expect(DIAS_DA_SEMANA).toHaveLength(7)
    expect(DIAS_DA_SEMANA[0]).toBe('domingo')
    expect(DIAS_DA_SEMANA[6]).toBe('sábado')
  })
})

describe('horariosSchema', () => {
  it('aceita semana vazia: negócio sem horário publicado', () => {
    expect(horariosSchema.safeParse([]).success).toBe(true)
  })

  it('aceita dois turnos no mesmo dia, com intervalo de almoço', () => {
    expect(horariosSchema.safeParse(manhaETarde).success).toBe(true)
  })

  it('converte o dia da semana que chegou como texto', () => {
    const { data } = horariosSchema.safeParse([{ diaSemana: '3', abre: '09:00', fecha: '18:00' }])
    expect(data[0].diaSemana).toBe(3)
  })

  it('recusa fim antes do início', () => {
    expect(erros([intervalo(2, '18:00', '09:00')])).toContain('O fim precisa ser depois do início')
  })

  it('recusa início igual ao fim, que não é atendimento nenhum', () => {
    expect(horariosSchema.safeParse([intervalo(2, '09:00', '09:00')]).success).toBe(false)
  })

  it.each([
    ['sem os dois pontos', '0800'],
    ['hora impossível', '25:00'],
    ['minuto impossível', '08:70'],
    ['sem zero à esquerda', '8:00'],
    ['vazio', ''],
  ])('recusa horário %s', (_rotulo, abre) => {
    expect(erros([intervalo(1, abre, '19:00')])).toContain('Use o formato 00:00')
  })

  it.each([[-1], [7], [99]])('recusa dia da semana %i', (dia) => {
    expect(erros([intervalo(dia, '08:00', '12:00')])).toContain('Dia da semana inválido')
  })

  it('recusa intervalos que se sobrepõem no mesmo dia', () => {
    const mensagens = erros([intervalo(1, '08:00', '12:00'), intervalo(1, '11:00', '15:00')])
    expect(mensagens.some((m) => m.includes('se sobrepõem'))).toBe(true)
  })

  it('diz em qual dia está a sobreposição', () => {
    const mensagens = erros([intervalo(4, '08:00', '12:00'), intervalo(4, '11:59', '15:00')])
    expect(mensagens).toContain('Os intervalos de quinta se sobrepõem')
  })

  it('aceita intervalos encostados, um terminando quando o outro começa', () => {
    const colados = [intervalo(1, '08:00', '12:00'), intervalo(1, '12:00', '18:00')]
    expect(horariosSchema.safeParse(colados).success).toBe(true)
  })

  it('não confunde dias diferentes no mesmo horário', () => {
    const semanaToda = [0, 1, 2, 3, 4, 5, 6].map((dia) => intervalo(dia, '08:00', '18:00'))
    expect(horariosSchema.safeParse(semanaToda).success).toBe(true)
  })

  it('recusa mais de quatro intervalos num mesmo dia', () => {
    const cinco = [
      intervalo(1, '06:00', '07:00'),
      intervalo(1, '08:00', '09:00'),
      intervalo(1, '10:00', '11:00'),
      intervalo(1, '12:00', '13:00'),
      intervalo(1, '14:00', '15:00'),
    ]
    expect(erros(cinco)).toContain('No máximo 4 intervalos por dia')
  })

  it('recusa lista maior que a semana inteira no limite', () => {
    const demais = Array.from({ length: 29 }, (_, i) => intervalo(i % 7, '08:00', '09:00'))
    expect(erros(demais)).toContain('Horários demais')
  })

  it('aponta a posição do intervalo com problema, para a tela marcar o campo', () => {
    const { error } = horariosSchema.safeParse([
      intervalo(1, '08:00', '12:00'),
      intervalo(1, '11:00', '15:00'),
    ])
    expect(error.issues[0].path).toEqual([1, 'abre'])
  })
})

describe('incluirHorarios', () => {
  it('devolve os horários em ordem de dia e de abertura', () => {
    expect(incluirHorarios.orderBy).toEqual([{ diaSemana: 'asc' }, { abre: 'asc' }])
  })

  it('não expõe id nem a chave do negócio', () => {
    expect(Object.keys(incluirHorarios.select).sort()).toEqual(['abre', 'diaSemana', 'fecha'])
  })
})

describe('comHorariosParaPrisma', () => {
  it('no cadastro, cria os horários junto do negócio', () => {
    const saida = comHorariosParaPrisma({ nomeNegocio: 'Ateliê', horarios: manhaETarde })
    expect(saida.horarios).toEqual({ create: manhaETarde })
    expect(saida.nomeNegocio).toBe('Ateliê')
  })

  it('na edição, troca a semana inteira de uma vez', () => {
    const saida = comHorariosParaPrisma({ horarios: manhaETarde }, { edicao: true })
    expect(saida.horarios).toEqual({ deleteMany: {}, create: manhaETarde })
  })

  it('sem horários no corpo, não mexe na semana guardada', () => {
    const saida = comHorariosParaPrisma({ nomeNegocio: 'Ateliê' }, { edicao: true })
    expect(saida).toEqual({ nomeNegocio: 'Ateliê' })
    expect('horarios' in saida).toBe(false)
  })

  it('lista vazia apaga a semana, e não é o mesmo que não informar', () => {
    const saida = comHorariosParaPrisma({ horarios: [] }, { edicao: true })
    expect(saida.horarios).toEqual({ deleteMany: {}, create: [] })
  })
})
