import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'

// Backend e frontend têm cada um o seu node_modules. Os testes ficam fora dos
// dois, então precisam de um caminho explícito para as bibliotecas que usam
// direto (as que os próprios módulos importam resolvem sozinhas, a partir da
// pasta onde moram).
const doBackend = createRequire(new URL('./backend/package.json', import.meta.url))

// Os testes de unidade ficam todos em tests/, separados por lado do sistema.
// As suítes que abrem o navegador continuam em tests-e2e/ e rodam à parte,
// porque dependem dos servidores no ar.
export default defineConfig({
  resolve: {
    alias: {
      zod: doBackend.resolve('zod'),
      '@prisma/client': doBackend.resolve('@prisma/client'),
      jsonwebtoken: doBackend.resolve('jsonwebtoken'),
      bcryptjs: doBackend.resolve('bcryptjs'),
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
  },
})
