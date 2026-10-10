# Publicando o VitrineRondon no Render

Este guia coloca o projeto no ar usando serviços gratuitos:

| Peça | Onde fica | Por quê |
|---|---|---|
| API (Express) | **Render**, web service gratuito | Hospeda o Node direto do GitHub |
| Site (React) | **Render**, static site gratuito | CDN, não dorme |
| Banco MySQL | **TiDB Cloud Starter**, plano gratuito | O Render não oferece MySQL gerenciado, e MySQL dentro do Render exige plano pago com disco |
| Fotos enviadas | **Cloudinary**, plano gratuito | O disco do Render gratuito é apagado a cada deploy, reinício ou pausa |
| Assinaturas | **AbacatePay**, em Dev mode | Checkout dos planos; em Dev mode nada é cobrado |

Tempo estimado: 30 a 40 minutos na primeira vez.

> **Limites do plano gratuito.** A API dorme depois de 15 minutos sem visitas, e a primeira visita
> seguinte leva cerca de 1 minuto para responder (o site abre na hora, mas as listas demoram). O
> TiDB Cloud Starter tem uma cota mensal gratuita de uso e espaço; acompanhe em **Overview →
> Capacity used this month** e deixe o limite de gastos em zero para nunca ser cobrado.

---

## 1. Banco de dados no TiDB Cloud

O [TiDB Cloud Starter](https://tidbcloud.com) é compatível com MySQL (o Prisma usa o mesmo
`provider = "mysql"`, sem mudar o schema nem as migrations) e tem plano gratuito sem cartão.

1. Crie a conta e, em **My TiDB → Create Resource**, um cluster **Starter**. Escolha a AWS na região
   `us-east-1` (N. Virginia), perto da API no Render.
2. No cluster, clique em **Connect**, escolha **Public Endpoint** e **Generate Password** (a senha
   aparece uma vez só). Anote **HOST**, a porta (**4000**) e o usuário, que vem com o prefixo do
   cluster (por exemplo `3pTAoNNegb47Uc8.root`).
3. Não precisa baixar o "CA cert" que o painel sugere: o certificado do TiDB é de uma autoridade
   pública (Let's Encrypt), e `sslaccept=strict` já confere a autoridade e o nome do servidor.

## 2. Preparar o banco a partir do seu computador

Isso cria o banco, as tabelas, a conta restrita que a API vai usar e, se você quiser, os dados de
demonstração. Roda uma vez só; o `backend/.env` de desenvolvimento não é alterado.

1. Copie `backend/.env.tidb.example` para `backend/.env.tidb` (este arquivo fica fora do git,
   porque guarda senhas).
2. Preencha `HOST`, o prefixo e a senha do `root` na `DATABASE_URL_MIGRACAO`. Na `DATABASE_URL`, use
   o **mesmo prefixo** com o nome `vitrine_app` e invente a senha (16 caracteres ou mais, só letras e
   números). Defina também `ADMIN_SENHA` e `DEMO_EMPREENDEDOR_SENHA` se for rodar o seed.
3. No terminal, dentro da pasta `backend`:

   ```bash
   npm run tidb:banco            # cria o banco vitrine_db (o cluster vem só com o "test")
   npm run tidb:status           # confere a conexão com TLS e as migrations pendentes
   npm run tidb:migrar           # cria as tabelas
   npm run tidb:criar-usuario    # conta PREFIXO.vitrine_app só com SELECT/INSERT/UPDATE/DELETE
   npm run tidb:seed             # opcional: dados de demonstração e o usuário administrador
   ```

   Se você não rodar o seed, crie os planos à venda com `npm run tidb:planos` (não apaga nada).
   O seed já os cria, junto com assinaturas e números de desempenho **de exemplo** para a
   demonstração (roteiro em [DEMO.md](../DEMO.md)).

   > O seed **apaga as tabelas** antes de inserir. Rode só agora, com o banco vazio, nunca depois
   > que o site estiver em uso. Sem o seed, não existe usuário administrador: crie a conta pelo
   > próprio site e promova-a a `ADMIN` direto no banco.

Se aparecer `Can't reach database server`, confira host, porta e se o usuário tem o prefixo do
cluster. Para ver a cadeia de certificados que o servidor apresenta (e se o nome confere), rode
`node scripts/certificado-banco.js HOST 4000`.

## 3. Fotos no Cloudinary

1. Crie a conta em [cloudinary.com](https://cloudinary.com) (plano Free).
2. No painel, abra **Settings → API Keys** e copie a **API environment variable**. Ela tem o formato:

   ```
   cloudinary://123456789012345:aBcDeFgHiJkLmNoPqRsTuVwXyZ@nome-da-sua-conta
   ```

   Guarde: vai no Render como `CLOUDINARY_URL`. As fotos ficam na pasta `vitrinelocal` da conta.

## 4. Enviar o código para o GitHub

O Render publica a partir do repositório `NSIX06/VitrineRondon`. Faça o commit de tudo, incluindo
o `render.yaml` da raiz, e envie:

```bash
git add .
git commit -m "Prepara o deploy no Render"
git push
```

Confira antes que nenhum `.env` com senha entrou no commit (`git status` não deve listar
`backend/.env` nem `backend/.env.tidb`).

## 5. Criar os serviços no Render

1. Crie a conta em [render.com](https://render.com) entrando com o GitHub.
2. **New → Blueprint**, escolha o repositório `VitrineRondon`. O Render lê o `render.yaml` e mostra
   dois serviços: `vitrinelocal-api` e `vitrinelocal`.
3. Ele pede os valores que não ficam no código:

   | Variável | Serviço | Valor |
   |---|---|---|
   | `DATABASE_URL` | API | A URL da conta `PREFIXO.vitrine_app`, igual à do `.env.tidb` |
   | `DATABASE_URL_MIGRACAO` | API | A URL do `PREFIXO.root`, igual à do `.env.tidb` |
   | `CORS_ORIGINS` | API | `https://vitrinelocal.onrender.com` (endereço do site, sem barra no fim) |
   | `CLOUDINARY_URL` | API | A variável copiada do Cloudinary |
   | `ABACATEPAY_API_KEY` | API | A chave de **Dev mode** do AbacatePay (começa com `abc_dev_`). A API recusa chave de produção |
   | `APP_URL` | API | `https://vitrinelocal.onrender.com` (endereço do site, sem barra no fim): o checkout volta para cá |
   | `VITE_API_URL` | Site | `https://vitrinelocal-api.onrender.com/api` |

   O `JWT_SECRET` e o `ABACATEPAY_WEBHOOK_SECRET` são gerados sozinhos pelo Render.

   > **Criou os serviços à mão (sem Blueprint)?** Aí ninguém gera esses valores: crie na API
   > (**Environment → Add**) `JWT_SECRET` e `ABACATEPAY_WEBHOOK_SECRET` (botão **Generate**),
   > `JWT_EXPIRES_IN` = `8h`, `ABACATEPAY_API_KEY` (chave de Dev mode, `abc_dev_...`) e
   > `APP_URL` (endereço do site). Sem o `JWT_SECRET`, login e cadastro dão erro; sem a chave do
   > AbacatePay, "Ir para o pagamento" dá erro. Para conferir, abra `/api/health` da API: tem que
   > mostrar `"login":"ok"` e `"pagamento":"ok"`. O log da API também avisa ao subir
   > (`LOGIN E CADASTRO FORA DO AR`, `PAGAMENTO FORA DO AR`, `APP_URL não definida`).

4. Clique em **Apply**. O primeiro deploy leva alguns minutos. As migrations rodam no build da API:
   se alguma falhar, o build para e nada é publicado.

### Os endereços saíram diferentes?

Se o nome `vitrinelocal` ou `vitrinelocal-api` já estiver em uso no Render, ele acrescenta um
sufixo (ex.: `vitrinelocal-a1b2.onrender.com`). Veja o endereço real no topo de cada serviço e
corrija:

- na **API** → Environment → `CORS_ORIGINS` e `APP_URL` com o endereço do site. A API reinicia sozinha;
- no **site** → Environment → `VITE_API_URL` com o endereço da API mais `/api`, e depois
  **Manual Deploy → Deploy latest commit**, porque esse valor entra no build do site.

## 6. Avisos de pagamento (webhook do AbacatePay)

Sem o webhook, o plano só é ativado quando o empreendedor abre "Meu negócio" (a API consulta o
gateway). Com ele, o AbacatePay avisa a API assim que o pagamento é aprovado, renovado, recusado ou
cancelado.

1. No Render, abra a **API → Environment** e copie o valor de `ABACATEPAY_WEBHOOK_SECRET`.
2. Cole no seu `backend/.env`, na variável de mesmo nome (a `ABACATEPAY_API_KEY` de Dev mode já
   deve estar lá).
3. Na pasta `backend`, com o endereço real da API:

   ```bash
   npm run abacatepay:webhook -- https://vitrinelocal-api.onrender.com
   ```

   O script cadastra o webhook no AbacatePay com os quatro eventos de assinatura, ou avisa se já
   existe um para esse endereço. Rodar de novo não duplica. Para trocar o segredo, apague o webhook
   no painel do AbacatePay e rode o comando outra vez.

A API confere o segredo na URL e a assinatura HMAC de cada aviso; qualquer outro pedido recebe `401`.

## 7. Conferir

1. Abra `https://vitrinelocal-api.onrender.com/api/health`. Deve responder
   `"banco":"ok"`. (Se estiver dormindo, espere cerca de 1 minuto.)
2. Abra o site e navegue pela Vitrine e pelos Empreendedores.
3. Entre como administrador (o e-mail e a senha do seed) e troque a foto de um item pelo
   computador. O endereço da imagem salva deve começar com `https://res.cloudinary.com/`.
4. Abra **Planos**: o aviso "Ambiente de testes" deve aparecer. Entre como um empreendedor, assine um
   plano e pague com o cartão `4242 4242 4242 4242` (ou "Simular Pagamento"). Ao voltar, "Meu
   negócio" deve mostrar o plano **Ativa**.

> Em produção (`NODE_ENV=production`, que o `render.yaml` define), os botões "Simular aprovação" e
> "Simular falha" do Admin não existem. A ativação vem do pagamento de teste no checkout.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| O site abre, mas nenhuma lista carrega e o console fala em CORS | `CORS_ORIGINS` diferente do endereço real do site (atenção a `https://` e à barra no fim) |
| O site chama `localhost:3001` | `VITE_API_URL` vazia ou alterada sem novo deploy do site |
| Build da API falha em `migrate deploy` | `DATABASE_URL_MIGRACAO` errada, banco `vitrine_db` não criado no TiDB (`npm run tidb:banco`) ou usuário sem o prefixo do cluster |
| Health check falha logo depois do deploy | `DATABASE_URL` errada, ou a conta `vitrine_app` não foi criada (passo 2) |
| Envio de foto dá erro | `CLOUDINARY_URL` ausente ou copiada incompleta |
| Primeira visita demora cerca de 1 minuto | A API estava dormindo (plano gratuito) |
| Assinar um plano dá erro | `ABACATEPAY_API_KEY` ausente ou de produção; o motivo exato está nos **Logs** da API |
| Depois de pagar, o checkout volta para `localhost` | `APP_URL` não foi preenchida com o endereço do site |
| O log da API mostra "Webhook recusado" | O webhook foi cadastrado com um segredo diferente do `ABACATEPAY_WEBHOOK_SECRET` do Render. Apague o webhook no painel do AbacatePay, copie o segredo do Render para o `.env` e rode o script de novo |

## Atualizações depois do primeiro deploy

Cada `git push` na branch principal publica de novo a API e o site. Mudanças no banco
(novas migrations em `backend/prisma/migrations`) são aplicadas sozinhas no build da API.
