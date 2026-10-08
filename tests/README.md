# Testes de unidade

Cada arquivo `.test.js` cobre um módulo do sistema. Rodam sem banco, sem rede e
sem servidor no ar, com [Vitest](https://vitest.dev).

```bash
npm test            # roda tudo uma vez
npm run test:watch  # reexecuta a cada arquivo salvo
npx vitest run tests/backend/horarios.test.js   # um arquivo só
```

## O que cada arquivo cobre

### `backend/`

| Arquivo | Módulo | O que garante |
|---|---|---|
| `erros.test.js` | `utils/erros.js` | `erroHttp` marca a mensagem como exibível, `parseId` recusa id forjado, nenhuma mensagem padrão descreve o sistema |
| `errorHandler.test.js` | `middlewares/errorHandler.js` | cada tipo de falha vira a resposta certa e o detalhe técnico fica só no log |
| `auth.test.js` | `middlewares/auth.js` | token leva só id e perfil, o perfil vem do banco a cada requisição, conta desativada é 403 |
| `validate.test.js` | `middlewares/validate.js` | corpo inválido não chega ao controller e campo desconhecido é descartado |
| `rateLimit.test.js` | `middlewares/rateLimit.js` | o login corta na décima tentativa, cada IP conta separado e, fora de produção, a própria máquina não entra na conta |
| `horarios.test.js` | `services/horarios.js` | semana sem sobreposição, no máximo 4 intervalos por dia, edição troca a semana inteira |
| `termos.test.js` | `services/termos.js` | os dois documentos são lidos do disco e o tipo nunca vira caminho de arquivo |
| `auditoria.test.js` | `services/auditoria.js` | senha e token não entram no log, só o que mudou é guardado, falha ao gravar não derruba a operação |
| `schemas-empreendedor.test.js` | `controllers/empreendedorController.js` | categoria da lista, coordenada dentro do planeta, e o padrão do estado não vaza para a edição parcial |
| `schemas-produto.test.js` | `controllers/produtoController.js` | preço positivo, e a edição não transfere o item para outro negócio nem transforma serviço em produto |
| `schemas-conta.test.js` | `controllers/authController.js` | força da senha, confirmação, telefone com DDD e os dois aceites obrigatórios |
| `schemas-admin.test.js` | contato e usuário | mensagem da comunidade e moderação de conta |
| `faq.test.js` | `controllers/faqController.js` | público só com ativas e em ordem, id gerado no cadastro, edição que não reativa sozinha, limites de 300 caracteres e auditoria |
| `paginacao.test.js` | `utils/paginacao.js` | sem página a lista vem inteira; página e tamanho inválidos são recusados com 400 |
| `planos.test.js` | `prisma/planos.js` | preços em centavos, só o Destaque liga selo, métricas ampliadas e divulgação, nenhum texto promete resultado, e o seed atualiza sem apagar nem desligar o plano do gateway |
| `assinaturas.test.js` | `services/assinaturas.js` | pagamento ativa e publica até o vencimento, cobrança recusada tira da vitrine na hora, cancelamento respeita o período pago, vencimento sem renovação tira pela data, evento repetido não muda nada, troca de plano nos dois sentidos, conciliação no localhost, simulação bloqueada em produção e assinaturas do seed que nunca chamam o gateway |
| `publicacao.test.js` | `services/publicacao.js` | navegar é gratuito e divulgar exige plano em vigor: filtro público, situação do negócio (rascunho, aguardando pagamento, ativo, expirado, suspenso), benefícios só no período pago e as mesmas situações na tela |
| `pagamento-abacatepay.test.js` | `services/pagamento/abacatepay.js` | chave de produção recusada sem liberação, chamadas no formato da API v2, produto sem duplicar, webhook só com segredo e HMAC válidos e tradução dos eventos |
| `metricas.test.js` | `services/metricas.js` | dia no fuso de Rondonópolis, cada visitante conta uma vez por janela (sem cookie nem IP no banco), dono e admin não contam, produto só do próprio negócio, painel básico e ampliado, o rodízio da seção de destaques e os tipos de evento iguais aos do site |
| `divulgacoes.test.js` | `controllers/divulgacaoController.js` | divulgação só com plano de divulgação e consentimento do empreendedor, data de publicação automática, auditoria e os tipos e status iguais aos da tela |
| `imagens.test.js` | `services/imagens.js` | envio vira WebP de até 1600 px sem metadados, arquivo que não é imagem é recusado, caminho forjado nunca é aceito nem apagado, e a imagem só sai do disco quando nenhum cadastro a usa |

### `frontend/`

| Arquivo | Módulo | O que garante |
|---|---|---|
| `api.test.js` | `services/api.js` | filtro das mensagens de erro, query dos filtros, token da sessão, cache de leitura e aviso de sessão perdida |
| `horarios.test.js` | `services/horarios.js` | "aberto agora" no fuso de Rondonópolis, incluindo virada de dia, almoço e fim de semana |
| `geocodificacao.test.js` | `services/geocodificacao.js` | segunda tentativa no Nominatim, cache por endereço e nenhuma coordenada inventada |
| `whatsapp.test.js` | `services/whatsapp.js` | código do país sem duplicar o 55 e mensagem inicial escapada |
| `planos-metricas.test.js` | `services/planos.js` e `services/metricas.js` | preço em reais a partir de centavos, ciclo em português, e o registro de métricas com keepalive, com o token do dono e sem quebrar a página quando a rede falha |
| `formatos-formularios.test.js` | `services/formatos.js` e `services/validacoes.js` | preço e números no padrão brasileiro (valor ausente vira zero) e os erros de validação do servidor viram mensagens por campo, com o grupo do nome removido quando pedido |
| `imagens.test.js` | `services/imagens.js` | imagem enviada aponta para o servidor da API, link antigo passa intacto, formato e tamanho conferidos antes do envio, o arquivo vai cru, sem virar JSON, e formatos e tamanho máximo iguais aos da API |
| `sessao.test.js` | `contexts/auth.js`, `services/validacoes.js`, `services/constantes.js` | destino de cada perfil depois do login e aceites obrigatórios |
| `fontes.test.js` | `services/fontes.js` | toda afirmação do site aponta para uma fonte com endereço e data |
| `faq.test.js` | `services/faq.js` | busca sem acento e com várias palavras, filtro por assunto e os mesmos limites do servidor |

Quatro testes comparam os dois lados de propósito: as categorias, os perfis, a
validação de horários e os limites do FAQ precisam combinar, ou a tela deixa salvar o que a API
recusa.

## O que não está aqui

- **Handlers HTTP** (`listarProdutos`, `login`, `criarMeuNegocio`…) dependem do
  banco. Estão cobertos de ponta a ponta pela coleção do Postman
  (`docs/postman/`, 45 requisições) e pelo roteiro em `docs/roteiro-testes-api.md`.
- **Componentes React e o hook `useConsulta`** precisam de um renderizador
  (`@testing-library/react` e `jsdom`), que o projeto ainda não usa. O
  comportamento deles é verificado no navegador pelas suítes de `tests-e2e/`.
- **Telas**: `tests-e2e/` abre o Microsoft Edge e confere mapa, senha visível,
  setas de navegação, tela de erro e tamanho do que a primeira visita baixa.
