// Seed do banco de dados do VitrineLocal
// Idempotente: limpa as tabelas (respeitando a ordem das FKs) e insere os dados iniciais.
// Cenário: comércio de bairro em Rondonópolis-MT. Dados de demonstração.
// Latitude e longitude ficam vazias de propósito: o mapa usa o endereço informado
// e as coordenadas só entram quando confirmadas pelo próprio empreendedor no cadastro.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { semearPlanos } from './planos.js';
import { PREFIXO_DEMO, STATUS, sincronizarNegocio, vigenciaApos } from '../src/services/assinaturas.js';
import { TIPOS, diaLocal } from '../src/services/metricas.js';

const prisma = new PrismaClient();

// Versão vigente dos termos (cabeçalho de TERMOS_DE_USO.md e POLITICA_DE_PRIVACIDADE.md)
const TERMOS_VERSAO = process.env.TERMOS_VERSAO || '1.1';

const CIDADE = 'Rondonópolis';

// Horários de demonstração. 0 = domingo, 1 = segunda ... 6 = sábado.
// Um dia pode ter mais de um intervalo, como na pausa do almoço.
const semana = (dias, intervalos) =>
  dias.flatMap((diaSemana) => intervalos.map(([abre, fecha]) => ({ diaSemana, abre, fecha })));
const SEG_A_SEX = [1, 2, 3, 4, 5];
const SEG_A_SAB = [1, 2, 3, 4, 5, 6];
const TER_A_SAB = [2, 3, 4, 5, 6];
const ESTADO = 'MT';

const empreendedoresSeed = [
  {
    nomeNegocio: 'Ateliê Fio & Arte',
    responsavel: 'Maria Aparecida Souza',
    descricao:
      'Peças artesanais em crochê e macramê feitas à mão: tapetes, bolsas, sousplats e decoração para casa.',
    categoria: 'Artesanato',
    horarios: semana(SEG_A_SEX, [['08:00', '12:00'], ['13:00', '17:00']]),
    cidade: CIDADE,
    estado: ESTADO,
    bairro: 'Vila Aurora',
    endereco: 'Rua Dom Pedro II',
    numero: '412',
    cep: '78740-030',
    exibirEndereco: true,
    whatsapp: '66991234567',
    instagram: '@atelie.fioearte',
    fotoUrl: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800',
    produtos: [
      {
        nome: 'Tapete de crochê redondo',
        descricao: 'Tapete de barbante 100% algodão, 1 metro de diâmetro. Cores sob encomenda.',
        preco: 120.0,
        tipo: 'produto',
        imagem: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=800',
      },
      {
        nome: 'Bolsa de macramê',
        descricao: 'Bolsa artesanal em macramê com alça de couro sintético.',
        preco: 85.0,
        tipo: 'produto',
        imagem: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
      },
      {
        nome: 'Oficina de crochê para iniciantes',
        descricao: 'Aula presencial de 3 horas com material incluso.',
        preco: 60.0,
        tipo: 'servico',
        imagem: 'https://images.unsplash.com/photo-1604066867775-43f48e3957d8?w=800',
      },
    ],
  },
  {
    nomeNegocio: 'Doces da Dona Lu',
    responsavel: 'Luciana Ferreira',
    descricao:
      'Bolos caseiros, brigadeiros gourmet e doces para festas. Encomendas com 48h de antecedência.',
    categoria: 'Alimentação',
    horarios: semana(TER_A_SAB, [['09:00', '18:00']]),
    cidade: CIDADE,
    estado: ESTADO,
    bairro: 'Jardim Atlântico',
    endereco: 'Avenida Lions Internacional',
    numero: '1580',
    cep: '78710-110',
    // Produção em casa: o endereço exato não é divulgado, só o bairro
    exibirEndereco: false,
    whatsapp: '66998765432',
    instagram: '@docesdadonalu',
    fotoUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
    produtos: [
      {
        nome: 'Bolo de cenoura com chocolate',
        descricao: 'Bolo caseiro de 1,5 kg com cobertura de brigadeiro.',
        preco: 55.0,
        tipo: 'produto',
        imagem: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800',
      },
      {
        nome: 'Cento de brigadeiros gourmet',
        descricao: '100 unidades em sabores variados: tradicional, ninho, pistache e limão.',
        preco: 150.0,
        tipo: 'produto',
        imagem: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800',
      },
    ],
  },
  {
    nomeNegocio: 'Silva Reparos Residenciais',
    responsavel: 'Carlos Eduardo Silva',
    descricao:
      'Serviços de elétrica, hidráulica e pequenos reparos em geral. Atendimento em toda a cidade.',
    categoria: 'Serviços',
    horarios: semana(SEG_A_SAB, [['08:00', '18:00']]),
    cidade: CIDADE,
    estado: ESTADO,
    bairro: 'Vila Operária',
    endereco: 'Rua Arnaldo Estevão de Figueiredo',
    numero: '230',
    cep: '78725-120',
    exibirEndereco: true,
    whatsapp: '66997771234',
    instagram: null,
    fotoUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800',
    produtos: [
      {
        nome: 'Instalação elétrica residencial',
        descricao: 'Troca de tomadas, interruptores, disjuntores e instalação de luminárias.',
        preco: 150.0,
        tipo: 'servico',
        imagem: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
      },
      {
        nome: 'Reparo hidráulico',
        descricao: 'Conserto de vazamentos, troca de torneiras, registros e sifões.',
        preco: 120.0,
        tipo: 'servico',
        imagem: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800',
      },
      {
        nome: 'Montagem de móveis',
        descricao: 'Montagem e desmontagem de móveis planejados ou de loja.',
        preco: 90.0,
        tipo: 'servico',
        imagem: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=800',
      },
    ],
  },
  {
    nomeNegocio: 'Brechó da Ju',
    responsavel: 'Juliana Martins',
    descricao:
      'Moda sustentável: roupas e acessórios de segunda mão selecionados a dedo, além de camisetas com estampas autorais.',
    categoria: 'Moda',
    horarios: [],
    cidade: CIDADE,
    estado: ESTADO,
    bairro: 'Centro',
    endereco: 'Rua Rio Branco',
    numero: '876',
    complemento: 'Loja 2',
    cep: '78700-090',
    exibirEndereco: true,
    whatsapp: '66996543210',
    instagram: '@brechodaju',
    fotoUrl: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800',
    produtos: [
      {
        nome: 'Camiseta estampa autoral',
        descricao: 'Camiseta 100% algodão com estampa exclusiva serigrafada.',
        preco: 49.9,
        tipo: 'produto',
        imagem: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
      },
      {
        nome: 'Jaqueta jeans vintage',
        descricao: 'Jaqueta jeans garimpada, tamanho M, em ótimo estado.',
        preco: 89.9,
        tipo: 'produto',
        imagem: 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=800',
      },
    ],
  },
  {
    nomeNegocio: 'Espaço Bela Flor',
    responsavel: 'Patrícia Oliveira',
    descricao:
      'Salão de beleza em casa: cortes, escova, manicure, pedicure e design de sobrancelhas com hora marcada.',
    categoria: 'Beleza',
    horarios: semana(TER_A_SAB, [['09:00', '12:00'], ['13:30', '19:00']]),
    cidade: CIDADE,
    estado: ESTADO,
    bairro: 'Parque Sagrada Família',
    endereco: 'Rua das Palmeiras',
    numero: '55',
    cep: '78735-020',
    exibirEndereco: true,
    whatsapp: '66995551122',
    instagram: '@espacobelaflor',
    fotoUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    produtos: [
      {
        nome: 'Corte feminino + escova',
        descricao: 'Corte personalizado com finalização em escova.',
        preco: 70.0,
        tipo: 'servico',
        imagem: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800',
      },
      {
        nome: 'Manicure e pedicure',
        descricao: 'Esmaltação tradicional ou em gel.',
        preco: 45.0,
        tipo: 'servico',
        imagem: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
      },
      {
        nome: 'Design de sobrancelhas',
        descricao: 'Design com henna ou pinça.',
        preco: 35.0,
        tipo: 'servico',
        imagem: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800',
      },
    ],
  },
];

// Perguntas da central de ajuda. Cada resposta descreve algo que o sistema
// faz de verdade: nada de prazo, número ou serviço que não exista.
const perguntasFrequentes = [
  {
    categoria: 'Para quem compra',
    ordem: 1,
    pergunta: 'Preciso criar conta para ver a vitrine?',
    resposta:
      'Não. Busca, filtros, páginas dos negócios e o contato pelo WhatsApp são abertos a qualquer pessoa. Só quem vai publicar um negócio precisa criar conta.',
  },
  {
    categoria: 'Para quem compra',
    ordem: 2,
    pergunta: 'Como combino preço, pagamento e entrega?',
    resposta:
      'Direto com o empreendedor. O botão do WhatsApp, na página do negócio, abre a conversa com quem vende. O VitrineRondon não intermedeia pagamento nem entrega.',
  },
  {
    categoria: 'Para quem vende',
    ordem: 3,
    pergunta: 'Quanto custa anunciar no VitrineRondon?',
    resposta:
      'Navegar pela vitrine é gratuito. Para divulgar um negócio, é preciso criar uma conta e assinar um dos planos: o Essencial (R$ 50 por mês) publica o perfil completo, com produtos, mapa, contato e estatísticas básicas, e o Destaque (R$ 75 por mês) soma selo, prioridade nas listas, espaço na seção de destaques, estatísticas ampliadas e a possibilidade de divulgação nas redes oficiais. Os dois também têm versão anual, paga de uma vez, com 2 meses de presente. O negócio fica publicado enquanto a assinatura estiver em dia, e a plataforma não cobra comissão sobre as vendas. Os planos aumentam a oportunidade de exposição, mas não garantem visitas, contatos ou vendas. Veja os detalhes na página Planos.',
  },
  {
    categoria: 'Privacidade',
    ordem: 4,
    pergunta: 'Trabalho em casa. Preciso mostrar meu endereço?',
    resposta:
      'Não. No cadastro do negócio, desmarque "Mostrar o endereço completo". A página passa a exibir só o bairro, e o mapa indica a região sem apontar a casa.',
  },
];

// ---------------------------------------------------------------------------
// Demonstração das assinaturas (roteiro em DEMO.md)
// Só aparece na vitrine negócio com conta e assinatura em vigor, então cada
// negócio de exemplo tem a sua conta (senha DEMO_EMPREENDEDOR_SENHA):
// - Ateliê Fio & Arte: Destaque ativo, com divulgação nas redes;
// - Doces da Dona Lu, Silva Reparos e Brechó da Ju: Essencial ativo. Na
//   apresentação, o Carlos (Silva Reparos) assina o Destaque e sobe na lista;
// - Espaço Bela Flor: rascunho, cadastrado e sem plano. Fica fora da vitrine
//   até a Patrícia escolher um plano e pagar.
// naVitrineHaDias é desde quando cada um aparece na vitrine (a assinatura
// atual pode ser mais nova, renovada): só o Brechó, há 6 dias, ganha o selo
// "Novo na vitrine"; a Patrícia ganha ao publicar na demonstração.
// As assinaturas nunca passaram pelo gateway: os ids "demo_" deixam a
// simulação do admin encontrá-las e o cancelamento não chama o AbacatePay.
// Os números de desempenho são de exemplo, para o painel não abrir vazio.
// ---------------------------------------------------------------------------
const CONTAS_DEMO = [
  {
    negocio: 'Ateliê Fio & Arte',
    nome: 'Maria Aparecida Souza',
    email: 'maria@ateliefioearte.com.br',
    telefone: '66999881234',
    plano: 'DESTAQUE',
    assinadoHaDias: 12,
    naVitrineHaDias: 150,
  },
  {
    negocio: 'Doces da Dona Lu',
    nome: 'Luciana Ferreira',
    email: 'luciana@docesdadonalu.com.br',
    telefone: '66998765432',
    plano: 'ESSENCIAL',
    assinadoHaDias: 25,
    naVitrineHaDias: 210,
  },
  {
    negocio: 'Silva Reparos Residenciais',
    nome: 'Carlos Eduardo Silva',
    email: 'carlos@silvareparos.com.br',
    telefone: '66997771234',
    plano: 'ESSENCIAL',
    assinadoHaDias: 20,
    naVitrineHaDias: 95,
  },
  {
    negocio: 'Brechó da Ju',
    nome: 'Juliana Martins',
    email: 'juliana@brechodaju.com.br',
    telefone: '66996543210',
    plano: 'ESSENCIAL',
    assinadoHaDias: 8,
    naVitrineHaDias: 6,
  },
  {
    negocio: 'Espaço Bela Flor',
    nome: 'Patrícia Oliveira',
    email: 'patricia@espacobelaflor.com.br',
    telefone: '66995551122',
    plano: null, // rascunho: ainda não escolheu plano
  },
];
const DIA_MS = 24 * 60 * 60 * 1000;
const diasAtras = (n) => new Date(Date.now() - n * DIA_MS);

/** Sorteio previsível: o seed gera sempre os mesmos números */
function sorteador(semente) {
  let estado = semente;
  return (minimo, maximo) => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return minimo + (estado % (maximo - minimo + 1));
  };
}

async function criarAssinaturaDemo(empreendedorId, nomePlano, iniciadaHaDias) {
  const plano = await prisma.plano.findUnique({ where: { nome: nomePlano } });
  const inicioEm = diasAtras(iniciadaHaDias);
  const assinatura = await prisma.assinatura.create({
    data: {
      empreendedorId,
      planoId: plano.id,
      status: STATUS.ATIVA,
      gatewayCheckoutId: `${PREFIXO_DEMO}bill_${empreendedorId}`,
      gatewayAssinaturaId: `${PREFIXO_DEMO}subs_${empreendedorId}`,
      inicioEm,
      ...vigenciaApos(inicioEm, plano.ciclo),
      criadoEm: inicioEm,
    },
  });
  await sincronizarNegocio(prisma, empreendedorId);
  return assinatura;
}

/** Últimos 30 dias de visitas e cliques, com mais movimento no fim de semana */
async function criarMetricasDemo(empreendedor, { escala, emDestaqueHaDias = 0, semente }) {
  const sortear = sorteador(semente);
  const linhas = [];
  for (let n = 29; n >= 0; n -= 1) {
    const dia = diaLocal(diasAtras(n));
    const fimDeSemana = [0, 6].includes(dia.getUTCDay());
    const destaque = n < emDestaqueHaDias;
    const visitas = Math.round(sortear(3, 9) * escala * (fimDeSemana ? 1.4 : 1) * (destaque ? 1.3 : 1));
    const conta = (tipo, quantidade, referenciaId = 0) => {
      if (quantidade > 0) linhas.push({ empreendedorId: empreendedor.id, dia, tipo, referenciaId, quantidade });
    };
    conta(TIPOS.VISUALIZACAO_PERFIL, visitas);
    conta(TIPOS.CLIQUE_WHATSAPP, Math.round(visitas * sortear(10, 25) / 100));
    conta(TIPOS.CLIQUE_ENDERECO, sortear(0, 2));
    if (empreendedor.instagram) conta(TIPOS.CLIQUE_INSTAGRAM, sortear(0, 2));
    if (destaque) conta(TIPOS.IMPRESSAO_DESTAQUE, sortear(25, 60));
    empreendedor.produtos.forEach((produto, i) => {
      conta(TIPOS.VISUALIZACAO_PRODUTO, Math.max(0, sortear(0, 6) - i), produto.id);
    });
  }
  await prisma.metricaDiaria.createMany({ data: linhas });
  return linhas.length;
}

async function semearDemonstracao(porNome) {
  for (const conta of CONTAS_DEMO.filter((c) => c.plano)) {
    const id = porNome(conta.negocio).id;
    await criarAssinaturaDemo(id, conta.plano, conta.assinadoHaDias);
    await prisma.empreendedor.update({ where: { id }, data: { publicadoDesde: diasAtras(conta.naVitrineHaDias) } });
  }
  const atelie = porNome('Ateliê Fio & Arte');
  const silva = porNome('Silva Reparos Residenciais');

  await prisma.empreendedor.update({
    where: { id: atelie.id },
    data: { autorizaDivulgacao: true, autorizaDivulgacaoEm: diasAtras(12) },
  });
  await prisma.divulgacao.createMany({
    data: [
      {
        empreendedorId: atelie.id,
        tipo: 'PRODUTO',
        titulo: 'Tapete de crochê redondo no feed oficial',
        canal: 'Instagram',
        status: 'PUBLICADA',
        publicadaEm: diasAtras(5),
        alcance: 640,
      },
      {
        empreendedorId: atelie.id,
        tipo: 'SERVICO',
        titulo: 'Oficina de crochê para iniciantes nos stories',
        canal: 'Instagram',
        status: 'PLANEJADA',
      },
    ],
  });

  const metricas =
    (await criarMetricasDemo(atelie, { escala: 1.6, emDestaqueHaDias: 12, semente: 7 })) +
    (await criarMetricasDemo(silva, { escala: 1, semente: 11 }));
  const rascunhos = CONTAS_DEMO.filter((c) => !c.plano).map((c) => c.negocio);
  console.log(`  - 1 Destaque, 3 Essencial, rascunho: ${rascunhos.join(', ')} | ${metricas} linhas de métricas`);
}

/** Grava o aceite dos dois termos para um usuário (uma linha por documento) */
async function registrarAceites(usuarioId) {
  await prisma.aceiteTermos.createMany({
    data: [
      { usuarioId, tipoTermo: 'TERMOS_DE_USO', versao: TERMOS_VERSAO, ip: '127.0.0.1', userAgent: 'seed' },
      { usuarioId, tipoTermo: 'POLITICA_PRIVACIDADE', versao: TERMOS_VERSAO, ip: '127.0.0.1', userAgent: 'seed' },
    ],
  });
}

async function main() {
  console.log('Limpando tabelas...');
  // Ordem respeita as chaves estrangeiras: filhos antes dos pais
  await prisma.logAuditoria.deleteMany();
  await prisma.perguntaFrequente.deleteMany();
  await prisma.aceiteTermos.deleteMany();
  await prisma.contato.deleteMany();
  await prisma.metricaDiaria.deleteMany();
  await prisma.divulgacao.deleteMany();
  await prisma.assinatura.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.empreendedor.deleteMany();
  await prisma.usuario.deleteMany();

  // Planos não são apagados: atualizar mantém o vínculo com o produto já
  // criado no gateway de pagamento
  console.log('Conferindo planos de assinatura...');
  await semearPlanos(prisma);

  console.log('Criando usuários...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@vitrinelocal.com.br';
  const adminSenha = process.env.ADMIN_SENHA;
  const demoSenha = process.env.DEMO_EMPREENDEDOR_SENHA;
  if (!adminSenha || !demoSenha) {
    throw new Error('Defina ADMIN_SENHA e DEMO_EMPREENDEDOR_SENHA no arquivo .env antes de rodar o seed.');
  }

  const admin = await prisma.usuario.create({
    data: {
      nome: process.env.ADMIN_NOME || 'Administrador',
      email: adminEmail,
      telefone: '66999990000',
      senhaHash: await bcrypt.hash(adminSenha, 10),
      perfil: 'ADMIN',
    },
  });
  await registrarAceites(admin.id);
  console.log(`  - ${admin.email} (ADMIN)`);

  // Uma conta por negócio: sem conta (e plano) nenhum negócio é publicado
  const senhaDemoHash = await bcrypt.hash(demoSenha, 10);
  const donos = {};
  for (const conta of CONTAS_DEMO) {
    const usuario = await prisma.usuario.create({
      data: {
        nome: conta.nome,
        email: conta.email,
        telefone: conta.telefone,
        senhaHash: senhaDemoHash,
        perfil: 'EMPREENDEDOR',
      },
    });
    await registrarAceites(usuario.id);
    donos[conta.negocio] = usuario.id;
    console.log(`  - ${usuario.email} (EMPREENDEDOR)`);
  }

  console.log('Inserindo empreendedores e produtos...');
  const empreendedoresCriados = [];
  for (const { produtos, horarios = [], ...dadosEmpreendedor } of empreendedoresSeed) {
    const usuarioId = donos[dadosEmpreendedor.nomeNegocio] ?? null;
    const empreendedor = await prisma.empreendedor.create({
      data: {
        ...dadosEmpreendedor,
        usuarioId,
        produtos: { create: produtos },
        horarios: { create: horarios },
      },
      include: { produtos: true },
    });
    empreendedoresCriados.push(empreendedor);
    console.log(`  - ${empreendedor.nomeNegocio} (${empreendedor.produtos.length} itens)`);
  }

  console.log('Inserindo assinaturas de demonstração...');
  const porNome = (nome) => empreendedoresCriados.find((e) => e.nomeNegocio === nome);
  await semearDemonstracao(porNome);

  console.log('Inserindo mensagem de contato de exemplo...');
  await prisma.contato.create({
    data: {
      nome: 'João Pedro Almeida',
      email: 'joao.pedro@email.com',
      telefone: '66991112233',
      mensagem:
        'Olá! Gostaria de encomendar um tapete de crochê na cor bege para entrega até o fim do mês. Vocês fazem sob medida?',
      lido: false,
      empreendedorId: empreendedoresCriados[0].id,
    },
  });

  console.log('Inserindo perguntas frequentes...');
  await prisma.perguntaFrequente.createMany({ data: perguntasFrequentes });

  const totalProdutos = await prisma.produto.count();
  const totalUsuarios = await prisma.usuario.count();
  const totalAceites = await prisma.aceiteTermos.count();
  console.log(
    `Seed concluído: ${totalUsuarios} usuários, ${totalAceites} aceites, ${empreendedoresCriados.length} empreendedores, ${totalProdutos} produtos, 1 contato, ${perguntasFrequentes.length} perguntas frequentes.`
  );
}

main()
  .catch((erro) => {
    console.error('Erro ao executar o seed:', erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
