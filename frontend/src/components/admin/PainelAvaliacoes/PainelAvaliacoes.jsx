import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'
import Button from '../../ui/Button/Button'
import Modal from '../../ui/Modal/Modal'
import Paginacao from '../../ui/Paginacao/Paginacao'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import Tag from '../../ui/Tag/Tag'
import Icone from '../../ui/Icone/Icone'
import Estrelas from '../../avaliacoes/Estrelas/Estrelas'
import CabecalhoSecao from '../CabecalhoSecao/CabecalhoSecao'
import '../painel-filtros.css'
import './PainelAvaliacoes.css'

const FILTROS = [
  { valor: 'denunciadas', rotulo: 'Denunciadas' },
  { valor: 'PUBLICADA', rotulo: 'Publicadas' },
  { valor: 'REMOVIDA', rotulo: 'Removidas' },
  { valor: '', rotulo: 'Todas' },
]

const dataCurta = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

/**
 * Moderação das avaliações (RN-AVAL-09). As denunciadas vêm primeiro. Remover
 * pede o motivo, que o autor vê no perfil; a avaliação sai da média e da
 * lista pública, mas o registro fica (e pode ser restaurado). Tudo vai para a
 * auditoria. A administração nunca edita a nota nem o texto de ninguém.
 */
function PainelAvaliacoes() {
  const [filtro, setFiltro] = useState('denunciadas')
  const [pagina, setPagina] = useState(1)
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [status, setStatus] = useState(null)
  const [removendo, setRemovendo] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [erroMotivo, setErroMotivo] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const buscar = useCallback(() => {
    const query =
      filtro === 'denunciadas'
        ? { denunciadas: 1, status: 'PUBLICADA', pagina, porPagina: 20 }
        : { status: filtro, pagina, porPagina: 20 }
    return api
      .get('/avaliacoes', query)
      .then((resposta) => {
        setDados(resposta)
        setErro(null)
      })
      .catch((falha) => setErro(falha.message))
  }, [filtro, pagina])

  useEffect(() => {
    buscar()
  }, [buscar])

  const moderar = async (avaliacao, acao, motivoDaRemocao) => {
    setSalvando(true)
    try {
      const resposta = await api.put(`/avaliacoes/${avaliacao.id}/moderacao`, {
        acao,
        ...(motivoDaRemocao ? { motivo: motivoDaRemocao } : {}),
      })
      setStatus({ tipo: 'sucesso', texto: `${avaliacao.empreendedor.nomeNegocio}: ${resposta.message}` })
      setRemovendo(null)
      await buscar()
    } catch (falha) {
      if (acao === 'remover') setErroMotivo(falha.message)
      else setStatus({ tipo: 'erro', texto: falha.message })
    } finally {
      setSalvando(false)
    }
  }

  const confirmarRemocao = (evento) => {
    evento.preventDefault()
    if (motivo.trim().length < 3) {
      setErroMotivo('Informe o motivo da remoção (o autor vai ver)')
      return
    }
    moderar(removendo, 'remover', motivo.trim())
  }

  return (
    <>
      <CabecalhoSecao
        titulo="Avaliações"
        texto="Notas e comentários dos clientes. As denunciadas aparecem primeiro; remover tira a avaliação da média e do perfil, com o motivo registrado."
      />
      <div className="painel painel-avaliacoes">
        <div className="painel-avaliacoes__filtros" role="group" aria-label="Filtrar avaliações">
          {FILTROS.map((opcao) => (
            <button
              key={opcao.valor || 'todas'}
              type="button"
              className={`painel-avaliacoes__filtro ${filtro === opcao.valor ? 'painel-avaliacoes__filtro--ativo' : ''}`}
              aria-pressed={filtro === opcao.valor}
              onClick={() => {
                setFiltro(opcao.valor)
                setPagina(1)
              }}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>

        {status && (
          <StatusMessage tipo={status.tipo} onFechar={() => setStatus(null)}>
            {status.texto}
          </StatusMessage>
        )}

        {!dados && !erro && <Spinner texto="Carregando as avaliações..." />}
        {erro && (
          <StatusMessage tipo="erro" titulo="Não foi possível carregar as avaliações" aoTentarDeNovo={buscar}>
            <p>{erro}</p>
          </StatusMessage>
        )}

        {dados && dados.data.length === 0 && (
          <StatusMessage tipo="vazio" titulo="Nada por aqui">
            <p>{filtro === 'denunciadas' ? 'Nenhuma avaliação denunciada para analisar.' : 'Nenhuma avaliação neste filtro.'}</p>
          </StatusMessage>
        )}

        {dados && dados.data.length > 0 && (
          <ul className="painel-avaliacoes__lista">
            {dados.data.map((avaliacao) => (
              <li key={avaliacao.id} className="painel-avaliacoes__item">
                <div className="painel-avaliacoes__cabeca">
                  <Estrelas valor={avaliacao.nota} tamanho={16} rotulo={`${avaliacao.nota} de 5 estrelas`} />
                  <Link to={`/empreendedores/${avaliacao.empreendedor.id}#avaliacoes`} className="painel-avaliacoes__negocio">
                    {avaliacao.empreendedor.nomeNegocio}
                  </Link>
                  {avaliacao.status === 'REMOVIDA' ? (
                    <Tag variante="alerta">Removida</Tag>
                  ) : (
                    <Tag variante="sucesso">Publicada</Tag>
                  )}
                  {avaliacao.denuncias > 0 && (
                    <span className="painel-avaliacoes__denuncias">
                      <Icone nome="flag" tamanho={16} />
                      {avaliacao.denuncias} {avaliacao.denuncias === 1 ? 'denúncia' : 'denúncias'}
                    </span>
                  )}
                </div>
                <p className="painel-avaliacoes__texto">{avaliacao.comentario}</p>
                <p className="painel-avaliacoes__meta">
                  {avaliacao.usuario.nome} ({avaliacao.usuario.email}) · {dataCurta.format(new Date(avaliacao.createdAt))}
                  {avaliacao.editadaEm ? ' · editada' : ''}
                </p>
                {avaliacao.status === 'REMOVIDA' && avaliacao.motivoRemocao && (
                  <p className="painel-avaliacoes__motivo">Motivo da remoção: {avaliacao.motivoRemocao}</p>
                )}
                <div className="painel-avaliacoes__acoes">
                  {avaliacao.status === 'REMOVIDA' ? (
                    <Button variante="secundario" tamanho="sm" disabled={salvando} onClick={() => moderar(avaliacao, 'restaurar')}>
                      Restaurar
                    </Button>
                  ) : (
                    <Button
                      variante="perigo"
                      tamanho="sm"
                      onClick={() => {
                        setRemovendo(avaliacao)
                        setMotivo('')
                        setErroMotivo(null)
                      }}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {dados && (
          <Paginacao
            pagina={dados.paginacao.pagina}
            totalPaginas={dados.paginacao.totalPaginas}
            total={dados.paginacao.total}
            rotuloItens="avaliações"
            aoMudar={setPagina}
          />
        )}
      </div>

      <Modal aberto={Boolean(removendo)} titulo="Remover avaliação" onFechar={() => setRemovendo(null)} tamanho="sm">
        <form className="formulario" onSubmit={confirmarRemocao} noValidate>
          <p>
            A avaliação sai do perfil de <strong>{removendo?.empreendedor.nomeNegocio}</strong> e da média. O autor vê o
            motivo.
          </p>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="motivo-remocao">
              Motivo<span className="campo__obrigatorio">*</span>
            </label>
            <input
              id="motivo-remocao"
              className={`campo__entrada ${erroMotivo ? 'campo__entrada--erro' : ''}`}
              value={motivo}
              onChange={(evento) => {
                setMotivo(evento.target.value)
                setErroMotivo(null)
              }}
              maxLength={300}
              placeholder="Ex.: linguagem ofensiva, propaganda, dados pessoais"
            />
            {erroMotivo && <span className="campo__erro">{erroMotivo}</span>}
          </div>
          <div className="painel-avaliacoes__acoes">
            <Button variante="secundario" onClick={() => setRemovendo(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" variante="perigo" disabled={salvando}>
              {salvando ? 'Removendo...' : 'Remover avaliação'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default PainelAvaliacoes
