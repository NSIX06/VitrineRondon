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
const daVitrine = ({ categoria = '', busca = '', tipo = '', pagina = 1 } = {}) =>
  `/produtos${montarQuery({ categoria, busca, tipo, pagina, porPagina: POR_PAGINA_VITRINE })}`
const dosEmpreendedores = ({ categoria = '', busca = '', bairro = '', pagina = 1 } = {}) =>
  `/empreendedores${montarQuery({ categoria, busca, bairro, pagina, porPagina: POR_PAGINA_EMPREENDEDORES })}`

describe('adiantamento por página', () => {
  it('vitrine sem filtro', () => {
    const { telas, leituras } = planoDeAdiantamento('/vitrine', '')
    expect(telas).toHaveLength(1)
    expect(leituras).toEqual([daVitrine()])
  })

  it('vitrine com filtros e página na URL', () => {
    const { leituras } = planoDeAdiantamento('/vitrine', '?categoria=Moda&tipo=servico&pagina=2&busca=bolo')
    expect(leituras).toEqual([daVitrine({ categoria: 'Moda', busca: 'bolo', tipo: 'servico', pagina: 2 })])
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
