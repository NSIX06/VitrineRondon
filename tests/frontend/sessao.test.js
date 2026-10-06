import { describe, it, expect } from 'vitest'
import { PERFIS, rotaInicialPorPerfil } from '../../frontend/src/contexts/auth.js'
import { validarAceites } from '../../frontend/src/services/validacoes.js'
import { CATEGORIAS } from '../../frontend/src/services/constantes.js'

describe('rotaInicialPorPerfil', () => {
  it('leva o administrador ao painel', () => {
    expect(rotaInicialPorPerfil({ perfil: PERFIS.ADMIN })).toBe('/admin')
  })

  it('leva o empreendedor à área do negócio dele', () => {
    expect(rotaInicialPorPerfil({ perfil: PERFIS.EMPREENDEDOR })).toBe('/meu-negocio')
  })

  it('leva quem só navega para a página inicial', () => {
    expect(rotaInicialPorPerfil({ perfil: PERFIS.COMUM })).toBe('/')
  })

  it('manda para a página inicial quem não está identificado', () => {
    expect(rotaInicialPorPerfil(null)).toBe('/')
    expect(rotaInicialPorPerfil(undefined)).toBe('/')
  })

  it('não dá painel a perfil desconhecido', () => {
    expect(rotaInicialPorPerfil({ perfil: 'SUPERVISOR' })).toBe('/')
  })

  it('usa os mesmos perfis do servidor', async () => {
    const { PERFIS: doServidor } = await import('../../backend/src/middlewares/auth.js')
    expect(PERFIS).toEqual(doServidor)
  })
})

describe('validarAceites', () => {
  it('não reclama quando os dois foram marcados', () => {
    expect(validarAceites({ termosDeUso: true, politicaPrivacidade: true })).toEqual({})
  })

  it('cobra os Termos de Uso', () => {
    const erros = validarAceites({ termosDeUso: false, politicaPrivacidade: true })
    expect(erros.termosDeUso).toMatch(/Termos de Uso/)
    expect(erros.politicaPrivacidade).toBeUndefined()
  })

  it('cobra a Política de Privacidade', () => {
    const erros = validarAceites({ termosDeUso: true, politicaPrivacidade: false })
    expect(erros.politicaPrivacidade).toMatch(/Política de Privacidade/)
  })

  it('cobra os dois quando nada foi marcado', () => {
    expect(Object.keys(validarAceites({}))).toEqual(['termosDeUso', 'politicaPrivacidade'])
  })
})

describe('categorias da vitrine', () => {
  it('tem as cinco categorias do projeto, sem "Geral"', () => {
    expect(CATEGORIAS).toEqual(['Artesanato', 'Alimentação', 'Serviços', 'Moda', 'Beleza'])
  })

  it('não repete nenhuma', () => {
    expect(new Set(CATEGORIAS).size).toBe(CATEGORIAS.length)
  })
})
