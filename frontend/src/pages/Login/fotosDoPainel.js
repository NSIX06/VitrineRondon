// Fotos do painel de acesso (login, esqueci a senha, nova senha) e os
// endereços nos tamanhos pedidos ao Unsplash. Sem imports de propósito: o
// build (vite.config.js) usa este arquivo para pedir a foto do login já na
// abertura, com o mesmo srcset que a tela vai usar (assim o navegador
// reaproveita o download em vez de baixar de novo).

export const FOTOS_DO_ACESSO = {
  entrar: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200',
  criar: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200',
}

// Larguras pedidas ao Unsplash: no celular o painel é uma faixa de ~230 px
// de altura na largura da tela; no computador, metade da tela
export const LARGURAS_DO_PAINEL = [480, 640, 720, 960, 1200]
export const TAMANHOS_DO_PAINEL = '(max-width: 860px) 60vw, 50vw'

/** Endereço do Unsplash com largura, formato moderno (WebP/AVIF) e compressão */
export function fotoNoTamanho(url, largura) {
  try {
    const endereco = new URL(url)
    if (endereco.hostname !== 'images.unsplash.com') return url
    endereco.searchParams.set('w', String(largura))
    endereco.searchParams.set('q', '50')
    endereco.searchParams.set('auto', 'format')
    endereco.searchParams.set('fit', 'crop')
    return endereco.toString()
  } catch {
    return url
  }
}

export function srcsetDaFoto(url) {
  return LARGURAS_DO_PAINEL.map((largura) => `${fotoNoTamanho(url, largura)} ${largura}w`).join(', ')
}
