# Roteiro de demonstração: assinaturas do VitrineRondon

> **Ambiente de testes.** Os pagamentos desta demonstração passam pelo **AbacatePay em modo de
> desenvolvimento (Dev mode)**: nenhum cartão é cobrado e nenhum dinheiro circula. As assinaturas e
> os números de desempenho que o seed cria são **dados de exemplo**. O sistema avisa isso na página
> de planos e no painel.

Duração: uns 10 minutos. O fluxo mostra o empreendedor do plano Essencial assinando o Destaque e o
efeito disso na vitrine, sem esconder quem não assina.

## Antes da apresentação

1. **Banco limpo:** em `backend/`, rode `npm run seed`. Ele recria os dados e deixa:

   | Negócio | Plano | Conta |
   |---|---|---|
   | Ateliê Fio & Arte | **Destaque** ativo, com divulgação nas redes | `maria@ateliefioearte.com.br` |
   | Silva Reparos Residenciais | **Essencial** ativo | `carlos@silvareparos.com.br` |
   | Doces da Dona Lu, Brechó da Ju, Espaço Bela Flor | sem plano (continuam na vitrine) | sem dono |

   As duas contas de empreendedor usam a senha `DEMO_EMPREENDEDOR_SENHA` do `.env`. O admin usa
   `ADMIN_EMAIL` e `ADMIN_SENHA`.

2. **Chave de testes:** `ABACATEPAY_API_KEY` no `backend/.env` precisa ser a chave de **Dev mode**
   (começa com `abc_dev_`). O servidor recusa chave de produção. Confira em
   `GET /api/planos`: a resposta deve trazer `"modoTeste": true`.

3. **Servidores:** `npm run dev:backend` e `npm run dev:frontend`.

4. **Abas prontas no navegador:** a vitrine (`/`), a página `/empreendedores` e uma janela anônima
   para entrar como admin depois. Confira a internet: o checkout abre no site do AbacatePay.

## Roteiro

### 1. A vitrine (visitante, sem login)

- Na **Home**, mostre a seção **"Negócios em Destaque"**: hoje só o Ateliê Fio & Arte.
- Em **Empreendedores**, mostre a ordem: o Ateliê vem primeiro, com o selo ⭐ "Negócio em Destaque".
  O **Silva Reparos está em último**. Destaque o ponto: quem não assina continua aparecendo; o
  plano muda a ordem, não a presença.
- Abra o perfil do Ateliê: o selo aparece na capa e no mapa.

### 2. A página de planos

- Abra **Planos** no menu. Mostre os dois cartões (Essencial R$ 50, Destaque R$ 75 por mês), a
  tabela de comparação e o quadro **"Sem promessas"**: o plano aumenta a oportunidade de exposição,
  mas não garante visitas, contatos nem vendas.
- O aviso "Ambiente de testes" informa que nada é cobrado e qual cartão usar.

### 3. O painel de quem já é Destaque (opcional, 1 minuto)

Entre como `maria@ateliefioearte.com.br` e abra **Meu negócio**:

- **Plano:** Destaque ativo, com a data da próxima cobrança.
- **Desempenho:** totais do mês, gráfico de visitas por dia e produtos mais vistos (recursos
  ampliados do Destaque).
- **Divulgação:** consentimento registrado e as divulgações nas redes oficiais (uma publicada, uma
  planejada).

Saia da conta.

### 4. O empreendedor do Essencial assina o Destaque

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

### 5. O efeito na vitrine

- Volte em **Empreendedores** (atualize a página): o **Silva Reparos subiu do último para o segundo
  lugar**, com o selo. Os negócios sem plano continuam lá, logo abaixo.
- Na **Home**, a seção de destaques agora tem dois negócios, em ordem que se reveza a cada visita.

### 6. A visão da administração

Entre como admin e abra **Admin** no menu:

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
3. Siga do passo 5 do roteiro.

**"Simular falha"** (numa assinatura ativa) mostra a inadimplência: o selo e a prioridade somem até
o pagamento ser regularizado. As simulações só existem fora de produção; em produção, essas rotas
respondem 404.

## Depois da apresentação

Para repetir o roteiro do zero, rode `npm run seed` de novo em `backend/`.

## Perguntas que a banca pode fazer

- **O pagamento é real?** Não. É o modo de desenvolvimento do AbacatePay. O servidor recusa chave de
  produção, a menos que `ABACATEPAY_PERMITIR_PRODUCAO=true` seja definido de propósito.
- **Como o sistema sabe que foi pago?** Por dois caminhos: o **webhook** do AbacatePay (com segredo
  na URL e assinatura HMAC conferida) e a **conciliação**, em que o painel consulta o gateway quando
  há checkout pendente. Na demonstração local, sem endereço público, é a conciliação que ativa o plano.
- **E se o aviso chegar duas vezes?** O tratamento é idempotente: o segundo aviso não muda nada.
- **O Destaque esconde quem não paga?** Não. Ele só muda a ordem e dá o selo. Todos os negócios
  ativos continuam na busca, nas listas e no mapa.
- **As estatísticas identificam o visitante?** Não. O banco guarda só "negócio, dia, tipo,
  quantidade". Não há cookie nem IP gravado; o dono e a administração não entram na contagem.
- **A divulgação nas redes é automática?** Não. A equipe publica e registra no painel. Não há
  integração com as redes sociais nem promessa de alcance.
