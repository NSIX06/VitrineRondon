// Imagens dos cadastros: links externos (como sempre foi) ou arquivos enviados
// do computador. O servidor guarda o arquivo enviado na pasta local
// ("/uploads/<id>.webp", em desenvolvimento) ou no Cloudinary (em produção,
// "https://res.cloudinary.com/...").
import { ORIGEM_API } from './api'

/** Formatos aceitos no envio (o servidor converte tudo para WebP) */
export const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024

const PREFIXO_UPLOAD = '/uploads/'
const PREFIXO_NUVEM = 'https://res.cloudinary.com/'
const LINK_EXTERNO = /^https?:\/\/\S+$/i

/** É um arquivo enviado do computador (e não um link colado)? */
export const ehImagemEnviada = (valor) =>
  typeof valor === 'string' && (valor.startsWith(PREFIXO_UPLOAD) || valor.startsWith(PREFIXO_NUVEM))

/** Prévia de um arquivo escolhido e ainda não enviado (só existe neste navegador)? */
export const ehPreviaLocal = (valor) => typeof valor === 'string' && valor.startsWith('blob:')

/** É um link http(s) completo? */
export const ehLinkDeImagem = (valor) => typeof valor === 'string' && LINK_EXTERNO.test(valor.trim())

/**
 * Endereço para usar no <img>. Arquivo enviado mora no servidor da API, que
 * pode estar em outro endereço que o site; link externo passa do jeito que está.
 */
export function urlImagem(valor) {
  if (!valor) return valor
  return valor.startsWith(PREFIXO_UPLOAD) ? `${ORIGEM_API}${valor}` : valor
}

// Larguras pedidas ao Cloudinary para o srcset: o navegador escolhe a menor
// que preenche o espaço na tela (já contando a densidade da tela do celular)
// Passos curtos até 960: no celular a foto do cartão ocupa ~370 px, que com a
// densidade da tela pede ~650 px; sem 720/800 o navegador pulava para 960
export const LARGURAS_IMAGEM = [320, 400, 480, 560, 640, 720, 800, 960, 1280, 1600]

/** Endereço do Cloudinary com uma transformação no lugar certo (logo depois de /upload/) */
function comTransformacao(url, transformacao) {
  return url.replace('/image/upload/', `/image/upload/${transformacao}/`)
}

/**
 * Fontes para a <img>: { src, srcSet? }. Foto no Cloudinary vem redimensionada
 * pelo próprio Cloudinary (formato automático, compressão "eco", sem aumentar a
 * original): um cartão de 350 px baixava a foto inteira de 1600 px. Link de
 * fora e arquivo da pasta local passam do jeito que estão.
 * - `larguras`: as versões oferecidas no srcset
 */
export function fontesDaImagem(valor, larguras = LARGURAS_IMAGEM) {
  const src = urlImagem(valor)
  // Link do Unsplash (muito usado por quem cola um link de foto): o próprio
  // Unsplash redimensiona, comprime e entrega em AVIF/WebP pelos parâmetros
  if (src && src.startsWith('https://images.unsplash.com/')) {
    const versao = (largura) => {
      const endereco = new URL(src)
      endereco.searchParams.set('w', String(largura))
      endereco.searchParams.set('q', '60')
      endereco.searchParams.set('auto', 'format')
      endereco.searchParams.set('fit', 'max')
      return endereco.toString()
    }
    return {
      src: versao(larguras[Math.min(4, larguras.length - 1)]),
      srcSet: larguras.map((largura) => `${versao(largura)} ${largura}w`).join(', '),
    }
  }
  if (!src || !src.startsWith(PREFIXO_NUVEM) || !src.includes('/image/upload/')) return { src }
  const versao = (largura) => comTransformacao(src, `f_auto,q_auto:eco,c_limit,w_${largura}`)
  return {
    src: versao(larguras[Math.min(4, larguras.length - 1)]),
    srcSet: larguras.map((largura) => `${versao(largura)} ${largura}w`).join(', '),
  }
}

/**
 * Confere o arquivo antes de enviar, para não gastar upload à toa.
 * Devolve a mensagem de erro, ou null se estiver tudo certo.
 */
export function problemaNoArquivo(arquivo) {
  if (!arquivo) return 'Escolha uma imagem.'
  if (!TIPOS_IMAGEM.includes(arquivo.type)) return 'Formato não aceito. Use JPG, PNG, WebP, GIF ou AVIF.'
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) return 'A imagem passa de 5 MB. Escolha um arquivo menor.'
  return null
}
