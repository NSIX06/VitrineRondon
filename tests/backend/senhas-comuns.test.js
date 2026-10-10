import { describe, it, expect } from 'vitest'
import { ehSenhaComum, problemaSenhaPrivilegiada } from '../../backend/src/services/senhasComuns.js'

describe('ehSenhaComum', () => {
  it('reconhece senhas comuns sem diferenciar maiúsculas', () => {
    expect(ehSenhaComum('Senha123')).toBe(true)
    expect(ehSenhaComum(' ABC12345 ')).toBe(true)
    expect(ehSenhaComum('Feira2026x')).toBe(false)
  })
})

describe('problemaSenhaPrivilegiada (seed em banco na nuvem)', () => {
  it('recusa curtas, comuns e as de exemplo publicadas', () => {
    expect(problemaSenhaPrivilegiada('Admin@2026')).toMatch(/14/)
    expect(problemaSenhaPrivilegiada('defina-uma-senha-forte')).toMatch(/comum|exemplo/)
    expect(problemaSenhaPrivilegiada('somenteletrasmuitolongas')).toMatch(/letras e números/)
  })

  it('aceita senha longa e aleatória', () => {
    expect(problemaSenhaPrivilegiada('kX9pQ2vL7mN4rT8w')).toBeNull()
  })
})
