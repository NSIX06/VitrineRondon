import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { planoDaAbertura } from './src/services/planoDeAbertura.js'
import { FOTOS_DO_ACESSO, TAMANHOS_DO_PAINEL, fotoNoTamanho, srcsetDaFoto } from './src/pages/Login/fotosDoPainel.js'

/**
 * Política de conteúdo (CSP) no index.html do build de produção. O site é
 * estático, então a CSP vai como <meta>, sem depender de configurar cabeçalhos
 * na hospedagem. Só scripts do próprio site rodam: um XSS não consegue carregar
 * script de fora nem executar código inline. A única exceção é o script da
 * abertura (gerado no build, dentro do index.html), liberado pelo hash exato
 * do conteúdo dele: qualquer outro script inline continua bloqueado.
 * Em desenvolvimento fica de fora, porque o Vite injeta scripts inline.
 * (frame-ancestors não vale em <meta>; o bloqueio de iframe fica no cabeçalho X-Frame-Options.)
 */
function politicaDeConteudo(urlDaApi) {
  const api = new URL(urlDaApi).origin
  const diretivas = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    // 'unsafe-inline' só para estilo: bibliotecas de animação e o mapa escrevem estilo inline
    'style-src': ["'self'", "'unsafe-inline'"],
    // Fontes servidas pelo próprio site (public/fontes)
    'font-src': ["'self'"],
    // Fotos vêm do Cloudinary, de links https informados pelos negócios e dos mapas
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", api, 'https://nominatim.openstreetmap.org'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    // Trusted Types: HTML e script em texto só passam pela política "default"
    // (src/services/trustedTypes.js), que só aceita os textos fixos do mapa
    'require-trusted-types-for': ["'script'"],
    'trusted-types': ['default'],
  }
  return {
    name: 'politica-de-conteudo',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Hash de cada script inline que o próprio build pôs na página
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, codigo]) => `'sha256-${createHash('sha256').update(codigo).digest('base64')}'`
        )
        const comHashes = { ...diretivas, 'script-src': [...diretivas['script-src'], ...hashes] }
        const conteudo = Object.entries(comHashes)
          .map(([nome, valores]) => `${nome} ${valores.join(' ')}`)
          .join('; ')
        return html.replace(
          /<head>/,
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${conteudo}" />`
        )
      },
    },
  }
}

/**
 * CSS da primeira tela dentro do index.html, em <style>, no lugar dos <link>.
 * No 4G lento do celular, a página esperava dois arquivos de CSS antes de
 * pintar qualquer coisa (1,5 s de "solicitações que bloqueiam a
 * renderização"). Como o site é de página única, o HTML só vem uma vez por
 * visita, e o CSS (~13 KiB comprimido) vai junto. A CSP já aceita estilo
 * inline. Fica um <link disabled> com o mesmo endereço (o navegador não baixa
 * link desativado): é por ele que o carregador do Vite sabe que esse CSS já
 * está na página e não o pede de novo quando uma tela sob demanda depende dele.
 */
function cssNaPagina() {
  return {
    name: 'css-na-pagina',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        if (!bundle) return html
        return html.replace(/<link rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)"[^>]*>/g, (tag, arquivo) => {
          const asset = bundle[arquivo]
          if (!asset || asset.type !== 'asset') return tag
          return `<style>${String(asset.source)}</style>\n    <link rel="stylesheet" href="/${arquivo}" disabled />`
        })
      },
    },
  }
}

/**
 * Script pequeno dentro do index.html que começa, logo na abertura, o que a
 * página aberta vai precisar: o código da tela (modulepreload) e os dados (a
 * API). Antes, esses pedidos só saíam depois de o JavaScript principal chegar
 * e rodar (~2,8 s no celular lento). O plano é o mesmo de
 * src/services/planoDeAbertura.js (o texto da função vem para cá); as
 * respostas ficam em window.__leiturasDaAbertura e o services/api.js as
 * aproveita, uma vez só e por até 10 s.
 * No login, a foto do painel (o maior elemento da tela no celular) também
 * começa na abertura, com o mesmo srcset da tela, em vez de esperar o React.
 */
function aberturaAdiantada(urlDaApi) {
  return {
    name: 'abertura-adiantada',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        if (!bundle) return html
        const chunks = Object.values(bundle).filter((item) => item.type === 'chunk')
        const porArquivo = Object.fromEntries(chunks.map((chunk) => [chunk.fileName, chunk]))
        const entrada = chunks.find((chunk) => chunk.isEntry)
        const jaNaPagina = new Set([entrada.fileName, ...entrada.imports])
        // Arquivos de JavaScript de uma tela: o dela e o que ele importa direto
        const arquivosDaTela = (nome) => {
          const chunk = chunks.find((c) => c.facadeModuleId?.replace(/\\/g, '/').endsWith(`/pages/${nome}/${nome}.jsx`))
          if (!chunk) return []
          const arquivos = new Set()
          const visitar = (c) => {
            if (!c || arquivos.has(c.fileName) || jaNaPagina.has(c.fileName)) return
            arquivos.add(c.fileName)
            // O CSS da tela também (o Vite só o pedia depois de o JavaScript principal rodar)
            c.viteMetadata?.importedCss?.forEach((css) => arquivos.add(css))
            c.imports.forEach((importado) => visitar(porArquivo[importado]))
          }
          visitar(chunk)
          return [...arquivos]
        }
        const nomes = ['Vitrine', 'Empreendedores', 'EmpreendedorDetalhe', 'ProdutoDetalhe', 'Login', 'MeuNegocio', 'Admin']
        const telas = Object.fromEntries(nomes.map((nome) => [nome, arquivosDaTela(nome)]))
        const fotoDoLogin = {
          src: fotoNoTamanho(FOTOS_DO_ACESSO.entrar, 720),
          srcset: srcsetDaFoto(FOTOS_DO_ACESSO.entrar),
          sizes: TAMANHOS_DO_PAINEL,
        }

        const codigo = `(function () {
var API = ${JSON.stringify(urlDaApi)};
var TELAS = ${JSON.stringify(telas)};
var FOTO_DO_LOGIN = ${JSON.stringify(fotoDoLogin)};
var planoDaAbertura = ${planoDaAbertura.toString()};
var token = null;
try { token = localStorage.getItem('vitrinelocal.token'); } catch (e) {}
var plano = planoDaAbertura(location.pathname, location.search, Boolean(token));
plano.telas.forEach(function (nome) {
  (TELAS[nome] || []).forEach(function (arquivo) {
    var link = document.createElement('link');
    if (/\\.css$/.test(arquivo)) {
      link.rel = 'preload';
      link.as = 'style';
    } else {
      link.rel = 'modulepreload';
    }
    // crossorigin igual ao do <link> que o carregador do Vite cria depois
    // (inclusive no CSS); com diferença, o navegador baixaria o arquivo de novo
    link.crossOrigin = '';
    link.href = '/' + arquivo;
    document.head.appendChild(link);
  });
});
if (plano.telas.indexOf('Login') >= 0) {
  var foto = document.createElement('link');
  foto.rel = 'preload';
  foto.as = 'image';
  foto.href = FOTO_DO_LOGIN.src;
  foto.setAttribute('imagesrcset', FOTO_DO_LOGIN.srcset);
  foto.setAttribute('imagesizes', FOTO_DO_LOGIN.sizes);
  foto.setAttribute('fetchpriority', 'high');
  document.head.appendChild(foto);
}
var leituras = {};
plano.leituras.forEach(function (leitura) {
  var cabecalhos = { Accept: 'application/json' };
  if (token) cabecalhos.Authorization = 'Bearer ' + token;
  var resposta = fetch(API + leitura.caminho, { headers: cabecalhos });
  resposta.catch(function () {});
  leituras[(token || '') + ' ' + leitura.caminho] = { resposta: resposta, ate: Date.now() + 10000 };
});
window.__leiturasDaAbertura = leituras;
})();`
        return html.replace(/(<head>[\s\S]*?<meta name="viewport"[^>]*>)/, `$1\n    <script>${codigo}</script>`)
      },
    },
  }
}

export default defineConfig(({ command, mode }) => {
  // Sem VITE_API_URL o site cairia no padrão http://localhost:3001/api e, no ar,
  // nenhuma tela carregaria. Melhor o build de produção parar com o motivo claro.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && mode === 'production' && !env.VITE_API_URL) {
    throw new Error(
      'Defina VITE_API_URL com o endereço da API (ex.: https://vitrinelocal-api.onrender.com/api) antes do build.'
    )
  }

  return {
    plugins: [
      react(),
      cssNaPagina(),
      // A ordem importa: a CSP vem por último para calcular o hash do script da abertura
      ...(env.VITE_API_URL ? [aberturaAdiantada(env.VITE_API_URL), politicaDeConteudo(env.VITE_API_URL)] : []),
    ],
    // Cache fora da pasta do OneDrive: a sincronização travava node_modules/.vite
    // e o servidor não subia (EPERM ao recriar .vite/deps)
    cacheDir: join(tmpdir(), 'vitrinelocal-vite'),
  }
})
