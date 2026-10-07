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
 * Erros de validação do servidor ({ campo, mensagem }[]) no formato dos
 * formulários: { campo: mensagem }. Devolve null quando o erro não traz campos.
 * `prefixos` tira o grupo do nome, como "conta." em "conta.email".
 */
export function errosDoServidor(erro, prefixos = []) {
  const lista = erro?.data?.errors
  if (!lista?.length) return null
  const mapa = {}
  for (const { campo, mensagem } of lista) {
    const prefixo = prefixos.find((p) => campo.startsWith(p))
    mapa[prefixo ? campo.slice(prefixo.length) : campo] = mensagem
  }
  return mapa
}
