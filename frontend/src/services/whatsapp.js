// Links do WhatsApp usados pela vitrine, pelo detalhe do item e pelo contato.

/** Só os dígitos, com o código do Brasil na frente */
export function numeroInternacional(numero) {
  const digitos = String(numero || '').replace(/\D/g, '')
  return digitos.startsWith('55') && digitos.length >= 12 ? digitos : `55${digitos}`
}

/** Link wa.me com mensagem inicial opcional */
export function linkWhatsapp(numero, mensagem) {
  const base = `https://wa.me/${numeroInternacional(numero)}`
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base
}
