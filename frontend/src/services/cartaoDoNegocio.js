// Textos do cartão de negócio (EmpreendedorCard). Só mostram o que existe:
// nada de vírgula sobrando nem dado inventado para preencher espaço.

/** "Bairro, Cidade", só com as partes cadastradas ("" quando não há nenhuma) */
export function localDoNegocio({ bairro, cidade } = {}) {
  return [bairro, cidade]
    .map((parte) => String(parte ?? '').trim())
    .filter(Boolean)
    .join(', ')
}

/** "Nenhum item cadastrado", "1 item na vitrine", "8 itens na vitrine" */
export function textoDosItens(total) {
  const n = Number(total) || 0
  if (n === 0) return 'Nenhum item cadastrado'
  return `${n} ${n === 1 ? 'item' : 'itens'} na vitrine`
}
