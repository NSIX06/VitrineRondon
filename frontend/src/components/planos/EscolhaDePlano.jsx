import { useState } from 'react'
import api from '../../services/api'
import { useConsulta } from '../../hooks/useConsulta'
import { porCiclo, precoEmReais } from '../../services/planos'
import Button from '../ui/Button/Button'
import Icone from '../ui/Icone/Icone'
import Spinner from '../ui/Spinner/Spinner'
import StatusMessage from '../ui/StatusMessage/StatusMessage'
import './EscolhaDePlano.css'

const nomeCurto = (plano) => plano.titulo.replace(/^VitrineRondon /, '')

/**
 * Última etapa do cadastro: escolher o plano e seguir para o pagamento. Sem
 * plano pago, o negócio fica salvo como rascunho, fora da vitrine.
 * - `planoInicial`: nome do plano já escolhido na página de planos (?plano=)
 */
function EscolhaDePlano({ planoInicial = '' }) {
  const consulta = useConsulta('/planos')
  const planos = consulta.dados?.data ?? []
  const [escolhido, setEscolhido] = useState(planoInicial.toUpperCase())
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  const irParaPagamento = async () => {
    setErro(null)
    setEnviando(true)
    try {
      const resposta = await api.post('/assinaturas', { plano: escolhido })
      window.location.assign(resposta.data.checkoutUrl)
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  if (consulta.carregando) return <Spinner texto="Carregando os planos..." />
  if (consulta.erro) {
    return (
      <StatusMessage tipo="erro" titulo="Não foi possível carregar os planos" aoTentarDeNovo={consulta.recarregar}>
        <p>{consulta.erro.message}</p>
      </StatusMessage>
    )
  }

  const plano = planos.find((p) => p.nome === escolhido)

  return (
    <div className="escolha-plano">
      {consulta.dados?.modoTeste && (
        <StatusMessage tipo="aviso" titulo="Ambiente de testes">
          <p>
            Nada é cobrado. No pagamento, use o cartão <strong>4242 4242 4242 4242</strong>, com qualquer
            validade futura e qualquer CVV.
          </p>
        </StatusMessage>
      )}

      <fieldset className="escolha-plano__opcoes">
        <legend className="escolha-plano__legenda">Escolha o plano para publicar seu negócio</legend>
        {planos.map((p) => (
          <label
            key={p.nome}
            className={`escolha-plano__opcao reflexo-ao-passar ${escolhido === p.nome ? 'escolha-plano__opcao--marcada' : ''} ${
              p.destaque ? 'escolha-plano__opcao--destaque' : ''
            }`}
          >
            <input
              type="radio"
              name="plano"
              value={p.nome}
              checked={escolhido === p.nome}
              onChange={() => setEscolhido(p.nome)}
            />
            <span className="escolha-plano__topo">
              <strong>{nomeCurto(p)}</strong>
              <span className="escolha-plano__preco">
                {precoEmReais(p.precoCentavos)} <small>{porCiclo(p.ciclo)}</small>
              </span>
            </span>
            <span className="escolha-plano__chamada">{p.chamada}</span>
            <ul className="escolha-plano__beneficios">
              {p.beneficios.slice(0, 4).map((b) => (
                <li key={b}>
                  <Icone nome="check" tamanho={16} />
                  {b}
                </li>
              ))}
            </ul>
          </label>
        ))}
      </fieldset>

      <p className="escolha-plano__nota">
        Os planos aumentam a oportunidade de exposição, mas não garantem visitas, contatos ou vendas. Você
        pode trocar de plano ou cancelar pelo painel. <a href="/planos" target="_blank" rel="noreferrer">Comparar os planos</a>
      </p>

      {erro && (
        <StatusMessage tipo="erro" onFechar={() => setErro(null)}>
          {erro}
        </StatusMessage>
      )}

      <div className="formulario__acoes escolha-plano__acoes">
        <Button to="/meu-negocio" variante="secundario" disabled={enviando}>
          Escolher depois
        </Button>
        <Button
          variante={plano?.destaque ? 'destaque' : 'primario'}
          onClick={irParaPagamento}
          disabled={!plano || enviando}
        >
          {enviando ? 'Abrindo o pagamento...' : plano ? `Pagar o ${nomeCurto(plano)}` : 'Escolha um plano'}
        </Button>
      </div>
      <p className="escolha-plano__nota">
        Escolhendo depois, seu negócio fica salvo como rascunho, fora da vitrine, até o plano ser pago.
      </p>
    </div>
  )
}

export default EscolhaDePlano
