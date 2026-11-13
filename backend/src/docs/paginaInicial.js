// Página inicial da documentação, aberta na raiz da API pelo navegador.
// Segue o roteiro de uma documentação de aula: apresentação, URL base, o que a
// API disponibiliza, primeiros passos num cliente HTTP, alguns endpoints,
// exemplos de requisição e os códigos HTTP. Os grupos, endpoints e exemplos
// saem do mesmo documento OpenAPI do Swagger, para as duas não divergirem.
import { ENDPOINTS, EXEMPLOS, GRUPOS } from './openapi.js';

const REPOSITORIO = 'https://github.com/NSIX06/VitrineRondon';
const SITE = 'https://vitrinerondon-1.onrender.com';

/**
 * Topo igual ao do site (Navbar): serrilha, o desenho da vitrine, o traço
 * inclinado e o nome em letreiro, "Rondon" em ouro com a estrelinha de brilho.
 * Usado também na página do Swagger.
 */
export function cabecalhoDaMarca({ status = true } = {}) {
  return `<header class="navbar">
      <div class="serrilha" aria-hidden="true"></div>
      <div class="conteudo navbar__conteudo">
        <a class="navbar__marca" href="/" aria-label="VitrineRondon: documentação da API">
          <img class="navbar__logo" src="/api/docs/arquivos/logo.svg" alt="" width="64" height="49">
          <span class="navbar__divisor" aria-hidden="true"></span>
          <span class="navbar__nome"><span class="letreiro">Vitrine</span><span class="letreiro letreiro--ouro letreiro--brilho">Rondon</span></span>
          <span class="navbar__api">API</span>
        </a>
        ${status ? '<span class="status" id="status" role="status">Verificando API...</span>' : `<a class="navbar__voltar" href="/">Início da documentação</a>`}
      </div>
    </header>`;
}

/** Rodapé igual ao do site: serrilha, listras, hachuras e o nome em letreiro claro */
export function rodapeDaMarca() {
  return `<footer class="footer">
      <div class="serrilha" aria-hidden="true"></div>
      <div class="conteudo footer__colunas">
        <div class="footer__coluna">
          <span class="footer__marca"><span class="letreiro letreiro--claro">Vitrine</span><span class="letreiro letreiro--ouro">Rondon</span></span>
          <p class="footer__texto">Uma vitrine digital para quem produz e trabalha perto de você. Projeto acadêmico, Rondonópolis-MT.</p>
        </div>
        <nav class="footer__coluna" aria-label="Links da documentação">
          <span class="footer__titulo">Documentação</span>
          <a href="/">Início</a>
          <a href="/api/docs">Swagger</a>
          <a href="/api/docs/openapi.yaml">OpenAPI (YAML)</a>
          <a href="/api/docs/openapi.json">OpenAPI (JSON)</a>
        </nav>
        <nav class="footer__coluna" aria-label="Links do projeto">
          <span class="footer__titulo">Projeto</span>
          <a href="${SITE}">Site do VitrineRondon</a>
          <a href="${REPOSITORIO}">Código-fonte no GitHub</a>
          <a href="${REPOSITORIO}/tree/main/docs/postman">Coleção do Postman</a>
        </nav>
      </div>
    </footer>`;
}

const escapar = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Endpoints em destaque na seção "Alguns endpoints" */
const DESTAQUES = [
  ['get', '/produtos'],
  ['get', '/produtos/{id}'],
  ['get', '/empreendedores'],
  ['get', '/empreendedores/{id}'],
  ['get', '/empreendedores/{id}/avaliacoes'],
  ['post', '/auth/login'],
  ['post', '/produtos'],
  ['put', '/produtos/{id}'],
  ['delete', '/produtos/{id}'],
  ['post', '/contatos'],
  ['get', '/planos'],
  ['post', '/assinaturas'],
];

const CODIGOS = [
  ['200 OK', 'Consulta, atualização ou exclusão concluída.'],
  ['201 Created', 'Registro criado com sucesso; o recurso volta na resposta.'],
  ['204 No Content', 'Evento de métrica registrado, sem corpo na resposta.'],
  ['400 Bad Request', 'Requisição ilegível: JSON malformado ou ID que não é número.'],
  ['401 Unauthorized', 'Sem token, ou com token inválido, expirado ou de sessão encerrada.'],
  ['403 Forbidden', 'Logado, mas sem permissão (perfil ou dono diferente).'],
  ['404 Not Found', 'O recurso indicado pela rota não existe ou está fora da vitrine.'],
  ['409 Conflict', 'Conflito com uma regra, como e-mail já cadastrado ou segunda avaliação do mesmo cliente.'],
  ['410 Gone', 'Link de recuperação de senha já usado ou expirado.'],
  ['422 Unprocessable Content', 'Dados inválidos; os detalhes de cada campo vêm em "errors".'],
  ['429 Too Many Requests', 'Limite de requisições atingido; espere alguns minutos.'],
  ['500 Internal Server Error', 'Erro inesperado; o detalhe técnico fica só no log do servidor.'],
  ['503 Service Unavailable', 'Banco ou gateway de pagamento fora do ar; tente de novo em instantes.'],
];

const resumoDe = (metodo, caminho) => ENDPOINTS.find(([m, c]) => m === metodo && c === caminho)?.[2].resumo ?? '';

const metodo = (m) => `<span class="metodo metodo--${m}">${m.toUpperCase()}</span>`;

function secaoGrupos() {
  const itens = Object.entries(GRUPOS)
    .map(([nome, texto]) => {
      const total = ENDPOINTS.filter(([, , o]) => o.tag === nome).length;
      return `<article class="cartao"><h3>${escapar(nome)}</h3><p>${escapar(texto)}</p><span class="cartao__total">${total} ${total === 1 ? 'endpoint' : 'endpoints'}</span></article>`;
    })
    .join('');
  return `<div class="grade">${itens}</div>`;
}

function secaoEndpoints() {
  const linhas = DESTAQUES.map(
    ([m, c]) => `<li>${metodo(m)}<code>/api${escapar(c)}</code><span>${escapar(resumoDe(m, c))}</span></li>`
  ).join('');
  return `<ul class="endpoints">${linhas}</ul>
    <p class="nota">São ${ENDPOINTS.length} endpoints ao todo. A lista completa, com parâmetros e respostas, está no <a href="/api/docs">Swagger</a>.</p>`;
}

function secaoExemplos() {
  return Object.entries(EXEMPLOS)
    .map(([chave, exemplo]) => {
      const [m, c] = chave.split(' ');
      return `<article class="exemplo">
        <h3>${escapar(exemplo.titulo)} · ${metodo(m)} <code>/api${escapar(c)}</code></h3>
        <pre><code>${escapar(JSON.stringify(exemplo.corpo, null, 2))}</code></pre>
        ${exemplo.observacao ? `<p class="nota">${escapar(exemplo.observacao)}</p>` : ''}
      </article>`;
    })
    .join('');
}

function secaoCodigos() {
  const linhas = CODIGOS.map(([codigo, texto]) => {
    const classe = codigo.startsWith('2') ? 'ok' : codigo.startsWith('4') ? 'cliente' : 'servidor';
    return `<li><strong class="codigo codigo--${classe}">${codigo}</strong><span>${escapar(texto)}</span></li>`;
  }).join('');
  return `<ul class="codigos">${linhas}</ul>
    <p>Erro de validação, sempre no mesmo formato:</p>
    <pre><code>${escapar(
      JSON.stringify(
        { success: false, message: 'Dados inválidos', errors: { preco: ['O preço deve ser maior que zero'], nome: ['Nome deve ter ao menos 2 caracteres'] } },
        null,
        2
      )
    )}</code></pre>`;
}

let pagina;

/** HTML da página inicial (montado uma vez) */
export function paginaInicial() {
  if (pagina) return pagina;
  pagina = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>API VitrineRondon</title>
    <link rel="stylesheet" href="/api/docs/inicio.css">
  </head>
  <body>
    ${cabecalhoDaMarca()}

    <section class="faixa faixa--anil heroi">
      <div class="conteudo">
        <span class="rotulo">Desenvolvimento de Sistemas Distribuídos</span>
        <h1>API REST do VitrineRondon</h1>
        <p>
          A vitrine digital de quem empreende em Rondonópolis-MT. Esta API entrega os negócios, os produtos e
          serviços, as avaliações e as assinaturas para o site, e pode ser consultada e testada por qualquer
          cliente HTTP: Postman, Bruno, Insomnia ou o próprio navegador.
        </p>
        <div class="acoes">
          <a class="botao botao--destaque" href="/api/docs">Abrir documentação Swagger</a>
          <a class="botao botao--claro" href="/api/produtos">Testar GET /api/produtos</a>
          <a class="botao botao--claro" href="/api/docs/openapi.yaml">Ver arquivo OpenAPI</a>
        </div>
        <p class="base">
          <strong>Base URL:</strong> <code>/api</code>
          · produção <code>https://vitrinerondon.onrender.com/api</code>
          · local <code>http://localhost:3001/api</code>
        </p>
      </div>
    </section>

    <main class="conteudo">

      <section>
        <h2>O que esta API disponibiliza?</h2>
        ${secaoGrupos()}
      </section>

      <section>
        <h2>Primeiros passos com o Postman (ou Bruno)</h2>
        <ol class="passos">
          <li>
            <h3><span>1</span> Configure a requisição</h3>
            <p>Escolha o método (GET, POST, PUT, PATCH ou DELETE) e monte a URL com a base e a rota:
            <code>http://localhost:3001</code> + <code>/api</code> + <code>/produtos</code>. A coleção pronta está em
            <a href="${REPOSITORIO}/tree/main/docs/postman">docs/postman</a> no repositório.</p>
          </li>
          <li>
            <h3><span>2</span> Defina os cabeçalhos</h3>
            <p><code>Content-Type: application/json</code> nas requisições com corpo. Nas rotas com cadeado no Swagger,
            entre em <code>POST /api/auth/login</code> e envie <code>Authorization: Bearer &lt;token&gt;</code>.</p>
          </li>
          <li>
            <h3><span>3</span> Consulte IDs</h3>
            <p>Antes de editar, avaliar ou assinar, pegue IDs que existem: <code>GET /api/produtos</code>,
            <code>GET /api/empreendedores</code> e <code>GET /api/planos</code>.</p>
          </li>
          <li>
            <h3><span>4</span> Envie e interprete</h3>
            <p>Confira o status HTTP e o corpo. Toda resposta segue <code>{ success, message, data }</code>; listas
            paginadas trazem <code>paginacao</code> e erros de validação trazem <code>errors</code> por campo.</p>
          </li>
        </ol>
      </section>

      <section>
        <h2>Alguns endpoints</h2>
        ${secaoEndpoints()}
      </section>

      <aside class="aviso">
        <strong>Uso acadêmico:</strong> os pagamentos rodam no AbacatePay em modo de testes e nenhum cartão é
        cobrado. As assinaturas e métricas do seed são de demonstração. No plano gratuito do Render, a API dorme
        depois de 15 minutos sem acesso e leva cerca de 1 minuto para acordar na primeira chamada.
      </aside>

      <section>
        <h2>Exemplos de requisição</h2>
        ${secaoExemplos()}
      </section>

      <section>
        <h2>Entenda os códigos HTTP</h2>
        ${secaoCodigos()}
      </section>

      <aside class="aviso aviso--dica">
        <strong>Dica:</strong> só aparecem na vitrine os negócios com plano em vigor; cadastrar ou editar itens
        do catálogo exige plano ativo. Cada conta faz uma avaliação por negócio, e o dono não avalia o próprio.
        Use IDs que existem na resposta da API, e lembre que campos extras no corpo são ignorados.
      </aside>
    </main>

    ${rodapeDaMarca()}
    <script src="/api/docs/inicio.js"></script>
  </body>
</html>`;
  return pagina;
}

/** Indicador de status no topo: consulta /api/health */
export const SCRIPT_INICIO = `(function () {
  var status = document.getElementById('status');
  fetch('/api/health', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      status.textContent = res.ok ? 'API no ar · banco ' + res.d.banco : 'API com problema · banco ' + (res.d.banco || '?');
      status.className = 'status ' + (res.ok ? 'status--ok' : 'status--erro');
    })
    .catch(function () {
      status.textContent = 'API indisponível';
      status.className = 'status status--erro';
    });
})();`;

/** Estilo da página inicial: o CSS fica em docs/inicio.css (as mesmas peças do site) */
