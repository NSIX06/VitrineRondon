import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Cache fora da pasta do OneDrive: a sincronização travava node_modules/.vite
  // e o servidor não subia (EPERM ao recriar .vite/deps)
  cacheDir: join(tmpdir(), 'vitrinelocal-vite'),
})
