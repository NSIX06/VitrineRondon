// Documentação da API: o contrato em OpenAPI e a tela do Swagger UI.
//   GET /api/docs               tela interativa (Swagger UI)
//   GET /api/docs/openapi.json  o contrato em JSON, para Postman, Insomnia etc.
//   GET /api/docs/openapi.yaml  o mesmo contrato em YAML (Bruno, Swagger Editor)
// A página inicial (raiz da API no navegador) usa inicio.css e inicio.js daqui.
//
// O resto da API só devolve JSON e tem a CSP fechada (default-src 'none').
// Aqui a tela precisa de script, estilo e imagem, então a política é aberta só
// o necessário e só nestas rotas: tudo vem do próprio servidor, sem script
// inline (a configuração do Swagger fica num arquivo próprio).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Router } from 'express';
import { getAbsoluteFSPath } from 'swagger-ui-dist';
import { especificacaoOpenApi } from '../docs/openapi.js';
import { paraYaml } from '../docs/yaml.js';
import { SCRIPT_INICIO, cabecalhoDaMarca, rodapeDaMarca } from '../docs/paginaInicial.js';

const PASTA_DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');

const router = Router();

const CSP_DA_DOCUMENTACAO = [
  "default-src 'none'",
  "script-src 'self'",
  // O Swagger UI escreve estilo direto nos elementos (style="...")
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

router.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP_DA_DOCUMENTACAO);
  next();
});

const PAGINA = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Swagger · API VitrineRondon</title>
    <link rel="stylesheet" href="/api/docs/swagger-ui.css">
    <link rel="stylesheet" href="/api/docs/inicio.css">
  </head>
  <body class="swagger-pagina">
    ${cabecalhoDaMarca({ status: false })}
    <div id="swagger-ui" class="conteudo"></div>
    ${rodapeDaMarca()}
    <script src="/api/docs/swagger-ui-bundle.js"></script>
    <script src="/api/docs/iniciar.js"></script>
  </body>
</html>`;

const INICIAR = `window.ui = SwaggerUIBundle({
  url: '/api/docs/openapi.json',
  dom_id: '#swagger-ui',
  deepLinking: true,
  persistAuthorization: false,
  tryItOutEnabled: false,
});`;

router.get('/', (req, res) => {
  res.type('html').send(PAGINA);
});

router.get('/openapi.json', (req, res) => {
  res.json(especificacaoOpenApi());
});

let yaml;
router.get('/openapi.yaml', (req, res) => {
  yaml ??= paraYaml(especificacaoOpenApi());
  res.type('application/yaml').send(yaml);
});

router.get('/inicio.css', (req, res) => {
  res.sendFile(path.join(PASTA_DOCS, 'inicio.css'), { maxAge: '1h' });
});

// Logo e fontes do site (cópias idênticas; os nomes das fontes trazem o hash)
router.use('/arquivos', express.static(path.join(PASTA_DOCS, 'arquivos'), { index: false, maxAge: '30d' }));

router.get('/inicio.js', (req, res) => {
  res.type('application/javascript').send(SCRIPT_INICIO);
});

router.get('/iniciar.js', (req, res) => {
  res.type('application/javascript').send(INICIAR);
});

// Arquivos do Swagger UI (CSS e JS), direto do pacote oficial
router.use(express.static(getAbsoluteFSPath(), { index: false, maxAge: '1d' }));

export default router;
