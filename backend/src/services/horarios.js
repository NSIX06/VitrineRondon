// Horário de atendimento dos negócios.
// Cada linha é um intervalo em um dia da semana: "08:00" às "12:00" na segunda.
// Um dia pode ter vários intervalos (ex.: 08:00–12:00 e 13:00–17:00).
// Quem calcula "aberto agora" é o navegador, no fuso de Rondonópolis; aqui só
// se valida e se guarda o que o empreendedor informou.
import { z } from 'zod';

// 0 = domingo ... 6 = sábado, igual ao Date.getDay() do JavaScript
export const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAXIMO_POR_DIA = 4;

const intervaloSchema = z
  .object({
    diaSemana: z.coerce
      .number({ error: 'Dia da semana inválido' })
      .int()
      .min(0, 'Dia da semana inválido')
      .max(6, 'Dia da semana inválido'),
    abre: z.string({ error: 'Informe o horário de início' }).regex(HORA, 'Use o formato 00:00'),
    fecha: z.string({ error: 'Informe o horário de fim' }).regex(HORA, 'Use o formato 00:00'),
  })
  // "HH:MM" com zero à esquerda pode ser comparado como texto
  .refine((h) => h.abre < h.fecha, {
    message: 'O fim precisa ser depois do início',
    path: ['fecha'],
  });

export const horariosSchema = z
  .array(intervaloSchema)
  .max(7 * MAXIMO_POR_DIA, 'Horários demais')
  .superRefine((lista, ctx) => {
    for (let dia = 0; dia < 7; dia++) {
      const doDia = lista
        .map((h, indice) => ({ ...h, indice }))
        .filter((h) => h.diaSemana === dia)
        .sort((a, b) => a.abre.localeCompare(b.abre));

      if (doDia.length > MAXIMO_POR_DIA) {
        ctx.addIssue({
          code: 'custom',
          message: `No máximo ${MAXIMO_POR_DIA} intervalos por dia`,
          path: [doDia[MAXIMO_POR_DIA].indice, 'abre'],
        });
      }
      for (let k = 1; k < doDia.length; k++) {
        if (doDia[k].abre < doDia[k - 1].fecha) {
          ctx.addIssue({
            code: 'custom',
            message: `Os intervalos de ${DIAS_DA_SEMANA[dia]} se sobrepõem`,
            path: [doDia[k].indice, 'abre'],
          });
        }
      }
    }
  });

/** Como os horários voltam da API: só o que interessa, em ordem */
export const incluirHorarios = {
  orderBy: [{ diaSemana: 'asc' }, { abre: 'asc' }],
  select: { diaSemana: true, abre: true, fecha: true },
};

/**
 * Converte o corpo validado para o formato do Prisma.
 * - No cadastro, os horários viram um create aninhado.
 * - Na edição, se vierem horários, a semana inteira é substituída na mesma
 *   operação (apaga os antigos e grava os novos). Se não vierem, nada muda.
 */
export function comHorariosParaPrisma(dados, { edicao = false } = {}) {
  const { horarios, ...resto } = dados;
  if (horarios === undefined) return resto;
  return {
    ...resto,
    horarios: edicao ? { deleteMany: {}, create: horarios } : { create: horarios },
  };
}
