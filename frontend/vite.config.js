import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // Sem VITE_API_URL o site cairia no padrão http://localhost:3001/api e, no ar,
  // nenhuma tela carregaria. Melhor o build de produção parar com o motivo claro.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && mode === 'production' && !env.VITE_API_URL) {
    throw new Error(
      'Defina VITE_API_URL com o endereço da API (ex.: https://vitrinelocal-api.onrender.com/api) antes do build.'
    )
  }

  return {
    plugins: [react()],
    // Cache fora da pasta do OneDrive: a sincronização travava node_modules/.vite
    // e o servidor não subia (EPERM ao recriar .vite/deps)
    cacheDir: join(tmpdir(), 'vitrinelocal-vite'),
  }
})
