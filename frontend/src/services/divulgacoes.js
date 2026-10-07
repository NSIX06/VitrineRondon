// Divulgações nas redes oficiais: os mesmos nomes no painel da administração
// e no do empreendedor. Um teste confere que batem com os valores da API.

export const TIPOS_DIVULGACAO = Object.freeze({
  NEGOCIO: 'Negócio',
  PRODUTO: 'Produto',
  SERVICO: 'Serviço',
  CAMPANHA: 'Campanha',
  INSTITUCIONAL: 'Conteúdo institucional',
})

export const STATUS_DIVULGACAO = Object.freeze({
  PLANEJADA: { rotulo: 'No calendário', variante: 'neutra' },
  PUBLICADA: { rotulo: 'Publicada', variante: 'ouro' },
  CANCELADA: { rotulo: 'Cancelada', variante: 'alerta' },
})
