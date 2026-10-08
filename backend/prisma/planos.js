// Planos de assinatura do VitrineRondon.
//
// Para divulgar um negócio, um destes planos é obrigatório: sem assinatura em
// vigor, o negócio fica guardado como rascunho, fora da vitrine.
//
// É a fonte única dos planos: o seed completo e o "npm run planos:semear" (que
// roda também em produção, sem apagar nada) leem daqui. Mudar preço, texto ou
// criar um plano novo é editar esta lista e rodar o comando de novo.
//
// "descricao" traz um benefício por linha: a página de planos monta a lista a
// partir dela. Os textos falam em oportunidade de exposição e nunca prometem
// resultado (mais clientes, posição fixa, número de visualizações).

const MENSAIS = [
  {
    nome: 'ESSENCIAL',
    titulo: 'VitrineRondon Essencial',
    chamada: 'Seu negócio publicado no VitrineRondon.',
    precoCentavos: 5000,
    ciclo: 'MONTHLY',
    destaque: false,
    metricasAmpliadas: false,
    divulgacao: false,
    ordem: 1,
    descricao: [
      'Publicação do seu negócio na vitrine enquanto a assinatura estiver em dia',
      'Perfil comercial completo, com nome, descrição e categoria',
      'Endereço, localização no mapa e horário de atendimento',
      'Botão direto para o seu WhatsApp e links das redes sociais',
      'Fotos, produtos e serviços no seu catálogo',
      'Presença na busca, nas categorias e no mapa, pelos critérios padrão',
      'Recebimento de mensagens pela central de contato',
      'Estatísticas básicas do seu perfil, com os totais do mês',
    ].join('\n'),
  },
  {
    nome: 'DESTAQUE',
    titulo: 'VitrineRondon Destaque',
    chamada: 'Ganhe mais visibilidade e aumente suas oportunidades de ser encontrado.',
    precoCentavos: 7500,
    ciclo: 'MONTHLY',
    destaque: true,
    metricasAmpliadas: true,
    divulgacao: true,
    ordem: 2,
    descricao: [
      'Tudo o que o plano Essencial oferece',
      'Selo "Negócio em Destaque" no card, no perfil e nos resultados de busca',
      'Prioridade na ordem das listas, sem tirar os demais negócios publicados',
      'Prioridade na vitrine animada da página inicial, à frente dos demais negócios',
      'Possibilidade de participar de campanhas e da divulgação nas redes oficiais, conforme o calendário editorial',
      'Estatísticas ampliadas: evolução por dia, por produto e impressões em destaque',
    ].join('\n'),
  },
];

// Planos anuais: os mesmos recursos, pagos de uma vez por ano com 2 meses de
// presente (12 meses pelo preço de 10). Mudar o desconto é mudar este número.
export const MESES_PAGOS_NO_ANO = 10;

/** Versão anual de um plano mensal: mesmo conteúdo, ciclo e preço do ano */
function anual(plano) {
  return {
    ...plano,
    nome: `${plano.nome}_ANUAL`,
    titulo: `${plano.titulo} Anual`,
    precoCentavos: plano.precoCentavos * MESES_PAGOS_NO_ANO,
    ciclo: 'ANNUALLY',
    ordem: plano.ordem + 10,
  };
}

export const PLANOS = [...MENSAIS, ...MENSAIS.map(anual)];

/**
 * Cria os planos que faltam e atualiza os que existem, pelo nome. Nunca apaga
 * plano nem mexe no gatewayProdutoId: um plano já vendido continua ligado ao
 * mesmo produto no gateway.
 */
export async function semearPlanos(prisma) {
  for (const plano of PLANOS) {
    await prisma.plano.upsert({
      where: { nome: plano.nome },
      create: plano,
      update: plano,
    });
  }
  return PLANOS.length;
}
