// Baixa as fontes do site para public/fontes/ e gera src/fontes.css.
//
// Por que: servidas pelo Google, as fontes custavam duas requisições de CSS que
// bloqueavam a primeira pintura (1,5 s no celular) e a fonte de ícones vinha
// INTEIRA (703 KiB). Aqui elas passam a sair do próprio site, e a de ícones
// só com os símbolos que o código usa.
//
// Uso (na pasta frontend): node scripts/baixar-fontes.mjs
// Rode de novo quando usar um ícone novo: o teste "ícones do subconjunto"
// avisa quando um nome do código não está na fonte baixada.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PASTA_FONTES = path.join(RAIZ, 'public', 'fontes')
const CSS_SAIDA = path.join(RAIZ, 'src', 'fontes.css')
const LISTA_ICONES = path.join(RAIZ, 'src', 'icones-usados.json')

// Navegador atual: o Google só entrega woff2 (e o recorte por idioma) para ele
const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

// Só os recortes de idioma que o site usa: português cabe em latin + latin-ext
const RECORTES = new Set(['latin', 'latin-ext'])

/** Nomes de ícone usados no código: toda palavra_em_minusculas entre aspas.
 *  Sobra algum nome que não é ícone (o Google ignora) e não falta nenhum. */
export async function iconesDoCodigo(pasta = path.join(RAIZ, 'src')) {
  const nomes = new Set()
  const visitar = async (dir) => {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const caminho = path.join(dir, item.name)
      if (item.isDirectory()) await visitar(caminho)
      else if (/\.(jsx?|tsx?)$/.test(item.name)) {
        const texto = await readFile(caminho, 'utf8')
        for (const [, nome] of texto.matchAll(/['"`]([a-z][a-z0-9_]{1,40})['"`]/g)) nomes.add(nome)
      }
    }
  }
  await visitar(pasta)
  return [...nomes].sort()
}

/** Nomes que existem no Material Symbols, pela lista oficial do Google Fonts */
async function iconesExistentes() {
  const texto = await (await buscar('https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true')).text()
  // A resposta começa com )]}' para não ser lida como script
  const dados = JSON.parse(texto.slice(texto.indexOf('{')))
  return new Set(dados.icons.map((icone) => icone.name))
}

async function buscar(url) {
  const resposta = await fetch(url, { headers: { 'User-Agent': NAVEGADOR } })
  if (!resposta.ok) throw new Error(`${resposta.status} em ${url}`)
  return resposta
}

/** Lê o CSS do Google em blocos { recorte, regra } */
function blocosDoCss(css) {
  const blocos = []
  const re = /(?:\/\* ([a-z-]+) \*\/\s*)?(@font-face \{[^}]+\})/g
  for (const [, recorte, regra] of css.matchAll(re)) blocos.push({ recorte: recorte ?? null, regra })
  return blocos
}

async function baixarFamilia(urlCss, prefixo, { soRecortes = true } = {}) {
  const css = await (await buscar(urlCss)).text()
  if (css.includes('/* fallback */')) throw new Error('O Google devolveu a fonte inteira (fallback): confira os nomes de ícone')
  const saida = []
  // Fonte variável: pesos diferentes apontam para o mesmo arquivo
  const baixados = new Map()
  for (const { recorte, regra } of blocosDoCss(css)) {
    if (soRecortes && recorte && !RECORTES.has(recorte)) continue
    const url = /url\((https:[^)]+)\)/.exec(regra)[1]
    if (!baixados.has(url)) baixados.set(url, Buffer.from(await (await buscar(url)).arrayBuffer()))
    const dados = baixados.get(url)
    const hash = createHash('sha256').update(dados).digest('hex').slice(0, 10)
    const nome = `${prefixo}${recorte ? `-${recorte}` : ''}-${hash}.woff2`
    await writeFile(path.join(PASTA_FONTES, nome), dados)
    saida.push({ recorte, nome, tamanho: dados.length, regra: regra.replace(url, `/fontes/${nome}`) })
  }
  return saida
}

async function main() {
  const existentes = await iconesExistentes()
  const icones = (await iconesDoCodigo()).filter((nome) => existentes.has(nome))
  // Apaga os arquivos, não a pasta: o OneDrive às vezes trava a remoção dela (EPERM)
  await mkdir(PASTA_FONTES, { recursive: true })
  for (const nome of await readdir(PASTA_FONTES)) await rm(path.join(PASTA_FONTES, nome), { force: true })

  // Bricolage com o tamanho óptico fixo em 36 (perto dos títulos do celular): com o
  // eixo inteiro (12..96) era um arquivo de 77 KiB; fixo, 41 KiB. Nem todo valor
  // sai reduzido (30, 32 e 40 vinham com o eixo inteiro): confira o tamanho.
  // Pedida sozinha: junto com a Inter, o Google devolvia a versão variável
  const textos = [
    ...(await baixarFamilia(
      'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@36,700;36,800&display=swap',
      'texto'
    )),
    ...(await baixarFamilia('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', 'texto')),
  ]
  // Os nomes precisam ir em ordem alfabética, ou o Google recusa o recorte
  const simbolos = await baixarFamilia(
    `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&icon_names=${icones.join(',')}&display=block`,
    'icones',
    { soRecortes: false }
  )

  const cabecalho = `/* Gerado por scripts/baixar-fontes.mjs: não edite à mão.
   Bricolage Grotesque e Inter (latin e latin-ext) e Material Symbols Outlined
   só com os ${icones.length} nomes encontrados no código. */\n`
  // A classe dos ícones (que o CSS do Google trazia junto) fica no fim
  const classeIcones = `
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
`
  const regras = [...textos, ...simbolos].map((f) => (f.recorte ? `/* ${f.recorte} */\n${f.regra}` : f.regra))
  await writeFile(CSS_SAIDA, `${cabecalho}\n${regras.join('\n\n')}\n${classeIcones}`)
  await writeFile(LISTA_ICONES, `${JSON.stringify(icones, null, 2)}\n`)

  // Sem preload das fontes no index.html: no 4G lento do celular, os 144 KiB
  // de fonte disputavam a banda com o JavaScript principal e atrasavam o texto
  // do topo (LCP) em ~0,4 s. Com font-display: swap o texto aparece na hora
  // com a fonte do sistema e troca quando a fonte chega.
  const preloads = '    <!-- (sem preload: ver scripts/baixar-fontes.mjs) -->'
  const indexHtml = path.join(RAIZ, 'index.html')
  const html = await readFile(indexHtml, 'utf8')
  const marcador = /( *<!-- fontes:inicio[^>]*-->)[\s\S]*?( *<!-- fontes:fim -->)/
  if (!marcador.test(html)) throw new Error('index.html sem os marcadores <!-- fontes:inicio --> e <!-- fontes:fim -->')
  await writeFile(indexHtml, html.replace(marcador, `$1\n${preloads}\n$2`))

  const kb = (n) => `${(n / 1024).toFixed(1)} KiB`
  for (const f of [...textos, ...simbolos]) console.log(`${f.nome.padEnd(44)} ${kb(f.tamanho)}`)
  console.log(`\n${icones.length} nomes no recorte de ícones -> src/fontes.css e src/icones-usados.json`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((erro) => {
    console.error(erro.message)
    process.exit(1)
  })
}
