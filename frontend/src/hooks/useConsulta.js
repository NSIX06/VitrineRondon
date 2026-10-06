import { useCallback, useEffect, useState } from 'react'
import api, { lerDoCache, montarQuery } from '../services/api'

/**
 * Busca dados de uma rota GET sem apagar a tela a cada mudança.
 *
 * - Na primeira visita não há o que mostrar: `carregando` fica verdadeiro.
 * - Ao voltar para uma página já vista, os dados guardados aparecem na hora e
 *   a busca roda por trás.
 * - Ao trocar um filtro, a lista anterior continua na tela, com `atualizando`
 *   verdadeiro, até a nova chegar. Nada some e o rodapé não pula.
 *
 * @param {string|null} caminho  ex.: '/produtos'; null não busca nada
 * @param {object} [params]      filtros da query; vazios são ignorados
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.manterAnterior=true]  false em páginas de detalhe: ir de
 *   um negócio para outro não pode mostrar o anterior com o endereço do novo
 */
export function useConsulta(caminho, params, { manterAnterior = true } = {}) {
  const chave = caminho ? `${caminho}${montarQuery(params)}` : null
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState(() => ({
    chave,
    dados: chave ? lerDoCache(chave) : undefined,
    erro: null,
    buscando: Boolean(chave),
  }))

  // Mudou a consulta: aproveita o cache dessa chave ou mantém o que já estava
  // na tela. Ajuste feito durante a renderização, sem efeito, como o React recomenda.
  if (estado.chave !== chave) {
    setEstado((anterior) => ({
      chave,
      dados: (chave && lerDoCache(chave)) ?? (manterAnterior ? anterior.dados : undefined),
      erro: null,
      buscando: Boolean(chave),
    }))
  }

  useEffect(() => {
    if (!chave) return undefined
    let ativo = true
    api
      .get(chave)
      .then((resposta) => {
        if (ativo) {
          setEstado((atual) =>
            atual.chave === chave ? { ...atual, dados: resposta, erro: null, buscando: false } : atual
          )
        }
      })
      .catch((erro) => {
        if (ativo) {
          setEstado((atual) => (atual.chave === chave ? { ...atual, erro, buscando: false } : atual))
        }
      })
    return () => {
      ativo = false
    }
  }, [chave, tentativa])

  const recarregar = useCallback(() => {
    setEstado((atual) => ({ ...atual, erro: null, buscando: true }))
    setTentativa((valor) => valor + 1)
  }, [])

  const temDados = estado.dados !== undefined
  return {
    dados: estado.dados,
    erro: estado.erro,
    carregando: !temDados && !estado.erro,
    atualizando: temDados && estado.buscando,
    recarregar,
  }
}
