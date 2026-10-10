import { useState } from 'react'
import api from '../../services/api'
import { useConsulta } from '../../hooks/useConsulta'
import { useAoVoltarDoHistorico } from '../../hooks/useAoVoltarDoHistorico'
import { economiaAnual, nomeDoPlano } from '../../services/planos'
import ChaveCiclo from './ChaveCiclo'
import CartaoPlano from './CartaoPlano'
import Button from '../ui/Button/Button'
import Icone from '../ui/Icone/Icone'
import Spinner from '../ui/Spinner/Spinner'
import StatusMessage from '../ui/StatusMessage/StatusMessage'
import './EscolhaDePlano.css'

/**
 * Escolher o plano e seguir para o pagamento, com os mesmos cartões da página
 * de planos. Aparece na última etapa do cadastro e na aba Plano do "Meu
 * negócio". Sem plano pago, o negócio fica salvo como rascunho, fora da vitrine.
 * - `planoInicial`: nome do plano já escolhido na página de planos (?plano=)
 * - `noPainel`: dentro do "Meu negócio", sem o "Escolher depois"
 */
function EscolhaDePlano({ planoInicial = '', noPainel = false }) {
  const consulta = useConsulta('/planos')
  const todosOsPlanos = consulta.dados?.data ?? []
  const pedido = planoInicial.toUpperCase()
  // Plano anual vindo da página de planos abre a chave já no anual
  const [ciclo, setCiclo] = useState(pedido.endsWith('_ANUAL') ? 'ANNUALLY' : 'MONTHLY')
  const planos = todosOsPlanos.filter((p) => p.ciclo === ciclo)
  const presenteAnual = todosOsPlanos.map((p) => economiaAnual(p, todosOsPlanos)).find(Boolean)
  // Plano cujo checkout está sendo aberto (só um por vez)
  const [enviando, setEnviando] = useState(null)
  const [erro, setErro] = useState(null)

  // Voltou do checkout pelo botão do navegador: o botão não pode ficar preso
  useAoVoltarDoHistorico(() => setEnviando(null))

  const irParaPagamento = async (plano) => {
    setErro(null)
    setEnviando(plano.nome)
    try {
      const resposta = await api.post('/assinaturas', { plano: plano.nome })
      window.location.assign(resposta.data.checkoutUrl)
    } catch (falha) {
      setErro(falha.message)
      setEnviando(null)
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
        <div className="escolha-plano__ciclo">
          <ChaveCiclo valor={ciclo} aoMudar={setCiclo} mesesDePresente={presenteAnual?.meses} />
        </div>
      )}

      {erro && (
        <StatusMessage tipo="erro" onFechar={() => setErro(null)}>
          {erro}
        </StatusMessage>
      )}

      <ul className="planos__lista escolha-plano__lista">
        {planos.map((plano) => (
          <CartaoPlano
            key={plano.nome}
            plano={plano}
            todosOsPlanos={todosOsPlanos}
            nota={plano.nome === pedido ? 'Este é o plano que você escolheu na página de planos.' : null}
            acao={
              <Button
                variante={plano.destaque ? 'destaque' : 'primario'}
                onClick={() => irParaPagamento(plano)}
                disabled={Boolean(enviando)}
              >
                {enviando === plano.nome
                  ? 'Abrindo o pagamento...'
                  : `Assinar o ${nomeDoPlano(plano)}${plano.ciclo === 'ANNUALLY' ? ' anual' : ''}`}
                <Icone nome={plano.destaque ? 'rocket_launch' : 'arrow_forward'} tamanho={18} />
              </Button>
            }
          />
        ))}
      </ul>

      <p className="escolha-plano__nota">
        Os planos aumentam a oportunidade de exposição, mas não garantem visitas, contatos ou vendas. Você
        pode trocar de plano ou cancelar pelo painel.
      </p>

      {!noPainel && (
        <div className="escolha-plano__depois">
          <Button to="/meu-negocio" variante="secundario" disabled={Boolean(enviando)}>
            Escolher depois
          </Button>
          <p className="escolha-plano__nota">
            Escolhendo depois, seu negócio fica salvo como rascunho, fora da vitrine, até o plano ser pago.
          </p>
        </div>
      )}
    </div>
  )
}

export default EscolhaDePlano
