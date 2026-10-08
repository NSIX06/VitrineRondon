import { useState } from 'react'
import api from '../../services/api'
import { useConsulta } from '../../hooks/useConsulta'
import { dataLonga } from '../../services/planos'
import Spinner from '../ui/Spinner/Spinner'
import StatusMessage from '../ui/StatusMessage/StatusMessage'
import Tag from '../ui/Tag/Tag'
import { formatarNumero } from '../../services/formatos'
import { STATUS_DIVULGACAO, TIPOS_DIVULGACAO } from '../../services/divulgacoes'
import CaixaDeMarcar from '../ui/CaixaDeMarcar/CaixaDeMarcar'
import './Painel.css'


/**
 * Divulgação nas redes oficiais (benefício do Destaque): consentimento de uso
 * das informações e imagens, e a lista do que já entrou no calendário.
 * - `negocio`: o negócio do painel (id, planoAtual, autorizaDivulgacao...)
 * - `aoAtualizar(negocio)`: devolve o negócio salvo depois do consentimento
 */
function PainelDivulgacao({ negocio, aoAtualizar }) {
  const consulta = useConsulta('/divulgacoes/minhas')
  const divulgacoes = consulta.dados?.data ?? []
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  // Benefício do Destaque em vigor: com o negócio publicado
  const temDestaque = negocio.situacao === 'ATIVO' && (negocio.planoAtual === 'DESTAQUE' || negocio.emDestaque)

  const alterarConsentimento = async (evento) => {
    const autoriza = evento.target.checked
    setErro(null)
    setSalvando(true)
    try {
      const resposta = await api.put(`/empreendedores/${negocio.id}`, { autorizaDivulgacao: autoriza })
      aoAtualizar(resposta.data)
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="painel">
      <p className="painel__detalhe">
        No plano Destaque, seu negócio pode aparecer nas redes oficiais do VitrineRondon. As publicações
        seguem o calendário editorial, a relevância do conteúdo e as regras de cada rede: não há uma
        quantidade fixa de posts.
      </p>

      <label className={`painel__consentimento ${!temDestaque ? 'painel__consentimento--inativo' : ''}`}>
        <CaixaDeMarcar
          checked={Boolean(negocio.autorizaDivulgacao)}
          onChange={alterarConsentimento}
          disabled={salvando}
        />
        <span>
          <strong>Autorizo o uso do nome, das fotos, dos produtos e das informações do meu negócio</strong> em
          divulgações nas redes oficiais do VitrineRondon.
          {negocio.autorizaDivulgacaoEm && negocio.autorizaDivulgacao && (
            <small> Autorizado em {dataLonga(negocio.autorizaDivulgacaoEm)}. Você pode retirar quando quiser.</small>
          )}
        </span>
      </label>
      {!temDestaque && (
        <p className="painel__detalhe">
          A divulgação faz parte do plano Destaque. Você pode deixar a autorização marcada desde já.
        </p>
      )}
      {erro && (
        <StatusMessage tipo="erro" onFechar={() => setErro(null)}>
          {erro}
        </StatusMessage>
      )}

      <h3 className="painel__subtitulo">Suas divulgações</h3>
      {consulta.carregando ? (
        <Spinner texto="Carregando..." />
      ) : divulgacoes.length === 0 ? (
        <p className="painel__detalhe">Nenhuma divulgação registrada ainda.</p>
      ) : (
        <ul className="divulgacoes">
          {divulgacoes.map((d) => {
            const status = STATUS_DIVULGACAO[d.status] ?? STATUS_DIVULGACAO.PLANEJADA
            return (
              <li key={d.id} className="divulgacoes__item">
                <div>
                  <span className="painel__rotulo">
                    {TIPOS_DIVULGACAO[d.tipo] ?? d.tipo}
                    {d.canal ? ` · ${d.canal}` : ''}
                  </span>
                  <strong className="divulgacoes__titulo">{d.titulo}</strong>
                  <span className="painel__detalhe">
                    {d.publicadaEm ? `Publicada em ${dataLonga(d.publicadaEm)}` : 'Data a definir'}
                    {typeof d.alcance === 'number' ? ` · alcance de ${formatarNumero(d.alcance)} pessoas` : ''}
                  </span>
                </div>
                <div className="divulgacoes__lado">
                  <Tag variante={status.variante}>{status.rotulo}</Tag>
                  {d.link && (
                    <a href={d.link} target="_blank" rel="noopener noreferrer">
                      Ver publicação
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default PainelDivulgacao
