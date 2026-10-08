# Roteiro de testes da API

Passo a passo para testar a API da VitrineLocal uma requisição por vez, no Thunder Client ou no
Postman. As duas coleções têm as mesmas requisições, na mesma ordem e com os mesmos números.

Todas as chamadas vão para `http://localhost:3001/api`, a porta do backend. A porta 5173 é a do
site e não responde à API.

## Antes de começar

1. Suba o backend com `npm run dev:backend` e confira que a requisição 01 responde 200.
2. Importe a coleção e o ambiente no programa que for usar:
   - **Thunder Client:** aba Collections, menu ☰, Import, arquivo `docs/thunder-client/vitrinelocal.colecao.json`.
     Depois, aba Env, menu ☰, Import, arquivo `docs/thunder-client/vitrinelocal.ambiente.json`, e marque o ambiente como ativo.
   - **Postman:** botão Import, arraste `docs/postman/vitrinelocal.postman_collection.json` e
     `docs/postman/vitrinelocal.postman_environment.json`. Escolha "VitrineLocal (local)" no seletor de ambiente, no canto superior direito.
3. Rode as requisições na ordem dos números. Algumas guardam valores que as seguintes usam:
   - 02 e 03 guardam os tokens do administrador e do empreendedor;
   - 08 guarda um id de produto, usado na 10;
   - 14 guarda o id do negócio do Carlos, usado na 15, 16 e 28;
   - 17 guarda o id do produto criado, usado na 18 e 19;
   - 32 guarda o id da pergunta criada, usado da 33 à 37.

## Como rodar uma por vez

- **Thunder Client:** clique na requisição, depois em Send. A aba Response mostra a resposta, e a aba
  Tests mostra se o código veio como esperado. A aba Docs traz o que conferir.
- **Postman:** clique na requisição, depois em Send. O corpo aparece em Body, e o resultado da
  verificação em Test Results. A descrição da requisição traz o que conferir.

As senhas ficam nas variáveis do ambiente, lidas do `backend/.env`. O token vale 8 horas; se
aparecer 401 onde não deveria, rode de novo a 02 ou a 03.

## 1. Comece aqui

### 01. API no ar

```
GET {{baseUrl}}/health
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** Responde `success: true` e a mensagem "API VitrineRondon operando". Se falhar, o backend não está rodando.

### 02. Entrar como administrador

```
POST {{baseUrl}}/auth/login
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Guarda no ambiente:** `tokenAdmin`
- **Confira:** A resposta traz `data.token` e `data.usuario.perfil` igual a `ADMIN`. O token vai sozinho para a variável `tokenAdmin`.

Corpo (JSON):

```json
{
  "email": "{{adminEmail}}",
  "senha": "{{adminSenha}}"
}
```

### 03. Entrar como empreendedor (Carlos)

```
POST {{baseUrl}}/auth/login
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Guarda no ambiente:** `tokenEmpreendedor`
- **Confira:** O perfil vem como `EMPREENDEDOR`. O token vai para a variável `tokenEmpreendedor`.

Corpo (JSON):

```json
{
  "email": "{{empreendedorEmail}}",
  "senha": "{{empreendedorSenha}}"
}
```

### 04. Quem sou eu (admin)

```
GET {{baseUrl}}/auth/me
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** Mostra nome, e-mail e perfil da conta do token. A senha nunca aparece.

## 2. Vitrine pública (sem login)

### 05. Listar empreendedores

```
GET {{baseUrl}}/empreendedores
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** `total` traz a quantidade, e cada negócio vem com a lista `horarios`.

### 06. Empreendedores da categoria Moda

```
GET {{baseUrl}}/empreendedores?categoria=Moda
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** Só aparecem negócios da categoria Moda, como o Brechó da Ju.

### 07. Buscar empreendedores por texto

```
GET {{baseUrl}}/empreendedores?busca=bolo
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** A busca olha nome, responsável e descrição. "bolo" encontra a Doces da Dona Lu.

### 08. Listar produtos e serviços

```
GET {{baseUrl}}/produtos
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Guarda no ambiente:** `produtoId`
- **Confira:** Cada item vem com um resumo do negócio. O id do primeiro vai para a variável `produtoId`.

### 09. Somente serviços

```
GET {{baseUrl}}/produtos?tipo=servico
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** Todos os itens têm `tipo: "servico"`.

### 10. Detalhe de um produto

```
GET {{baseUrl}}/produtos/{{produtoId}}
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** Um único item, com os dados completos do empreendedor.

### 11. Termos de Uso

```
GET {{baseUrl}}/termos/TERMOS_DE_USO
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** Traz o texto em Markdown e a versão vigente.

### 12. Política de Privacidade

```
GET {{baseUrl}}/termos/POLITICA_PRIVACIDADE
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** Mesmo formato dos termos, com o texto da política.

### 13. Enviar mensagem de contato

```
POST {{baseUrl}}/contatos
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 201
- **Confira:** Código 201 e a mensagem salva. Ela aparece depois em "Mensagens recebidas", na pasta 4. Esta requisição grava dados de verdade.

Corpo (JSON):

```json
{
  "nome": "Teste API",
  "email": "teste.api@email.com",
  "telefone": null,
  "mensagem": "Mensagem enviada durante o teste da API.",
  "empreendedorId": null
}
```

## 3. Área do empreendedor (Carlos)

### 14. Meu negócio

```
GET {{baseUrl}}/empreendedores/meu
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 200
- **Guarda no ambiente:** `empreendedorId`
- **Confira:** O negócio do Carlos, com produtos e horários. O id vai para a variável `empreendedorId`. Rode esta antes das outras da pasta.

### 15. Detalhe público do meu negócio

```
GET {{baseUrl}}/empreendedores/{{empreendedorId}}
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** O mesmo negócio visto por um visitante, sem login.

### 16. Definir horário (08:00–12:00 e 13:00–17:00, seg a sex)

```
PUT {{baseUrl}}/empreendedores/{{empreendedorId}}
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 200
- **Confira:** A resposta volta com 10 intervalos. Na página do negócio, o selo "Disponível" passa a seguir esse horário. Esta requisição grava dados de verdade.

Corpo (JSON):

```json
{
  "horarios": [
    {
      "diaSemana": 1,
      "abre": "08:00",
      "fecha": "12:00"
    },
    {
      "diaSemana": 1,
      "abre": "13:00",
      "fecha": "17:00"
    },
    {
      "diaSemana": 2,
      "abre": "08:00",
      "fecha": "12:00"
    },
    {
      "diaSemana": 2,
      "abre": "13:00",
      "fecha": "17:00"
    },
    {
      "diaSemana": 3,
      "abre": "08:00",
      "fecha": "12:00"
    },
    {
      "diaSemana": 3,
      "abre": "13:00",
      "fecha": "17:00"
    },
    {
      "diaSemana": 4,
      "abre": "08:00",
      "fecha": "12:00"
    },
    {
      "diaSemana": 4,
      "abre": "13:00",
      "fecha": "17:00"
    },
    {
      "diaSemana": 5,
      "abre": "08:00",
      "fecha": "12:00"
    },
    {
      "diaSemana": 5,
      "abre": "13:00",
      "fecha": "17:00"
    }
  ]
}
```

### 17. Cadastrar produto no meu negócio

```
POST {{baseUrl}}/produtos
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 201
- **Guarda no ambiente:** `produtoId`
- **Confira:** Código 201. O id do item novo vai para `produtoId`, usado nas duas próximas.

Corpo (JSON):

```json
{
  "nome": "Item de teste da API",
  "descricao": "Criado durante o teste da API.",
  "preco": 25.5,
  "tipo": "servico",
  "empreendedorId": {{empreendedorId}},
  "disponivel": true
}
```

### 18. Alterar só o preço do produto

```
PUT {{baseUrl}}/produtos/{{produtoId}}
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 200
- **Confira:** O preço vira 30 e o tipo continua `servico`: a edição parcial não mexe no que não foi enviado.

Corpo (JSON):

```json
{
  "preco": 30
}
```

### 19. Excluir o produto

```
DELETE {{baseUrl}}/produtos/{{produtoId}}
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 200
- **Confira:** Mensagem de exclusão. Se repetir o "Detalhe de um produto" agora, a resposta passa a ser 404.

## 4. Administração

### 20. Mensagens recebidas

```
GET {{baseUrl}}/contatos
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** Inclui a mensagem enviada na pasta 2. Só o administrador consegue ler.

### 21. Contas cadastradas

```
GET {{baseUrl}}/usuarios
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** Lista as contas com perfil e negócio. Nenhuma traz `senhaHash`.

### 22. Auditoria (página 1, 10 por página)

```
GET {{baseUrl}}/auditoria?pagina=1&porPagina=10
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** `paginacao` informa total e número de páginas. Os registros vêm do mais novo para o mais antigo.

### 23. Auditoria: só entradas recusadas

```
GET {{baseUrl}}/auditoria?acao=LOGIN_RECUSADO
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** Só aparecem tentativas de login recusadas.

### 24. Opções dos filtros da auditoria

```
GET {{baseUrl}}/auditoria/opcoes
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** Ações, entidades e pessoas que existem de fato na trilha, com as quantidades.

## 5. Erros esperados (segurança e validação)

### 25. 401: mensagens sem login

```
GET {{baseUrl}}/contatos
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 401
- **Confira:** Sem token, a API recusa com "Faça login para continuar".

### 26. 403: empreendedor tentando ver contas

```
GET {{baseUrl}}/usuarios
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 403
- **Confira:** O token é válido, mas o perfil não tem permissão para essa rota.

### 27. 400: categoria fora da lista

```
POST {{baseUrl}}/empreendedores
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 400
- **Confira:** `errors` aponta o campo `categoria` e lista as opções válidas. Nada é gravado.

Corpo (JSON):

```json
{
  "nomeNegocio": "Teste",
  "responsavel": "Fulano",
  "categoria": "Geral",
  "cidade": "Rondonópolis",
  "whatsapp": "66999990000"
}
```

### 28. 400: horário com fim antes do início

```
PUT {{baseUrl}}/empreendedores/{{empreendedorId}}
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 400
- **Confira:** `errors` traz "O fim precisa ser depois do início". O horário salvo não muda.

Corpo (JSON):

```json
{
  "horarios": [
    {
      "diaSemana": 1,
      "abre": "12:00",
      "fecha": "08:00"
    }
  ]
}
```

### 29. 401: senha errada

```
POST {{baseUrl}}/auth/login
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 401
- **Confira:** A mensagem é a mesma para e-mail inexistente e senha errada. A tentativa entra na auditoria como `LOGIN_RECUSADO`.

Corpo (JSON):

```json
{
  "email": "{{adminEmail}}",
  "senha": "senha-errada"
}
```

## 6. Paginação e perguntas frequentes

### 30. Produtos: página 2, 5 por página

```
GET {{baseUrl}}/produtos?pagina=2&porPagina=5
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** No máximo 5 itens e o bloco `paginacao` com `pagina: 2`, `porPagina: 5`, o total e o total de páginas. Sem `pagina` na URL, a lista vem inteira, como na 08.

### 31. Perguntas frequentes (público)

```
GET {{baseUrl}}/faq
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** Só as perguntas visíveis, em ordem crescente de `ordem`. Nenhuma traz o campo `ativo`.

### 32. Criar pergunta (admin)

```
POST {{baseUrl}}/faq
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 201
- **Confira:** Código 201 e o `id` gerado pelo banco, que vai para `faqId`. A pergunta nasce com `ativo: true`.

Corpo (JSON):

```json
{
  "pergunta": "Pergunta de teste da API?",
  "resposta": "Resposta de teste.\nCom quebra de linha.",
  "categoria": "Teste",
  "ordem": 99
}
```

### 33. Todas as perguntas, inclusive ocultas (admin)

```
GET {{baseUrl}}/faq/todas
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** A pergunta criada na 32 está na lista, com `ativo` e as datas.

### 34. Editar e esconder a pergunta (admin)

```
PUT {{baseUrl}}/faq/{{faqId}}
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** O texto mudou, `ativo` virou `false`, a `ordem` continua 99 (não foi enviada) e `updatedAt` ficou depois de `createdAt`.

Corpo (JSON):

```json
{
  "pergunta": "Pergunta de teste da API, editada?",
  "ativo": false
}
```

### 35. Pergunta oculta não aparece no público

```
GET {{baseUrl}}/faq
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 200
- **Confira:** A pergunta escondida na 34 não está na lista.

### 36. Excluir a pergunta (admin)

```
DELETE {{baseUrl}}/faq/{{faqId}}
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 200
- **Confira:** Exclusão definitiva. Aparece na auditoria como `DELETE` de `PerguntaFrequente`.

### 37. 404: editar pergunta que já foi excluída

```
PUT {{baseUrl}}/faq/{{faqId}}
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 404
- **Confira:** A pergunta da 36 não existe mais.

Corpo (JSON):

```json
{
  "pergunta": "Não existe mais?"
}
```

### 38. 401: criar pergunta sem login

```
POST {{baseUrl}}/faq
```

- **Autenticação:** nenhuma
- **Resposta esperada:** 401
- **Confira:** A trava fica no servidor: esconder o botão na tela não bastaria.

Corpo (JSON):

```json
{
  "pergunta": "Pergunta de teste da API?",
  "resposta": "Resposta de teste.\nCom quebra de linha.",
  "categoria": "Teste",
  "ordem": 99
}
```

### 39. 403: empreendedor tentando criar pergunta

```
POST {{baseUrl}}/faq
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 403
- **Confira:** Só a administração mantém a central de ajuda.

Corpo (JSON):

```json
{
  "pergunta": "Pergunta de teste da API?",
  "resposta": "Resposta de teste.\nCom quebra de linha.",
  "categoria": "Teste",
  "ordem": 99
}
```

### 40. 403: empreendedor tentando ver as ocultas

```
GET {{baseUrl}}/faq/todas
```

- **Autenticação:** Bearer, token do empreendedor (`{{tokenEmpreendedor}}`)
- **Resposta esperada:** 403
- **Confira:** A lista completa é só da administração.

### 41. 400: pergunta vazia

```
POST {{baseUrl}}/faq
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 400
- **Confira:** `errors` aponta o campo `pergunta` com "A pergunta é obrigatória".

Corpo (JSON):

```json
{
  "pergunta": "",
  "resposta": "Resposta"
}
```

### 42. 400: pergunta com 301 caracteres

```
POST {{baseUrl}}/faq
```

- **Autenticação:** Bearer, token do administrador (`{{tokenAdmin}}`)
- **Resposta esperada:** 400
- **Confira:** "A pergunta pode ter até 300 caracteres". O corpo da coleção já traz os 301 caracteres.

Corpo (JSON):

```json
{
  "pergunta": "aaaa... (301 letras)",
  "resposta": "Resposta"
}
```
