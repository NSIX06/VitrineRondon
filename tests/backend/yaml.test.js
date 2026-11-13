import { describe, it, expect } from 'vitest'
import { paraYaml } from '../../backend/src/docs/yaml.js'

// O OpenAPI também é servido em YAML (/api/docs/openapi.yaml). O conversor é
// nosso, sem dependência: estes casos garantem um YAML sem ambiguidade.
describe('paraYaml', () => {
  it('textos sempre entre aspas, sem confundir com número, booleano ou comentário', () => {
    expect(paraYaml({ versao: '1.0', ativo: 'no', nota: 'a # b: c' })).toBe(
      'versao: "1.0"\nativo: "no"\nnota: "a # b: c"\n'
    )
  })

  it('números, booleanos e null sem aspas', () => {
    expect(paraYaml({ n: 3, ok: true, nada: null })).toBe('n: 3\nok: true\nnada: null\n')
  })

  it('chaves com caracteres especiais (caminhos, códigos HTTP) vão entre aspas', () => {
    expect(paraYaml({ '/produtos/{id}': { '200': 'ok' } })).toBe('"/produtos/{id}":\n  "200": "ok"\n')
  })

  it('listas de objetos com o primeiro campo na linha do traço', () => {
    expect(paraYaml({ servers: [{ url: '/api', description: 'aqui' }] })).toBe(
      'servers:\n- url: "/api"\n  description: "aqui"\n'
    )
  })

  it('objetos e listas vazios', () => {
    expect(paraYaml({ security: [], extra: {}, lista: [{ bearerAuth: [] }] })).toBe(
      'security: []\nextra: {}\nlista:\n- bearerAuth: []\n'
    )
  })

  it('quebra de linha e aspas dentro do texto ficam escapadas, numa linha só', () => {
    const texto = 'linha 1\nlinha "2"'
    const yaml = paraYaml({ texto })
    expect(yaml.split('\n').filter(Boolean)).toHaveLength(1)
    expect(yaml).toBe(`texto: ${JSON.stringify(texto)}\n`)
  })
})
