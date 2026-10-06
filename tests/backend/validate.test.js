import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { ZodError } from 'zod'
import { validateBody } from '../../backend/src/middlewares/validate.js'

const schema = z.object({
  nome: z.string().min(2),
  idade: z.coerce.number().int().optional(),
  papel: z.string().default('visitante'),
})

describe('validateBody', () => {
  it('segue adiante quando o corpo está válido', () => {
    const req = { body: { nome: 'Ana' } }
    const seguir = vi.fn()
    validateBody(schema)(req, {}, seguir)
    expect(seguir).toHaveBeenCalledWith()
  })

  it('troca o corpo pelo resultado da validação, já convertido', () => {
    const req = { body: { nome: 'Ana', idade: '34' } }
    validateBody(schema)(req, {}, vi.fn())
    expect(req.body.idade).toBe(34)
    expect(req.body.papel).toBe('visitante')
  })

  it('descarta campos que o schema não conhece', () => {
    // É o que impede alguém de mandar "perfil":"ADMIN" junto do cadastro
    const req = { body: { nome: 'Ana', perfil: 'ADMIN' } }
    validateBody(schema)(req, {}, vi.fn())
    expect(req.body.perfil).toBeUndefined()
  })

  it('entrega o erro de validação para o errorHandler, sem responder por conta própria', () => {
    const req = { body: { nome: 'A' } }
    const seguir = vi.fn()
    validateBody(schema)(req, {}, seguir)
    expect(seguir).toHaveBeenCalledTimes(1)
    expect(seguir.mock.calls[0][0]).toBeInstanceOf(ZodError)
  })

  it('não deixa o corpo inválido chegar ao controller', () => {
    const req = { body: { nome: 'A' } }
    validateBody(schema)(req, {}, vi.fn())
    expect(req.body).toEqual({ nome: 'A' })
  })

  it('trata corpo ausente como erro de validação', () => {
    const seguir = vi.fn()
    validateBody(schema)({ body: undefined }, {}, seguir)
    expect(seguir.mock.calls[0][0]).toBeInstanceOf(ZodError)
  })
})
