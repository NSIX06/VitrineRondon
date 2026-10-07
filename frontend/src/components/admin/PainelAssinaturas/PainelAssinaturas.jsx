import { useCallback, useEffect, useState } from 'react'
import api from '../../../services/api'
import { STATUS_ASSINATURA, dataLonga, precoEmReais } from '../../../services/planos'
import Button from '../../ui/Button/Button'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import Tag from '../../ui/Tag/Tag'
import DataTable from '../../tables/DataTable/DataTable'
import '../../painel/Painel.css'

/**
 * Assinaturas mais recentes. Fora de produção, a administração pode simular a
 * aprovação ou a falha do pagamento: o servidor aplica o mesmo tratamento do
 * webhook do gateway, o que permite demonstrar o fluxo no localhost.
 */
function PainelAssinaturas({ aoAlterar }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [status, setStatus] = useState(null)
  const [simulando, setSimulando] = useState(null)

  const buscar = useCallback(
    () =>
      api
        .get('/assinaturas')
        .then((resposta) => {
          setDados(resposta)
          setErro(null)
        })
        .catch((falha) => setErro(falha.message)),
    []
  )

  useEffect(() => {
    buscar()
  }, [buscar])

  const simular = async (assinatura, evento) => {
    setSimulando(assinatura.id)
    try {
      const resposta = await api.post(`/assinaturas/${assinatura.id}/simular-${evento}`)
      setStatus({ tipo: 'sucesso', texto: `${assinatura.empreendedor.nomeNegocio}: ${resposta.message}` })
      await buscar()
      aoAlterar?.()
    } catch (falha) {
      setStatus({ tipo: 'erro', texto: falha.message })
    } finally {
      setSimulando(null)
    }
  }

  if (!dados && !erro) return <Spinner texto="Carregando as assinaturas..." />
  if (erro && !dados) {
    return (
      <StatusMessage tipo="erro" titulo="Não foi possível carregar as assinaturas">
        <p>{erro}</p>
      </StatusMessage>
    )
  }

  const colunas = [
    { chave: 'id', titulo: 'Nº', largura: '4rem' },
    { chave: 'negocio', titulo: 'Negócio', render: (a) => a.empreendedor.nomeNegocio },
    {
      chave: 'plano',
      titulo: 'Plano',
      render: (a) => `${a.plano.titulo.replace(/^VitrineRondon /, '')} · ${precoEmReais(a.plano.precoCentavos)}`,
    },
    {
      chave: 'status',
      titulo: 'Status',
      render: (a) => {
        const s = STATUS_ASSINATURA[a.status] ?? { rotulo: a.status, variante: 'neutra' }
        return <Tag variante={s.variante}>{s.rotulo}</Tag>
      },
    },
    { chave: 'criadoEm', titulo: 'Criada em', render: (a) => dataLonga(a.criadoEm) },
    { chave: 'proxima', titulo: 'Próxima cobrança', render: (a) => (a.proximaCobranca ? dataLonga(a.proximaCobranca) : '—') },
  ]

  const acoes = dados.simulacaoDisponivel
    ? [
        {
          rotulo: 'Simular aprovação',
          onClick: (a) => simular(a, 'aprovacao'),
          // Só faz sentido para quem espera pagamento ou teve a cobrança recusada
          ocultarSe: (a) => !['PENDENTE', 'INADIMPLENTE'].includes(a.status) || simulando === a.id,
        },
        {
          rotulo: 'Simular falha',
          variante: 'perigo',
          onClick: (a) => simular(a, 'falha'),
          ocultarSe: (a) => a.status !== 'ATIVA' || simulando === a.id,
        },
      ]
    : []

  return (
    <div className="painel">
      {status && (
        <StatusMessage tipo={status.tipo} onFechar={() => setStatus(null)}>
          {status.texto}
        </StatusMessage>
      )}
      <p className="painel__detalhe">
        {dados.modoTeste ? 'Pagamentos em ambiente de testes (AbacatePay Dev mode). ' : ''}
        {dados.simulacaoDisponivel
          ? 'Para a demonstração, "Simular aprovação" faz o mesmo que o aviso de pagamento do gateway.'
          : 'Em produção, o status muda só pelos avisos do gateway de pagamento.'}
      </p>
      <DataTable colunas={colunas} dados={dados.data} acoes={acoes} mensagemVazia="Nenhuma assinatura ainda." />
      <div>
        <Button variante="secundario" tamanho="sm" onClick={buscar}>
          Atualizar lista
        </Button>
      </div>
    </div>
  )
}

export default PainelAssinaturas
