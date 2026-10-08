# Roteiro de demonstração: assinaturas do VitrineRondon

> **Ambiente de testes.** Os pagamentos desta demonstração passam pelo **AbacatePay em modo de
> desenvolvimento (Dev mode)**: nenhum cartão é cobrado e nenhum dinheiro circula. As assinaturas e
> os números de desempenho que o seed cria são **dados de exemplo**. O sistema avisa isso na página
> de planos e no painel.

Duração: uns 12 minutos. A regra que o roteiro mostra: **navegar é gratuito; divulgar um negócio
exige conta + plano em vigor.** Um negócio em rascunho é publicado ao assinar, um Essencial assina o
Destaque e sobe na lista, e o cancelamento respeita o período já pago.

## Antes da apresentação

1. **Banco limpo:** em `backend/`, rode `npm run prisma:seed`. Ele recria os dados e deixa:

   | Negócio | Situação | Conta |
   |---|---|---|
   | Ateliê Fio & Arte | **Destaque** ativo, com divulgação nas redes | `maria@ateliefioearte.com.br` |
   | Silva Reparos Residenciais | **Essencial** ativo | `carlos@silvareparos.com.br` |
   | Doces da Dona Lu, Brechó da Ju | **Essencial** ativo | `luciana@docesdadonalu.com.br`, `juliana@brechodaju.com.br` |
   | Espaço Bela Flor | **Rascunho**: cadastrado, sem plano, fora da vitrine | `patricia@espacobelaflor.com.br` |

   Todas as contas de empreendedor usam a senha `DEMO_EMPREENDEDOR_SENHA` do `.env`. O admin usa
   `ADMIN_EMAIL` e `ADMIN_SENHA`.

2. **Chave de testes:** `ABACATEPAY_API_KEY` no `backend/.env` precisa ser a chave de **Dev mode**
   (começa com `abc_dev_`). O servidor recusa chave de produção. Confira em
   `GET /api/planos`: a resposta deve trazer `"modoTeste": true`.

3. **Servidores:** `npm run dev:backend` e `npm run dev:frontend`.

4. **Abas prontas no navegador:** a vitrine (`/`), a página `/empreendedores` e uma janela anônima
   para entrar como admin depois. Confira a internet: o checkout abre no site do AbacatePay.

## Roteiro

### 1. A vitrine (visitante, sem login)

- Na **Home**, mostre a faixa **"Quem está na feira"**: a pilha de cartões se reveza sozinha, com o Ateliê Fio & Arte (Destaque, com selo) na frente e os negócios do Essencial em seguida. Clique num cartão para abrir o negócio.
- Em **Empreendedores**, mostre que aparecem **quatro** negócios: só os que têm plano em vigor. O
  Espaço Bela Flor está cadastrado, mas não aparece: ainda não assinou. Busque "sobrancelhas" na
  Vitrine: o serviço dela também não aparece.
- Mostre a ordem: o Ateliê vem primeiro, com o selo ⭐ "Negócio em Destaque". O **Silva Reparos
  está em último**. O Destaque muda a ordem; os negócios do Essencial continuam aparecendo.
- Abra o perfil do Ateliê: o selo aparece na capa e no mapa.

### 2. A página de planos

- Abra **Planos** no menu. O texto do topo diz a regra: para divulgar, escolha um dos planos
  mensais. Mostre os dois cartões (Essencial R$ 50, Destaque R$ 75 por mês), a tabela de comparação
  e o quadro **"Transparência"**: o plano aumenta a oportunidade de exposição, mas não garante
  visitas, contatos nem vendas.
- O aviso "Ambiente de testes" informa que nada é cobrado e qual cartão usar.
- Sem login, o botão de cada plano é **"Criar conta e assinar"**: ele leva ao cadastro em três
  etapas (conta, negócio, plano), com o plano já marcado. Se quiser mostrar, clique e volte.

### 3. Do rascunho à vitrine

1. Entre como `patricia@espacobelaflor.com.br` e abra **Meu negócio**. O aviso no topo diz que o
   negócio **ainda não está publicado**, e a etiqueta mostra "Rascunho: fora da vitrine". O catálogo
   pode ser editado normalmente.
2. Clique em **"Ver prévia (só você vê)"**: a página do negócio abre com o aviso de prévia. Um
   visitante que tentasse o mesmo endereço receberia "não encontrado".
3. Clique em **"Escolher um plano"**, escolha o **Essencial** e conclua o pagamento de testes
   (cartão 4242 ou "Simular Pagamento").
4. De volta ao painel: **Essencial · Ativa**, com próxima cobrança e vencimento, e o negócio
   **Publicado**. Em **Empreendedores**, o Espaço Bela Flor agora aparece.

Saia da conta.

### 4. O painel de quem já é Destaque (opcional, 1 minuto)

Entre como `maria@ateliefioearte.com.br` e abra **Meu negócio**:

- **Plano:** Destaque ativo, com valor, próxima cobrança, vencimento e "Seu negócio: Publicado".
- **Desempenho:** totais do mês, gráfico de visitas por dia e produtos mais vistos (recursos
  ampliados do Destaque).
- **Divulgação:** consentimento registrado e as divulgações nas redes oficiais (uma publicada, uma
  planejada).

Saia da conta.

### 5. O empreendedor do Essencial assina o Destaque

1. Entre como `carlos@silvareparos.com.br` e abra **Meu negócio** → **Plano**: Essencial ativo.
   Em **Desempenho**, só os totais (sem gráfico): é o recurso básico.
2. Vá em **Planos** e clique em **"Mudar para este plano"** no cartão do Destaque.
3. Na confirmação, leia o aviso: o plano atual continua valendo até o pagamento do novo ser
   confirmado. Clique em **"Ir para o pagamento"**.
4. No **checkout do AbacatePay** (ambiente de testes), pague de um destes jeitos:
   - cartão **4242 4242 4242 4242**, qualquer validade futura e qualquer CVV; ou
   - **"Preencher com dados fictícios"** e depois **"Simular Pagamento"**.
5. O AbacatePay devolve para **Meu negócio**. O painel confere o pagamento sozinho por alguns
   segundos e passa a mostrar **Destaque · Ativa**, com início e próxima cobrança. O selo aparece
   embaixo do nome do negócio.

### 6. O efeito na vitrine

- Volte em **Empreendedores** (atualize a página): o **Silva Reparos subiu para o segundo lugar**,
  com o selo. Os negócios do Essencial continuam lá, logo abaixo.
- Na **Home**, a pilha da feira agora começa pelos dois negócios em Destaque (em ordem que se reveza a cada visita), com o selo.

### 7. Cancelamento respeita o período pago (opcional)

Como Carlos, em **Meu negócio** → **Plano**, clique em **"Cancelar assinatura"**. A confirmação
explica: as cobranças param, mas o negócio continua publicado até o fim do período já pago; depois
sai da vitrine, e os dados ficam guardados. Confirmado, o painel mostra "Publicado até" com a data, e
o negócio segue na lista de Empreendedores.

### 8. A visão da administração

Entre como admin e abra **Admin** no menu:

- **Empreendedores:** a coluna **Situação** mostra quem está publicado, em rascunho, aguardando
  pagamento, com plano vencido ou suspenso. Desmarcar "Liberado pela moderação" suspende um negócio,
  que sai da vitrine mesmo com plano pago.
- **Assinaturas:** o histórico do Silva Reparos: o Essencial aparece **cancelado** (substituído pela
  troca) e o Destaque **ativo**. Nenhuma cobrança duplicada.
- **Auditoria:** cada mudança de status registrada, com a origem (`WEBHOOK`, `CONCILIACAO` ou `SIMULACAO`).
- **Divulgações:** onde a equipe registra o que foi publicado nas redes. Só negócios com plano que
  inclui divulgação **e** com consentimento podem entrar.

## Plano B (sem internet ou com o AbacatePay fora do ar)

Se o checkout não abrir ou não voltar:

1. O pedido de troca já ficou registrado como **Aguardando pagamento**.
2. Como admin, em **Assinaturas**, clique em **"Simular aprovação"** na linha pendente. O servidor
   aplica exatamente o mesmo tratamento do aviso de pagamento do gateway.
3. Volte ao painel do empreendedor e siga o roteiro.

**"Simular falha"** (numa assinatura ativa) mostra a inadimplência: o negócio sai da vitrine até o
pagamento ser regularizado. As simulações só existem fora de produção; em produção, essas rotas
respondem 404.

## Depois da apresentação

Para repetir o roteiro do zero, rode `npm run prisma:seed` de novo em `backend/`.

## Perguntas que a banca pode fazer

- **O pagamento é real?** Não. É o modo de desenvolvimento do AbacatePay. O servidor recusa chave de
  produção, a menos que `ABACATEPAY_PERMITIR_PRODUCAO=true` seja definido de propósito.
- **Como o sistema sabe que foi pago?** Por dois caminhos: o **webhook** do AbacatePay (com segredo
  na URL e assinatura HMAC conferida) e a **conciliação**, em que o painel consulta o gateway quando
  há checkout pendente. Na demonstração local, sem endereço público, é a conciliação que ativa o plano.
- **E se o aviso chegar duas vezes?** O tratamento é idempotente: o segundo aviso não muda nada.
- **Dá para publicar de graça?** Não. Navegar é gratuito, mas um negócio só aparece com conta e
  plano em vigor. A regra está na API (não só na tela): sem assinatura, lista, busca, perfil,
  produtos, contato e métricas simplesmente não devolvem o negócio ao público.
- **E se a assinatura vencer ou for cancelada?** Cancelada, vale até o fim do período pago. Vencida
  ou com cobrança recusada, o negócio sai da vitrine, mas nada é apagado: basta renovar.
- **O Destaque esconde o Essencial?** Não. Ele muda a ordem e dá o selo; os negócios do Essencial
  continuam na busca, nas listas e no mapa.
- **As estatísticas identificam o visitante?** Não. O banco guarda só "negócio, dia, tipo,
  quantidade". Não há cookie nem IP gravado; o dono e a administração não entram na contagem.
- **A divulgação nas redes é automática?** Não. A equipe publica e registra no painel. Não há
  integração com as redes sociais nem promessa de alcance.
