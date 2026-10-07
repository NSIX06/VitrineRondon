import Tag from './Tag'

/** Etiqueta "Produto" ou "Serviço" de um item do catálogo */
function TagTipo({ tipo }) {
  const servico = tipo === 'servico'
  return <Tag variante={servico ? 'servico' : 'produto'}>{servico ? 'Serviço' : 'Produto'}</Tag>
}

export default TagTipo
