// Planos de assinatura do VitrineRondon.
//
// É a fonte única dos planos: o seed completo e o "npm run planos:semear" (que
// roda também em produção, sem apagar nada) leem daqui. Mudar preço, texto ou
// criar um plano novo é editar esta lista e rodar o comando de novo.
//
// "descricao" traz um benefício por linha: a página de planos monta a lista a
// partir dela. Os textos falam em oportunidade de exposição e nunca prometem
// resultado (mais clientes, posição fixa, número de visualizações).

export const PLANOS = [
  {
    nome: 'ESSENCIAL',
    titulo: 'VitrineRondon Essencial',
    chamada: 'Tenha seu negócio presente no VitrineRondon.',
    precoCentavos: 5000,
    ciclo: 'MONTHLY',
    destaque: false,
    metricasAmpliadas: false,
    divulgacao: false,
    ordem: 1,
    descricao: [
      'Perfil comercial completo, com nome, descrição e categoria',
      'Endereço, localização no mapa e horário de atendimento',
      'Botão direto para o seu WhatsApp e links das redes sociais',
      'Fotos, produtos e serviços no seu catálogo',
      'Participação na busca e nas listas da vitrine pelos critérios padrão',
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
      'Prioridade na ordem das listas, sem tirar ninguém da vitrine',
      'Espaço na seção "Negócios em Destaque" da página inicial',
      'Possibilidade de participar de campanhas e da divulgação nas redes oficiais, conforme o calendário editorial',
      'Estatísticas ampliadas: evolução por dia, por produto e impressões em destaque',
    ].join('\n'),
  },
];

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
