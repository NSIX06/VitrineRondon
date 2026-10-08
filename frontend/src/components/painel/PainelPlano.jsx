import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../services/api'
import { SITUACAO_NEGOCIO, STATUS_ASSINATURA, dataLonga, porCiclo, precoEmReais } from '../../services/planos'
import Button from '../ui/Button/Button'
import ConfirmModal from '../ui/ConfirmModal/ConfirmModal'
import Icone from '../ui/Icone/Icone'
import SeloDestaque from '../ui/SeloDestaque/SeloDestaque'
import Spinner from '../ui/Spinner/Spinner'
import StatusMessage from '../ui/StatusMessage/StatusMessage'
import Tag from '../ui/Tag/Tag'
import './Painel.css'

// Na volta do checkout o pagamento pode levar alguns segundos para aparecer
// no gateway: o painel confere de novo algumas vezes antes de desistir
const TENTATIVAS_RETORNO = 6
const INTERVALO_RETORNO_MS = 3000

const nomeCurto = (plano) => plano?.titulo?.replace(/^VitrineRondon /, '') ?? ''

/** A assinatura ainda vale? (ativa, ou cancelada dentro do período pago) */
const emVigor = (assinatura) =>
  assinatura?.status === 'ATIVA' ||
  (assinatura?.status === 'CANCELADA' && assinatura.vigenteAte && new Date(assinatura.vigenteAte) > new Date())

/**
 * Plano do negócio no painel: plano, valor, status, próxima cobrança,
 * vencimento, situação do negócio, troca em andamento e cancelamento.
 * - `voltouDoCheckout`: a página abriu na volta do pagamento
 * - `aoMudar(negocio)`: avisa o painel quando plano/destaque mudam
 */
function PainelPlano({ voltouDoCheckout = false, aoMudar }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const tentativas = useRef(0)
  // Guardado em ref para o efeito de conferência não reiniciar a cada render
  const aoMudarRef = useRef(aoMudar)
  useEffect(() => {
    aoMudarRef.current = aoMudar
  }, [aoMudar])

  const carregar = useCallback(async () => {
    try {
      const resposta = await api.get('/assinaturas/minha')
      setDados(resposta.data)
      setErro(null)
      aoMudarRef.current?.(resposta.data.negocio)
      return resposta.data
    } catch (falha) {
      setErro(falha.message)
      return null
    }
  }, [])

  // Volta do checkout: confere até a assinatura sair de "aguardando pagamento"
  useEffect(() => {
    let ativo = true
    let relogio
    const conferir = async () => {
      const atual = await carregar()
      if (!ativo || !voltouDoCheckout) return
      const aindaPendente = atual?.trocaPendente || atual?.assinatura?.status === 'PENDENTE'
      if (!aindaPendente) {
        if (atual?.assinatura?.status === 'ATIVA') {
          setAviso({ tipo: 'sucesso', texto: `Pagamento confirmado. Plano ${nomeCurto(atual.assinatura.plano)} ativo.` })
        }
        return
      }
      tentativas.current += 1
      if (tentativas.current < TENTATIVAS_RETORNO) {
        setAviso({ tipo: 'info', texto: 'Confirmando seu pagamento com o AbacatePay...' })
        relogio = setTimeout(conferir, INTERVALO_RETORNO_MS)
      } else {
        setAviso({
          tipo: 'aviso',
          texto: 'O pagamento ainda não foi confirmado. Se você concluiu o pagamento, atualize a página em instantes.',
        })
      }
    }
    conferir()
    return () => {
      ativo = false
      clearTimeout(relogio)
    }
  }, [carregar, voltouDoCheckout])

  const cancelar = async () => {
    setCancelando(true)
    try {
      const resposta = await api.delete('/assinaturas/minha')
      setConfirmarCancelamento(false)
      setAviso({ tipo: 'sucesso', texto: resposta.message })
      await carregar()
    } catch (falha) {
      setConfirmarCancelamento(false)
      setAviso({ tipo: 'erro', texto: falha.message })
    } finally {
      setCancelando(false)
    }
  }

  if (!dados && !erro) return <Spinner texto="Carregando seu plano..." />
  if (erro && !dados) {
    return (
      <StatusMessage tipo="erro" titulo="Não foi possível carregar seu plano" acao={<Button tamanho="sm" onClick={carregar}>Tentar de novo</Button>}>
        <p>{erro}</p>
      </StatusMessage>
    )
  }

  const { assinatura, trocaPendente, modoTeste, negocio } = dados
  const vigente = emVigor(assinatura)
  const cancelada = assinatura?.status === 'CANCELADA'
  const temPlano = assinatura && (vigente || ['INADIMPLENTE', 'PENDENTE'].includes(assinatura.status))
  const status = assinatura ? STATUS_ASSINATURA[assinatura.status] : null
  const situacao = SITUACAO_NEGOCIO[negocio?.situacao]
  const expirado = negocio?.situacao === 'ASSINATURA_EXPIRADA'

  return (
    <div className="painel">
      {aviso && (
        <StatusMessage tipo={aviso.tipo} onFechar={() => setAviso(null)}>
          {aviso.texto}
        </StatusMessage>
      )}

      {!temPlano ? (
        <div className="painel__convite">
          <Icone nome="workspace_premium" tamanho={30} />
          <div>
            <h3>{expirado ? 'Seu plano está inativo' : 'Escolha um plano para publicar seu negócio'}</h3>
            <p>
              {expirado
                ? 'Renove sua assinatura para voltar a divulgar seu negócio no VitrineRondon. Seus dados, produtos e fotos continuam guardados.'
                : 'Para aparecer na vitrine, escolha o Essencial (a partir de R$ 50 por mês) ou o Destaque (a partir de R$ 75 por mês), com cobrança mensal ou anual. O Destaque soma selo, prioridade nas listas, estatísticas ampliadas e a possibilidade de divulgação nas redes oficiais.'}
            </p>
            {cancelada && (
              <p className="painel__detalhe">Sua última assinatura ({nomeCurto(assinatura.plano)}) terminou.</p>
            )}
          </div>
          <Button to="/planos" variante="destaque">
            {expirado ? 'Renovar assinatura' : 'Escolher um plano'}
          </Button>
        </div>
      ) : (
        <div className={`painel__plano ${assinatura.plano.destaque ? 'painel__plano--destaque' : ''}`}>
          <div className="painel__plano-topo">
            <div>
              <span className="painel__rotulo">Plano atual</span>
              <h3 className="painel__plano-nome">{nomeCurto(assinatura.plano)}</h3>
            </div>
            <Tag variante={status.variante}>{status.rotulo}</Tag>
          </div>
          {assinatura.plano.destaque && vigente && <SeloDestaque />}

          <dl className="painel__fatos">
            <div>
              <dt>Valor</dt>
              <dd>
                {precoEmReais(assinatura.plano.precoCentavos)} {porCiclo(assinatura.plano.ciclo)}
              </dd>
            </div>
            <div>
              <dt>Ativo desde</dt>
              <dd>{dataLonga(assinatura.inicioEm)}</dd>
            </div>
            <div>
              <dt>Próxima cobrança</dt>
              <dd>{assinatura.status === 'ATIVA' ? dataLonga(assinatura.proximaCobranca) : '—'}</dd>
            </div>
            <div>
              <dt>{cancelada ? 'Publicado até' : 'Vencimento'}</dt>
              <dd>{vigente ? dataLonga(assinatura.vigenteAte) : '—'}</dd>
            </div>
            {situacao && (
              <div>
                <dt>Seu negócio</dt>
                <dd>{situacao.rotulo}</dd>
              </div>
            )}
          </dl>

          {assinatura.status === 'PENDENTE' && assinatura.checkoutUrl && (
            <p className="painel__detalhe">
              O pagamento ainda não foi concluído: seu negócio será publicado assim que ele for
              confirmado. <a href={assinatura.checkoutUrl}>Continuar pagamento</a>
            </p>
          )}
          {assinatura.status === 'INADIMPLENTE' && (
            <p className="painel__detalhe painel__detalhe--alerta">
              A última cobrança foi recusada. Seu negócio saiu da vitrine até o pagamento ser aprovado;
              os dados continuam guardados.
            </p>
          )}
          {cancelada && vigente && (
            <p className="painel__detalhe">
              Assinatura cancelada: não haverá novas cobranças. Seu negócio continua publicado, com os
              benefícios do plano, até {dataLonga(assinatura.vigenteAte)}. Depois disso sai da vitrine,
              e os dados ficam guardados para quando quiser voltar.
            </p>
          )}
          {trocaPendente && (
            <p className="painel__detalhe">
              Troca para o {nomeCurto(trocaPendente.plano)} iniciada.{' '}
              {trocaPendente.checkoutUrl && <a href={trocaPendente.checkoutUrl}>Concluir pagamento</a>}
            </p>
          )}

          <div className="painel__acoes">
            {cancelada ? (
              <Button to="/planos" variante="destaque" tamanho="sm">
                Assinar de novo
              </Button>
            ) : (
              <>
                <Button to="/planos" variante="secundario" tamanho="sm">
                  <Icone nome="swap_horiz" tamanho={18} />
                  Trocar de plano
                </Button>
                <Button variante="texto" tamanho="sm" onClick={() => setConfirmarCancelamento(true)}>
                  Cancelar assinatura
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {modoTeste && (
        <p className="painel__sandbox">
          <Icone nome="science" tamanho={16} />
          Pagamentos em ambiente de testes: nada é cobrado de verdade.
        </p>
      )}

      <ConfirmModal
        aberto={confirmarCancelamento}
        titulo="Cancelar assinatura"
        mensagem={
          assinatura?.status === 'ATIVA'
            ? `As próximas cobranças param. Seu negócio continua publicado, com os benefícios do plano, até ${dataLonga(assinatura.vigenteAte)}, o fim do período já pago. Depois disso sai da vitrine; dados, produtos e fotos continuam guardados. Deseja cancelar?`
            : 'Seu negócio fica fora da vitrine, e os dados continuam guardados para quando quiser voltar. Deseja cancelar?'
        }
        textoConfirmar="Cancelar assinatura"
        carregando={cancelando}
        onConfirmar={cancelar}
        onCancelar={() => setConfirmarCancelamento(false)}
      />
    </div>
  )
}

export default PainelPlano
