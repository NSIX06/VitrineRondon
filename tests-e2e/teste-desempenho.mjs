// O que a primeira tela baixa e o quanto a API comprime.
// Roda sobre o build de produção: `npm run build` dentro de frontend/.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(import.meta.dirname, '..', 'frontend', 'dist')
const API = 'http://localhost:3001/api'
let ok = 0
let falhas = 0
const checar = (nome, condicao, extra = '') => {
  if (condicao) { ok++; console.log(`  OK   ${nome} ${extra}`) }
  else { falhas++; console.log(`  FALHA ${nome} ${extra}`) }
}
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('Rode antes: cd frontend && npm run build')
  process.exit(1)
}

const html = readFileSync(join(DIST, 'index.html'), 'utf-8')
const arquivosIniciais = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1])
const tamanho = (arquivo) => readFileSync(join(DIST, arquivo)).length
const totalInicial = arquivosIniciais.reduce((soma, arquivo) => soma + tamanho(arquivo), 0)

console.log('\n1. Primeira visita')
console.log(`  ${arquivosIniciais.length} arquivos, ${kb(totalInicial)}`)
// Antes de dividir por rota era um pacote só, de 753 kB
checar('a primeira tela baixa menos de 400 kB', totalInicial < 400 * 1024, `-> ${kb(totalInicial)}`)
checar('o mapa não entra na primeira visita', !arquivosIniciais.some((a) => a.includes('Mapa')))
checar('o painel do administrador não entra', !arquivosIniciais.some((a) => a.includes('Admin')))
checar('o leitor de markdown não entra', !arquivosIniciais.some((a) => a.includes('Termos') || a.includes('DocumentoLegal')))

console.log('\n2. Telas sob demanda')
const gerados = readdirSync(join(DIST, 'assets'))
for (const nome of ['Mapa', 'Admin', 'Termos', 'DocumentoLegal', 'MeuNegocio', 'EmpreendedorDetalhe']) {
  checar(`${nome} vira arquivo à parte`, gerados.some((a) => a.startsWith(nome) && a.endsWith('.js')))
}

console.log('\n3. Compressão da API')
try {
  const comprimida = await fetch(`${API}/produtos`, { headers: { 'Accept-Encoding': 'gzip' } })
  const codificacao = comprimida.headers.get('content-encoding')
  const corpo = await comprimida.text()
  checar('a API responde comprimida', codificacao === 'gzip', `-> ${codificacao}`)
  console.log(`  catálogo: ${kb(Buffer.byteLength(corpo))} sem compressão`)
} catch (erro) {
  checar('a API responde comprimida', false, `backend fora do ar? ${erro.message}`)
}

console.log(`\n=== ${ok} verificações OK, ${falhas} falhas ===`)
// Sem process.exit: encerrar no meio do fechamento da conexão derruba o Node
// com um erro interno, mesmo com tudo passando
process.exitCode = falhas === 0 ? 0 : 1
