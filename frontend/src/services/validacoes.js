// Validações compartilhadas no cliente (o servidor valida de novo)

/** Aceites obrigatórios do cadastro; devolve erros por campo (vazio se ok) */
export function validarAceites(valores) {
  const erros = {}
  if (!valores.termosDeUso) erros.termosDeUso = 'É preciso aceitar os Termos de Uso para continuar'
  if (!valores.politicaPrivacidade) {
    erros.politicaPrivacidade = 'É preciso estar ciente da Política de Privacidade para continuar'
  }
  return erros
}

/**
 * Erros de validação do servidor ({ campo: [mensagens] }) no formato dos
 * formulários: { campo: mensagem }, com a primeira mensagem de cada campo.
 * Devolve null quando o erro não traz campos.
 * `prefixos` tira o grupo do nome, como "conta." em "conta.email".
 */
export function errosDoServidor(erro, prefixos = []) {
  const porCampo = erro?.data?.errors
  if (!porCampo || typeof porCampo !== 'object' || !Object.keys(porCampo).length) return null
  const mapa = {}
  for (const [campo, mensagens] of Object.entries(porCampo)) {
    const prefixo = prefixos.find((p) => campo.startsWith(p))
    mapa[prefixo ? campo.slice(prefixo.length) : campo] = [].concat(mensagens)[0]
  }
  return mapa
}
