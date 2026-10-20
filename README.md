# VitrineRondon

> O projeto começou como **VitrineLocal**. A marca visível mudou para VitrineRondon; pastas, pacotes,
> chaves internas e os e-mails das contas de exemplo mantêm o nome antigo de propósito.

Vitrine digital para micro e pequenos empreendedores de Rondonópolis-MT. Artesãos, doceiras,
eletricistas, brechós e salões criam a própria conta, cadastram o negócio, a localização, o horário de
atendimento e seus produtos ou serviços; a comunidade navega por categoria, bairro e busca, vê o
negócio no mapa e fala direto com quem faz pelo WhatsApp.

O sistema é multiusuário: cada empreendedor administra apenas o próprio negócio, o visitante navega
sem conta e a administração modera a vitrine. Navegar é gratuito; **publicar um negócio exige conta e
um plano pago** (Essencial ou Destaque, mensal ou anual), sem comissão sobre as vendas. O aceite dos
Termos de Uso e da Política de Privacidade é obrigatório no cadastro, e toda ação relevante fica
registrada numa trilha de auditoria consultável só pela administração.

| | |
|---|---|
| **Problema que resolve** | Microempreendedores informais não têm canal digital para divulgar o que vendem: dependem do boca a boca e de grupos de WhatsApp, e o alcance para na esquina |
| **Para quem** | Microempreendedores individuais ou informais de Rondonópolis e quem procura produtos e serviços perto de casa |
| **ODS** | ODS 8 (Trabalho Decente e Crescimento Econômico), com relação aos ODS 1 e 10 |
| **Site publicado** | https://vitrinerondon-1.onrender.com (API em https://vitrinerondon.onrender.com/api) |
| **Pagamentos** | AbacatePay em **modo de testes**: nenhum cartão é cobrado |

## Sumário

- [Visão geral das telas](#visão-geral-das-telas)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Como executar](#como-executar)
- [Scripts](#scripts)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Modelo de dados](#modelo-de-dados)
- [Perfis e permissões](#perfis-e-permissões)
- [Termos de uso e privacidade](#termos-de-uso-e-privacidade)
- [Auditoria](#auditoria)
- [Central de ajuda (FAQ)](#central-de-ajuda-faq)
- [Avaliações dos negócios](#avaliações-dos-negócios)
- [Login com Google](#login-com-google)
- [Planos e assinaturas](#planos-e-assinaturas)
- [Imagens: envio, enquadramento e zoom](#imagens-envio-enquadramento-e-zoom)
- [API](#api)
- [Funcionalidades e requisitos atendidos](#funcionalidades-e-requisitos-atendidos)
- [Identidade visual](#identidade-visual)
- [Fontes do conteúdo](#fontes-do-conteúdo)
- [Testes](#testes)
- [Integração contínua](#integração-contínua)
- [Segurança](#segurança)
- [Tratamento de erros](#tratamento-de-erros)
- [Desempenho](#desempenho)
- [Publicação no Render](#publicação-no-render)
- [Branches e fluxo de trabalho](#branches-e-fluxo-de-trabalho)
- [Solução de problemas](#solução-de-problemas)

## Visão geral das telas

| Rota | Quem vê | O que tem |
|---|---|---|
| `/` | todos | Pilha animada de negócios (Destaque na frente), números da vitrine, "Como funciona", novidades com filtro por categoria |
| `/vitrine` | todos | Produtos e serviços com busca, filtros por categoria, tipo e bairro, e paginação na URL |
| `/produtos/:id` | todos | Página do item: foto enquadrada, preço, pedido pelo WhatsApp e cartão do negócio |
| `/empreendedores` | todos | Negócios publicados, Destaque primeiro, com busca e filtros |
| `/empreendedores/:id` | todos | Perfil do negócio: capa, foto do perfil, "aberto agora", horários da semana, mapa, catálogo e contato direto |
| `/planos` | todos | Essencial e Destaque, com a chave Mensal/Anual |
| `/contato` | todos | Central de ajuda (FAQ) e formulário que fala com a equipe do VitrineRondon |
| `/sobre` | todos | Problema, dados com fontes, proposta, público e ODS |
| `/termos`, `/privacidade` | todos | Documentos legais servidos pela API |
| `/login`, `/cadastro` | visitantes | Entrar; cadastro em três etapas (conta, negócio, plano e pagamento) |
| `/esqueci-senha`, `/redefinir-senha` | visitantes | Recuperação de senha por e-mail |
| `/meu-negocio` | contas logadas | Abas Catálogo, Plano, Desempenho e Divulgação, e edição dos dados do negócio |
| `/admin` | ADMIN | Abas Produtos, Empreendedores, Assinaturas, Divulgações, Mensagens, Contas, FAQ e Auditoria |

## Stack

| Camada | Tecnologia |
|---|---|
| Banco de dados | MySQL 8 (`vitrine_db`) no desenvolvimento; TiDB Cloud Starter (compatível com MySQL) em produção |
| Backend | Node.js, Express 5, Prisma ORM 6, Zod 4, helmet, express-rate-limit, bcrypt, jsonwebtoken, compression, cors, dotenv |
| Frontend | React 19, Vite, React Router 7 (modo de dados), Fetch nativo, Leaflet + react-leaflet (mapas), gsap (pilha animada da Home). CSS puro com variáveis, sem Tailwind nem biblioteca de componentes |
| Pagamentos | AbacatePay (API v2, em Dev mode), atrás de uma camada própria em `services/pagamento/` |
| Imagens | sharp (conversão para WebP) e Cloudinary em produção |
| E-mail | Resend ou Brevo (recuperação de senha) |
| Qualidade | Vitest (787 testes), suítes de ponta a ponta pelo Chrome DevTools Protocol, oxlint, GitHub Actions |
| Hospedagem | Render (API e site estático), pelo Blueprint `render.yaml` |
| Portas | Backend `3001`, frontend `5173` |

## Pré-requisitos

- Node.js 20 ou superior (testado com a v23; o CI usa a v22)
- MySQL 8 em execução na porta 3306 (instalação local ou XAMPP)
- npm

## Como executar

Todos os comandos abaixo são executados **a partir da raiz** do projeto.

```bash
# 1. Instala as dependências do backend e do frontend
npm run install:all

# 2. Configura as credenciais
#    Copie backend/.env.example para backend/.env e ajuste DATABASE_URL (conta da
#    aplicação, com uma senha longa nova), DATABASE_URL_MIGRACAO (o root),
#    JWT_SECRET, ADMIN_SENHA e DEMO_EMPREENDEDOR_SENHA
#    Copie frontend/.env.example para frontend/.env (o valor padrão já funciona)

# 3. Cria o banco vitrine_db e as tabelas com a conta de administrador
#    (o MySQL precisa estar rodando)
npm run prisma:migrate

# 4. Cria a conta que a API usa, só com leitura e escrita no vitrine_db
npm run banco:criar-usuario

# 5. Popula os dados iniciais: o administrador, 5 contas de empreendedor com
#    seus negócios e itens, assinaturas e métricas de demonstração, 1 mensagem
#    e 4 perguntas frequentes
npm run prisma:seed

# 6. Sobe o backend (terminal 1)
npm run dev:backend      # http://localhost:3001/api/health

# 7. Sobe o frontend (terminal 2)
npm run dev:frontend     # http://localhost:5173
```

No Windows, `powershell -ExecutionPolicy Bypass -File tests-e2e/subir-servidores.ps1` sobe os dois
como processos independentes do terminal, com os logs em `%TEMP%\vitrine-backend.log` e
`%TEMP%\vitrine-frontend.log`.

O seed é idempotente: rodar de novo limpa as tabelas e reinsere os mesmos dados. Ele **falha de
propósito** se `ADMIN_SENHA` ou `DEMO_EMPREENDEDOR_SENHA` não estiverem no `.env`, para que nenhuma
senha padrão fique escrita no código.

Contas criadas pelo seed:

| Conta | Perfil | Serve para |
|---|---|---|
| `ADMIN_EMAIL` do `.env` | ADMIN | Painel de administração, contas e auditoria |
| `maria@ateliefioearte.com.br` | EMPREENDEDOR | Ateliê Fio & Arte, no plano **Destaque**, com divulgação nas redes |
| `carlos@silvareparos.com.br` | EMPREENDEDOR | Silva Reparos, no **Essencial**: é quem assina o Destaque na demonstração |
| `luciana@docesdadonalu.com.br`, `juliana@brechodaju.com.br` | EMPREENDEDOR | Doces da Dona Lu e Brechó da Ju, no **Essencial** |
| `patricia@espacobelaflor.com.br` | EMPREENDEDOR | Espaço Bela Flor, **rascunho** sem plano: fora da vitrine até assinar |

As senhas são as que você definir no `.env` (as contas de empreendedor usam
`DEMO_EMPREENDEDOR_SENHA`). Todo negócio do seed tem conta, porque só negócio com conta e plano em
vigor aparece na vitrine. As assinaturas e os números de desempenho do seed são de
**demonstração**: nunca passaram pelo gateway. O roteiro da apresentação está em [DEMO.md](DEMO.md).

**Administrador sem rodar o seed.** Num banco que já tem dados (como o de produção), o seed apagaria
tudo. Para criar ou atualizar só a conta de administrador, use `npm run admin:criar --prefix backend`
(ou `tidb:criar-admin` para o TiDB). O script pede os dados pelo terminal e não grava a senha em
arquivo nenhum.

## Scripts

Na raiz:

| Script | O que faz |
|---|---|
| `npm run install:all` | Instala backend e frontend |
| `npm run dev:backend` / `dev:frontend` | Sobe a API (com `node --watch`) e o site (Vite) |
| `npm run prisma:migrate` | Aplica e cria migrations com a conta de administrador do banco |
| `npm run prisma:deploy` | Só aplica as migrations pendentes (o que o Render faz no build) |
| `npm run prisma:seed` | Recria os dados de demonstração (**apaga o banco**) |
| `npm run banco:criar-usuario` | Cria ou realinha a conta `vitrine_app` da API |
| `npm test` / `test:watch` | Testes de unidade (Vitest) |
| `npm run test:e2e` | As seis suítes de ponta a ponta que não mexem no banco |
| `npm run test:e2e:planos` | Suíte das assinaturas (**apaga o banco local**) |
| `npm run audit` | `npm audit` de backend e frontend, falhando em vulnerabilidade alta |

Em `backend/` (além dos repassados acima):

| Script | O que faz |
|---|---|
| `npm run prisma:status` | Situação das migrations |
| `npm run planos:semear` | Atualiza os planos à venda a partir de `prisma/planos.js`, sem apagar nada |
| `npm run admin:criar` | Cria ou atualiza a conta de administrador |
| `npm run abacatepay:webhook` | Cadastra o webhook do AbacatePay apontando para a API publicada |
| `npm run tidb:banco`, `tidb:migrar`, `tidb:status`, `tidb:criar-usuario`, `tidb:seed`, `tidb:planos`, `tidb:criar-admin` | Os mesmos passos contra o TiDB Cloud, lendo `backend/.env.tidb` |
| `npm run render:build` | Build da API no Render: `prisma generate` e `migrate deploy` |

## Variáveis de ambiente

### `backend/.env`

```
PORT=3001
NODE_ENV=development
# Conta da aplicação: só lê e grava linhas no vitrine_db
DATABASE_URL="mysql://vitrine_app:SENHA_LONGA_E_ALEATORIA@localhost:3306/vitrine_db"
# Conta de administrador: só migrations e criação da conta acima
DATABASE_URL_MIGRACAO="mysql://root:SUA_SENHA@localhost:3306/vitrine_db"

# Sessão
JWT_SECRET="troque-por-um-segredo-longo-e-aleatorio"
JWT_EXPIRES_IN="8h"

# Versão vigente dos documentos legais, gravada em cada aceite
TERMOS_VERSAO="1.3"

# Imagens enviadas do computador: pasta local, ou Cloudinary se preenchido
UPLOADS_DIR="uploads"
CLOUDINARY_URL=""

# Assinaturas (AbacatePay). Só a chave de TESTE, que começa com abc_dev_
ABACATEPAY_API_KEY=""
ABACATEPAY_WEBHOOK_SECRET=""
APP_URL="http://localhost:5173"

# Usadas apenas pelo seed
ADMIN_NOME="Administrador"
ADMIN_EMAIL="admin@vitrinelocal.com.br"
ADMIN_SENHA="defina-uma-senha-forte"
DEMO_EMPREENDEDOR_SENHA="defina-uma-senha-forte"
```

| Variável | Obrigatória | Observação |
|---|---|---|
| `DATABASE_URL` | sim | Conta que a API usa. Só `SELECT`, `INSERT`, `UPDATE` e `DELETE` no `vitrine_db` |
| `DATABASE_URL_MIGRACAO` | para migrations | Conta de administrador. Usada por `prisma:migrate`, `prisma:deploy`, `prisma:status` e `banco:criar-usuario`; a API nunca se conecta com ela |
| `JWT_SECRET` | sim | Sem ela a vitrine abre, mas ninguém entra nem se cadastra: o log avisa na subida e o `/api/health` mostra `"login": "indisponivel"` |
| `JWT_EXPIRES_IN` | não | Padrão `8h` |
| `TERMOS_VERSAO` | não | Padrão `1.3`. Mudar a versão faz novos aceites gravarem o novo número |
| `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` | para o login com Google | Cliente OAuth "Aplicativo da Web" do Google Cloud. Sem eles, o botão "Continuar com Google" aparece como indisponível. Veja [Login com Google](#login-com-google) |
| `GOOGLE_URL_RETORNO` | não | Endereço de retorno fixo. Padrão: `<endereço da API>/api/auth/google/retorno` |
| `JWT_EXPIRES_IN_CLIENTE` | não | Duração da sessão de cliente (login com Google). Padrão `30d` |
| `UPLOADS_DIR` | não | Padrão `uploads` (relativo à pasta `backend`). Onde ficam as fotos enviadas quando não há Cloudinary |
| `CLOUDINARY_URL` | **em produção** | `cloudinary://CHAVE:SEGREDO@CONTA`. Com ela, as fotos vão para o Cloudinary. Sem ela, em produção, o envio de fotos é recusado com `503` (o disco do Render gratuito é apagado a cada deploy, e as fotos sumiriam) e o `/api/health` mostra `"imagens": "indisponivel"` |
| `CLOUDINARY_PASTA` | não | Padrão `vitrinelocal`. Pasta das fotos dentro da conta do Cloudinary |
| `ABACATEPAY_API_KEY` | para assinar planos | Chave do AbacatePay em **Dev mode** (`abc_dev_...`). Sem ela a vitrine funciona e a assinatura responde `503` com uma mensagem clara. Uma chave de produção é recusada |
| `ABACATEPAY_PERMITIR_PRODUCAO` | não | `true` libera a chave de produção, que **cobra de verdade**. Fica desligada no projeto |
| `ABACATEPAY_WEBHOOK_SECRET` | em produção | Segredo longo, inventado por você, que o AbacatePay manda na URL do webhook. No localhost não é usado |
| `ABACATEPAY_BASE_URL` | não | Padrão `https://api.abacatepay.com/v2` |
| `PAGAMENTO_PROVEDOR` | não | Padrão `abacatepay`. Troca o gateway sem mexer no resto (ver [Planos e assinaturas](#planos-e-assinaturas)) |
| `APP_URL` | sim, com assinaturas | Endereço do site. O checkout volta para `APP_URL/meu-negocio` depois do pagamento |
| `EMAIL_PROVEDOR` | para recuperar senha | `resend` ou `brevo`. Sem ele, fora de produção o e-mail (com o link) só aparece no log do servidor |
| `RESEND_API_KEY` / `BREVO_API_KEY` | conforme o provedor | Chave do serviço escolhido. Só a do provedor em `EMAIL_PROVEDOR` é usada e nunca vai para o log |
| `EMAIL_REMETENTE` | com provedor | `Nome <endereco@dominio>`, de um domínio verificado no serviço. Com um endereço `@gmail.com`, `@hotmail.com` ou parecido, o e-mail sai, mas cai no Spam, e no Spam o Gmail desativa os links (o botão "Criar nova senha" não abre) |
| `CORS_ORIGINS` | em produção | Endereços do site que podem chamar a API, separados por vírgula |
| `BANCO_HOST_CONTA` | não | Padrão `localhost`. De onde a conta da aplicação pode entrar no MySQL; num banco na nuvem use `%` |
| `ADMIN_SENHA`, `DEMO_EMPREENDEDOR_SENHA` | só para o seed | O seed aborta se faltarem |

Nenhuma chave de API vai para o frontend: o pagamento acontece na página do AbacatePay, e o mapa
(Leaflet com ladrilhos do OpenStreetMap) e a geocodificação do Nominatim são usados em modo aberto,
sem credencial. Os arquivos `.env`, `.env.tidb` e `.env.aiven` estão no `.gitignore`.

**Por que duas contas de banco.** Se alguém explorar uma falha na API, só consegue o que a conta da
API pode: ler e gravar linhas do `vitrine_db`. Criar, alterar ou apagar tabela, ver outros bancos, ler
as contas do MySQL, criar usuário e ler arquivo do servidor são recusados pelo próprio MySQL, o que foi
testado conta por conta. A conta `vitrine_app` só entra a partir desta máquina (`@localhost`).

**MySQL só na própria máquina.** Neste computador de desenvolvimento, o `my.ini` tem
`bind-address=127.0.0.1,::1` e `mysqlx-bind-address=127.0.0.1`, e as regras de firewall "Port 3306"
e "mysqld" estão desativadas: nenhuma outra máquina da rede alcança o banco. Para desfazer, apague
essas duas linhas do `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini` (há uma cópia do original ao
lado, `my.ini.antes-bind-address-*`), reinicie o serviço `MySQL80` e reative as regras no Firewall do
Windows. A API continua funcionando das duas formas, porque se conecta por `localhost`.

`npm run banco:criar-usuario` cria a conta com a senha que estiver em `DATABASE_URL` e pode ser rodado
de novo: se a conta já existe, senha e permissões são realinhadas com o `.env`. Ele recusa usar o
mesmo usuário nas duas variáveis e senha com menos de 16 caracteres.

Exemplos de `DATABASE_URL_MIGRACAO`:

| Situação | Valor |
|---|---|
| MySQL do XAMPP sem senha | `mysql://root:@localhost:3306/vitrine_db` |
| MySQL Server com senha | `mysql://root:SUA_SENHA@localhost:3306/vitrine_db` |

### `frontend/.env`

```
VITE_API_URL=http://localhost:3001/api
```

## Estrutura do projeto

```
VitrineLocal/
├── package.json              scripts de orquestração (install:all, prisma:*, dev:*, test*)
├── render.yaml               Blueprint do Render (API + site estático)
├── TERMOS_DE_USO.md          documento servido pela API e pela página /termos
├── POLITICA_DE_PRIVACIDADE.md  idem, para /privacidade
├── DEMO.md                   roteiro da demonstração das assinaturas
├── .github/workflows/ci.yml  testes, lint, build e auditoria de dependências a cada push
├── security-audit/           relatório da auditoria de segurança (Markdown, HTML, PDF, SARIF)
├── docs/                     publicação no Render, coleções do Thunder Client e do Postman,
│                             roteiro de testes da API e capturas das suítes de ponta a ponta
├── tests/                    testes de unidade (Vitest), um .test.js por módulo
├── tests-e2e/                driver do Chrome DevTools Protocol e suítes de ponta a ponta
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     modelo de dados (18 tabelas)
│   │   ├── migrations/       17 migrations, da criação inicial ao enquadramento das fotos
│   │   ├── reversoes/        SQL para desfazer uma migration (o Prisma só anda para frente)
│   │   ├── planos.js         os planos à venda (preço, ciclo, benefícios, recursos)
│   │   └── seed.js           dados iniciais (senhas vêm do .env)
│   ├── scripts/              prisma-admin (migrations com a conta root), criar-banco,
│   │                         criar-usuario-banco, criar-admin, semear-planos,
│   │                         abacatepay-webhook, certificado-banco (TLS do TiDB)
│   └── src/
│       ├── app.js            Express: helmet, cors, compressão, limites, rotas, 404, erros
│       ├── server.js         confere sessão, pagamento e fotos, conecta ao banco e sobe
│       ├── config/prisma.js  singleton do PrismaClient
│       ├── controllers/      empreendedor, produto, contato, auth, usuario, auditoria, faq,
│       │                     upload, assinatura, metrica, divulgacao, saude
│       ├── middlewares/      auth.js (JWT, perfis e sessões encerradas), rateLimit.js,
│       │                     errorHandler.js, validate.js
│       ├── utils/            erros.js (mensagens exibíveis), paginacao.js, origens.js (CORS),
│       │                     enquadramento.js (formato "x% y% zoom")
│       ├── services/         auditoria, termos, horarios, imagens (envio, WebP e Cloudinary),
│       │                     assinaturas (estados), publicacao (quem aparece na vitrine),
│       │                     metricas (desempenho sem identificar ninguém), email,
│       │                     redefinicaoSenha, senhasComuns, pagamento/ (index + abacatepay)
│       └── routes/           index.js + um roteador por entidade
└── frontend/
    └── src/
        ├── main.jsx          entrada; na página inicial já adianta os dados da Home
        ├── App.jsx           roteador, layout, telas sob demanda e pré-carga no ócio
        ├── contexts/         auth.js (contexto e perfis) + AuthContext.jsx (provider)
        ├── services/         api.js (Fetch com token, cache e GETs sem duplicar), constantes,
        │                     fontes, validacoes, formatos, whatsapp, telefone (máscara),
        │                     planos, metricas, divulgacoes, imagens, enquadramento,
        │                     geocodificacao (Nominatim), faq, horarios, novidades
        ├── hooks/            useConsulta (leituras com cache), useFiltrosNaUrl, useRelogio,
        │                     useFocoNoErro (leva ao primeiro campo com erro),
        │                     useAoVoltarDoHistorico
        ├── components/
        │   ├── auth/         RotaProtegida
        │   ├── layout/       Navbar (estados por perfil), Footer
        │   ├── ui/           Button, Modal, ConfirmModal, StatusMessage, Aviso, Spinner, Tag, Icone,
        │   │                 Fonte, Mapa (Leaflet sob demanda), Voltar (teclas Voltar e Avançar),
        │   │                 Paginacao, Acordeao, PaginaErro, SeloDestaque, SeloNovo,
        │   │                 CaixaDeMarcar, CardSwap, DotField (fundo de pontos), Datilografo
        │   ├── cards/        ProdutoCard, EmpreendedorCard
        │   ├── forms/        ProdutoForm, EmpreendedorForm, ContatoForm, ContaForm, AceiteTermos,
        │   │                 HorariosEditor, CampoSenha, CampoImagem, AjusteEnquadramento,
        │   │                 EntradaTelefone, ResumoDeErros, FaqForm
        │   ├── planos/       CartaoPlano, EscolhaDePlano, ChaveCiclo (mensal/anual)
        │   ├── painel/       PainelPlano, PainelDesempenho, PainelDivulgacao, AvisoSituacao
        │   ├── admin/        PainelAuditoria, PainelUsuarios, PainelFaq, PainelAssinaturas,
        │   │                 PainelDivulgacoes, CabecalhoSecao
        │   ├── home/         PilhaDeNegocios
        │   ├── legal/        DocumentoLegal, DocumentoLegalModal
        │   ├── faq/          PerguntasFrequentes
        │   ├── tables/       DataTable
        │   └── filters/      SearchBar, CategoriaFilter
        └── pages/            Home, Vitrine, ProdutoDetalhe, Empreendedores, EmpreendedorDetalhe,
                              Contato, Sobre, Login, Cadastro, RecuperarSenha, Termos, Planos,
                              MeuNegocio, Admin (+ detalhe-migalhas.css e listagem.css comuns)
```

Cada componente e página mora na própria pasta, com o `.jsx` e o `.css` ao lado.

## Modelo de dados

Dezoito tabelas. Uma conta pode ter um negócio; um negócio tem muitos produtos, intervalos de
atendimento, assinaturas, divulgações, métricas e avaliações (tudo em cascata) e pode receber mensagens.
Cada avaliação tem um autor (a conta, em cascata), cada denúncia liga uma conta a uma avaliação, e cada
identidade externa (login com Google) liga uma conta a um provedor. Os
aceites de termos e os pedidos de nova senha seguem a conta em cascata, mas os logs de auditoria
sobrevivem à exclusão da conta: apagar um usuário não pode apagar o histórico. Um plano não pode ser
apagado enquanto houver assinatura dele. Três tabelas ficam soltas: as perguntas da central de ajuda,
os avisos do gateway já processados e as sessões encerradas.

```mermaid
erDiagram
    USUARIOS ||--o| EMPREENDEDORES : "é dono de"
    USUARIOS ||--o{ ACEITES_TERMOS : "aceitou"
    USUARIOS ||--o{ LOGS_AUDITORIA : "gerou"
    USUARIOS ||--o{ REDEFINICOES_SENHA : "pediu"
    EMPREENDEDORES ||--o{ PRODUTOS : "oferece"
    EMPREENDEDORES ||--o{ CONTATOS : "recebe"
    EMPREENDEDORES ||--o{ HORARIOS_ATENDIMENTO : "atende em"
    EMPREENDEDORES ||--o{ ASSINATURAS : "assina"
    PLANOS ||--o{ ASSINATURAS : "é assinado em"
    EMPREENDEDORES ||--o{ DIVULGACOES : "é divulgado em"
    EMPREENDEDORES ||--o{ METRICAS_DIARIAS : "tem"
    EMPREENDEDORES ||--o{ AVALIACOES : "recebe"
    USUARIOS ||--o{ AVALIACOES : "escreveu"
    AVALIACOES ||--o{ DENUNCIAS_AVALIACAO : "recebe"
    USUARIOS ||--o{ DENUNCIAS_AVALIACAO : "fez"
    USUARIOS ||--o{ IDENTIDADES_EXTERNAS : "entra por"

    USUARIOS {
        int id PK
        varchar nome
        varchar email UK
        varchar telefone
        varchar senha_hash "bcrypt, nunca sai da API"
        varchar perfil "COMUM | EMPREENDEDOR | ADMIN"
        boolean ativo
        datetime senha_alterada_em "derruba sessões anteriores"
        datetime created_at
        datetime updated_at
    }

    REDEFINICOES_SENHA {
        int id PK
        int usuario_id FK "ON DELETE CASCADE"
        char token_hash UK "SHA-256 do código do link"
        datetime expira_em "30 minutos"
        datetime usado_em
        datetime created_at
    }

    SESSOES_ENCERRADAS {
        varchar jti PK "id do token encerrado pelo Sair"
        datetime expira_em
    }

    ACEITES_TERMOS {
        int id PK
        int usuario_id FK "ON DELETE CASCADE"
        varchar tipo_termo "TERMOS_DE_USO | POLITICA_PRIVACIDADE"
        varchar versao
        boolean aceito
        varchar ip
        varchar user_agent
        datetime created_at
    }

    LOGS_AUDITORIA {
        int id PK
        int usuario_id FK "nulo; ON DELETE SET NULL"
        varchar usuario_nome "cópia, sobrevive à exclusão da conta"
        varchar acao
        varchar tipo_entidade
        int entidade_id
        text descricao
        json valores_antes
        json valores_depois
        varchar ip
        varchar user_agent
        varchar status "SUCESSO | ERRO"
        text erro_mensagem
        datetime created_at
    }

    EMPREENDEDORES {
        int id PK
        int usuario_id FK "único; nulo; ON DELETE SET NULL"
        varchar nome_negocio
        varchar responsavel
        text descricao
        varchar categoria "Artesanato | Alimentação | Serviços | Moda | Beleza"
        varchar cidade
        varchar endereco
        varchar numero
        varchar complemento
        varchar bairro
        varchar estado
        varchar cep
        float latitude
        float longitude
        boolean exibir_endereco
        varchar whatsapp
        varchar instagram
        varchar foto_url "capa"
        varchar logo_url "foto do perfil"
        varchar foto_foco "enquadramento da capa"
        varchar logo_foco "enquadramento da foto do perfil"
        boolean ativo "falso = suspenso pela moderação"
        varchar plano_atual "cópia da assinatura vigente"
        boolean em_destaque "cópia: ordena a vitrine sem juntar tabelas"
        datetime publicado_ate "fim do período pago"
        datetime publicado_desde "primeira publicação: selo Novo"
        boolean autoriza_divulgacao
        datetime autoriza_divulgacao_em
        datetime created_at
        datetime updated_at
    }

    PRODUTOS {
        int id PK
        varchar nome
        text descricao
        float preco
        varchar tipo "produto | servico"
        varchar imagem
        varchar imagem_foco "x% y% e zoom opcional"
        boolean disponivel
        int empreendedor_id FK "ON DELETE CASCADE"
        datetime created_at
        datetime updated_at
    }

    HORARIOS_ATENDIMENTO {
        int id PK
        int empreendedor_id FK "ON DELETE CASCADE"
        tinyint dia_semana "0 = domingo ... 6 = sábado"
        varchar abre "08:00"
        varchar fecha "12:00"
    }

    CONTATOS {
        int id PK
        varchar nome
        varchar email
        varchar telefone
        text mensagem
        boolean lido
        int empreendedor_id FK "nulo; ON DELETE SET NULL (legado)"
        datetime created_at
    }

    PLANOS {
        int id PK
        varchar nome UK "ESSENCIAL | DESTAQUE | *_ANUAL"
        varchar titulo
        varchar chamada
        text descricao
        int preco_centavos "5000 = R$ 50,00"
        varchar ciclo "MONTHLY | ANNUALLY"
        boolean destaque
        boolean metricas_ampliadas
        boolean divulgacao
        int ordem
        boolean ativo
        varchar gateway_produto_id "produto no AbacatePay"
    }

    ASSINATURAS {
        int id PK
        int empreendedor_id FK "ON DELETE CASCADE"
        int plano_id FK
        varchar status "PENDENTE | ATIVA | INADIMPLENTE | CANCELADA"
        varchar gateway_checkout_id UK "bill_..."
        varchar gateway_assinatura_id UK "subs_..."
        varchar checkout_url
        datetime inicio_em
        datetime proxima_cobranca
        datetime vigente_ate "próxima cobrança + 1 dia"
        datetime cancelada_em
    }

    EVENTOS_WEBHOOK {
        varchar id PK "id do aviso do gateway: repetido não é aplicado de novo"
        datetime recebido_em
    }

    DIVULGACOES {
        int id PK
        int empreendedor_id FK "ON DELETE CASCADE"
        varchar tipo "NEGOCIO | PRODUTO | SERVICO | CAMPANHA | INSTITUCIONAL"
        varchar titulo
        varchar canal
        varchar status "PLANEJADA | PUBLICADA | CANCELADA"
        datetime publicada_em
        varchar link
        int alcance
    }

    METRICAS_DIARIAS {
        int id PK
        int empreendedor_id FK "ON DELETE CASCADE"
        date dia "fuso de Rondonópolis"
        varchar tipo "VISUALIZACAO_PERFIL, CLIQUE_WHATSAPP..."
        int referencia_id "produto, ou 0 para o negócio"
        int quantidade
    }

    PERGUNTAS_FREQUENTES {
        int id PK
        varchar pergunta "até 300"
        text resposta "texto puro, até 5000"
        varchar categoria "opcional, até 80"
        int ordem "padrão 0"
        boolean ativo "padrão true"
        datetime created_at
        datetime updated_at
    }
```

O schema completo está em [backend/prisma/schema.prisma](backend/prisma/schema.prisma).

**Migrations.** São 17, aplicadas em ordem: criação inicial, localização, autenticação com termos e
auditoria, disponibilidade e banner, horários de atendimento, índices de busca, perguntas frequentes,
assinaturas, publicação por assinatura, remoção do banner, `publicado_desde`, redefinição de senha,
sessões encerradas, eventos do webhook, foto do perfil (`logo_url`), enquadramento das fotos do
negócio e enquadramento das fotos dos itens. As mais recentes têm o SQL de reversão em
`backend/prisma/reversoes/`, para desfazer com `npx prisma db execute --file ...`.

## Perfis e permissões

| Perfil | Vê | Faz |
|---|---|---|
| Visitante (sem conta) | Vitrine, empreendedores, detalhes, planos, perguntas frequentes ativas | Envia mensagem à equipe pelo formulário de contato |
| COMUM | Tudo do visitante | Avalia negócios e denuncia avaliações. A conta é criada sozinha no primeiro login com Google (sem senha nem telefone). Pode cadastrar o próprio negócio, o que promove a conta a EMPREENDEDOR |
| EMPREENDEDOR | Tudo do comum, mais o próprio negócio em prévia (mesmo sem plano) e os itens indisponíveis do próprio catálogo | Edita o próprio negócio, assina e troca de plano, gerencia o catálogo (com plano em vigor), vê o desempenho e as divulgações |
| ADMIN | Tudo, incluindo negócios fora da vitrine, mensagens, contas, assinaturas, auditoria, perguntas ocultas e avaliações removidas | Cria, edita e exclui qualquer registro; suspende negócios; ativa e desativa contas; registra divulgações; mantém a central de ajuda; remove e restaura avaliações (não avalia) |

Regras que valem no servidor, independentemente do que a interface mostrar:

- Toda rota protegida verifica o perfil no banco a cada requisição, não no token. Uma conta desativada perde o acesso na hora, sem esperar o token expirar.
- **Sair encerra a sessão de verdade:** o identificador do token (`jti`) vai para `sessoes_encerradas` e o token deixa de valer antes de expirar.
- O dono só mexe no que é dele. Tentar editar ou excluir item de outro negócio devolve `403`, mesmo com o `id` correto na URL.
- **Catálogo só com plano em vigor:** criar e editar produtos ou serviços exige assinatura ativa. Sem plano, o painel mostra o catálogo bloqueado e o caminho para a aba Plano.
- O vínculo de um produto com o negócio não pode ser trocado na edição: o schema de atualização remove `empreendedorId`, então não há como transferir um item para outra vitrine.
- O formulário de contato fala só com a equipe do VitrineRondon: o servidor ignora qualquer `empreendedorId` enviado. Ler as mensagens é exclusivo da administração, porque elas contêm dados pessoais.
- Um administrador não consegue desativar a própria conta.
- Senhas são guardadas com bcrypt, nenhum `select` da API inclui o hash, e senhas muito comuns são recusadas no cadastro.
- O login devolve a mesma mensagem para e-mail inexistente e senha errada, para não revelar quais e-mails estão cadastrados.
- **Esqueci a senha:** o link vai por e-mail (Resend ou Brevo, escolhido em `EMAIL_PROVEDOR`), vale 30 minutos e uma vez só. O banco guarda só o SHA-256 do código, um pedido novo anula os anteriores e, para a mesma conta, sai no máximo um e-mail a cada 2 minutos. A resposta do pedido é igual exista a conta ou não, e sai antes do envio, para o tempo de resposta também não denunciar. Ao trocar a senha, `senhaAlteradaEm` derruba os tokens emitidos antes. Sem provedor configurado, fora de produção o e-mail aparece no log da API para testar o fluxo.

No navegador, o componente `RotaProtegida` leva quem não entrou para o login e devolve a pessoa à
rota pretendida depois. Essa checagem é conveniência de interface: a autorização de verdade está na API.

## Termos de uso e privacidade

Os documentos ficam em [TERMOS_DE_USO.md](TERMOS_DE_USO.md) e
[POLITICA_DE_PRIVACIDADE.md](POLITICA_DE_PRIVACIDADE.md), na raiz, e são servidos pela API em
`/api/termos/TERMOS_DE_USO` e `/api/termos/POLITICA_PRIVACIDADE`. As páginas `/termos` e
`/privacidade` renderizam esse conteúdo, e no cadastro eles abrem num modal por cima do formulário.

| Regra | Como é garantida |
|---|---|
| Aceite obrigatório no cadastro | As duas caixas começam desmarcadas e o servidor valida com `z.literal(true)`; marcar só no frontend não passa |
| Aceite registrado com data, versão, IP e navegador | Cada cadastro grava uma linha por documento em `aceites_termos` |
| Versão vigente controlada por configuração | `TERMOS_VERSAO` no `.env`, gravada junto do aceite |
| Nenhum aceite órfão | Conta, negócio e aceites são criados na mesma transação: se um falhar, nada é gravado |
| Leitura antes de aceitar | O documento abre num modal; o que já foi digitado continua no formulário, e ler não marca o aceite sozinho |
| Sem promessa de resultado | Termos (seção 5), página de planos e FAQ dizem que o plano aumenta a exposição, mas não garante visitas, contatos ou vendas |

## Auditoria

Toda gravação passa pelo serviço [backend/src/services/auditoria.js](backend/src/services/auditoria.js).
O navegador nunca envia logs: quem registra é o servidor, com o que realmente aconteceu.

O que fica registrado: entradas e saídas do sistema, tentativas de entrada recusadas, cadastros de
conta, aceites de termos, criação, alteração e exclusão de negócios, produtos, mensagens e perguntas
frequentes, mudanças de perfil, ativação ou desativação de contas, mudanças de status das assinaturas
(com a origem: `WEBHOOK`, `CONCILIACAO` ou `SIMULACAO`) e divulgações.

Cada registro guarda quem fez, o que fez, sobre qual registro, quando, de qual IP e com qual
navegador, além da situação (concluída ou com erro). Em alterações, são gravados **apenas os campos
que mudaram**, no antes e no depois.

O que nunca é gravado: senhas, hashes, tokens e confirmações de senha são removidos antes da
escrita. O texto das mensagens de contato também fica de fora, por ser conteúdo pessoal de terceiros.

Uma falha ao gravar o log não derruba a operação principal: o erro vai para o console do servidor e
a ação do usuário segue normalmente.

Consultar a auditoria é exclusivo do administrador, na aba Auditoria do painel, com filtros por
ação, registro, pessoa, situação, período e busca livre, além de paginação. Consultas **não** geram
logs: registrar cada leitura encheria a tabela e esconderia os eventos que importam.

## Avaliações dos negócios

> Como cliente, quero dar uma nota e comentar um negócio que me atendeu, e ver a reputação dos outros antes de chamar no WhatsApp.

No perfil de cada negócio, a reputação aparece ao lado do nome (estrelas, média e quantidade) e a
seção **Avaliações dos clientes** mostra o resumo com a distribuição das notas, o formulário e os
comentários, ordenáveis (mais recentes, maior e menor nota) e carregados aos poucos ("ver mais").

| Regra | Como funciona |
|---|---|
| RN-AVAL-01 | Cada avaliação pertence a um negócio (`avaliacoes.empreendedor_id`, com chave estrangeira) |
| RN-AVAL-02 | Só quem tem conta avalia: cliente (`COMUM`) ou empreendedor de outro negócio. O dono não avalia o próprio; a administração modera e não avalia. Negócio fora da vitrine não recebe avaliação |
| RN-AVAL-03 | Uma avaliação por pessoa por negócio, garantida pelo índice único (`empreendedor_id`, `usuario_id`); a segunda tentativa recebe `409` |
| RN-AVAL-04 | Nota inteira de 1 a 5. `0`, `6`, `4.5` e `"5"` são recusados |
| RN-AVAL-05 e 06 | Média, total e distribuição não ficam gravados: saem das avaliações `PUBLICADA` a cada leitura (`groupBy` por nota), então publicar, editar, apagar ou remover já muda a reputação |
| RN-AVAL-07 | Validação no servidor com Zod (nota, comentário de 3 a 1000 caracteres); campos extras como `media` ou `usuarioId` são descartados |
| RN-AVAL-08 | Nenhuma rota escreve média ou contagem; o dono do negócio não edita nem apaga avaliações de clientes |
| RN-AVAL-09 | O autor edita (marca "editada") e apaga a própria. A administração remove com motivo (o autor vê o motivo) e pode restaurar; o registro removido fica guardado, fora da média. Tudo vai para a auditoria |
| RN-AVAL-10 | O seed não cria avaliações; o perfil sem avaliações diz "Este negócio ainda não possui avaliações." |

**Estrelas:** o preenchimento usa a média exata (4,3 pinta 30% da quinta estrela), e a cor vem da
faixa da média: cinza sem avaliações, vermelha (1 a 1,9), laranja (2 a 2,9), dourada (3 a 3,9), verde
(4 a 4,4) e dourado premium, com brilho (4,5 a 5). A média e a quantidade também aparecem em texto, e as estrelas
têm rótulo para leitores de tela, então a cor nunca é a única informação. No **plano Destaque** muda só o
acabamento (contorno dourado, brilho, moldura e o selo "Reputação em destaque"): a nota, a média e o
número de estrelas são os mesmos de qualquer plano, e o selo "Negócio Destaque" continua separado da
reputação.

**Privacidade e segurança:** o avaliador aparece como primeiro nome e inicial do sobrenome; e-mail e
telefone só aparecem para a administração, na moderação. O comentário é guardado e exibido como texto
puro (o React escapa qualquer HTML). Publicar e editar têm limite de 10 por hora; denúncias, 20 por
hora, uma por conta por avaliação.

**Seletor de estrelas:** é um grupo de botões de rádio de verdade, então as setas do teclado trocam a
nota e o leitor de tela anuncia "4 estrelas, Bom". A seção só busca os dados quando chega perto da tela,
para não disputar a rede com o topo do perfil.

## Login com Google

> Como cliente, quero avaliar um negócio sem preencher cadastro nem criar senha.

Quem avalia não faz cadastro nem "login": **escreve a avaliação primeiro** (estrelas e comentário
aparecem para qualquer visitante) e clica em **"Publicar com Google"**. O rascunho fica guardado no
navegador, o Google confirma quem é a pessoa e, na volta, **a avaliação é publicada sozinha**. Se ela
cancelar no Google, o texto continua no formulário. Quem anuncia continua com e-mail e senha, e a tela de
login é só dos empreendedores. Não existe um segundo sistema de sessão: o login com Google termina na
mesma sessão JWT do login por senha.

**Depois da confirmação:** o menu mostra só "Minhas avaliações" e "Sair" (o tipo da conta aparece como
"Cliente"). Em `/minhas-avaliacoes` a pessoa vê, edita e apaga as avaliações que deixou; sem sessão, a
página pede a confirmação com o Google ali mesmo. A sessão de cliente dura **30 dias**
(`JWT_EXPIRES_IN_CLIENTE`) e leva a marca `escopo: cliente`: se a conta deixar de ser COMUM (ao anunciar
um negócio), essa sessão deixa de valer e a resposta do cadastro do negócio já traz uma sessão normal
de empreendedor (8 horas).

**Fluxo** (OAuth 2.0 / OpenID Connect, *authorization code* com PKCE, todo no servidor):

1. O botão é um link para `/api/auth/google/iniciar?destino=<página>&origem=<site>`. A API guarda
   `state`, `nonce`, o verificador PKCE e o destino num cookie assinado, `httpOnly`, de 10 minutos,
   restrito ao caminho do retorno, e leva ao Google.
2. O Google volta para `/api/auth/google/retorno`. A API confere o `state` com o cookie (CSRF), troca o
   código pelo `id_token` com o segredo e o verificador e valida o `id_token`: assinatura RS256 pelas chaves
   públicas do Google (com cache e nova busca quando a chave muda), emissor, audiência, validade, `nonce`
   e e-mail verificado.
3. A identidade é procurada em `identidades_externas` pelo par único (`provedor`, `sujeito`):
   - achou: entra na conta de sempre (o perfil dela não muda);
   - o e-mail já é de uma conta, sem vínculo: **nada é ligado sozinho**; a tela pede a senha dessa conta
     e só então liga o Google a ela (`/auth/google/vincular`, com o limite de tentativas do login);
   - ninguém: cria uma conta `COMUM` (nome e e-mail do Google, sem senha nem telefone), o vínculo e o
     aceite dos termos, numa transação. Dois primeiros logins simultâneos esbarram no índice único e o
     segundo recupera a conta do primeiro.
4. A API volta ao site em `/entrar/google#codigo=...`: um código de **uso único que vale 60 s** (no
   fragmento, que não vai para servidores nem para o `Referer`), trocado pela sessão em
   `/auth/google/sessao`. O site apaga o fragmento e volta à página de onde a pessoa saiu (só caminhos do
   próprio site são aceitos como destino; a origem precisa estar em `CORS_ORIGINS`).

Os tokens temporários do fluxo são assinados com uma chave derivada do `JWT_SECRET`, diferente da das
sessões, então nenhum deles vale como sessão. Login social nunca dá perfil de empreendedor ou de admin.
Login cancelado, demorado, de conta desativada ou com falha mostra o motivo e o botão para tentar de novo.

**Configurar (uma vez):** no [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
crie um "ID do cliente OAuth" do tipo **Aplicativo da Web**, com as URIs de redirecionamento autorizadas
`https://<sua-api>/api/auth/google/retorno` e `http://localhost:3001/api/auth/google/retorno`, e coloque
`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `backend/.env` e nas variáveis do Render.

**Outros provedores:** o modelo (`identidades_externas.provedor`) e o serviço
([services/loginSocial.js](backend/src/services/loginSocial.js)) já recebem Microsoft ou Apple como uma
entrada a mais em `configuracaoDoProvedor`.

## Central de ajuda (FAQ)

> Como usuário, quero consultar perguntas frequentes para resolver dúvidas sem depender do suporte.
>
> Como administrador, quero cadastrar e manter o FAQ no próprio sistema, sem precisar de alteração
> de código ou novo deploy.

**Onde fica.** No item **Contato** do menu, antes do formulário: quem abre a página vê primeiro se a
dúvida já tem resposta e, se não tiver, escreve logo abaixo. A busca olha pergunta e resposta, sem
diferenciar acento ("endereco" encontra "endereço"). Os assuntos aparecem como botões ("Todos", "Para
quem compra", "Para quem vende"...), que quebram em linhas e ficam inteiros de 320 px em diante. As
perguntas abrem uma por vez: a resposta aparece na hora e só o texto esmaece, sem animar a altura,
que travava no celular. Quem é administrador vê o atalho "Administrar perguntas", que abre o painel
direto na aba **FAQ**, com tabela, cadastro e edição em modal e exclusão com confirmação.

**Regras de negócio.**

1. A leitura é pública, como o resto da vitrine. Só aparecem as perguntas ativas; a administração vê
   todas.
2. A ordem é pelo campo `ordem`, crescente, e no empate pela pergunta em ordem alfabética.
3. Criar, editar, excluir e ver as ocultas exige o perfil ADMIN, conferido no servidor (`401` sem
   login, `403` com outro perfil). Esconder o botão na tela não é a trava.
4. A pergunta é obrigatória e tem até 300 caracteres; a resposta é obrigatória e tem até 5000; o
   assunto é opcional, até 80. A tela valida com os mesmos limites, e um teste compara os dois lados.
5. A resposta é texto puro, exibido escapado. As quebras de linha digitadas são mantidas.
6. Toda criação, edição e exclusão entra na auditoria.
7. A exclusão é definitiva, como nos outros cadastros do projeto. Para tirar uma pergunta do ar sem
   perdê-la, basta desmarcar "Visível na central de ajuda".

**Persistência.** Tabela `perguntas_frequentes`, criada pela migration
`20260927140000_perguntas_frequentes`, com índice em `(ativo, ordem)` para a leitura pública. O seed
cria quatro perguntas de exemplo, e cada resposta descreve algo que o sistema faz de verdade.

**Adaptações feitas ao pedido original**, escrito para outro sistema:

| Pedido | Aqui | Por quê |
|---|---|---|
| Leitura só para usuário autenticado | Leitura pública (confirmado) | A vitrine não pede conta para navegar, e o cadastro público não cria conta de consulta. Exigir login esconderia o FAQ de quase todo mundo |
| Permissão `faq.gerenciar` | Perfil ADMIN | O projeto controla acesso por perfil, sem tabela de permissões |
| Campos `criadoEm` e `atualizadoEm` | `createdAt` e `updatedAt` (colunas `created_at` e `updated_at`) | Mesmo padrão das outras tabelas |
| Item próprio no menu | Item "Contato" | O FAQ e o formulário ficam na mesma página |
| Proteção CSRF | Não se aplica | A sessão vai no cabeçalho `Authorization`, não em cookie |
| Exportar para Excel, CSV ou PDF | Não feito | O projeto não tem exportação; o próprio pedido condicionava isso a ela existir |

## Planos e assinaturas

> **Ambiente de testes.** Os pagamentos usam o AbacatePay em **Dev mode**: nenhum cartão é cobrado.
> O roteiro da apresentação está em [DEMO.md](DEMO.md).

**Navegar é gratuito. Divulgar um negócio exige conta e plano em vigor.** Não existe publicação
gratuita: o empreendedor escolhe um dos dois planos, com cobrança mensal ou anual, e a plataforma não
cobra comissão sobre as vendas.

| | Essencial | Destaque |
|---|---|---|
| Preço mensal | R$ 50 por mês | R$ 75 por mês |
| Preço anual (2 meses de presente) | R$ 500 por ano | R$ 750 por ano |
| Publicação do negócio na vitrine (busca, categorias, mapa, contato) | ✓ | ✓ |
| Catálogo de produtos e serviços | ✓ | ✓ |
| Estatísticas do perfil | totais do período | totais, gráfico por dia e produtos mais vistos |
| Selo "Negócio em Destaque" | | ✓ |
| Prioridade na ordem das listas e da busca | | ✓ |
| Prioridade na pilha animada do topo da Home | | ✓ |
| Fundo especial na página do negócio e dos itens | | ✓ (azul-noite com brilho laranja) |
| Possibilidade de divulgação nas redes oficiais | | ✓ |

Os planos ficam em [backend/prisma/planos.js](backend/prisma/planos.js) (`npm run planos:semear`
atualiza o banco sem apagar nada). A vitrine decide pelos recursos do plano (`destaque`,
`metricasAmpliadas`, `divulgacao`), não pelo nome dele. Os cartões dos planos são o mesmo componente
([CartaoPlano](frontend/src/components/planos/CartaoPlano.jsx)) na página `/planos`, no cadastro e na
aba Plano do "Meu negócio", com o plano atual destacado no estilo dele.

**Transparência.** A página `/planos`, os Termos (seção 5) e a FAQ dizem a mesma coisa: o plano
aumenta a oportunidade de exposição, mas **não garante** visitas, contatos ou vendas. O Destaque muda
a ordem e dá o selo; os negócios do Essencial continuam na busca, nas listas e no mapa.

**Mensal ou anual.** Cada plano tem uma versão anual (`ESSENCIAL_ANUAL`, `DESTAQUE_ANUAL`), com os
mesmos recursos, cobrada uma vez por ano no AbacatePay (ciclo `ANNUALLY`) e com 2 meses de presente
(12 meses pelo preço de 10, em `MESES_PAGOS_NO_ANO`, no `planos.js`). A página de planos, a escolha
do plano no cadastro e a aba Plano têm a chave Mensal/Anual. Cancelar o anual interrompe a renovação,
e o negócio fica no ar até o fim do ano pago.

**Selo "Novo na vitrine".** O negócio guarda quando apareceu na vitrine pela primeira vez
(`publicadoDesde`, gravado na primeira assinatura paga). Nos 30 dias seguintes, os cartões dele, os
cartões dos seus produtos e serviços, a página do negócio e a do produto mostram o selo verde
"Novo". Renovar ou voltar depois de sair não faz o negócio parecer novo de novo.

**Publicação condicionada à assinatura.** A regra mora em
[services/publicacao.js](backend/src/services/publicacao.js) e vale em toda consulta pública: lista e
detalhe de negócios, busca, destaques, produtos, mensagens de contato e métricas. Esconder na tela não
é a trava: a API simplesmente não devolve o negócio a quem não é o dono nem a administração.

| Situação do negócio | Quando | Na vitrine |
|---|---|---|
| `RASCUNHO` | cadastrado, nunca teve plano | não |
| `AGUARDANDO_PAGAMENTO` | plano escolhido, pagamento não confirmado | não |
| `ATIVO` | assinatura em vigor | sim |
| `ASSINATURA_EXPIRADA` | já teve plano e o período pago acabou | não (dados guardados) |
| `SUSPENSO` | retirado pela administração (moderação) | não, mesmo com plano pago |

Cada assinatura paga guarda o fim do período (`vigenteAte` = próxima cobrança + 1 dia de folga para o
aviso de renovação chegar), e o negócio guarda até quando fica publicado (`publicadoAte`). Ao vencer, o
negócio sai da vitrine sozinho, pela data; uma varredura de hora em hora só zera plano e selo guardados.
Nada é apagado: negócio, produtos, fotos e histórico ficam à espera de uma renovação.

Fluxo do cadastro: **conta → negócio → plano → pagamento → publicação**. Quem para antes do pagamento
encontra o negócio salvo como rascunho no "Meu negócio", com o caminho para publicar na aba Plano. O
dono vê o próprio rascunho em modo de prévia. Negócio criado pela administração sem conta responsável
fica como rascunho.

**Fluxo da assinatura.**

1. O empreendedor escolhe o plano (em `/planos`, no fim do cadastro ou na aba Plano). A API cria (uma
   vez só) o produto do plano no AbacatePay e um checkout de assinatura com uma referência única
   (`assinatura-<id>-<sufixo aleatório>`), e grava a assinatura como `PENDENTE`.
2. O navegador vai para a página de pagamento do AbacatePay. Em Dev mode vale o cartão
   `4242 4242 4242 4242` ou o botão "Simular Pagamento".
3. O pagamento chega à API por dois caminhos, que convergem na mesma função idempotente
   (`aplicarEvento`):
   - **webhook** `POST /api/webhooks/abacatepay`, conferido pelo segredo na URL e pela assinatura
     HMAC-SHA256 do corpo (`X-Webhook-Signature`); qualquer outro pedido recebe `401`. O id de cada
     aviso fica em `eventos_webhook`, e um aviso repetido é confirmado sem ser aplicado de novo;
   - **conciliação**: ao abrir "Meu negócio" com checkout pendente, a API consulta o gateway. É o que
     ativa o plano no localhost, onde o AbacatePay não alcança o webhook.
4. A assinatura vira `ATIVA`, com início, próxima cobrança e vencimento, e o negócio é publicado na
   hora. O aviso "Pagamento confirmado" aparece uma vez e some de vez ao ser fechado.

| Status | Quando | Publicado e com benefícios |
|---|---|---|
| `PENDENTE` | checkout criado, sem pagamento | não |
| `ATIVA` | pagamento aprovado ou renovação paga | sim, até o vencimento |
| `INADIMPLENTE` | renovação recusada | não, até pagar |
| `CANCELADA` pelo empreendedor | não haverá novas cobranças | sim, até o fim do período pago |
| `CANCELADA` por troca de plano | o novo plano foi pago | não (vale o novo) |

**Regras que o servidor garante:**

- Só a assinatura em vigor publica o negócio e dá benefício. Plano, selo e vencimento são copiados
  para o negócio (`planoAtual`, `emDestaque`, `publicadoAte`) a cada mudança, na mesma transação.
- Cancelar respeita o período pago; cobrança recusada e troca de plano encerram na hora.
- Suspender e reativar é só da administração: o dono não se reativa pela edição do negócio.
- O mesmo aviso repetido (o gateway reenvia) não muda nada; um aviso atrasado de ativação não
  ressuscita uma assinatura cancelada.
- Um checkout em andamento por negócio: abrir outro cancela o anterior não pago.
- **Troca de plano** é uma assinatura nova. O plano atual vale até o novo ser pago; então o antigo é
  cancelado aqui e no gateway. Não há duas cobranças ativas.
- Os ids do gateway e o link de pagamento de checkouts antigos nunca saem da API.
- Uma chave de produção é recusada, a menos que `ABACATEPAY_PERMITIR_PRODUCAO=true`.
- Gateway fora do ar ou chave ausente respondem `503` com o código `PAGAMENTO_INDISPONIVEL` e uma frase
  clara ("o pagamento está indisponível; seu negócio continua salvo"), em vez de um erro 500 genérico.
- Toda mudança de status entra na auditoria, com a origem (`WEBHOOK`, `CONCILIACAO`, `SIMULACAO`).

**Demonstração sem internet.** Fora de produção, o admin tem "Simular aprovação" e "Simular falha" na
aba Assinaturas. Elas aplicam o mesmo tratamento do webhook. Em produção, essas rotas respondem `404`.

**Trocar de gateway.** O resto do sistema só conversa com
[services/pagamento/index.js](backend/src/services/pagamento/index.js). Outro gateway (Asaas, Mercado
Pago) é um arquivo novo na mesma pasta, com as mesmas funções (`criarCheckoutAssinatura`,
`consultarPorCheckout`, `cancelarAssinatura`, `webhookAutentico`, `interpretarWebhook`), e
`PAGAMENTO_PROVEDOR` apontando para ele.

**Desempenho do negócio, sem cookies.** O site conta visitas ao perfil, visualizações de produto e
cliques em WhatsApp, telefone, endereço e Instagram. O banco guarda só "negócio, dia, tipo,
quantidade": nenhum cookie, nenhum IP gravado. Para a mesma pessoa recarregando a página não inflar os
números, a memória do servidor guarda por 30 minutos um hash anônimo (IP + navegador + um sal sorteado
na subida), que nunca vai para o banco. O dono e a administração não contam. As aparições na seção de
destaques são contadas pelo servidor.

Na aba **Desempenho** do "Meu negócio", o dono escolhe o período (7, 30 ou 90 dias) e vê os totais
comparados com o período anterior (subiu ou caiu, em %), o gráfico de barras por dia com a linha da
média e o melhor dia em amarelo (o gráfico troca entre visitas, contatos e produtos vistos e mostra os
números de cada dia ao passar o mouse ou tocar), os dias da semana com mais movimento e os produtos
mais vistos. O Essencial vê os totais; o Destaque vê tudo.

**Divulgação nas redes.** Não há integração com redes sociais. A equipe publica e registra no painel
(aba Divulgações). Só entram negócios com plano que inclui divulgação **e** com o consentimento
marcado pelo dono (gravado com data). A aba Empreendedores do admin mostra a coluna de consentimento,
e o dono acompanha a lista na aba Divulgação do "Meu negócio".

## Imagens: envio, enquadramento e zoom

**Envio.** Os campos `imagem` (produto), `fotoUrl` (capa do negócio) e `logoUrl` (foto do perfil)
aceitam um link `https` completo ou o endereço devolvido por `POST /uploads/imagem`. No formulário, a
foto vem do computador (também dá para arrastar), da galeria ou da câmera do celular ("Escolher na
galeria" e "Tirar foto"), ou de um link colado.

No servidor, o envio só aceita JPG, PNG, WebP, GIF e AVIF de até 5 MB. O arquivo é aberto com o
[sharp](https://sharp.pixelplumbing.com) (o que não é imagem é recusado com `415`), girado conforme a
câmera, reduzido para no máximo 1600 px, regravado em WebP e tem os metadados descartados, inclusive a
localização GPS das fotos de celular. SVG fica de fora porque pode carregar script.

| Ambiente | Onde a foto fica | O que vai para o banco |
|---|---|---|
| Desenvolvimento | `backend/uploads/` | `/uploads/<uuid>.webp` |
| Produção (`CLOUDINARY_URL` definida) | Cloudinary, na pasta `CLOUDINARY_PASTA` | `https://res.cloudinary.com/...` |
| Produção sem `CLOUDINARY_URL` | lugar nenhum: o envio responde `503` | nada |

A imagem trocada ou de um cadastro excluído é apagada (do disco ou do Cloudinary) quando nenhum outro
cadastro a usa. Uma foto quebrada vira a ilustração padrão, sem o corte da original.

**Fotos no cadastro.** O envio exige login, mas no cadastro a conta só passa a existir no fim da etapa
"Seu negócio". Por isso, ali a foto escolhida fica guardada no navegador, com prévia e ajuste, e é
enviada logo depois de a conta ser criada. Se o envio falhar, o cadastro segue e um aviso pede para
colocar as fotos depois no "Meu negócio".

**Enquadramento e zoom.** Depois de escolher a foto, o formulário mostra a prévia nos formatos em que
ela aparece no site (topo da página e cartão da vitrine para a capa; o quadrado redondo para a foto do
perfil; cartão e página do item para os produtos). A pessoa arrasta para escolher a parte que fica à
vista (setas do teclado também movem; Shift dá passos maiores). Nos produtos e serviços há ainda a
régua **Aproximar**, de 100% a 300%, e o botão **Restaurar**. O valor é gravado como `"x% y%"` ou
`"x% y% zoom"` (`fotoFoco`, `logoFoco`, `imagemFoco`), validado no servidor por
[utils/enquadramento.js](backend/src/utils/enquadramento.js) e aplicado com `object-position` e
`transform: scale` a partir do mesmo ponto
([services/enquadramento.js](frontend/src/services/enquadramento.js)).

## API

Base: `http://localhost:3001/api` (produção: `https://vitrinerondon.onrender.com/api`). Todas as
respostas seguem o formato `{ success, message?, total?, data? }`.

As rotas abaixo indicam quem pode chamá-las. "Dono" significa o empreendedor ao qual o registro
pertence; o administrador também passa em todas as rotas de dono.

### Sessão e documentos

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/health` | público | Verifica a API e o banco: `200` com `"banco": "ok"`, ou `503` se o banco não responder em 3 segundos. Informa também `login`, `pagamento` e `imagens` (`ok` ou `indisponivel`), sem dizer o motivo |
| POST | `/auth/registrar` | público | Cria conta sem negócio. Exige o aceite dos dois documentos. Não é usada pela interface, que cadastra conta e negócio juntos |
| POST | `/auth/registrar-empreendedor` | público | Cria conta e negócio em uma transação, com aceite |
| POST | `/auth/login` | público | Devolve token e dados da sessão |
| POST | `/auth/esqueci-senha` | público | Manda o link de nova senha por e-mail. Responde igual exista a conta ou não |
| POST | `/auth/redefinir-senha/verificar` | público | Diz se o link (`codigo`) ainda vale: `410` com `motivo` `invalido`, `usado` ou `expirado` |
| POST | `/auth/redefinir-senha` | público | Troca a senha pelo link. Marca o link como usado e derruba as sessões abertas antes |
| POST | `/auth/logout` | autenticado | Encerra a sessão (o token deixa de valer) e registra na auditoria |
| GET | `/auth/provedores` | público | Logins externos configurados: `{ "google": true }` |
| GET | `/auth/google/iniciar` | público | Começa o login com Google. Query `destino` (caminho do site) e `origem` (site, conferido com `CORS_ORIGINS`) |
| GET | `/auth/google/retorno` | Google | Valida o retorno e volta ao site com `#codigo`, `#vincular` ou `#erro` |
| POST | `/auth/google/sessao` | público | Troca o `codigo` (uso único, 60 s) pela sessão, no mesmo formato do login |
| POST | `/auth/google/vincular` | público | `{ "vinculo", "senha" }`: liga o Google a uma conta existente com o mesmo e-mail |
| GET | `/auth/me` | autenticado | Dados da conta atual, sem o hash da senha |
| GET | `/termos/:tipo` | público | `TERMOS_DE_USO` ou `POLITICA_PRIVACIDADE`, com a versão vigente |

### Vitrine

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/empreendedores` | público | Lista os publicados, Destaque primeiro. Filtros: `categoria`, `cidade`, `bairro`, `busca`. Com `pagina` e `porPagina` (até 60) a resposta vem paginada |
| GET | `/empreendedores/destaques` | público | Até `limite` (padrão 3) negócios com Destaque, em ordem sorteada. Filtro opcional `categoria` |
| GET | `/empreendedores/:id` | público | Detalhe com os produtos e os horários. Itens indisponíveis só para o dono e o admin |
| GET | `/empreendedores/meu` | autenticado | Negócio da conta atual, com a situação (`RASCUNHO`, `ATIVO`...); `404` se ainda não tiver um |
| POST | `/empreendedores/meu` | autenticado | Cadastra o próprio negócio e promove a conta a EMPREENDEDOR |
| POST | `/empreendedores` | admin | Cria um negócio sem dono |
| PUT | `/empreendedores/:id` | dono | Atualiza (campos parciais), inclusive fotos, enquadramento, horários e consentimento de divulgação |
| DELETE | `/empreendedores/:id` | admin | Exclui (e seus produtos, em cascata) |
| GET | `/produtos` | público | Lista. Filtros: `categoria`, `tipo`, `busca`, `empreendedorId`, `bairro`. Aceita `pagina` e `porPagina` |
| GET | `/produtos/:id` | público | Detalhe com o empreendedor |
| POST | `/produtos` | dono, com plano em vigor | Cria no próprio negócio |
| PUT | `/produtos/:id` | dono, com plano em vigor | Atualiza. O vínculo com o negócio não pode ser trocado |
| DELETE | `/produtos/:id` | dono | Exclui |
| POST | `/uploads/imagem` | autenticado | Envia uma imagem (corpo = o arquivo, `Content-Type: image/...`). Devolve `data.url`. `503` em produção sem Cloudinary |
| POST | `/contatos` | público | Envia mensagem à equipe |
| GET | `/contatos` | admin | Lista as mensagens recebidas |
| PATCH | `/contatos/:id/lido` | admin | Marca como lida. Corpo opcional `{ "lido": false }` desmarca |
| DELETE | `/contatos/:id` | admin | Exclui |
| GET | `/faq` | público | Perguntas ativas, por `ordem` e depois pela pergunta |
| POST | `/metricas` | público | Registra um evento de desempenho `{ empreendedorId, tipo, produtoId? }`. Sempre `204` |
| GET | `/empreendedores/:id/avaliacoes` | público | Resumo (`media`, `total`, `distribuicao`), comentários publicados, `minha` (a de quem está logado) e `permissao`. Aceita `ordem` (`recentes`, `maior`, `menor`), `pagina` e `porPagina` (até 20) |
| POST | `/empreendedores/:id/avaliacoes` | autenticado, menos o dono e o admin | Publica `{ "nota", "comentario" }`. `409` se a conta já avaliou |
| PUT | `/avaliacoes/:id` | autor | Edita a nota e o comentário |
| DELETE | `/avaliacoes/:id` | autor | Apaga a própria avaliação |
| GET | `/avaliacoes/minhas` | autenticado | As avaliações da conta, com o negócio e a situação (inclusive removidas, com o motivo) |
| POST | `/avaliacoes/:id/denuncias` | autenticado, menos o autor | Denuncia `{ "motivo"? }`. Repetir não soma |

### Planos, assinaturas e desempenho

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/planos` | público | Planos à venda, com benefícios e `modoTeste` |
| GET | `/assinaturas/minha` | dono | Assinatura atual, troca pendente e plano do negócio. Concilia checkouts pendentes com o gateway |
| POST | `/assinaturas` | dono | Assina `{ "plano": "ESSENCIAL" }`. Devolve `checkoutUrl`. `409` se o plano já está ativo; `503` se o pagamento estiver indisponível |
| PUT | `/assinaturas/minha` | dono | Troca de plano (novo checkout; o atual vale até o pagamento) |
| DELETE | `/assinaturas/minha` | dono | Cancela as próximas cobranças. O negócio segue publicado até o fim do período pago |
| GET | `/assinaturas` | admin | Assinaturas recentes e se a simulação está disponível |
| POST | `/assinaturas/:id/simular-aprovacao` | admin | Fora de produção: aplica o pagamento aprovado. Em produção, `404` |
| POST | `/assinaturas/:id/simular-falha` | admin | Fora de produção: aplica a cobrança recusada. Em produção, `404` |
| POST | `/webhooks/abacatepay` | gateway | Aviso do AbacatePay. Exige `?webhookSecret=` e `X-Webhook-Signature`; senão `401` |
| GET | `/metricas/meu-negocio` | dono | Desempenho do período (`dias`, de 7 a 90), com o período anterior para comparar. `disponivel: false` sem plano em vigor |
| GET | `/divulgacoes/minhas` | dono | Divulgações do próprio negócio |
| GET | `/divulgacoes` | admin | Todas as divulgações |
| POST | `/divulgacoes` | admin | Registra. Exige plano com divulgação e consentimento do negócio (`409` sem eles) |
| PUT | `/divulgacoes/:id` | admin | Atualiza só os campos enviados |
| DELETE | `/divulgacoes/:id` | admin | Exclui |

### Administração

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/usuarios` | admin | Lista contas. Filtros: `perfil`, `ativo`, `busca` |
| PATCH | `/usuarios/:id/situacao` | admin | Ativa ou desativa uma conta. Corpo `{ "ativo": false, "motivo": "..." }` |
| GET | `/auditoria` | admin | Trilha paginada. Filtros: `acao`, `tipoEntidade`, `status`, `usuarioId`, `de`, `ate`, `busca`, `pagina`, `porPagina` |
| GET | `/auditoria/opcoes` | admin | Valores existentes na trilha, para montar os filtros |
| GET | `/auditoria/:id` | admin | Detalhe com os valores antes e depois |
| GET | `/faq/todas` | admin | Todas as perguntas, inclusive as ocultas |
| POST | `/faq` | admin | Cria. Corpo `{ "pergunta", "resposta", "categoria"?, "ordem"?, "ativo"? }` |
| PUT | `/faq/:id` | admin | Atualiza só os campos enviados |
| DELETE | `/faq/:id` | admin | Exclui definitivamente |
| GET | `/avaliacoes` | admin | Fila de moderação: denunciadas primeiro. Filtros `status` e `denunciadas=1` |
| PUT | `/avaliacoes/:id/moderacao` | admin | `{ "acao": "remover", "motivo" }` ou `{ "acao": "restaurar" }` |

### Limites de requisições

| Rota | Limite por IP |
|---|---|
| API em geral | 600 a cada 15 minutos |
| Login e verificação de link de senha | 10 a cada 15 minutos |
| Cadastro | 10 por hora |
| Esqueci a senha | 5 a cada 15 minutos |
| Formulário de contato | 5 por hora |
| Envio de imagens | 60 a cada 15 minutos |
| Métricas | 120 a cada 15 minutos |
| Publicar e editar avaliações | 10 por hora |
| Denúncias de avaliações | 20 por hora |

Em desenvolvimento, a própria máquina fica fora da conta, para as suítes de teste não esbarrarem nos
limites.

### Formatos e exemplos

**Edição parcial de verdade.** Um `PUT` altera só os campos enviados. Os valores padrão (estado "MT",
tipo "produto") valem apenas no cadastro. No Zod 4, `.partial()` preserva os `.default()` do esquema
de origem; por isso os esquemas de edição são montados a partir de uma base sem padrões.

**Categorias.** A lista é fechada e validada no servidor: Artesanato, Alimentação, Serviços, Moda e
Beleza. Quem cadastra escolhe uma, para todo negócio aparecer em algum filtro da vitrine.

**Telefones.** A interface mostra e digita no formato `(66) 99123-4567`; a API recebe e guarda só os
dígitos, que viram o link `https://wa.me/55<numero>`.

**Horários.** Em `POST` e `PUT` de negócio, o campo `horarios` traz a semana inteira, e na edição ela
substitui a anterior. O servidor recusa fim antes do início, formato diferente de `00:00`, intervalos
sobrepostos no mesmo dia e mais de quatro intervalos por dia. As pausas (almoço e outros intervalos)
são o espaço entre os intervalos.

```json
{ "horarios": [
  { "diaSemana": 1, "abre": "08:00", "fecha": "12:00" },
  { "diaSemana": 1, "abre": "13:00", "fecha": "17:00" }
] }
```

**Enquadramento.** `fotoFoco`, `logoFoco` e `imagemFoco` aceitam `"x% y%"` com x e y de 0 a 100 e,
opcionalmente, o zoom de 1 a 3 com uma casa: `"50% 30% 1.4"`.

**Paginação opcional.** Sem `pagina` na URL, `/produtos` e `/empreendedores` devolvem a lista inteira.
Com `pagina`, a resposta ganha o bloco `paginacao`:

```json
{ "success": true, "total": 13, "data": [ ... ],
  "paginacao": { "pagina": 2, "porPagina": 9, "total": 13, "totalPaginas": 2 } }
```

Chamadas autenticadas enviam o token no cabeçalho:

```
Authorization: Bearer <token devolvido pelo login>
```

Sem token, uma rota protegida responde `401`. Com token válido mas perfil insuficiente, `403`.

Exemplo de criação de produto (com o token de um dono com plano em vigor):

```bash
curl -X POST http://localhost:3001/api/produtos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"nome":"Pão de mel","preco":8.5,"tipo":"produto","empreendedorId":2,"imagemFoco":"50% 40% 1.2"}'
```

Erros de validação retornam `400` com a lista de campos:

```json
{
  "success": false,
  "message": "Dados inválidos",
  "errors": [{ "campo": "preco", "mensagem": "Preço deve ser um valor positivo" }]
}
```

Registro inexistente retorna `404`; JSON malformado ou chave estrangeira inválida retornam `400`.

## Funcionalidades e requisitos atendidos

**CRUD completo pela interface** em dois lugares:
- `/admin`, para a administração: abas em forma de teclas (Produtos, Empreendedores, Assinaturas, Divulgações, Mensagens, Avaliações, Contas, FAQ e Auditoria), cada uma com cabeçalho próprio e espaçamento uniforme. Produtos e Empreendedores têm tabela, Novo (modal com formulário vazio, `POST`), Editar (modal preenchido, `PUT`) e Excluir (confirmação, `DELETE`); Mensagens tem marcar como lida ou não lida (`PATCH`) e excluir.
- `/meu-negocio`, para o empreendedor: abas Catálogo, Plano, Desempenho e Divulgação, sobre o próprio negócio, sem enxergar o de ninguém. A edição dos dados do negócio abre num modal grande.
- Após cada operação a lista é recarregada e um aviso no canto da tela informa o resultado.

**Cadastro em três etapas:**
1. **Sua conta:** nome, e-mail, telefone, senha (com o botão de ver o que foi digitado) e o aceite dos dois documentos.
2. **Seu negócio:** dados, fotos (com enquadramento), localização e horário. Conta, aceite e negócio vão ao servidor numa única requisição, então não existe conta sem negócio nem aceite órfão.
3. **Plano e pagamento:** escolha do plano (mensal ou anual) e ida ao checkout. O negócio só é publicado com o pagamento confirmado.

Se uma etapa tiver erro, a tela rola até o primeiro campo errado, coloca o foco nele e mostra, junto do
botão, quantos campos faltam, com o atalho "Mostrar" ([useFocoNoErro](frontend/src/hooks/useFocoNoErro.js)
e [ResumoDeErros](frontend/src/components/forms/ResumoDeErros/ResumoDeErros.jsx)). Se a resposta do
servidor se perder (rede ou servidor acordando) e a pessoa tentar de novo, o cadastro reconhece que a
conta já foi criada e segue para o plano, em vez de travar em "e-mail já cadastrado".

**Telefone com máscara:** todos os campos de telefone e WhatsApp formatam enquanto a pessoa digita
ou cola: `(66) 99123-4567` no celular e `(66) 3421-1234` no fixo, inclusive colando com `+55` e
espaços, sem o cursor pular ([EntradaTelefone](frontend/src/components/forms/EntradaTelefone/EntradaTelefone.jsx)).

**Marketplace multiusuário:**
- Quem só quer navegar pela vitrine não cria conta: busca, filtros, mapa e contato pelo WhatsApp são abertos. A página de cadastro diz isso e oferece o atalho para a vitrine.
- Uma conta sem negócio ainda pode existir pela API e, ao cadastrar o primeiro negócio, é promovida a empreendedor numa transação que registra a mudança de perfil na auditoria.
- O cabeçalho muda conforme o perfil: entrar e cadastrar-se para visitantes, "Meu negócio" para empreendedores e "Admin" para a administração, sempre com o menu da conta e a saída.

**Horário de atendimento:** o editor fala a língua do comércio. Cada dia tem "Abre às" e "Fecha às" e,
se quiser, o almoço e outros intervalos. Atalhos aplicam o mesmo horário de segunda a sexta, e a
prévia no rodapé mostra o que a página pública exibiria agora. A página do negócio mostra a semana,
com o dia de hoje destacado, e o selo "Aberto agora" (bolinha verde) só dentro de um intervalo; fora
dele, ou sem horário informado, mostra "Fechado agora" e quando abre de novo. O selo é recalculado a
cada 30 segundos, sem recarregar a página.

O cálculo usa sempre o horário de Rondonópolis (America/Cuiaba), e não o do aparelho de quem visita.
Um intervalo inclui o minuto de início e exclui o de fim: 08:00 às 12:00 atende às 11:59 e não às
12:00. Intervalos que atravessam a meia-noite não são aceitos; quem atende até 01:00 cadastra 22:00
às 23:59 num dia e 00:00 às 01:00 no seguinte. A lógica fica em
[frontend/src/services/horarios.js](frontend/src/services/horarios.js).

**Página do negócio:** capa com o enquadramento escolhido, foto do perfil (ou as iniciais do
negócio), selos de plano e "Novo", "Aberto agora", telefone, Instagram, endereço e mapa, catálogo em
linha (foto, preço, descrição, "Ver detalhes" e o pedido pelo WhatsApp com a mensagem pronta) e a
caixa de contato, que acompanha a rolagem no computador. O cartão inteiro do item é clicável e leva à
página dele; o botão do WhatsApp continua funcionando à parte.

**Localização do empreendedor:** o cadastro do negócio aceita rua, número, complemento, bairro,
cidade, estado e CEP. O botão "Localizar no mapa" consulta o Nominatim (OpenStreetMap, sem chave) e
preenche latitude e longitude, que podem ser corrigidas à mão. A página pública desenha o mapa com
Leaflet. Quando o empreendedor desmarca "Mostrar o endereço completo", o alfinete dá lugar a um
círculo de aproximação sobre o bairro, sem apontar a casa. Nenhuma coordenada é inventada.

**Formulário do negócio:** no modal do painel ele se divide em três colunas lado a lado (dados,
localização e horário). Em telas médias vira duas colunas e, no celular, uma, pela consulta de
contêiner (a largura do próprio formulário, e não a da tela).

**Contato:** a central de ajuda vem primeiro; abaixo, o formulário em duas colunas, com validação ao
sair de cada campo, contador de caracteres e confirmação no lugar do formulário depois do envio. A
mensagem vai sempre para a equipe do VitrineRondon (o cartão "Para quem vai" diz isso); para falar
com um negócio, o caminho é o WhatsApp dele.

**Navegação fluida:** a aplicação é de página única, e cada leitura da API fica guardada em memória.
Voltar a uma página já vista mostra o conteúdo na hora e atualiza por trás. Trocar um filtro mantém a
lista anterior na tela, esmaecida, até a nova chegar. Com o site aberto, as outras telas são baixadas
em segundo plano quando o navegador fica ocioso, então a troca de página não passa por "Carregando a
tela...", e cada tela nova entra com um esmaecimento de 0,22 s.

**Rolagem:** página nova abre no topo, e o botão voltar do navegador devolve a posição exata de antes
(`ScrollRestoration` do React Router). Filtrar não mexe na rolagem. Imagens fora da tela carregam só
quando chegam perto dela.

**Teclas Voltar e Avançar e barra de navegação:** no computador, as telas internas têm as teclas
"Voltar" e "Avançar". O "Voltar" usa o histórico quando existe e, quando a pessoa chega direto pelo
endereço, vira um link para a página de origem. O "Avançar" vai para a tela seguinte do histórico ou,
sem ela, para a próxima página do site (Início → Vitrine → Empreendedores → Planos → Contato → Sobre).
Nas páginas do negócio e do item, as teclas ficam numa barra anil com fundo animado e uma linha
amarela embaixo, ao lado da trilha "Início › Empreendedores › negócio › item". **No celular as teclas
e essa barra somem**: o voltar do próprio aparelho já faz esse papel, e a página começa direto no
conteúdo. Login e cadastro não têm as teclas.

**Pilha de negócios da Home:** o topo da página mostra uma pilha de cartões que se revezam sozinhos,
adaptada do CardSwap do React Bits (licença MIT) em
[components/ui/CardSwap](frontend/src/components/ui/CardSwap/CardSwap.jsx). Os negócios do Destaque
vêm na frente, com o selo, e os demais publicados em seguida; cada cartão abre a página do negócio. A
pilha pausa com o mouse em cima, quando sai da tela e quando a aba fica escondida. Os dados, a Home e
o código da pilha (com o gsap) começam a baixar juntos assim que o site abre, e um esqueleto dos
cartões ocupa o lugar enquanto isso; se a vitrine vier vazia ou a leitura falhar, o esqueleto para de
pulsar. Só a foto do cartão da frente carrega na hora; as de trás esperam a vez. Para quem pede menos
movimento ao sistema, a pilha fica parada, com o primeiro cartão na frente. Teclado e leitor de tela
usam a lista de nomes ao lado da pilha.

**Fundo conforme o plano:** a página do negócio e as páginas dos itens dele mudam de fundo pelo
plano. Essencial: azul anil com brilho azul-claro no alto. Destaque: azul-noite com brilho laranja
forte e focos âmbar, e os cartões ganham sombra dourada.

**Caixas de marcar e reflexo nos planos:** as caixas de marcar usam o componente
[CaixaDeMarcar](frontend/src/components/ui/CaixaDeMarcar/CaixaDeMarcar.jsx): ao marcar, a caixa fica
amarela e o visto é desenhado (SVG com `stroke-dashoffset`), e ela afunda ao ser pressionada. Por baixo
continua o `<input type="checkbox">` de verdade. Os cartões de planos têm um reflexo de luz que
atravessa o cartão ao passar o mouse.

**Revelar ao rolar e barra de rolagem:** blocos e cartões surgem subindo e ganhando cor quando entram
na tela, com animações guiadas pela própria rolagem, só em CSS (`animation-timeline: view()`). Para
quem pede menos movimento, só esmaecem; navegador sem suporte mostra tudo parado. A barra de rolagem
segue o tema.

**Movimento:** o botão "Cadastre-se" alterna com "Vire empreendedor", deslizando. Quem pede menos
movimento vê a troca por esmaecimento. O fundo de pontos animado ([DotField](frontend/src/components/ui/DotField))
aparece no topo das páginas públicas e atrás do login e do cadastro.

**Celular:** todas as telas foram conferidas de 320 px a 390 px, sem rolagem lateral, com alvos de
toque de pelo menos 32 px e campos que não dão zoom sozinhos ao tocar.

**Aceite de termos e auditoria:** descritos em [Termos de uso e privacidade](#termos-de-uso-e-privacidade)
e [Auditoria](#auditoria).

**Frontend componentizado:** mais de 50 componentes reutilizáveis separados das 14 páginas, cada um em
pasta própria. `ProdutoForm` e `EmpreendedorForm` servem para criar e editar. `ProdutoCard` e
`EmpreendedorCard` aparecem na Home, na Vitrine, na lista de empreendedores e no detalhe. Todas as
páginas têm estados de carregando, erro e vazio.

**Banco relacional** com quinze tabelas, chaves estrangeiras e regras de exclusão definidas no
Prisma, incluindo a diferença deliberada entre cascata (aceites seguem a conta) e preservação (logs
sobrevivem à conta).

**Paginação:** a vitrine mostra 9 itens por página e a lista de empreendedores, 6. A página fica na
URL (`?pagina=2`), então dá para compartilhar o link e o botão voltar do navegador volta à página
anterior da lista. Trocar um filtro leva de volta à primeira página.

## Identidade visual

O site usa um traço de história em quadrinhos com cel-shade, todo em CSS (sem imagens nem
bibliotecas de componentes):

- **Cores:** anil (`#17346e`, `#0f2557`) nos fundos e títulos, amarelo ouro (`#fbbf24`) nos destaques
  e botões de ação, nanquim (`#111827`) nos contornos e textos.
- **Tipografia:** Bricolage Grotesque nos títulos, preços e métricas; Inter na interface e nos textos,
  carregadas do Google Fonts com fallback para fontes do sistema.
- **Cel-shade:** contornos grossos, sombra dura deslocada sem desfoque, faixa de luz em cima e de
  sombra embaixo nos botões, um arco de brilho no canto e dois riscos "//" no outro. Os títulos e os
  nomes nos cartões usam o mesmo letreiro em duas tonalidades.
- **Tokens:** cores, sombras, máscaras de brilho e espaçamentos ficam como variáveis em
  [frontend/src/index.css](frontend/src/index.css) (`--cor-anil`, `--cor-ouro`, `--sombra-dura`,
  `--cel`, `--mascara-arco`, `--mascara-riscos`...).

## Fontes do conteúdo

A justificativa do problema fica na página **Sobre**, no bloco "O que trava o comércio de bairro em
Rondonópolis": cada afirmação traz o link para a publicação que a sustenta, e a lista completa das
referências aparece no fim da mesma página. As referências ficam centralizadas em
[frontend/src/services/fontes.js](frontend/src/services/fontes.js).

| Dado usado no site | Fonte |
|---|---|
| Comércio e serviços movimentam cerca de R$ 93 milhões por dia útil | [Folha do Estado, 10/09/2026](https://folhaestado.com.br/um-dia-util-a-menos-pode-gerar-impacto-de-ate-r-335-milhoes-na-economia-de-rondonopolis/) |
| 20 empresas fechadas entre janeiro e agosto de 2026; juros, custos e crédito entre as causas | [Portal MT, 20/08/2026](https://portalmt.com.br/fechamento-de-empresas-acende-alerta-para-o-varejo-de-rondonopolis/) |
| Pesquisa Jornada do Consumidor Rondonopolitano (CDL, 152 entrevistados): estacionamento, acesso ao centro e canais digitais de busca | [Portal MT, 09/07/2026](https://portalmt.com.br/pesquisa-da-cdl-aponta-tendencias-e-oportunidades-para-fortalecer-o-comercio-de-rondonopolis/) |
| Ambulantes irregulares, calçadas e concorrência desleal; ofício à Prefeitura e ao MPMT | [CDL Rondonópolis, 13/10/2025](https://www.cdlroo.org.br/comunicacao/cdl-reforca-importancia-de-regulamentacao-do-comercio-de-ambulantes-em-rondonopolis/58) |
| Arrombamentos e roubos; comerciante com 35 anos e quatro de cinco lojas atingidas | [Agora MT, 04/2025](https://www.agoramt.com.br/2025/04/cdl-reune-empresarios-e-forcas-policiais-para-buscar-mais-seguranca-no-comercio-em-rondonopolis/) |

**Imagem:** a bandeira municipal em `frontend/src/assets/bandeira-rondonopolis.jpg` vem do
[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bandeira_de_Rondonopolis.png), obra da
Prefeitura de Rondonópolis em domínio público. O crédito aparece ao lado da imagem no site.

## Testes

### Unidade (sem banco, sem rede, sem servidor)

Cada função do sistema tem o seu arquivo `.test.js` em [`tests/`](tests/), separado por lado:
`tests/backend/` e `tests/frontend/`. São **787 verificações em 43 arquivos**, rodando com Vitest.

```bash
npm test            # roda tudo uma vez
npm run test:watch  # reexecuta a cada arquivo salvo
```

O [`tests/README.md`](tests/README.md) tem a tabela do que cada arquivo cobre. Em resumo: validação
de cada cadastro (inclusive enquadramento e zoom), regras de sessão e perfil, limites de requisições,
máscara de telefone, cálculo de "aberto agora" e do editor de horários, limpeza da auditoria, a
máquina de estados das assinaturas (com um banco falso em memória), a autenticidade do webhook, a
contagem de métricas sem identificar ninguém, o envio de imagens (pasta local, Cloudinary e a recusa
em produção sem Cloudinary), o health check, o tratamento de erros e o filtro que impede vazamento de
dado técnico nas mensagens. Alguns testes comparam as duas pontas de propósito: categorias, perfis,
horários e limites do FAQ precisam combinar entre frontend e backend.

Os handlers HTTP dependem do banco e ficam com a coleção do Postman; os componentes React são
conferidos no navegador pelas suítes abaixo.

### Ponta a ponta (navegador)

Os testes ficam em `tests-e2e/`. São scripts que dirigem o Microsoft Edge em modo headless pelo
Chrome DevTools Protocol, sem dependência nenhuma além do Node: abrem o sistema como uma pessoa
faria, clicam nos elementos reais e conferem o resultado na tela e no banco.

Antes, suba o backend e o frontend (`tests-e2e/subir-servidores.ps1` no Windows). Depois, dentro de
`tests-e2e/`:

```bash
node teste-ajustes-ui.mjs        # mapa Leaflet, ver a senha, barra de navegação e largura no celular
node teste-erros-ui.mjs          # a tela de erro não mostra pilha de chamadas nem caminho de arquivo
node teste-desempenho.mjs        # o que a primeira tela baixa e a compressão da API
node teste-faq-ui.mjs            # central de ajuda, paginação, contato estável e permissões na tela
node teste-celular-ui.mjs        # telas a 390px, termos em modal no cadastro e o painel sem repetições
node teste-cadastro-celular.mjs  # cadastro completo no celular: máscara, foco no erro, etapas
node teste-avaliacoes-ui.mjs     # avaliar pelo teclado, editar, duplicada, dono, denúncia, moderação e celular
node teste-contas-ui.mjs         # cliente que anuncia depois, cadastro com sessão aberta e login de empreendedor
node teste-google-ui.mjs         # avaliar sem cadastro (provedor simulado): rascunho publicado na volta, cancelar sem perder, Minhas avaliações, sessão de 30 dias, vínculo
node teste-planos-ui.mjs --resetar-banco  # APAGA o banco: publicação, cadastro em 3 etapas, troca e cancelamento
```

Da raiz, `npm run test:e2e` roda as oito primeiras, em sequência. O `teste-google-ui.mjs` (`npm run test:e2e:google`) precisa da API apontando para o provedor simulado; o comando para subir está no topo de `tests-e2e/provedor-google-simulado.mjs`. Se o frontend estiver em outra
porta, informe: `APP_URL=http://localhost:5174 npm run test:e2e`.

O `teste-planos-ui.mjs` **apaga o banco local**: roda o seed no começo e no fim, para partir sempre
do cenário do [DEMO.md](DEMO.md) e deixá-lo pronto para a demonstração. Por isso ele só roda com
pedido explícito, `npm run test:e2e:planos`, e fica fora do `npm run test:e2e`. Ele abre o checkout de
testes do AbacatePay, então precisa da `ABACATEPAY_API_KEY` de Dev mode e de internet.

O `teste-desempenho.mjs` lê a pasta `frontend/dist`, então precisa de um build recente. As capturas
de tela vão para `docs/` (depois de rodar, `git restore docs/` descarta as que mudaram).
`cdp.mjs` guarda o driver e os utilitários compartilhados (`abrirNavegador`, `entrarNoSistema`,
`cabecalhoAdmin` e o placar `criarPlacar`) e usa as contas do seed, então depende das senhas do
`.env`. Cada execução cria um perfil descartável do navegador e o apaga ao terminar.

### API (Thunder Client e Postman)

As coleções prontas, com as requisições na ordem certa e o token preenchido automaticamente depois do
login, estão em `docs/thunder-client/` e `docs/postman/`. O passo a passo de cada requisição, com
corpo e resposta esperada, está em [`docs/roteiro-testes-api.md`](docs/roteiro-testes-api.md). Pela
linha de comando:

```bash
newman run docs/postman/vitrinelocal.postman_collection.json -e docs/postman/vitrinelocal.postman_environment.json
```

## Integração contínua

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda a cada push na `main` e na
`dev` e em todo pull request:

1. instala as dependências com `npm ci`;
2. gera o cliente do Prisma (sem banco);
3. roda os testes de unidade (Vitest);
4. roda o lint (oxlint) no frontend e no backend;
5. faz o build do site;
6. falha se houver vulnerabilidade alta nas dependências de produção (`npm audit --omit=dev`).

O próprio pipeline é protegido: as actions são fixadas pelo SHA do commit, o token do GitHub só lê o
código e nenhum segredo é usado (os testes simulam banco e gateways).

## Segurança

A pasta [`security-audit/`](security-audit/) tem o relatório completo da auditoria de segurança
(sumário executivo, metodologia, superfície de ataque, achados, controles positivos, plano de
correção e limitações), em Markdown, HTML, PDF e SARIF. As correções foram feitas numa branch à
parte, com testes, e já estão na `main`.

Controles em vigor, cada um com teste ou evidência no relatório:

| Controle | Como |
|---|---|
| Autorização no servidor | Perfil conferido no banco a cada requisição; dono só mexe no que é dele |
| Mass assignment | Esquemas Zod por rota; campos como `empreendedorId`, `perfil` e plano não entram pela edição |
| Senhas | bcrypt, senhas comuns recusadas, mesma resposta para e-mail inexistente e senha errada |
| Sessão | JWT curto (8 h), revogado no Sair (`sessoes_encerradas`) e na troca de senha |
| Força bruta | Limites por IP em login, cadastro, recuperação, contato, upload e métricas |
| Cabeçalhos | helmet (CSP, `X-Content-Type-Options`, `Referrer-Policy` e afins) |
| CORS | Fechado por padrão em produção: só os endereços de `CORS_ORIGINS` |
| Banco | Conta da API só com leitura e escrita de linhas; TLS estrito com o TiDB |
| Upload | Reprocessado pelo sharp, sem SVG, sem metadados, nomes gerados pelo servidor |
| Webhook | Segredo na URL + HMAC-SHA256 do corpo; avisos repetidos não são aplicados duas vezes |
| Erros | Nenhuma pilha, caminho ou endereço de banco chega ao usuário |
| Segredos | `.env*` fora do git; nenhuma chave no frontend; chave de pagamento de produção recusada |
| Dependências | `npm audit` no CI, falhando em vulnerabilidade alta de produção |

## Tratamento de erros

A regra vale nas duas pontas: **o usuário recebe uma frase escrita por nós; o detalhe técnico fica no
log do servidor ou no console de quem desenvolve.** Pilha de chamadas, caminho de arquivo, endereço
de banco e nome de biblioteca contam como o sistema é feito por dentro.

**No backend.** [`utils/erros.js`](backend/src/utils/erros.js) cria os erros com `erroHttp(status,
mensagem)`, que marca a mensagem como própria para exibição. O
[`errorHandler`](backend/src/middlewares/errorHandler.js) só repassa o texto de erros marcados assim;
qualquer outro vira uma mensagem padrão do status, e o original vai para o log junto da rota que
falhou. Falhas do gateway de pagamento viram `503` com o código `PAGAMENTO_INDISPONIVEL`. A rota 404
não repete o endereço pedido, e a recusa do CORS não devolve a origem bloqueada.

**Configuração faltando.** Na subida, o servidor avisa no topo do log se falta `JWT_SECRET` (login e
cadastro fora do ar), `ABACATEPAY_API_KEY` (pagamento fora do ar), `CLOUDINARY_URL` em produção
(envio de fotos fora do ar) ou `APP_URL`. O `/api/health` mostra a mesma coisa como `ok` ou
`indisponivel`, sem dizer o nome da variável.

**No frontend.** Uma tela que quebra cai em
[`PaginaErro`](frontend/src/components/ui/PaginaErro/PaginaErro.jsx), no lugar da tela de erro do
React Router, que imprime a pilha de chamadas. São dois níveis: o de fora pega falhas da Navbar e do
Footer; o de dentro pega falhas de uma tela e continua desenhado com o menu por cima.

Em [`api.js`](frontend/src/services/api.js), `mensagemSegura` decide o que pode aparecer: recusa
texto de mais de uma linha, com HTML, com caminho de arquivo, com endereço IP ou com código de
sistema (`ECONNREFUSED`), e nunca aproveita a mensagem de uma resposta 5xx, que pode ter vindo de um
proxy no meio do caminho. Resposta que não é JSON também não vira mensagem. Pedidos sem resposta em
90 segundos (o servidor gratuito acordando) mostram uma mensagem própria em vez de travar.

## Desempenho

**O que a primeira visita baixa.** Cada tela é um arquivo à parte (`lazy` + `Suspense` em
[`App.jsx`](frontend/src/App.jsx)), inclusive a Home: quem chega por outra página não a baixa. O mapa
é separado de novo dentro da página, em
[`MapaPreguicoso.jsx`](frontend/src/components/ui/Mapa/MapaPreguicoso.jsx), com uma caixa de espera
da mesma altura para o conteúdo em volta não pular. Quem só olha a vitrine não baixa o painel do
administrador, o leitor de markdown dos termos nem o Leaflet.

**Telas em segundo plano.** Depois que o site abre, as outras telas são baixadas uma a uma quando o
navegador fica ocioso (`requestIdleCallback`), e o clique seguinte já as encontra prontas.

**Página inicial adiantada.** Entrando pela Home, o [`main.jsx`](frontend/src/main.jsx) dispara as
consultas da página, o código dela e o da pilha animada antes de o React desenhar
([`pages/Home/consultas.js`](frontend/src/pages/Home/consultas.js)). Antes isso acontecia em fila;
no teste local, a pilha passou a aparecer em cerca de 0,8 s, contra 1,3 s.

**Leituras.** Cada GET fica em cache, e a tela mostra o que já tinha enquanto atualiza por trás. Um
GET igual pedido de novo enquanto o primeiro ainda está a caminho espera a mesma resposta, em vez de
bater no servidor duas vezes.

**Respostas da API.** `compression()` no Express: o catálogo em JSON sai de 6,0 kB para 1,5 kB.

**Consultas.** Além das chaves estrangeiras, o banco tem índices para os filtros da vitrine:
`empreendedores(ativo, categoria)`, `(ativo, bairro)`, `(ativo, em_destaque)` e
`(ativo, publicado_ate)`, e `produtos(disponivel, tipo)`. O filtro por cidade não ganhou índice de
propósito, porque a consulta usa `LIKE` com `%` na frente.

**Imagens.** WebP de no máximo 1600 px, `loading="lazy"` e `decoding="async"` nos cartões, e cache de
um ano para os arquivos enviados.

## Publicação no Render

O projeto sobe no Render pelo Blueprint [`render.yaml`](render.yaml), que cria a API (web service) e o
site (static site), os dois no plano gratuito. O MySQL fica no TiDB Cloud Starter e as fotos enviadas
no Cloudinary, também gratuitos. O Render publica a branch `main` sozinho a cada push, e o build da
API roda `prisma migrate deploy`, então migrations novas são aplicadas no próprio deploy.

O passo a passo completo, com a preparação do banco pela sua máquina (`npm run tidb:banco`,
`tidb:migrar`, `tidb:criar-usuario` e `tidb:seed` ou `tidb:criar-admin`) e o cadastro do webhook do
AbacatePay (`npm run abacatepay:webhook`), está em [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md).

**Conferência rápida depois de publicar.** Abra `https://vitrinerondon.onrender.com/api/health`. Tudo
certo é:

```json
{ "success": true, "banco": "ok", "login": "ok", "pagamento": "ok", "imagens": "ok" }
```

| Campo `indisponivel` | Variável a conferir no serviço da API |
|---|---|
| `banco` | `DATABASE_URL` (e se o TiDB está no ar) |
| `login` | `JWT_SECRET` |
| `pagamento` | `ABACATEPAY_API_KEY` |
| `imagens` | `CLOUDINARY_URL` |

No plano gratuito, a API "dorme" depois de um tempo parada, e a primeira visita espera ela acordar
(cerca de um minuto). O site mostra os esqueletos e avisa quando o servidor está demorando.

## Branches e fluxo de trabalho

| Branch | Papel |
|---|---|
| `dev` | Desenvolvimento. Todo trabalho novo entra aqui, em commits pequenos, um por assunto |
| `main` | Produção: é dela que o Render publica. Recebe a `dev` por fast-forward (`git merge --ff-only dev`) |
| `qa`, `prod` | Previstas para um fluxo `dev → qa → prod`; estão paradas desde 07/10/2026, atrás da `main` |
| `seguranca/correcoes-auditoria` | Correções da auditoria de segurança, já incorporadas à `main` |

O caminho em uso é: commit na `dev`, testes passando, `git checkout main && git merge --ff-only dev
&& git push origin main dev`. Para voltar a usar `qa` e `prod`, basta atualizá-las a partir da `main`
e apontar o Render para a `prod` no painel dele (troca que não foi feita).

## Solução de problemas

**Todas as telas dizem "Não foi possível falar com o servidor", com o backend no ar.** O navegador
não conseguiu chamar a API. Se o log do backend mostrar `CORS recusou a origem ...`, a página foi
aberta de um endereço que a API não aceita. Em desenvolvimento, sem `CORS_ORIGINS`, ela aceita a
própria máquina em qualquer porta; com `CORS_ORIGINS` preenchida, vale só a lista. Confira também se
não há dois servidores do frontend rodando.

**A API responde 503 "O serviço está indisponível no momento".** O banco está fora do ar ou a
conexão caiu. `GET /api/health` confirma. Confira se o serviço `MySQL80` está rodando. Quando o banco
volta, o Prisma reconecta sozinho, sem reiniciar o backend.

**Abri http://localhost:3001 e apareceu uma mensagem em JSON.** Essa porta é a da API, não a do
site. O site fica em **http://localhost:5173**.

**Tudo responde "Muitas requisições".** É o limite de 600 requisições a cada 15 minutos por IP. Em
desenvolvimento, a própria máquina fica fora da conta. Se aparecer num celular de verdade na rede
local, reinicie o backend, que zera a contagem.

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| As fotos dos negócios e dos itens não aparecem no site publicado | A API foi publicada sem `CLOUDINARY_URL`: as fotos foram para o disco do Render, que é apagado a cada deploy | Defina `CLOUDINARY_URL` no serviço da API, confira `"imagens": "ok"` no `/api/health` e envie as fotos de novo |
| "O envio de fotos está temporariamente indisponível" | Produção sem `CLOUDINARY_URL` (ou com valor fora do formato `cloudinary://chave:segredo@conta`) | Mesma correção acima |
| Ninguém consegue entrar nem se cadastrar no site publicado | Falta `JWT_SECRET` no serviço da API | Defina a variável no Render; o `/api/health` deve mostrar `"login": "ok"` |
| "O pagamento está indisponível no momento" | Falta `ABACATEPAY_API_KEY`, a chave não é a de Dev mode (`abc_dev_`) ou o AbacatePay está fora do ar | O motivo exato fica no log do backend. O negócio continua salvo |
| Paguei e o painel ainda mostra o plano antigo | O aviso do pagamento ainda não chegou | Abra "Meu negócio" de novo: a conciliação consulta o gateway. Na demonstração, use "Simular aprovação" no Admin |
| Não consigo cadastrar produtos | O negócio não tem plano em vigor | Assine um plano na aba Plano do "Meu negócio" |
| `P1000: Authentication failed` ao migrar | Senha errada em `DATABASE_URL_MIGRACAO` | Ajuste `backend/.env`. No XAMPP a senha do root costuma ser vazia |
| `P1000: Authentication failed` ao subir o backend | A conta da aplicação não existe ou a senha mudou | `npm run banco:criar-usuario`, que cria a conta ou realinha a senha com o `.env` |
| `CREATE command denied to user 'vitrine_app'` | Migration rodada com a conta da aplicação | Use `npm run prisma:migrate` ou `prisma:deploy`, que trocam para a conta de administrador |
| `P1001: Can't reach database server` | MySQL parado | Inicie o serviço MySQL ou o XAMPP |
| `EPERM` ao rodar `prisma generate` no Windows | A API está rodando e segura o arquivo do cliente do Prisma | Pare o backend, rode o comando e suba de novo |
| `npm ci` falha com `EPERM` numa pasta do OneDrive | A sincronização segura arquivos de `node_modules` | Use `npm install --legacy-peer-deps` ou pause a sincronização |
| Porta 3001 ou 5173 em uso | Outro processo na porta | Altere `PORT` no backend ou rode `npm run dev -- --port 5174` no frontend |
| Botão "Localizar no mapa" não encontra o endereço | Nominatim não reconheceu a rua ou está sem rede | Confira a grafia, tente sem o número, ou informe latitude e longitude manualmente |
| API responde `403` com token válido | Perfil sem permissão para aquela rota, ou tentativa de mexer em registro de outro dono | Confira o perfil em `/auth/me`; é o comportamento esperado |
| Seed aborta reclamando de senha | `ADMIN_SENHA` ou `DEMO_EMPREENDEDOR_SENHA` ausentes | Defina as duas no `.env`; o seed não usa senha padrão de propósito |
| Conta não entra e a mensagem fala em conta desativada | A administração desativou o acesso | Reative na aba Contas do painel |
| Um estilo novo não aparece no navegador | O Vite leu o `.css` no instante em que ele estava sendo salvo. Acontece mais em pastas sincronizadas, como o OneDrive | Salve o arquivo de novo ou reinicie `npm run dev:frontend` |
| Negócio aparece como "Fechado agora" | Está fora do horário informado, ou o dono ainda não informou o horário | Confira o horário em "Meu negócio", em Editar dados |
| A rolagem vai aos saltos e nada no site desliza | Os "Efeitos de animação" do Windows estão desligados, e o navegador pede menos movimento aos sites | Ligue em Configurações > Acessibilidade > Efeitos visuais > Efeitos de animação |
| `npm audit` aponta `deepmerge-ts` (alta) | Dependência transitiva do CLI do Prisma, usada só em desenvolvimento | Não afeta a API em execução. Não rode `npm audit fix --force`, pois ele rebaixa o Prisma |
