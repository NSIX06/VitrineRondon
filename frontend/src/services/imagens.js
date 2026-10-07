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
