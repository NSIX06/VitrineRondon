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
