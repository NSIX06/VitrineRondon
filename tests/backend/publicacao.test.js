import { describe, it, expect } from 'vitest'
import {
  SITUACAO,
  estaPublicado,
  filtroPublicado,
  planoEmVigor,
  situacaoDoNegocio,
} from '../../backend/src/services/publicacao.js'

const AGORA = new Date('2026-10-08T12:00:00Z')
const AMANHA = new Date('2026-10-09T12:00:00Z')
const ONTEM = new Date('2026-10-07T12:00:00Z')
const publicado = { ativo: true, planoAtual: 'ESSENCIAL', publicadoAte: AMANHA }

describe('navegar é gratuito; divulgar exige assinatura em vigor', () => {
  it('a consulta pública pede negócio ativo e período pago no futuro', () => {
    expect(filtroPublicado(AGORA)).toEqual({ ativo: true, publicadoAte: { gt: AGORA } })
  })

  it('só aparece na vitrine quem tem período pago em andamento', () => {
    expect(estaPublicado(publicado, AGORA)).toBe(true)
    expect(estaPublicado({ ...publicado, publicadoAte: ONTEM }, AGORA)).toBe(false)
    expect(estaPublicado({ ...publicado, publicadoAte: null }, AGORA)).toBe(false)
  })

  it('negócio suspenso pela administração sai da vitrine mesmo com plano pago', () => {
    expect(estaPublicado({ ...publicado, ativo: false }, AGORA)).toBe(false)
  })

  it('data vinda do JSON (texto) também vale', () => {
    expect(estaPublicado({ ...publicado, publicadoAte: AMANHA.toISOString() }, AGORA)).toBe(true)
  })
})

describe('situação do negócio', () => {
  const pendente = { status: 'PENDENTE', inicioEm: null }
  const jaPaga = { status: 'CANCELADA', inicioEm: ONTEM }

  it('cadastrado sem plano é rascunho', () => {
    expect(situacaoDoNegocio({ ativo: true, publicadoAte: null }, [], AGORA)).toBe(SITUACAO.RASCUNHO)
  })

  it('plano escolhido e não pago aguarda pagamento', () => {
    expect(situacaoDoNegocio({ ativo: true, publicadoAte: null }, [pendente], AGORA)).toBe(SITUACAO.AGUARDANDO_PAGAMENTO)
  })

  it('período pago em andamento é ativo, mesmo com uma troca de plano pendente', () => {
    expect(situacaoDoNegocio(publicado, [{ status: 'ATIVA', inicioEm: ONTEM }, pendente], AGORA)).toBe(SITUACAO.ATIVO)
  })

  it('já teve plano e o período acabou: assinatura expirada (os dados ficam)', () => {
    expect(situacaoDoNegocio({ ativo: true, publicadoAte: ONTEM }, [jaPaga], AGORA)).toBe(SITUACAO.ASSINATURA_EXPIRADA)
  })

  it('checkout abandonado nunca pago não conta como assinatura que existiu', () => {
    const abandonado = { status: 'CANCELADA', inicioEm: null }
    expect(situacaoDoNegocio({ ativo: true, publicadoAte: null }, [abandonado], AGORA)).toBe(SITUACAO.RASCUNHO)
  })

  it('suspensão administrativa vale mais que tudo', () => {
    expect(situacaoDoNegocio({ ...publicado, ativo: false }, [jaPaga], AGORA)).toBe(SITUACAO.SUSPENSO)
  })
})

describe('benefícios do plano só valem no período pago', () => {
  it('dentro do período, vale o plano guardado', () => {
    expect(planoEmVigor({ planoAtual: 'DESTAQUE', publicadoAte: AMANHA }, AGORA)).toBe('DESTAQUE')
  })

  it('depois do vencimento, nenhum plano, mesmo antes da varredura zerar o campo', () => {
    expect(planoEmVigor({ planoAtual: 'DESTAQUE', publicadoAte: ONTEM }, AGORA)).toBe('NENHUM')
    expect(planoEmVigor({ planoAtual: 'ESSENCIAL', publicadoAte: null }, AGORA)).toBe('NENHUM')
  })
})
