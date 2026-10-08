# VitrineRondon

> O projeto começou como **VitrineLocal**. A marca visível mudou para VitrineRondon; pastas, pacotes,
> chaves internas e os e-mails das contas de exemplo mantêm o nome antigo de propósito.

Vitrine digital para micro e pequenos empreendedores de Rondonópolis-MT. Artesãos, doceiras, eletricistas, brechós e salões criam a própria conta, cadastram o negócio, a localização e seus produtos ou serviços; a comunidade navega por categoria, bairro e busca, vê o negócio no mapa e entra em contato direto pelo WhatsApp.

O sistema é multiusuário: cada empreendedor administra apenas o próprio negócio, o visitante navega sem conta e a administração modera a vitrine. O aceite dos Termos de Uso e da Política de Privacidade é obrigatório no cadastro, e toda ação relevante fica registrada em uma trilha de auditoria consultável só pela administração.

**Problema que resolve:** microempreendedores informais não têm canal digital para divulgar o que vendem.
**ODS relacionado:** ODS 8 (Trabalho Decente e Crescimento Econômico), com relação aos ODS 1 e 10.

## Sumário

- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Como executar](#como-executar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Modelo de dados](#modelo-de-dados)
- [Perfis e permissões](#perfis-e-permissões)
- [Termos de uso e privacidade](#termos-de-uso-e-privacidade)
- [Auditoria](#auditoria)
- [Central de ajuda (FAQ)](#central-de-ajuda-faq)
- [Planos e assinaturas](#planos-e-assinaturas)
- [API](#api)
- [Funcionalidades e requisitos atendidos](#funcionalidades-e-requisitos-atendidos)
- [Testes](#testes)
- [Tratamento de erros](#tratamento-de-erros)
- [Desempenho](#desempenho)
- [Publicação no Render](#publicação-no-render)
- [Branches](#branches)
- [Solução de problemas](#solução-de-problemas)

## Stack

| Camada | Tecnologia |
|---|---|
| Banco de dados | MySQL 8 (`vitrine_db`) |
| Backend | Node.js, Express 5, Prisma ORM 6, Zod 4, cors, compression, dotenv, nodemon |
| Frontend | React 19, Vite, React Router 7, Fetch nativo, Leaflet + react-leaflet (mapas), gsap (pilha animada da Home) |
| Pagamentos | AbacatePay (API v2, em modo de testes), atrás de uma camada própria em `services/pagamento/` |
| Imagens | sharp (conversão para WebP) e Cloudinary em produção |
| Portas | Backend `3001`, frontend `5173` |

## Pré-requisitos

- Node.js 20 ou superior (testado com a v23)
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

# 5. Popula os dados iniciais
#    2 contas, 4 aceites, 5 empreendedores, 13 itens, 1 mensagem
npm run prisma:seed

# 6. Sobe o backend (terminal 1)
npm run dev:backend      # http://localhost:3001/api/health

# 7. Sobe o frontend (terminal 2)
npm run dev:frontend     # http://localhost:5173
```

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

As senhas são as que você definir no `.env` (as duas contas de empreendedor usam
`DEMO_EMPREENDEDOR_SENHA`). Todo negócio do seed tem conta, porque só negócio com conta e plano
em vigor aparece na vitrine. As assinaturas e os números de desempenho do seed são de
**demonstração**: nunca passaram pelo gateway. O roteiro da apresentação está em [DEMO.md](DEMO.md).

Para subir os dois com um único comando, instale o `concurrently` na raiz e adicione o script:

```bash
npm install -D concurrently
```

```json
"dev": "concurrently \"npm:dev:backend\" \"npm:dev:frontend\""
```

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
TERMOS_VERSAO="1.1"

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
| `JWT_SECRET` | sim | Sem ela a API recusa qualquer login, com erro explícito |
| `JWT_EXPIRES_IN` | não | Padrão `8h` |
| `TERMOS_VERSAO` | não | Padrão `1.1`. Mudar a versão faz novos aceites gravarem o novo número |
| `UPLOADS_DIR` | não | Padrão `uploads` (relativo à pasta `backend`). Onde ficam as fotos enviadas quando não há Cloudinary |
| `CLOUDINARY_URL` | em produção | `cloudinary://CHAVE:SEGREDO@CONTA`. Com ela, as fotos enviadas vão para o Cloudinary em vez da pasta local (o disco do Render gratuito é apagado a cada deploy) |
| `CLOUDINARY_PASTA` | não | Padrão `vitrinelocal`. Pasta das fotos dentro da conta do Cloudinary |
| `ABACATEPAY_API_KEY` | para assinar planos | Chave do AbacatePay em **Dev mode** (`abc_dev_...`). Sem ela a vitrine funciona e só a assinatura responde erro. Uma chave de produção é recusada |
| `ABACATEPAY_PERMITIR_PRODUCAO` | não | `true` libera a chave de produção, que **cobra de verdade**. Fica desligada no projeto |
| `ABACATEPAY_WEBHOOK_SECRET` | em produção | Segredo longo, inventado por você, que o AbacatePay manda na URL do webhook. No localhost não é usado |
| `ABACATEPAY_BASE_URL` | não | Padrão `https://api.abacatepay.com/v2` |
| `PAGAMENTO_PROVEDOR` | não | Padrão `abacatepay`. Troca o gateway sem mexer no resto (ver [Planos e assinaturas](#planos-e-assinaturas)) |
| `APP_URL` | sim, com assinaturas | Endereço do site. O checkout volta para `APP_URL/meu-negocio` depois do pagamento |
| `CORS_ORIGINS` | em produção | Endereços do site que podem chamar a API, separados por vírgula |
| `BANCO_HOST_CONTA` | não | Padrão `localhost`. De onde a conta da aplicação pode entrar no MySQL; num banco na nuvem use `%` |
| `ADMIN_SENHA`, `DEMO_EMPREENDEDOR_SENHA` | só para o seed | O seed aborta se faltarem |

Nenhuma chave de API vai para o frontend: o pagamento acontece na página do AbacatePay, e o mapa (Leaflet com ladrilhos do OpenStreetMap) e a
geocodificação do Nominatim são usados em modo aberto, sem credencial.

**Por que duas contas.** Se alguém explorar uma falha na API, só consegue o que a conta da API
pode: ler e gravar linhas do `vitrine_db`. Criar, alterar ou apagar tabela, ver outros bancos, ler as
contas do MySQL, criar usuário e ler arquivo do servidor são recusados pelo próprio MySQL, o que foi
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
├── package.json              scripts de orquestração (install:all, prisma:*, dev:*)
├── TERMOS_DE_USO.md          documento servido pela API e pela página /termos
├── POLITICA_DE_PRIVACIDADE.md  idem, para /privacidade
├── DEMO.md                   roteiro da demonstração das assinaturas
├── docs/                     coleções do Thunder Client e do Postman + roteiro de testes da API
├── tests/                    testes de unidade (Vitest), um .test.js por módulo
├── tests-e2e/                driver do Chrome DevTools Protocol e suítes de ponta a ponta
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     modelo de dados (13 tabelas)
│   │   ├── migrations/       init, localização, autenticação/termos/auditoria,
│   │   │                     banner, horários de atendimento, índices de busca,
│   │   │                     perguntas frequentes, assinaturas, publicação por assinatura,
│   │   │                     remoção do banner
│   │   ├── planos.js         os dois planos à venda (preço, benefícios, recursos)
│   │   ├── reversoes/        SQL para desfazer uma migration (o Prisma só anda para frente)
│   │   └── seed.js           dados iniciais (senhas vêm do .env)
│   └── src/
│       ├── app.js            Express: cors, json, log, autenticação opcional, rotas, 404, erros
│       ├── server.js         conecta ao banco e sobe na PORT
│       ├── config/prisma.js  singleton do PrismaClient
│       ├── controllers/      empreendedor, produto, contato, auth, usuario, auditoria,
│       │                     faq, upload, assinatura, metrica, divulgacao
│       ├── middlewares/      auth.js (JWT e perfis), errorHandler.js, validate.js
│       ├── utils/            erros.js (mensagens exibíveis), paginacao.js (página opcional das listas)
│       ├── services/         auditoria.js (registro central), termos.js (documentos e aceites),
│       │                     horarios.js (validação da semana de atendimento),
│       │                     imagens.js (envio, WebP e Cloudinary), assinaturas.js (estados da
│       │                     assinatura), metricas.js (desempenho sem identificar ninguém),
│       │                     pagamento/ (camada do gateway: index.js + abacatepay.js)
│       └── routes/           index.js + um roteador por entidade
└── frontend/
    └── src/
        ├── App.jsx           Router com Layout e rotas protegidas por perfil
        ├── contexts/         auth.js (contexto e perfis) + AuthContext.jsx (provider)
        ├── services/         api.js (cliente Fetch com token), constantes.js, fontes.js,
        │                     validacoes.js (inclui os erros do servidor por campo),
        │                     formatos.js (preço e números), whatsapp.js (links wa.me),
        │                     planos.js, metricas.js, divulgacoes.js, imagens.js,
        │                     geocodificacao.js (Nominatim, com cache em memória),
        │                     faq.js (busca, filtro e validação da central de ajuda),
        │                     horarios.js (cálculo de "aberto agora" no fuso de Rondonópolis)
        ├── hooks/            useConsulta (leituras com cache), useFiltrosNaUrl (filtros e
        │                     página das listagens na URL), useRelogio (hora que se atualiza)
        ├── components/
        │   ├── auth/         RotaProtegida
        │   ├── layout/       Navbar (estados por perfil), Footer
        │   ├── ui/           Button, Modal, ConfirmModal, StatusMessage, Spinner, Tag e TagTipo, Icone, Fonte,
        │   │                 Mapa (Leaflet, carregado sob demanda), Voltar e Avançar,
        │   │                 Paginacao, Acordeao, PaginaErro, SeloDestaque
        │   ├── cards/        ProdutoCard, EmpreendedorCard
        │   ├── forms/        ProdutoForm, EmpreendedorForm, ContatoForm, ContaForm, AceiteTermos,
        │   │                 HorariosEditor, CampoSenha (com o botão de ver a senha), FaqForm
        │   ├── admin/        PainelAuditoria, PainelUsuarios, PainelFaq,
        │   │                 PainelAssinaturas, PainelDivulgacoes
        │   ├── painel/       PainelPlano, PainelDesempenho, PainelDivulgacao (abas do "Meu negócio")
        │   ├── faq/          PerguntasFrequentes (a central de ajuda da página de Contato)
        │   ├── tables/       DataTable
        │   └── filters/      SearchBar, CategoriaFilter
        └── pages/            Home, Vitrine, ProdutoDetalhe, Empreendedores, EmpreendedorDetalhe,
                              Contato, Sobre, Login, Cadastro, Termos, MeuNegocio, Admin, Planos
```

Cada componente e página mora na própria pasta com o `.jsx` e o `.css` ao lado.

## Modelo de dados

Doze tabelas. Onze são relacionadas entre si; a outra guarda as perguntas da central de ajuda. Uma conta pode ter um negócio; um negócio tem muitos produtos (exclusão
em cascata), tem seus intervalos de horário de atendimento (também em cascata) e pode receber
muitas mensagens. Os aceites de termos seguem a conta em cascata, mas os
logs de auditoria sobrevivem à exclusão da conta: apagar um usuário não pode apagar o histórico.
As assinaturas, divulgações e métricas seguem o negócio em cascata; um plano não pode ser apagado
enquanto houver assinatura dele.

```mermaid
erDiagram
    USUARIOS ||--o| EMPREENDEDORES : "é dono de"
    USUARIOS ||--o{ ACEITES_TERMOS : "aceitou"
    USUARIOS ||--o{ LOGS_AUDITORIA : "gerou"
    EMPREENDEDORES ||--o{ PRODUTOS : "oferece"
    EMPREENDEDORES ||--o{ CONTATOS : "recebe"
    EMPREENDEDORES ||--o{ HORARIOS_ATENDIMENTO : "atende em"
    EMPREENDEDORES ||--o{ ASSINATURAS : "assina"
    PLANOS ||--o{ ASSINATURAS : "é assinado em"
    EMPREENDEDORES ||--o{ DIVULGACOES : "é divulgado em"
    EMPREENDEDORES ||--o{ METRICAS_DIARIAS : "tem"

    USUARIOS {
        int id PK
        varchar nome
        varchar email UK
        varchar telefone
        varchar senha_hash "bcrypt, nunca sai da API"
        varchar perfil "COMUM | EMPREENDEDOR | ADMIN"
        boolean ativo
        datetime created_at
        datetime updated_at
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
        varchar foto_url
        boolean ativo
        varchar plano_atual "NENHUM | ESSENCIAL | DESTAQUE (cópia da assinatura ativa)"
        boolean em_destaque "cópia: ordena a vitrine sem juntar tabelas"
        datetime publicado_ate "fim do período pago: só aparece ao público antes dele"
        boolean autoriza_divulgacao
        datetime autoriza_divulgacao_em
        datetime created_at
        datetime updated_at
    }

    PLANOS {
        int id PK
        varchar nome UK "ESSENCIAL | DESTAQUE"
        varchar titulo
        int preco_centavos "5000 = R$ 50,00"
        varchar ciclo "MONTHLY"
        boolean destaque
        boolean metricas_ampliadas
        boolean divulgacao
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
        datetime vigente_ate "próxima cobrança + 1 dia; cancelada vale até aqui"
        datetime cancelada_em
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

    PRODUTOS {
        int id PK
        varchar nome
        text descricao
        float preco
        varchar tipo "produto | servico"
        varchar imagem
        boolean disponivel
        int empreendedor_id FK "ON DELETE CASCADE"
        datetime created_at
        datetime updated_at
    }

    CONTATOS {
        int id PK
        varchar nome
        varchar email
        varchar telefone
        text mensagem
        boolean lido
        int empreendedor_id FK "nulo; ON DELETE SET NULL"
        datetime created_at
    }

    HORARIOS_ATENDIMENTO {
        int id PK
        int empreendedor_id FK "ON DELETE CASCADE"
        tinyint dia_semana "0 = domingo ... 6 = sábado"
        varchar abre "08:00"
        varchar fecha "12:00"
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

## Perfis e permissões

| Perfil | Vê | Faz |
|---|---|---|
| Visitante (sem conta) | Vitrine, empreendedores, detalhes, perguntas frequentes ativas | Envia mensagem pelo formulário de contato |
| COMUM | Tudo do visitante | Cadastra o próprio negócio, o que promove a conta a EMPREENDEDOR. A interface não cria contas desse tipo: o cadastro público já nasce com negócio |
| EMPREENDEDOR | Tudo do comum, mais os itens indisponíveis do próprio catálogo | Edita o próprio negócio e gerencia os próprios produtos e serviços |
| ADMIN | Tudo, incluindo negócios inativos, mensagens, contas, auditoria e perguntas ocultas | Cria, edita e exclui qualquer registro; ativa e desativa contas; mantém a central de ajuda |

Regras que valem no servidor, independentemente do que a interface mostrar:

- Toda rota protegida verifica o perfil no banco a cada requisição, não no token. Uma conta desativada perde o acesso na hora, sem esperar o token expirar.
- O dono só mexe no que é dele. Tentar editar ou excluir item de outro negócio devolve `403`, mesmo com o `id` correto na URL.
- O vínculo de um produto com o negócio não pode ser trocado na edição: o schema de atualização remove `empreendedorId`, então não há como transferir um item para outra vitrine.
- Ler mensagens de contato é exclusivo da administração, porque elas contêm dados pessoais de quem escreveu.
- Um administrador não consegue desativar a própria conta.
- Senhas são guardadas com bcrypt e nenhum `select` da API inclui o hash.
- O login devolve a mesma mensagem para e-mail inexistente e senha errada, para não revelar quais e-mails estão cadastrados.

No navegador, o componente `RotaProtegida` leva quem não entrou para o login e devolve a pessoa à
rota pretendida depois. Essa checagem é conveniência de interface: a autorização de verdade está na API.

## Termos de uso e privacidade

Os documentos ficam em [TERMOS_DE_USO.md](TERMOS_DE_USO.md) e
[POLITICA_DE_PRIVACIDADE.md](POLITICA_DE_PRIVACIDADE.md), na raiz, e são servidos pela API em
`/api/termos/TERMOS_DE_USO` e `/api/termos/POLITICA_PRIVACIDADE`. As páginas `/termos` e `/privacidade` renderizam esse conteúdo.

| Regra | Como é garantida |
|---|---|
| Aceite obrigatório no cadastro | As duas caixas começam desmarcadas e o servidor valida com `z.literal(true)`; marcar só no frontend não passa |
| Aceite registrado com data, versão, IP e navegador | Cada cadastro grava uma linha por documento em `aceites_termos` |
| Versão vigente controlada por configuração | `TERMOS_VERSAO` no `.env`, gravada junto do aceite |
| Nenhum aceite órfão | Conta, negócio e aceites são criados na mesma transação: se um falhar, nada é gravado |
| Leitura antes de aceitar | Os links abrem os documentos em outra aba, sem perder o formulário preenchido |

## Auditoria

Toda gravação passa pelo serviço [backend/src/services/auditoria.js](backend/src/services/auditoria.js).
O navegador nunca envia logs: quem registra é o servidor, com o que realmente aconteceu.

O que fica registrado: entradas e saídas do sistema, tentativas de entrada recusadas, cadastros de
conta, aceites de termos, criação, alteração e exclusão de negócios, produtos e mensagens, mudanças
de perfil e ativação ou desativação de contas.

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

## Central de ajuda (FAQ)

> Como usuário, quero consultar perguntas frequentes para resolver dúvidas sem depender do suporte.
>
> Como administrador, quero cadastrar e manter o FAQ no próprio sistema, sem precisar de alteração
> de código ou novo deploy.

**Onde fica.** No item **Contato** do menu, antes do formulário: quem abre a página vê primeiro se a
dúvida já tem resposta e, se não tiver, escreve logo abaixo. As perguntas abrem uma por vez, há busca
que olha pergunta e resposta (sem diferenciar acento: "endereco" encontra "endereço") e filtro por
assunto. Quem é administrador vê o atalho "Administrar perguntas", que abre o painel direto na aba
**Perguntas frequentes**, com tabela, cadastro e edição em modal e exclusão com confirmação.

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
cria quatro perguntas de exemplo, e cada resposta descreve algo que o sistema faz de verdade. Para
desfazer a migration, há o SQL em `backend/prisma/reversoes/`, testado num banco à parte: aplicar do
zero, reaplicar (sem efeito), reverter e aplicar de novo deixaram o banco idêntico ao `schema.prisma`.

**Adaptações feitas ao pedido original**, escrito para outro sistema:

| Pedido | Aqui | Por quê |
|---|---|---|
| Leitura só para usuário autenticado | Leitura pública (confirmado) | A vitrine não pede conta para navegar, e o cadastro público não cria conta de consulta. Exigir login esconderia o FAQ de quase todo mundo |
| Permissão `faq.gerenciar` | Perfil ADMIN | O projeto controla acesso por perfil, sem tabela de permissões |
| Campos `criadoEm` e `atualizadoEm` | `createdAt` e `updatedAt` (colunas `created_at` e `updated_at`) | Mesmo padrão das outras tabelas |
| Item próprio no menu | Item "Contato" | O FAQ e o formulário ficam na mesma página (o nome encurtou para caber o item Planos) |
| Proteção CSRF | Não se aplica | A sessão vai no cabeçalho `Authorization`, não em cookie |
| Exportar para Excel, CSV ou PDF | Não feito | O projeto não tem exportação; o próprio pedido condicionava isso a ela existir |

## Planos e assinaturas

> **Ambiente de testes.** Os pagamentos usam o AbacatePay em **Dev mode**: nenhum cartão é cobrado.
> O roteiro da apresentação está em [DEMO.md](DEMO.md).

**Navegar é gratuito. Divulgar um negócio exige conta + plano em vigor.** Não existe publicação
gratuita: o empreendedor escolhe um dos dois planos mensais, e a plataforma não cobra comissão sobre
as vendas.

| | Essencial | Destaque |
|---|---|---|
| Preço | R$ 50 por mês | R$ 75 por mês |
| Publicação do negócio na vitrine (busca, categorias, mapa, contato) | ✓ | ✓ |
| Estatísticas do perfil | totais do período | totais, gráfico por dia e produtos mais vistos |
| Selo "Negócio em Destaque" | | ✓ |
| Prioridade na ordem das listas e da busca | | ✓ |
| Prioridade na pilha animada do topo da Home | | ✓ |
| Possibilidade de divulgação nas redes oficiais | | ✓ |

Os planos ficam em [backend/prisma/planos.js](backend/prisma/planos.js) (`npm run planos:semear`
atualiza o banco sem apagar nada). A vitrine decide pelos recursos do plano (`destaque`,
`metricasAmpliadas`, `divulgacao`), não pelo nome dele.

**Transparência.** A página `/planos`, os Termos (seção 5) e a FAQ dizem a mesma coisa: o plano aumenta
a oportunidade de exposição, mas **não garante** visitas, contatos ou vendas. O Destaque muda a ordem e
dá o selo; os negócios do Essencial continuam na busca, nas listas e no mapa.

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
encontra o negócio salvo como rascunho no "Meu negócio", com o caminho para publicar. O dono vê o próprio
rascunho em modo de prévia. Negócio criado pela administração sem conta responsável fica como rascunho.

**Fluxo da assinatura.**

1. O empreendedor escolhe o plano em `/planos`. A API cria (uma vez só) o produto mensal no AbacatePay e
   um checkout de assinatura, e grava a assinatura como `PENDENTE`.
2. O navegador vai para a página de pagamento do AbacatePay. Em Dev mode vale o cartão
   `4242 4242 4242 4242` ou o botão "Simular Pagamento".
3. O pagamento chega à API por dois caminhos, que convergem na mesma função idempotente
   (`aplicarEvento`):
   - **webhook** `POST /api/webhooks/abacatepay`, conferido pelo segredo na URL e pela assinatura
     HMAC-SHA256 do corpo (`X-Webhook-Signature`); qualquer outro pedido recebe `401`;
   - **conciliação**: ao abrir "Meu negócio" com checkout pendente, a API consulta o gateway. É o que
     ativa o plano no localhost, onde o AbacatePay não alcança o webhook.
4. A assinatura vira `ATIVA`, com início, próxima cobrança e vencimento, e o negócio é publicado na hora.

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
destaques são contadas pelo servidor. O Essencial vê os totais; o Destaque vê também a série diária e
os produtos mais vistos.

**Divulgação nas redes.** Não há integração com redes sociais. A equipe publica e registra no painel
(aba Divulgações). Só entram negócios com plano que inclui divulgação **e** com o consentimento
marcado pelo dono (gravado com data), e o dono acompanha a lista na aba Divulgação do "Meu negócio".

## API

Base: `http://localhost:3001/api`. Todas as respostas seguem o formato `{ success, message?, total?, data? }`.

As rotas abaixo indicam quem pode chamá-las. "Dono" significa o empreendedor ao qual o registro
pertence; o administrador também passa em todas as rotas de dono.

### Sessão e documentos

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/health` | público | Verifica a API e o banco: `200` com `"banco": "ok"`, ou `503` se o banco não responder em 3 segundos |
| POST | `/auth/registrar` | público | Cria conta sem negócio. Exige o aceite dos dois documentos. Não é usada pela interface, que cadastra conta e negócio juntos |
| POST | `/auth/registrar-empreendedor` | público | Cria conta e negócio em uma transação, com aceite |
| POST | `/auth/login` | público | Devolve token e dados da sessão |
| POST | `/auth/logout` | autenticado | Encerra a sessão e registra na auditoria |
| GET | `/auth/me` | autenticado | Dados da conta atual, sem o hash da senha |
| GET | `/termos/:tipo` | público | `TERMOS_DE_USO` ou `POLITICA_PRIVACIDADE`, com a versão vigente |

### Vitrine

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/empreendedores` | público | Lista. Filtros: `categoria`, `cidade`, `bairro`, `busca`. Inativos só para o admin. Com `pagina` e `porPagina` (até 60) a resposta vem paginada |
| GET | `/empreendedores/:id` | público | Detalhe com os produtos. Itens indisponíveis só para o dono e o admin |
| GET | `/empreendedores/meu` | autenticado | Negócio da conta atual; `404` se ainda não tiver um |
| POST | `/empreendedores/meu` | autenticado | Cadastra o próprio negócio e promove a conta a EMPREENDEDOR |
| POST | `/empreendedores` | admin | Cria um negócio sem dono |
| PUT | `/empreendedores/:id` | dono | Atualiza (campos parciais) |
| DELETE | `/empreendedores/:id` | admin | Exclui (e seus produtos, em cascata) |
| GET | `/produtos` | público | Lista. Filtros: `categoria`, `tipo`, `busca`, `empreendedorId`, `bairro`. Aceita `pagina` e `porPagina` |
| GET | `/produtos/:id` | público | Detalhe com o empreendedor |
| POST | `/produtos` | dono | Cria no próprio negócio |
| PUT | `/produtos/:id` | dono | Atualiza. O vínculo com o negócio não pode ser trocado |
| DELETE | `/produtos/:id` | dono | Exclui |
| POST | `/uploads/imagem` | autenticado | Envia uma imagem do computador (corpo = o arquivo, `Content-Type: image/...`). Devolve `data.url` para usar em `imagem` ou `fotoUrl` |
| POST | `/contatos` | público | Envia mensagem |
| GET | `/contatos` | admin | Lista as mensagens recebidas |
| PATCH | `/contatos/:id/lido` | admin | Marca como lida. Corpo opcional `{ "lido": false }` desmarca |
| DELETE | `/contatos/:id` | admin | Exclui |
| GET | `/faq` | público | Perguntas ativas, por `ordem` e depois pela pergunta |
| GET | `/empreendedores/destaques` | público | Até `limite` (padrão 3) negócios com Destaque, em ordem sorteada. Filtro opcional `categoria` |
| POST | `/metricas` | público | Registra um evento de desempenho `{ empreendedorId, tipo, produtoId? }`. Sempre `204`; limite de 120 a cada 15 minutos |

### Planos, assinaturas e desempenho

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/planos` | público | Planos à venda, com benefícios e `modoTeste` |
| GET | `/assinaturas/minha` | dono | Assinatura atual, troca pendente e plano do negócio. Concilia checkouts pendentes com o gateway |
| POST | `/assinaturas` | dono | Assina `{ "plano": "ESSENCIAL" }`. Devolve `checkoutUrl`. `409` se o plano já está ativo |
| PUT | `/assinaturas/minha` | dono | Troca de plano (novo checkout; o atual vale até o pagamento) |
| DELETE | `/assinaturas/minha` | dono | Cancela as próximas cobranças. O negócio segue publicado até o fim do período pago |
| GET | `/assinaturas` | admin | Assinaturas recentes e se a simulação está disponível |
| POST | `/assinaturas/:id/simular-aprovacao` | admin | Fora de produção: aplica o pagamento aprovado. Em produção, `404` |
| POST | `/assinaturas/:id/simular-falha` | admin | Fora de produção: aplica a cobrança recusada. Em produção, `404` |
| POST | `/webhooks/abacatepay` | gateway | Aviso do AbacatePay. Exige `?webhookSecret=` e `X-Webhook-Signature`; senão `401` |
| GET | `/metricas/meu-negocio` | dono | Desempenho do período (`dias`, de 7 a 90). `disponivel: false` sem plano em vigor |
| GET | `/divulgacoes/minhas` | dono | Divulgações do próprio negócio |
| GET | `/divulgacoes` | admin | Todas as divulgações |
| POST | `/divulgacoes` | admin | Registra. Exige plano com divulgação e consentimento do negócio (`409` sem eles) |
| PUT | `/divulgacoes/:id` | admin | Atualiza só os campos enviados |
| DELETE | `/divulgacoes/:id` | admin | Exclui |

O consentimento para divulgação é o campo `autorizaDivulgacao` em `PUT /empreendedores/:id`; a data
é gravada pelo servidor.

**Imagens.** Os campos `imagem` (produto) e `fotoUrl` (negócio) aceitam um
link `http(s)` completo, como sempre, ou o caminho devolvido por `POST /uploads/imagem`
(`/uploads/<id>.webp`, ou o endereço `https://res.cloudinary.com/...` quando `CLOUDINARY_URL` está
definida). No envio, o servidor só aceita JPG, PNG, WebP, GIF e AVIF de até 5 MB, abre o
arquivo com o [sharp](https://sharp.pixelplumbing.com) (arquivo que não é imagem é recusado com
`415`), reduz para no máximo 1600 px, regrava em WebP e descarta os metadados, inclusive a
localização GPS das fotos de celular. SVG fica de fora porque pode carregar script. Os arquivos são
servidos em `/uploads/...` com cache de um ano, e a imagem trocada ou de um cadastro excluído é
apagada do disco quando nenhum outro cadastro a usa. Imagem enviada e nunca salva num cadastro
continua na pasta.

**Paginação opcional.** Sem `pagina` na URL, `/produtos` e `/empreendedores` devolvem a lista inteira,
como sempre: a home, o painel do empreendedor e as coleções de teste continuam funcionando sem
mudança. Com `pagina`, a resposta ganha o bloco `paginacao`:

```json
{ "success": true, "total": 13, "data": [ ... ],
  "paginacao": { "pagina": 2, "porPagina": 9, "total": 13, "totalPaginas": 2 } }
```

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

**Edição parcial de verdade.** Um `PUT` altera só os campos enviados. Os valores padrão
(estado "MT", tipo "produto") valem apenas no cadastro. No Zod 4, `.partial()`
preserva os `.default()` do esquema de origem; por isso os esquemas de edição são montados a partir
de uma base sem padrões. Antes dessa correção, editar um negócio pela API sem enviar a categoria a
trocava para a categoria padrão, e editar um serviço sem enviar o tipo o transformava em produto.

**Categorias.** A lista é fechada e validada no servidor: Artesanato, Alimentação, Serviços, Moda e
Beleza. Não há categoria genérica nem valor padrão; quem cadastra escolhe uma, para todo negócio
aparecer em algum filtro da vitrine.

**Horários.** Em `POST` e `PUT` de negócio, o campo `horarios` traz a semana inteira, e na edição ela
substitui a anterior. Cada intervalo tem o formato abaixo. O servidor recusa fim antes do início,
formato diferente de `00:00`, intervalos sobrepostos no mesmo dia e mais de quatro intervalos por dia.

```json
{ "horarios": [
  { "diaSemana": 1, "abre": "08:00", "fecha": "12:00" },
  { "diaSemana": 1, "abre": "13:00", "fecha": "17:00" }
] }
```

Chamadas autenticadas enviam o token no cabeçalho:

```
Authorization: Bearer <token devolvido pelo login>
```

Sem token, uma rota protegida responde `401`. Com token válido mas perfil insuficiente, `403`.

Exemplo de criação de produto:

```bash
curl -X POST http://localhost:3001/api/produtos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Pão de mel","preco":8.5,"tipo":"produto","empreendedorId":2}'
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
- `/admin`, para a administração: abas Produtos e Empreendedores com tabela, botão Novo (Modal com formulário vazio, `POST`), Editar (Modal preenchido, `PUT`) e Excluir (ConfirmModal, `DELETE`); aba Mensagens com marcar como lida ou não lida (`PATCH`) e excluir; abas Assinaturas, Divulgações, Contas, FAQ e Auditoria.
- `/meu-negocio`, para o empreendedor: mesmo ciclo completo sobre o próprio catálogo, sem enxergar o de ninguém, e as abas Plano, Desempenho e Divulgação.
- Após cada operação a lista é recarregada e um `StatusMessage` informa o resultado.

**Marketplace multiusuário:**
- O cadastro público tem um caminho só, "Quero publicar meu negócio", em duas etapas: a conta com o aceite e, em seguida, o negócio. As duas partes vão ao servidor em uma única requisição, então não existe conta sem negócio nem aceite órfão.
- Quem só quer navegar pela vitrine não cria conta: busca, filtros, mapa e contato pelo WhatsApp são abertos. A própria página de cadastro diz isso e oferece o atalho para a vitrine.
- Uma conta sem negócio ainda pode existir pela API e, ao cadastrar o primeiro negócio, é promovida a empreendedor em uma transação que registra a mudança de perfil na auditoria.
- O cabeçalho muda conforme o perfil: entrar e cadastrar-se para visitantes, "Cadastrar meu negócio" para contas comuns, "Meu negócio" para empreendedores e "Admin" para a administração, sempre com o menu da conta e a saída.

**Horário de atendimento:** o empreendedor informa, no cadastro do negócio, os intervalos de cada
dia da semana, com quantas pausas quiser (por exemplo, 08:00 às 12:00 e 13:00 às 17:00). Há um atalho
que aplica esse exemplo de segunda a sexta. A página pública mostra a semana, com o dia de hoje
destacado, e o selo "Disponível para atendimento", com bolinha verde, só dentro de um intervalo. Fora
dele, ou sem horário informado, mostra "Indisponível para atendimento", com bolinha vermelha, e diz
quando abre de novo. O selo é recalculado a cada 30 segundos, então troca sozinho quando o horário
começa ou termina, sem recarregar a página.

O cálculo usa sempre o horário de Rondonópolis (America/Cuiaba), e não o do aparelho de quem visita.
Um intervalo inclui o minuto de início e exclui o de fim: 08:00 às 12:00 atende às 11:59 e não às
12:00. Intervalos que atravessam a meia-noite não são aceitos; quem atende até 01:00 cadastra 22:00
às 23:59 em um dia e 00:00 às 01:00 no seguinte. A lógica fica em
[frontend/src/services/horarios.js](frontend/src/services/horarios.js).

**Formulário do negócio:** no modal do painel e na área do empreendedor ele se divide em três colunas
lado a lado (dados, localização e horário). Em telas médias vira duas colunas e, no celular, uma.
O formulário se organiza pela própria largura, com consulta de contêiner, e não pela largura da tela.

**Topo da página inicial:** no lugar do antigo cartaz (e do banner que a administração trocava),
fica a pilha animada de negócios descrita abaixo, ao lado do texto e da lista "Na vitrine agora".

**Contato:** formulário em duas colunas, com validação ao sair de cada campo, contador de
caracteres, cartão do destinatário com atalho para o WhatsApp do negócio e confirmação no lugar do
formulário depois do envio.

**Navegação sem recarregar a tela:** a aplicação é de página única, e cada leitura da API fica
guardada em memória. Voltar a uma página já vista mostra o conteúdo na hora e atualiza por trás.
Trocar um filtro mantém a lista anterior na tela, esmaecida, até a nova chegar, sem o "Carregando" e
sem o rodapé pular. Qualquer alteração (salvar, excluir) ou troca de sessão limpa essa memória. A
lógica fica no gancho [frontend/src/hooks/useConsulta.js](frontend/src/hooks/useConsulta.js).

**Rolagem:** página nova abre no topo, e o botão voltar do navegador devolve a posição exata de antes
(`ScrollRestoration` do React Router, que por isso roda em modo de dados). Filtrar não mexe na
rolagem. Salvar no painel mostra um aviso no canto da tela, que some sozinho, em vez de levar a
página ao topo. Imagens fora da tela carregam só quando chegam perto dela.

**Pilha de negócios da Home:** o topo da página mostra uma pilha de cartões que se
revezam sozinhos, adaptada do CardSwap do React Bits (licença MIT) em
[components/ui/CardSwap](frontend/src/components/ui/CardSwap/CardSwap.jsx). Os negócios do Destaque vêm
na frente, com o selo, e os demais publicados em seguida; cada cartão abre a página do negócio. A
pilha pausa com o mouse em cima, e o gsap só é baixado quando ela aparece, fora do pacote da primeira
visita. Para quem pede menos movimento ao sistema, os cartões trocam de lugar com um esmaecimento, sem
cair nem deslizar. Teclado e leitor de tela usam a lista de nomes ao lado da pilha.

**Revelar ao rolar e barra de rolagem:** blocos e cartões surgem subindo e ganhando cor quando entram
na tela, com animações guiadas pela própria rolagem, só em CSS (`animation-timeline: view()`); listas
como os números e o "O que fazemos" animam em grupo, em cascata, pela linha do tempo do bloco pai
(`view-timeline-name`). Para quem pede menos movimento, só esmaecem, sem deslocar; navegador sem
suporte mostra tudo parado. A barra de rolagem segue o tema (trilho creme, alça anil arredondada com
contorno de nanquim); no Firefox, que só aceita cores, fica com as mesmas cores.

**Movimento:** o botão "Cadastre-se" alterna com "Vire empreendedor", deslizando. Quem pede menos
movimento ao sistema vê a troca por esmaecimento, sem deslizar, e a rolagem até "Como funciona" vai
direto em vez de animar. Nos dois casos, a troca pausa com o mouse ou o foco sobre o botão.

**Aceite de termos e auditoria:** descritos nas seções [Termos de uso e privacidade](#termos-de-uso-e-privacidade) e [Auditoria](#auditoria).

**Frontend componentizado:**
- 24 componentes reutilizáveis separados das 12 páginas, cada um em pasta própria.
- `ProdutoForm` e `EmpreendedorForm` servem para criar e editar. `ProdutoCard` e `EmpreendedorCard` aparecem na Home, na Vitrine, na lista de empreendedores e no detalhe.
- Todas as páginas têm estados de carregando, erro e vazio.

**Planos e assinaturas:** descritos em [Planos e assinaturas](#planos-e-assinaturas).

**Banco relacional** com doze tabelas, chaves estrangeiras e regras de exclusão definidas no Prisma, incluindo a diferença deliberada entre cascata (aceites seguem a conta) e preservação (logs sobrevivem à conta).

**Público:** vitrine com busca, filtro por categoria, tipo e bairro; página do item (`/produtos/:id`); página do empreendedor com endereço, mapa e botão de WhatsApp (`https://wa.me/55<numero>`); formulário de contato; layout responsivo.

**Localização do empreendedor:** o cadastro do negócio aceita rua, número, complemento, bairro, cidade, estado e CEP. O botão "Localizar no mapa" consulta o Nominatim (OpenStreetMap, sem chave) e preenche latitude e longitude, que podem ser corrigidas à mão. Se o endereço não for encontrado, o formulário avisa e aceita coordenadas manuais. A página pública desenha o mapa com Leaflet e ladrilhos do OpenStreetMap, pelas coordenadas gravadas ou, sem elas, pelo endereço digitado, com o link "Ver no OpenStreetMap". Quando o empreendedor desmarca "Mostrar o endereço completo", o alfinete dá lugar a um círculo de aproximação sobre o bairro, sem apontar a casa. Nenhuma coordenada é inventada: sem endereço reconhecido, o mapa diz que não encontrou em vez de mostrar um ponto qualquer.

**Paginação:** a vitrine mostra 9 itens por página e a lista de empreendedores, 6. A página
fica na URL (`?pagina=2`), então dá para compartilhar o link e o botão voltar do navegador volta à
página anterior da lista. Trocar um filtro leva de volta à primeira página, porque a página 3 do
resultado antigo pode nem existir no novo.

**Termos no cadastro:** os links dos Termos de Uso e da Política de Privacidade, no aceite e na
lateral do cadastro, abrem o documento num modal por cima do formulário. Antes abriam outra aba, e no
celular a pessoa saía do cadastro no meio, às vezes sem achar o caminho de volta. O que já foi
digitado continua no formulário, e ler o documento não marca o aceite sozinho.

**Navegação e acesso:** toda tela interna tem o par "Voltar" e "Avançar", alinhado à margem do
título. O "Voltar" usa o histórico quando existe e, quando a pessoa chega direto pelo endereço, vira
um link para a página de origem. O "Avançar" fica apagado até haver tela à frente, ou seja, só depois
de voltar; abrir um link novo apaga o caminho adiante e o botão volta a ficar inativo. Os campos de senha
do login e do cadastro têm o botão de ver o que foi digitado, com aviso para leitores de tela.

**Tipografia:** Bricolage Grotesque (títulos, preços e métricas) e Inter (interface e textos), carregadas do Google Fonts com fallback para fontes do sistema.

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
`tests/backend/` e `tests/frontend/`. São 637 verificações em 33 arquivos, rodando com Vitest.

```bash
npm test            # roda tudo uma vez
npm run test:watch  # reexecuta a cada arquivo salvo
```

O [`tests/README.md`](tests/README.md) tem a tabela do que cada arquivo cobre. Em resumo: validação
de cada cadastro, regras de sessão e perfil, limite de tentativas de login, cálculo de "aberto
agora", limpeza da auditoria, a máquina de estados das assinaturas (com um banco falso em memória),
a autenticidade do webhook, a contagem de métricas sem identificar ninguém, tratamento de erros e o filtro que impede vazamento de dado técnico nas
mensagens. Três testes comparam as duas pontas de propósito — categorias, perfis e horários precisam
combinar entre frontend e backend.

Os handlers HTTP dependem do banco e ficam com a coleção do Postman; os componentes React e o hook
`useConsulta` precisariam de `@testing-library/react`, que o projeto ainda não usa, e são conferidos
no navegador pelas suítes abaixo.

### Ponta a ponta (navegador)

Os testes ficam em `tests-e2e/`. São scripts que dirigem o Microsoft Edge em modo headless pelo
Chrome DevTools Protocol, sem dependência nenhuma além do Node: abrem o sistema como uma pessoa
faria, clicam nos elementos reais e conferem o resultado na tela e no banco.

Antes, suba o backend e o frontend. No Windows, o script abaixo sobe os dois como processos
independentes do terminal, com os logs em `%TEMP%itrine-backend.log` e `%TEMP%itrine-frontend.log`:

```powershell
powershell -ExecutionPolicy Bypass -File tests-e2e/subir-servidores.ps1
```

Depois, dentro de `tests-e2e/`:

```bash
node teste-ajustes-ui.mjs     # mapa Leaflet, ver a senha, setas de navegação e largura no celular
node teste-erros-ui.mjs       # a tela de erro não mostra pilha de chamadas nem caminho de arquivo
node teste-desempenho.mjs     # o que a primeira tela baixa e a compressão da API
node teste-faq-ui.mjs         # central de ajuda, paginação, contato estável e permissões na tela
node teste-celular-ui.mjs     # telas a 390px, termos em modal no cadastro e o painel sem repetições
node teste-planos-ui.mjs --resetar-banco  # APAGA o banco: regra de publicação, cadastro em 3 etapas, troca e cancelamento
```

O `teste-planos-ui.mjs` **apaga o banco local**: roda o seed no começo e no fim, para partir sempre
do cenário do [DEMO.md](DEMO.md) e deixá-lo pronto para a demonstração. Por isso ele só roda com
pedido explícito, `npm run test:e2e:planos` (ou `node teste-planos-ui.mjs --resetar-banco`), e fica
fora do `npm run test:e2e`. Ele abre o checkout de testes do AbacatePay, então precisa da
`ABACATEPAY_API_KEY` de Dev mode e de internet; a aprovação do pagamento vem da simulação do admin,
que aplica o mesmo tratamento do aviso do gateway.

Ou, da raiz, `npm run test:e2e` roda as cinco que não mexem no banco, em sequência. Se o frontend estiver em outra porta, informe:
`APP_URL=http://localhost:5174 npm run test:e2e`. O `teste-erros-ui.mjs` derruba de fora o
arquivo de uma tela, para provocar a falha sem nenhum código de teste dentro do site.

O `teste-desempenho.mjs` lê a pasta `frontend/dist`, então precisa de um `npm run build` recente; ele
não abre o navegador.

As capturas de tela vão para `docs/`. `cdp.mjs` guarda o driver e os utilitários compartilhados
(`abrirNavegador`, `entrarNoSistema`, `cabecalhoAdmin` e o placar `criarPlacar`), e usa as contas do seed, então depende das
senhas definidas no `.env`. Cada execução cria um perfil descartável do navegador e o apaga ao
terminar, inclusive após uma interrupção.

As suítes anteriores (vitrine pública, autenticação, painel do administrador, auditoria, horários)
foram escritas em uma pasta temporária e se perderam; o que sobrou está listado acima.

### API (Thunder Client e Postman)

As coleções prontas, com as 42 requisições na ordem certa e o token preenchido automaticamente
depois do login, estão em `docs/thunder-client/` e `docs/postman/`. O passo a passo de cada
requisição, com corpo e resposta esperada, está em
[`docs/roteiro-testes-api.md`](docs/roteiro-testes-api.md). Pela linha de comando:

```bash
newman run docs/postman/vitrinelocal.postman_collection.json   -e docs/postman/vitrinelocal.postman_environment.json
```

## Tratamento de erros

A regra vale nas duas pontas: **o usuário recebe uma frase escrita por nós; o detalhe técnico fica no
log do servidor ou no console de quem desenvolve.** Pilha de chamadas, caminho de arquivo, endereço
de banco e nome de biblioteca contam como o sistema é feito por dentro.

**No backend.** [`utils/erros.js`](backend/src/utils/erros.js) cria os erros com `erroHttp(status,
mensagem)`, que marca a mensagem como própria para exibição. O
[`errorHandler`](backend/src/middlewares/errorHandler.js) só repassa o texto de erros marcados assim;
qualquer outro vira uma mensagem padrão do status, e o original vai para o log junto da rota que
falhou. A rota 404 não repete mais o endereço pedido, e a recusa do CORS não devolve a origem
bloqueada.

**No frontend.** Uma tela que quebra agora cai em
[`PaginaErro`](frontend/src/components/ui/PaginaErro/PaginaErro.jsx), no lugar da tela de erro do
React Router, que imprime a pilha de chamadas e um recado para o desenvolvedor. São dois níveis: o de
fora pega falhas da Navbar e do Footer; o de dentro pega falhas de uma tela e continua desenhado com
o menu por cima, para a pessoa seguir navegando.

Em [`api.js`](frontend/src/services/api.js), `mensagemSegura` decide o que pode aparecer: recusa
texto de mais de uma linha, com HTML, com caminho de arquivo, com endereço IP ou com código de
sistema (`ECONNREFUSED`), e nunca aproveita a mensagem de uma resposta 5xx, que pode ter vindo de um
proxy no meio do caminho. Resposta que não é JSON também não vira mensagem.

## Desempenho

**O que a primeira visita baixa.** Cada tela é um arquivo à parte, carregado quando alguém entra
nela: `lazy` + `Suspense` em [`App.jsx`](frontend/src/App.jsx). A home fica de fora da divisão porque
é a porta de entrada. O mapa é separado de novo dentro da página, em
[`MapaPreguicoso.jsx`](frontend/src/components/ui/Mapa/MapaPreguicoso.jsx), com uma caixa de espera da
mesma altura para o conteúdo em volta não pular.

| | Antes | Depois |
|---|---|---|
| Arquivos na primeira visita | 1 pacote | 7 arquivos |
| Tamanho | 753 kB (224 kB comprimidos) | 380 kB (114 kB comprimidos) |

Quem só olha a vitrine deixa de baixar o painel do administrador (30 kB), o leitor de markdown dos
termos (118 kB) e o Leaflet (157 kB).

**Respostas da API.** `compression()` no Express: o catálogo em JSON sai de 6,0 kB para 1,5 kB.

**Consultas.** Além das chaves estrangeiras, o banco tem índices para os filtros da vitrine:
`empreendedores(ativo, categoria)`, `empreendedores(ativo, bairro)` e `produtos(disponivel, tipo)`.
O filtro por cidade não ganhou índice de propósito, porque a consulta usa `LIKE` com `%` na frente e
o MySQL não resolve isso por índice.

**Paginação.** `/produtos` e `/empreendedores` aceitam `pagina` e `porPagina`, com contagem e busca
em paralelo. Sem esses parâmetros a resposta continua inteira, por compatibilidade.

**Já existiam antes:** `loading="lazy"` nas imagens dos cards, debounce de 400 ms na busca e cache de
GET com revalidação em segundo plano em [`api.js`](frontend/src/services/api.js) — é o que evita a
tela piscar "Carregando" a cada navegação.

## Publicação no Render

O projeto sobe no Render pelo Blueprint [`render.yaml`](render.yaml), que cria a API (web service) e o
site (static site), os dois no plano gratuito. O MySQL fica no Aiven e as fotos enviadas no
Cloudinary, também gratuitos. O passo a passo completo, com a preparação do banco pela sua máquina
(`npm run aiven:migrar`, `aiven:criar-usuario` e `aiven:seed`) e o cadastro do webhook do AbacatePay
(`npm run abacatepay:webhook`), está em [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md).

## Branches

| Branch | Papel |
|---|---|
| `dev` | Desenvolvimento. Todo trabalho novo entra aqui, em commits pequenos |
| `qa` | Conferência: recebe a `dev` quando uma etapa fica pronta, para testar antes de publicar |
| `prod` | Versão aprovada, que recebe a `qa` |
| `main` | É dela que o Render publica hoje. A configuração do Render não foi alterada |

O caminho é `dev → qa → prod`, sempre por merge, sem commit direto em `qa` ou `prod`. Enquanto o
Render continuar apontando para a `main`, o que chega em `prod` também precisa ir para a `main`
para ser publicado. Apontar o Render para a `prod` é uma troca no painel dele, que não foi feita.

## Solução de problemas

**Todas as telas dizem "Não foi possível falar com o servidor", com o backend no ar.** O navegador
não conseguiu chamar a API. Se o log do backend mostrar `CORS recusou a origem ...`, a página foi
aberta de um endereço que a API não aceita. Em desenvolvimento, sem `CORS_ORIGINS`, ela aceita a
própria máquina em qualquer porta (`localhost`, `127.0.0.1` ou `[::1]`); isso cobre o Vite subindo na
5174 quando a 5173 já está ocupada por outro servidor esquecido aberto. Com `CORS_ORIGINS`
preenchida, vale só a lista. Confira também se não há dois servidores do frontend rodando.

**A API responde 503 "O serviço está indisponível no momento".** O banco está fora do ar ou a
conexão caiu. `GET /api/health` confirma: ele consulta o banco e responde `503` com
`"banco": "indisponivel"` nesse caso (antes respondia "operando" mesmo sem banco). Confira se o
serviço `MySQL80` está rodando. Quando o banco volta, o Prisma reconecta sozinho, sem reiniciar o
backend. O motivo técnico (host, porta, código do erro) fica só no log do servidor.

**Abri http://localhost:3001 e apareceu uma mensagem em JSON.** Essa porta é a da API, não a do
site. A raiz responde dizendo isso; o site fica em **http://localhost:5173**. Um endereço da API que
não existe responde `{"success":false,"message":"Rota não encontrada"}`, sem repetir o caminho
pedido; o caminho fica no log do servidor, como `GET /qualquer-coisa -> 404`.

**Tudo responde "Muitas requisições. Tente novamente em alguns minutos."** É o limite de 600
requisições a cada 15 minutos por endereço IP. Em desenvolvimento, a própria máquina (`localhost`)
fica fora da conta: as suítes de teste fazem centenas de chamadas, e o navegador do desenvolvedor,
inclusive no modo celular, sai do mesmo endereço. Se aparecer num celular de verdade na rede local,
reinicie o backend, que zera a contagem. Em produção o limite vale para todos.

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `P1000: Authentication failed` ao migrar | Senha errada em `DATABASE_URL_MIGRACAO` | Ajuste `backend/.env`. No XAMPP a senha do root costuma ser vazia |
| `P1000: Authentication failed` ao subir o backend | A conta da aplicação não existe ou a senha mudou | `npm run banco:criar-usuario`, que cria a conta ou realinha a senha com o `.env` |
| `CREATE command denied to user 'vitrine_app'` | Migration rodada com a conta da aplicação | Use `npm run prisma:migrate` ou `prisma:deploy`, que trocam para a conta de administrador |
| `P1001: Can't reach database server` | MySQL parado | Inicie o serviço MySQL ou o XAMPP |
| Frontend mostra "Não foi possível conectar ao servidor" | Backend não está rodando | Rode `npm run dev:backend` em outro terminal |
| Aviso `package.json#prisma is deprecated` | Prisma 6 avisa sobre o Prisma 7 | Apenas um aviso; o seed funciona normalmente |
| Porta 3001 ou 5173 em uso | Outro processo na porta | Altere `PORT` no backend ou rode `npm run dev -- --port 5174` no frontend |
| Botão "Localizar no mapa" não encontra o endereço | Nominatim não reconheceu a rua ou está sem rede | Confira a grafia, tente sem o número, ou informe latitude e longitude manualmente |
| API responde `401` em rotas que antes eram abertas | Depois do marketplace, gerenciar e ler mensagens exige login | Envie `Authorization: Bearer <token>` obtido em `/auth/login` |
| API responde `403` com token válido | Perfil sem permissão para aquela rota, ou tentativa de mexer em registro de outro dono | Confira o perfil em `/auth/me`; é o comportamento esperado |
| Login falha com "JWT_SECRET não definido" | Variável ausente no `backend/.env` | Defina `JWT_SECRET` e reinicie o backend |
| Seed aborta reclamando de senha | `ADMIN_SENHA` ou `DEMO_EMPREENDEDOR_SENHA` ausentes | Defina as duas no `.env`; o seed não usa senha padrão de propósito |
| Conta não entra e a mensagem fala em conta desativada | A administração desativou o acesso | Reative na aba Contas do painel |
| Um estilo novo não aparece no navegador | O Vite leu o `.css` no instante em que ele estava sendo salvo e guardou a versão vazia. Acontece com mais facilidade em pastas sincronizadas, como o OneDrive | Salve o arquivo de novo ou reinicie `npm run dev:frontend` |
| Negócio aparece como "Indisponível para atendimento" | Está fora do horário informado, ou o dono ainda não informou o horário | Confira o horário em "Meu negócio", em Editar dados. A página diz quando o negócio abre de novo |
| Cadastro de negócio recusa a categoria | Só valem Artesanato, Alimentação, Serviços, Moda e Beleza | Escolha uma delas; não existe mais a categoria "Geral" |
| A rolagem da roda do mouse vai aos saltos e nada no site desliza | Os "Efeitos de animação" do Windows estão desligados. Com isso, navegadores baseados no Chromium desligam a rolagem suave em todos os sites e pedem menos movimento a eles | Ligue em Configurações > Acessibilidade > Efeitos visuais > Efeitos de animação |
| Assinar um plano dá erro (a API responde `502`) | Falta `ABACATEPAY_API_KEY`, a chave não é a de Dev mode (`abc_dev_`), falta permissão na chave ou o AbacatePay está fora do ar | O motivo exato fica no log do backend. O escopo da chave está descrito em `backend/.env.example` |
| Paguei e o painel ainda mostra o plano antigo | O aviso do pagamento ainda não chegou | Abra "Meu negócio" de novo: a conciliação consulta o gateway. Na demonstração, use "Simular aprovação" no Admin |
| `npm audit` aponta `deepmerge-ts` (alta) | Dependência transitiva do CLI do Prisma, usada só em desenvolvimento | Não afeta a API em execução. Não rode `npm audit fix --force`, pois ele rebaixa o Prisma |
