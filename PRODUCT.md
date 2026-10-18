# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primário: o morador de Rondonópolis-MT que procura no celular.** Navega sem conta, quase sempre pelo
celular, muitas vezes num aparelho simples e com internet fraca. Quer achar alguém perto de casa (a
doceira, o eletricista, o brechó, o salão), conferir se é de confiança e se está aberto agora, e chamar
no WhatsApp. Quando uma decisão de interface favorece um lado, esse visitante vem primeiro: a vitrine
pública (busca, filtros, mapa, cartões, perfil do negócio) é a cara do projeto.

**Secundário: o microempreendedor que anuncia.** Individual ou informal (artesão, doceira, eletricista,
brechó, salão), sem site e sem saber aparecer em buscador, dependendo do boca a boca e de grupos de
WhatsApp. Cria a conta, cadastra o negócio, a localização, o horário e o catálogo, assina um plano e
acompanha o desempenho em `/meu-negocio`. Importante, mas em segundo plano nas decisões de tela.

**Outros papéis confirmados no código:** o cliente com conta (`COMUM`, criada no primeiro login com
Google) que avalia negócios, e a administração (`/admin`) que modera a vitrine.

**Público da avaliação:** o projeto é apresentado a uma banca acadêmica. O que a banca vê é a vitrine
pública, e ela precisa parecer um produto pronto para lançar.

## Product Purpose

Vitrine digital para micro e pequenos empreendedores de Rondonópolis. Resolve a invisibilidade digital
de quem vende bem no boca a boca, mas cujo alcance "para na esquina". A comunidade encontra por
categoria, bairro, busca e mapa e fala direto com quem faz, pelo WhatsApp.

Sucesso agora é uma apresentação convincente para a banca, com o produto funcionando de ponta a ponta.
Se ele for lançado, sucesso é o morador achar e chamar um negócio local, e o empreendedor ver retorno
no que paga.

## Positioning

Local de propósito, uma cidade só: Rondonópolis, com bairros reais, horário calculado no fuso de
Cuiabá e o problema justificado por dados da cidade com fonte. Não é um marketplace: a venda acontece
na conversa de WhatsApp com quem faz, e a plataforma não cobra comissão. O plano pago compra
exposição, e o produto diz abertamente que ele **não garante** visitas, contatos nem vendas.

## Operating Context

- **Situação:** trabalho acadêmico para apresentação a uma banca, ligado ao ODS 8 (com relação aos ODS
  1 e 10). Pode virar produto real em Rondonópolis; a decisão de lançar vem depois da banca.
- **Roteiro da apresentação:** [DEMO.md](DEMO.md), com cerca de 12 minutos e os cinco negócios de exemplo do seed.
- **Pagamentos:** AbacatePay em modo de testes. Nenhum cartão é cobrado, e o site avisa isso.
- **Site publicado:** Render, com a API em plano que "dorme". O site mostra o aviso "Acordando o
  servidor" quando a API demora.
- **Fluxo do visitante:** busca ou filtro → cartão → perfil do negócio (horário, "Aberto agora", mapa,
  avaliações) → WhatsApp com a mensagem pronta.
- **Fluxo do empreendedor:** conta → negócio → plano → pagamento → publicação.

## Capabilities and Constraints

- **Rotas públicas:** Home, Vitrine, item, Empreendedores, perfil do negócio, Planos, Contato e FAQ,
  Sobre, Termos e Privacidade. **Rotas logadas:** cadastro em três etapas, Meu negócio, Minhas
  avaliações e Admin. O mapa completo das rotas está no README.
- **Publicação:** só fica na vitrine o negócio com conta e plano em vigor. Os estados são `RASCUNHO`,
  `AGUARDANDO_PAGAMENTO`, `ATIVO`, `ASSINATURA_EXPIRADA` e `SUSPENSO`. Navegar é gratuito.
- **Planos:** Essencial (R$ 50/mês ou R$ 500/ano) e Destaque (R$ 75/mês ou R$ 750/ano). O Destaque dá
  selo, prioridade na ordem, prioridade na pilha da Home, fundo especial no perfil e chance de
  divulgação nas redes. A fonte de verdade é `backend/prisma/planos.js`.
- **Avaliações:** nota inteira de 1 a 5, uma por pessoa por negócio, com média calculada a cada leitura.
  No Destaque muda só o acabamento, nunca a nota.
- **Localização:** quando o empreendedor esconde o endereço, o mapa mostra um círculo de aproximação
  sobre o bairro. Nenhuma coordenada é inventada.
- **Horário:** sempre no fuso America/Cuiaba, e não no fuso do aparelho de quem visita.
- **Stack existente:** React 19 com Vite e React Router 7, CSS puro com variáveis e sem biblioteca de
  componentes, Leaflet e gsap. Backend em Express 5 com Prisma e MySQL/TiDB.
- **Idioma:** só português do Brasil.
- **Nomes:** a marca visível é **VitrineRondon**. Pastas, pacotes, chaves internas e e-mails de exemplo
  mantêm "VitrineLocal" de propósito.

## Brand Commitments

- **Nome:** VitrineRondon.
- **Voz:** português direto e concreto, na língua do comércio de bairro ("Abre às", "Fecha às",
  "Aberto agora", "quem faz"). Sem promessas exageradas.
- **Transparência:** página de Planos, Termos (seção 5) e FAQ dizem a mesma coisa sobre o que o plano
  não garante. O ambiente de testes é sempre anunciado.
- **Destaque sem distorcer:** o plano pago muda a ordem e o acabamento; o Essencial continua na busca,
  nas listas e no mapa, e a reputação é a mesma regra para todos.
- **Recursos de marca:** o logo em `frontend/src/assets/logo.svg`, o favicon e a bandeira municipal em
  `frontend/src/assets/bandeira-rondonopolis.jpg`. A bandeira é de domínio público, do Wikimedia
  Commons, e sempre aparece com o crédito.

## Evidence on Hand

- **Dados da cidade com fonte** na página Sobre: centralizados em `frontend/src/services/fontes.js`
  e listados no README, em "Fontes do conteúdo" (Folha do Estado, Portal MT, CDL Rondonópolis, Agora MT).
- **Negócios de exemplo do seed:** Ateliê Fio & Arte, Silva Reparos, Doces da Dona Lu, Brechó da Ju e
  Espaço Bela Flor. São **demonstração, não clientes reais**.
- **Demonstração, não resultado:** as assinaturas e as métricas de desempenho do seed nunca passaram
  pelo gateway.
- **Não existem e não devem ser inventados:** depoimentos, clientes ou empreendedores reais, números de
  uso ou de vendas, parcerias, avaliações de exemplo (o seed não cria nenhuma) e menções na imprensa.

## Product Principles

1. **Quem procura vem primeiro.** Achar, confiar e chamar no WhatsApp no celular, com o menor número de
   passos, pesa mais que qualquer outra tela.
2. **Funcionar no aparelho simples.** Celular modesto e rede fraca são o caso normal, não o caso extremo.
   O que é pesado precisa justificar o peso.
3. **Verdade antes de vitrine.** Nada de número, depoimento ou garantia inventados. Dados com fonte, e o
   plano pago nunca disfarçado de mérito.
4. **Local de verdade.** Bairros, horários, mapa e linguagem de Rondonópolis, e não um marketplace genérico.
5. **Pronto para lançar.** Mesmo sendo trabalho acadêmico, o produto se apresenta e se comporta como
   serviço real.

## Accessibility & Inclusion

Boas práticas, sem meta formal de certificação, com atenção extra a celular simples, internet fraca e
pouca familiaridade digital. As práticas já existentes ficam:

- o sistema funciona por teclado e por leitor de tela;
- a cor nunca é a única informação (as estrelas também trazem a média em texto);
- o pedido de menos movimento é respeitado;
- o layout fica estável enquanto a página carrega;
- a primeira tela é leve.
