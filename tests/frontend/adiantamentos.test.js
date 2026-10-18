import { describe, it, expect } from 'vitest'
import { montarQuery } from '../../frontend/src/services/api.js'
import {
  planoDeAdiantamento,
  POR_PAGINA_VITRINE,
  POR_PAGINA_EMPREENDEDORES,
} from '../../frontend/src/services/adiantamentos.js'

// A leitura adiantada só é aproveitada se o endereço for idêntico ao que a
// tela pede (caminho + query, na mesma ordem do useConsulta). Estes testes
// montam o endereço do jeito de cada tela e comparam.
const daVitrine = ({ categoria = '', busca = '', tipo = '', bairro = '', pagina = 1 } = {}) =>
  `/produtos${montarQuery({ categoria, busca, tipo, bairro, pagina, porPagina: POR_PAGINA_VITRINE })}`
const dosEmpreendedores = ({ categoria = '', busca = '', bairro = '', pagina = 1 } = {}) =>
  `/empreendedores${montarQuery({ categoria, busca, bairro, pagina, porPagina: POR_PAGINA_EMPREENDEDORES })}`

describe('adiantamento por página', () => {
  it('vitrine sem filtro: a página da lista e a lista de negócios (bairros)', () => {
    const { telas, leituras } = planoDeAdiantamento('/vitrine', '')
    expect(telas).toHaveLength(1)
    expect(leituras).toEqual([daVitrine(), '/empreendedores'])
  })

  it('vitrine com filtros e página na URL', () => {
    const { leituras } = planoDeAdiantamento('/vitrine', '?categoria=Moda&tipo=servico&bairro=Centro&pagina=2&busca=bolo')
    expect(leituras).toEqual([
      daVitrine({ categoria: 'Moda', busca: 'bolo', tipo: 'servico', bairro: 'Centro', pagina: 2 }),
      '/empreendedores',
    ])
  })

  it('empreendedores: a página da lista e a lista completa (bairros)', () => {
    const { leituras } = planoDeAdiantamento('/empreendedores', '?bairro=Centro')
    expect(leituras).toEqual([dosEmpreendedores({ bairro: 'Centro' }), '/empreendedores'])
  })

  it('perfil do negócio e página do item pelo id', () => {
    expect(planoDeAdiantamento('/empreendedores/30001').leituras).toEqual(['/empreendedores/30001'])
    expect(planoDeAdiantamento('/produtos/9').leituras).toEqual(['/produtos/9'])
    expect(planoDeAdiantamento('/empreendedores/abc').leituras).toEqual([])
  })

  it('área restrita sem sessão adianta só o login; com sessão, a área e os dados', () => {
    const semSessao = planoDeAdiantamento('/meu-negocio', '', false)
    expect(semSessao.telas).toHaveLength(1)
    expect(semSessao.leituras).toEqual([])
    expect(planoDeAdiantamento('/meu-negocio', '?aba=desempenho', true).leituras).toEqual([
      '/auth/me',
      '/empreendedores/meu',
      '/metricas/meu-negocio?dias=30',
    ])
    expect(planoDeAdiantamento('/admin', '', true).leituras).toEqual(['/auth/me'])
  })

  it('páginas sem dados para adiantar não pedem nada', () => {
    for (const caminho of ['/sobre', '/contato', '/planos', '/termos', '/cadastro']) {
      expect(planoDeAdiantamento(caminho).leituras).toEqual([])
    }
  })
})

describe('plano da abertura (o script dentro do index.html)', async () => {
  const { planoDaAbertura } = await import('../../frontend/src/services/planoDeAbertura.js')
  const { CONSULTAS_DA_HOME } = await import('../../frontend/src/pages/Home/consultas.js')

  it('a Home adianta exatamente as consultas que ela faz', () => {
    expect(planoDaAbertura('/', '', false).leituras.map((l) => l.caminho).sort()).toEqual(Object.values(CONSULTAS_DA_HOME).sort())
  })

  it('a função funciona sozinha, copiada pelo texto (como vai para o index.html)', () => {
    const copia = new Function(`return ${planoDaAbertura.toString()}`)()
    expect(copia('/empreendedores/7', '', false)).toEqual(planoDaAbertura('/empreendedores/7', '', false))
    expect(copia('/vitrine', '?tipo=servico', false)).toEqual(planoDaAbertura('/vitrine', '?tipo=servico', false))
  })

  it('leituras de área logada só com sessão', () => {
    expect(planoDaAbertura('/meu-negocio', '', false).leituras).toEqual([])
    expect(planoDaAbertura('/meu-negocio', '', true).leituras.every((l) => l.comSessao)).toBe(true)
  })
})
