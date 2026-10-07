// Seed do banco de dados do VitrineLocal
// Idempotente: limpa as tabelas (respeitando a ordem das FKs) e insere os dados iniciais.
// Cenário: comércio de bairro em Rondonópolis-MT. Dados de demonstração.
// Latitude e longitude ficam vazias de propósito: o mapa usa o endereço informado
// e as coordenadas só entram quando confirmadas pelo próprio empreendedor no cadastro.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { semearPlanos } from './planos.js';

const prisma = new PrismaClient();

// Versão vigente dos termos (cabeçalho de TERMOS_DE_USO.md e POLITICA_DE_PRIVACIDADE.md)
const TERMOS_VERSAO = process.env.TERMOS_VERSAO || '1.0';

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
      'O cadastro é gratuito e a plataforma não cobra comissão sobre as vendas: seu negócio aparece na vitrine sem pagar nada. Quem quiser mais recursos pode assinar um plano opcional: o Essencial (R$ 50 por mês) traz as estatísticas do perfil, e o Destaque (R$ 75 por mês) soma selo, prioridade nas listas, espaço na seção de destaques e a possibilidade de divulgação nas redes oficiais. Os planos aumentam a oportunidade de exposição, mas não garantem visitas, contatos ou vendas. Veja os detalhes na página Planos.',
  },
  {
    categoria: 'Privacidade',
    ordem: 4,
    pergunta: 'Trabalho em casa. Preciso mostrar meu endereço?',
    resposta:
      'Não. No cadastro do negócio, desmarque "Mostrar o endereço completo". A página passa a exibir só o bairro, e o mapa indica a região sem apontar a casa.',
  },
];

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

  // Conta de demonstração: dona do Silva Reparos Residenciais
  const donoSilva = await prisma.usuario.create({
    data: {
      nome: 'Carlos Eduardo Silva',
      email: 'carlos@silvareparos.com.br',
      telefone: '66997771234',
      senhaHash: await bcrypt.hash(demoSenha, 10),
      perfil: 'EMPREENDEDOR',
    },
  });
  await registrarAceites(donoSilva.id);
  console.log(`  - ${donoSilva.email} (EMPREENDEDOR)`);

  console.log('Inserindo empreendedores e produtos...');
  const empreendedoresCriados = [];
  for (const { produtos, horarios = [], ...dadosEmpreendedor } of empreendedoresSeed) {
    // Só o Silva Reparos tem dono; os demais ficam "sem dono" até um admin vincular
    const usuarioId = dadosEmpreendedor.nomeNegocio.startsWith('Silva') ? donoSilva.id : null;
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
