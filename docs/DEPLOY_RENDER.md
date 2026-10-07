# Publicando o VitrineRondon no Render

Este guia coloca o projeto no ar usando serviços gratuitos:

| Peça | Onde fica | Por quê |
|---|---|---|
| API (Express) | **Render**, web service gratuito | Hospeda o Node direto do GitHub |
| Site (React) | **Render**, static site gratuito | CDN, não dorme |
| Banco MySQL | **Aiven**, plano gratuito | O Render não oferece MySQL gerenciado, e MySQL dentro do Render exige plano pago com disco |
| Fotos enviadas | **Cloudinary**, plano gratuito | O disco do Render gratuito é apagado a cada deploy, reinício ou pausa |
| Assinaturas | **AbacatePay**, em Dev mode | Checkout dos planos; em Dev mode nada é cobrado |

Tempo estimado: 30 a 40 minutos na primeira vez.

> **Limites do plano gratuito.** A API dorme depois de 15 minutos sem visitas, e a primeira visita
> seguinte leva cerca de 1 minuto para responder (o site abre na hora, mas as listas demoram). O
> Aiven pode desligar um banco gratuito que fique muito tempo sem uso; ele avisa por e-mail antes, e
> dá para religar pelo painel.

---

## 1. Banco de dados no Aiven

1. Crie a conta em [aiven.io](https://aiven.io) (não pede cartão).
2. **Create service → MySQL → plano Free.** Escolha uma região nos Estados Unidos, lado leste,
   perto da região `virginia` em que a API vai rodar no Render.
3. Espere o serviço ficar **Running** (alguns minutos).
4. Na aba **Databases**, crie um banco chamado `vitrine_db`.
5. Em **Overview → Connection information**, anote **Host**, **Port** e a senha do usuário
   `avnadmin`. No mesmo bloco, em **CA certificate**, clique em **Download** e salve o arquivo como:

   ```
   backend/prisma/certificados/aiven-ca.pem
   ```

   Esse certificado é público (não tem senha dentro) e vai para o git: é ele que faz a API recusar
   qualquer servidor que não seja o seu banco do Aiven.

## 2. Preparar o banco a partir do seu computador

Isso cria as tabelas, a conta restrita que a API vai usar e, se você quiser, os dados de
demonstração. Roda uma vez só; o `backend/.env` de desenvolvimento não é alterado.

1. Copie `backend/.env.aiven.example` para `backend/.env.aiven` (este arquivo fica fora do git,
   porque guarda senhas).
2. Preencha `HOST`, `PORTA` e a senha do `avnadmin` nas duas URLs, e invente a senha da conta
   `vitrine_app` (16 caracteres ou mais, só letras e números). Defina também `ADMIN_SENHA` e
   `DEMO_EMPREENDEDOR_SENHA` se for rodar o seed.
3. No terminal, dentro da pasta `backend`:

   ```bash
   npm run aiven:migrar          # cria as tabelas
   npm run aiven:criar-usuario   # cria a conta vitrine_app só com SELECT/INSERT/UPDATE/DELETE
   npm run aiven:seed            # opcional: dados de demonstração e o usuário administrador
   ```

   Se você não rodar o seed, crie os planos à venda com `npm run aiven:planos` (não apaga nada).
   O seed já os cria, junto com assinaturas e números de desempenho **de exemplo** para a
   demonstração (roteiro em [DEMO.md](../DEMO.md)).

   > O seed **apaga as tabelas** antes de inserir. Rode só agora, com o banco vazio, nunca depois
   > que o site estiver em uso. Sem o seed, não existe usuário administrador: crie a conta pelo
   > próprio site e promova-a a `ADMIN` direto no banco.

Se aparecer `Can't reach database server`, confira host, porta e se o arquivo
`aiven-ca.pem` está no lugar certo (o caminho na URL é relativo à pasta `backend/prisma`).

## 3. Fotos no Cloudinary

1. Crie a conta em [cloudinary.com](https://cloudinary.com) (plano Free).
2. No painel, abra **Settings → API Keys** e copie a **API environment variable**. Ela tem o formato:

   ```
   cloudinary://123456789012345:aBcDeFgHiJkLmNoPqRsTuVwXyZ@nome-da-sua-conta
   ```

   Guarde: vai no Render como `CLOUDINARY_URL`. As fotos ficam na pasta `vitrinelocal` da conta.

## 4. Enviar o código para o GitHub

O Render publica a partir do repositório `NSIX06/VitrineRondon`. Faça o commit de tudo, incluindo
o `aiven-ca.pem` e o `render.yaml` da raiz, e envie:

```bash
git add .
git commit -m "Prepara o deploy no Render"
git push
```

Confira antes que nenhum `.env` com senha entrou no commit (`git status` não deve listar
`backend/.env` nem `backend/.env.aiven`).

## 5. Criar os serviços no Render

1. Crie a conta em [render.com](https://render.com) entrando com o GitHub.
2. **New → Blueprint**, escolha o repositório `VitrineRondon`. O Render lê o `render.yaml` e mostra
   dois serviços: `vitrinelocal-api` e `vitrinelocal`.
3. Ele pede os valores que não ficam no código:

   | Variável | Serviço | Valor |
   |---|---|---|
   | `DATABASE_URL` | API | A URL da conta `vitrine_app`, igual à do `.env.aiven` |
   | `DATABASE_URL_MIGRACAO` | API | A URL do `avnadmin`, igual à do `.env.aiven` |
   | `CORS_ORIGINS` | API | `https://vitrinelocal.onrender.com` (endereço do site, sem barra no fim) |
   | `CLOUDINARY_URL` | API | A variável copiada do Cloudinary |
   | `ABACATEPAY_API_KEY` | API | A chave de **Dev mode** do AbacatePay (começa com `abc_dev_`). A API recusa chave de produção |
   | `APP_URL` | API | `https://vitrinelocal.onrender.com` (endereço do site, sem barra no fim): o checkout volta para cá |
   | `VITE_API_URL` | Site | `https://vitrinelocal-api.onrender.com/api` |

   O `JWT_SECRET` e o `ABACATEPAY_WEBHOOK_SECRET` são gerados sozinhos pelo Render.

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
| Build da API falha em `migrate deploy` | `DATABASE_URL_MIGRACAO` errada, banco `vitrine_db` não criado no Aiven, ou `aiven-ca.pem` fora do repositório |
| Health check falha logo depois do deploy | `DATABASE_URL` errada, ou a conta `vitrine_app` não foi criada (passo 2) |
| Envio de foto dá erro | `CLOUDINARY_URL` ausente ou copiada incompleta |
| Primeira visita demora cerca de 1 minuto | A API estava dormindo (plano gratuito) |
| Assinar um plano dá erro | `ABACATEPAY_API_KEY` ausente ou de produção; o motivo exato está nos **Logs** da API |
| Depois de pagar, o checkout volta para `localhost` | `APP_URL` não foi preenchida com o endereço do site |
| O log da API mostra "Webhook recusado" | O webhook foi cadastrado com um segredo diferente do `ABACATEPAY_WEBHOOK_SECRET` do Render. Apague o webhook no painel do AbacatePay, copie o segredo do Render para o `.env` e rode o script de novo |

## Atualizações depois do primeiro deploy

Cada `git push` na branch principal publica de novo a API e o site. Mudanças no banco
(novas migrations em `backend/prisma/migrations`) são aplicadas sozinhas no build da API.
