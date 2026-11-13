// Página inicial da documentação, aberta na raiz da API pelo navegador.
// Segue o roteiro de uma documentação de aula: apresentação, URL base, o que a
// API disponibiliza, primeiros passos num cliente HTTP, alguns endpoints,
// exemplos de requisição e os códigos HTTP. Os grupos, endpoints e exemplos
// saem do mesmo documento OpenAPI do Swagger, para as duas não divergirem.
import { ENDPOINTS, EXEMPLOS, GRUPOS } from './openapi.js';

const REPOSITORIO = 'https://github.com/NSIX06/VitrineRondon';

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
    <header class="topo">
      <div class="conteudo topo__linha">
        <strong class="marca">API <span>VitrineRondon</span></strong>
        <span class="status" id="status" role="status">Verificando API...</span>
      </div>
    </header>

    <main class="conteudo">
      <section class="heroi">
        <span class="rotulo">Desenvolvimento de Sistemas Distribuídos</span>
        <h1>API REST do VitrineRondon</h1>
        <p>
          A vitrine digital de quem empreende em Rondonópolis-MT. Esta API entrega os negócios, os produtos e
          serviços, as avaliações e as assinaturas para o site, e pode ser consultada e testada por qualquer
          cliente HTTP: Postman, Bruno, Insomnia ou o próprio navegador.
        </p>
        <div class="acoes">
          <a class="botao botao--ouro" href="/api/docs">Abrir documentação Swagger</a>
          <a class="botao" href="/api/produtos">Testar GET /api/produtos</a>
          <a class="botao" href="/api/docs/openapi.yaml">Ver arquivo OpenAPI</a>
        </div>
        <p class="base">
          <strong>Base URL:</strong> <code>/api</code>
          · produção <code>https://vitrinerondon.onrender.com/api</code>
          · local <code>http://localhost:3001/api</code>
        </p>
      </section>

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

    <footer class="rodape">
      <div class="conteudo">
        VitrineRondon • Projeto acadêmico • Rondonópolis-MT •
        <a href="${REPOSITORIO}">Código-fonte no GitHub</a> •
        <a href="/api/docs/openapi.json">OpenAPI (JSON)</a>
      </div>
    </footer>
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

/** Estilo da página inicial, com as cores e o traço do VitrineRondon (DESIGN.md) */
export const ESTILO_INICIO = `
:root { --anil: #17346e; --anil-escuro: #0f2557; --ouro: #fbbf24; --ouro-claro: #fde68a; --tinta: #111827;
  --cinza: #374151; --papel: #f8f6f0; --branco: #fff; --verde: #15803d; --lacre: #9b1c1c;
  --titulo: 'Arial Black', 'Arial Bold', Arial, sans-serif; --texto: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--papel); color: var(--tinta); font: 500 16px/1.6 var(--texto); }
a { color: var(--anil); font-weight: 700; text-underline-offset: 3px; }
a:focus-visible, .botao:focus-visible { outline: 3px solid var(--ouro); outline-offset: 2px; }
code { font-family: ui-monospace, Consolas, monospace; font-size: .9em; background: var(--branco); border: 1px solid #cfc8b4; border-radius: 4px; padding: 0 .3em; }
.conteudo { max-width: 1040px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 40px); }
.topo { background: var(--anil); border-bottom: 3px solid var(--tinta); }
.topo__linha { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-block: 14px; }
.marca { color: var(--branco); font: 900 18px var(--titulo); }
.marca span { color: var(--ouro); }
.status { font-size: 14px; font-weight: 700; padding: 4px 12px; border: 2px solid var(--tinta); border-radius: 999px; background: var(--ouro-claro); }
.status--ok { background: #dcfce7; color: var(--verde); }
.status--erro { background: #fff1ef; color: var(--lacre); }
.heroi { padding: 40px 0 8px; }
.rotulo { display: inline-block; background: var(--ouro); border: 2px solid var(--tinta); border-radius: 4px; box-shadow: 3px 3px 0 var(--tinta);
  padding: 2px 10px; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; transform: rotate(-1.5deg); }
h1, h2, h3 { font-family: var(--titulo); color: var(--anil); line-height: 1.1; }
h1 { font-size: clamp(30px, 5vw, 48px); margin: 18px 0 12px; }
h2 { font-size: clamp(22px, 3vw, 28px); margin: 48px 0 16px; padding-bottom: 8px; border-bottom: 3px solid var(--tinta); }
h3 { font-size: 18px; margin: 0 0 6px; }
.heroi p { max-width: 70ch; color: var(--cinza); }
.acoes { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
.botao { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 18px; background: var(--branco); color: var(--anil);
  border: 3px solid var(--tinta); border-radius: 8px; box-shadow: 4px 4px 0 var(--tinta); text-decoration: none; transition: transform .12s, box-shadow .12s; }
.botao:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--tinta); }
.botao--ouro { background: var(--ouro); color: var(--tinta); }
.base { font-size: 15px; }
.grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.cartao, .exemplo, .passos li { background: var(--branco); border: 3px solid var(--tinta); border-radius: 12px; box-shadow: 5px 5px 0 var(--tinta); padding: 16px; }
.cartao p { margin: 0 0 8px; font-size: 15px; color: var(--cinza); }
.cartao__total { font-size: 13px; font-weight: 800; color: var(--anil); }
.passos { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
.passos h3 { display: flex; align-items: center; gap: 8px; }
.passos h3 span { display: inline-grid; place-items: center; width: 30px; height: 30px; background: var(--ouro); border: 2px solid var(--tinta); border-radius: 6px; color: var(--tinta); }
.passos p { margin: 0; font-size: 15px; }
.endpoints, .codigos { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.endpoints li, .codigos li { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; background: var(--branco); border: 2px solid var(--tinta); border-radius: 8px; padding: 8px 12px; }
.endpoints li span:last-child { color: var(--cinza); font-size: 15px; }
.metodo { display: inline-block; min-width: 68px; text-align: center; padding: 2px 8px; border: 2px solid var(--tinta); border-radius: 4px; font: 800 13px var(--texto); color: var(--branco); }
.metodo--get { background: #1d4ed8; }
.metodo--post { background: #15803d; }
.metodo--put { background: #b45309; }
.metodo--patch { background: #6d28d9; }
.metodo--delete { background: var(--lacre); }
.exemplo { margin-bottom: 20px; }
.exemplo h3 { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
pre { margin: 10px 0; padding: 14px; background: var(--anil-escuro); color: #f8fafc; border: 3px solid var(--tinta); border-radius: 8px; overflow-x: auto; }
pre code { background: none; border: 0; padding: 0; color: inherit; font-size: 14px; }
.codigo { display: inline-block; min-width: 230px; }
.codigo--ok { color: var(--verde); }
.codigo--cliente { color: #b45309; }
.codigo--servidor { color: var(--lacre); }
.nota { font-size: 14px; color: var(--cinza); margin: 6px 0 0; }
.aviso { margin: 40px 0 0; padding: 16px 18px; background: var(--ouro-claro); border: 2px dashed var(--tinta); border-radius: 8px; }
.aviso--dica { background: #e4ebfb; }
.rodape { margin-top: 56px; padding: 20px 0; background: var(--anil); color: #dbe4ff; border-top: 3px solid var(--tinta); font-size: 14px; }
.rodape a { color: var(--branco); }
@media (max-width: 560px) { .codigo { min-width: 0; } .endpoints li code { word-break: break-all; } }
@media (prefers-reduced-motion: reduce) { .botao { transition: none; } }
`;
