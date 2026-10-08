import { useState } from 'react'
import api from '../../services/api'
import { useConsulta } from '../../hooks/useConsulta'
import { economiaAnual, nomeDoPlano, porCiclo, precoEmReais } from '../../services/planos'
import ChaveCiclo from './ChaveCiclo'
import Button from '../ui/Button/Button'
import Icone from '../ui/Icone/Icone'
import Spinner from '../ui/Spinner/Spinner'
import StatusMessage from '../ui/StatusMessage/StatusMessage'
import './EscolhaDePlano.css'

/**
 * Última etapa do cadastro: escolher o plano e seguir para o pagamento. Sem
 * plano pago, o negócio fica salvo como rascunho, fora da vitrine.
 * - `planoInicial`: nome do plano já escolhido na página de planos (?plano=)
 */
function EscolhaDePlano({ planoInicial = '' }) {
  const consulta = useConsulta('/planos')
  const todosOsPlanos = consulta.dados?.data ?? []
  const [escolhido, setEscolhido] = useState(planoInicial.toUpperCase())
  // Plano anual vindo da página de planos abre a chave já no anual
  const [ciclo, setCiclo] = useState(planoInicial.toUpperCase().endsWith('_ANUAL') ? 'ANNUALLY' : 'MONTHLY')
  const planos = todosOsPlanos.filter((p) => p.ciclo === ciclo)
  const presenteAnual = todosOsPlanos.map((p) => economiaAnual(p, todosOsPlanos)).find(Boolean)
  // Trocar de ciclo leva a escolha para o plano equivalente (Destaque mensal -> Destaque anual)
  const mudarCiclo = (novo) => {
    const atual = todosOsPlanos.find((p) => p.nome === escolhido)
    const par = atual && todosOsPlanos.find((p) => p.ciclo === novo && p.destaque === atual.destaque)
    setCiclo(novo)
    if (par) setEscolhido(par.nome)
  }
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

      {todosOsPlanos.some((p) => p.ciclo === 'ANNUALLY') && (
        <ChaveCiclo valor={ciclo} aoMudar={mudarCiclo} mesesDePresente={presenteAnual?.meses} />
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
              <strong>{nomeDoPlano(p)}</strong>
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
          {enviando
            ? 'Abrindo o pagamento...'
            : plano
              ? `Pagar o ${nomeDoPlano(plano)}${plano.ciclo === 'ANNUALLY' ? ' anual' : ''}`
              : 'Escolha um plano'}
        </Button>
      </div>
      <p className="escolha-plano__nota">
        Escolhendo depois, seu negócio fica salvo como rascunho, fora da vitrine, até o plano ser pago.
      </p>
    </div>
  )
}

export default EscolhaDePlano
