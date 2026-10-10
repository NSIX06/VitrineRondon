import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Política de conteúdo (CSP) no index.html do build de produção. O site é
 * estático, então a CSP vai como <meta>, sem depender de configurar cabeçalhos
 * na hospedagem. Só scripts do próprio site rodam: um XSS não consegue carregar
 * script de fora nem executar código inline. Em desenvolvimento fica de fora,
 * porque o Vite injeta scripts inline para recarregar a página.
 * (frame-ancestors não vale em <meta>; o bloqueio de iframe fica no cabeçalho X-Frame-Options.)
 */
function politicaDeConteudo(urlDaApi) {
  const api = new URL(urlDaApi).origin
  const diretivas = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    // 'unsafe-inline' só para estilo: bibliotecas de animação e o mapa escrevem estilo inline
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    // Fotos vêm do Cloudinary, de links https informados pelos negócios e dos mapas
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", api, 'https://nominatim.openstreetmap.org'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }
  const conteudo = Object.entries(diretivas)
    .map(([nome, valores]) => `${nome} ${valores.join(' ')}`)
    .join('; ')
  return {
    name: 'politica-de-conteudo',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: conteudo }, injectTo: 'head-prepend' },
    ],
  }
}

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
    plugins: [react(), ...(env.VITE_API_URL ? [politicaDeConteudo(env.VITE_API_URL)] : [])],
    // Cache fora da pasta do OneDrive: a sincronização travava node_modules/.vite
    // e o servidor não subia (EPERM ao recriar .vite/deps)
    cacheDir: join(tmpdir(), 'vitrinelocal-vite'),
  }
})
