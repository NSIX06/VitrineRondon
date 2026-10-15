import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// A fonte de ícones é um recorte só com os nomes usados no código
// (scripts/baixar-fontes.mjs). Ícone novo fora do recorte apareceria como
// texto ("star") na tela: este teste avisa para rodar o script de novo.
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/src')
const NO_RECORTE = new Set(JSON.parse(readFileSync(path.join(SRC, 'icones-usados.json'), 'utf8')))

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = path.join(dir, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.jsx?$/.test(nome) ? [caminho] : []
  })
}

/** Nomes passados ao <Icone> e às listas de ícones (nome="x", nome={... 'x' ...}, icone: 'x') */
function iconesUsados() {
  const nomes = new Set()
  for (const arquivo of arquivos(SRC)) {
    const texto = readFileSync(arquivo, 'utf8')
    for (const [, nome] of texto.matchAll(/<Icone[^>]*?\bnome="([a-z0-9_]+)"/g)) nomes.add(nome)
    for (const [, expressao] of texto.matchAll(/<Icone[^>]*?\bnome=\{([^}]*)\}/g)) {
      // Só os resultados do ternário (depois de ? ou :), não os valores comparados
      for (const [, nome] of expressao.matchAll(/[?:]\s*'([a-z0-9_]+)'/g)) nomes.add(nome)
    }
    for (const [, nome] of texto.matchAll(/\bicone:\s*'([a-z0-9_]+)'/g)) nomes.add(nome)
  }
  return [...nomes]
}

describe('ícones do subconjunto', () => {
  it('todo ícone usado no código está na fonte baixada', () => {
    const usados = iconesUsados()
    expect(usados.length).toBeGreaterThan(30)
    expect(usados.filter((nome) => !NO_RECORTE.has(nome))).toEqual([])
  })
})
