import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../../services/api'
import { useAuth } from '../../../contexts/auth'
import Button from '../../ui/Button/Button'
import ConfirmModal from '../../ui/ConfirmModal/ConfirmModal'
import Icone from '../../ui/Icone/Icone'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import Estrelas from '../Estrelas/Estrelas'
import CartaoAvaliacao from './CartaoAvaliacao'
import FormAvaliacao from './FormAvaliacao'
import { urlDoGoogle, useProvedores } from '../../../services/loginSocial'
import { apagarRascunho, guardarRascunho, lerRascunho } from '../../../services/rascunhoAvaliacao'
import {
  ORDENS_DAS_AVALIACOES,
  descricaoDaReputacao,
  formatarMedia,
  percentuaisDaDistribuicao,
  textoDaQuantidade,
} from '../../../services/avaliacoes'
import './SecaoAvaliacoes.css'

const POR_PAGINA = 5
const ESPERA_MAXIMA_MS = 3000

/**
 * "Avaliações dos clientes" no perfil do negócio: resumo com a distribuição
 * das notas, o formulário (ou a avaliação de quem está vendo) e os
 * comentários, com ordenação e "ver mais". Os dados só são pedidos quando a
 * seção chega perto da tela, para não disputar a rede com o topo do perfil.
 *
 * - `aoMudarResumo(resumo)`: avisa o topo do perfil quando a média muda
 */
function SecaoAvaliacoes({ negocioId, nomeNegocio, destaque = false, aoMudarResumo }) {
  const { autenticado } = useAuth()
  const location = useLocation()
  const refSecao = useRef(null)
  const [visivel, setVisivel] = useState(
    () => location.hash === '#avaliacoes' || typeof IntersectionObserver === 'undefined'
  )
  const [ordem, setOrdem] = useState('recentes')
  // `consulta`: ordenação e sessão da lista que está na tela; diferente da
  // pedida agora = carregando
  const [estado, setEstado] = useState({ consulta: null, erro: null, itens: [], pagina: 1 })
  const [dados, setDados] = useState(null)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const caminho = `/empreendedores/${negocioId}/avaliacoes`
  const provedores = useProvedores()
  // Avaliação escrita antes de confirmar com o Google (volta preenchida, ou é publicada sozinha)
  const [rascunho, setRascunho] = useState(() => lerRascunho(negocioId))
  const rascunhoTratado = useRef(false)

  // Só busca quando a seção está a uma tela de distância. Se o navegador não
  // avisar (aba em segundo plano, quadros pausados), busca mesmo assim alguns
  // segundos depois: o topo do perfil já carregou e a seção não fica vazia
  useEffect(() => {
    if (visivel || !refSecao.current) return undefined
    const reserva = setTimeout(() => setVisivel(true), ESPERA_MAXIMA_MS)
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) setVisivel(true)
      },
      { rootMargin: '600px 0px' }
    )
    observador.observe(refSecao.current)
    return () => {
      clearTimeout(reserva)
      observador.disconnect()
    }
  }, [visivel])

  const carregar = useCallback(
    async (pagina = 1) => {
      const resposta = await api.get(caminho, { ordem, pagina, porPagina: POR_PAGINA })
      setDados(resposta)
      aoMudarResumo?.(resposta.resumo)
      return resposta
    },
    [caminho, ordem, aoMudarResumo]
  )

  const consulta = `${ordem}|${autenticado}`
  const carregando = visivel && estado.consulta !== consulta && !estado.erro

  // Primeira página (de novo a cada ordenação, sessão ou negócio)
  useEffect(() => {
    if (!visivel) return undefined
    let ativo = true
    api
      .get(caminho, { ordem, pagina: 1, porPagina: POR_PAGINA })
      .then((resposta) => {
        if (!ativo) return
        setDados(resposta)
        aoMudarResumo?.(resposta.resumo)
        setEstado({ consulta, erro: null, itens: resposta.data, pagina: 1 })
      })
      .catch((erro) => {
        if (ativo) setEstado((anterior) => ({ ...anterior, consulta, erro }))
      })
    return () => {
      ativo = false
    }
  }, [visivel, caminho, ordem, aoMudarResumo, consulta])

  // Chegou pelo link "#avaliacoes" (ex.: voltando do login): rola até aqui
  useEffect(() => {
    if (location.hash === '#avaliacoes' && dados) refSecao.current?.scrollIntoView({ block: 'start' })
  }, [location.hash, Boolean(dados)]) // eslint-disable-line react-hooks/exhaustive-deps

  const tentarDeNovo = () => {
    setEstado((anterior) => ({ ...anterior, consulta: null, erro: null }))
    carregar(1)
      .then((resposta) => setEstado({ consulta, erro: null, itens: resposta.data, pagina: 1 }))
      .catch((erro) => setEstado((anterior) => ({ ...anterior, consulta, erro })))
  }

  const verMais = async () => {
    setCarregandoMais(true)
    try {
      const proxima = estado.pagina + 1
      const resposta = await carregar(proxima)
      setEstado((anterior) => ({
        ...anterior,
        // Sem repetir (alguém pode ter avaliado entre uma página e outra)
        itens: [...anterior.itens, ...resposta.data.filter((nova) => !anterior.itens.some((a) => a.id === nova.id))],
        pagina: proxima,
      }))
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: erro.message })
    } finally {
      setCarregandoMais(false)
    }
  }

  /** Depois de publicar, editar ou apagar: volta para a primeira página */
  const recarregar = async (mensagem) => {
    const resposta = await carregar(1)
    setEstado({ consulta, erro: null, itens: resposta.data, pagina: 1 })
    setEditando(false)
    setAviso({ tipo: 'sucesso', texto: mensagem })
  }

  const publicar = async (valores) => {
    const resposta = await api.post(caminho, valores)
    apagarRascunho()
    setRascunho(null)
    await recarregar(resposta.message)
  }

  // Visitante: guarda o que escreveu e vai ao Google só para confirmar quem é.
  // Na volta, a avaliação é publicada sozinha (efeito abaixo).
  const publicarComGoogle = async (valores) => {
    if (provedores?.google === false) {
      throw new Error('A confirmação com o Google ainda não está disponível. Tente mais tarde.')
    }
    guardarRascunho(negocioId, valores)
    window.location.assign(urlDoGoogle(`${location.pathname}#avaliacoes`))
    // A página vai embora: o botão fica em "Enviando..." até o Google abrir
    await new Promise(() => {})
  }

  // Voltou confirmado com um rascunho deste negócio: publica sem pedir de novo
  useEffect(() => {
    if (!dados || !autenticado || !rascunho || rascunhoTratado.current) return
    rascunhoTratado.current = true
    // Já tinha avaliado, ou não pode avaliar (dono, admin): o rascunho é descartado
    if (dados.minha || !dados.permissao?.podeAvaliar) {
      apagarRascunho()
      return
    }
    api
      .post(caminho, rascunho)
      .then((resposta) => {
        apagarRascunho()
        setRascunho(null)
        return recarregar(resposta.message)
      })
      .catch((erro) => setAviso({ tipo: 'erro', texto: `Sua avaliação não foi publicada: ${erro.message}` }))
  }, [dados, autenticado, rascunho, caminho]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rascunho que não vai ser publicado porque a pessoa já tinha avaliado (ou é a dona)
  const rascunhoDescartado = Boolean(autenticado && rascunho && dados && (dados.minha || !dados.permissao?.podeAvaliar))

  const salvarEdicao = async (valores) => {
    const resposta = await api.put(`/avaliacoes/${dados.minha.id}`, valores)
    await recarregar(resposta.message)
  }

  const excluir = async () => {
    setExcluindo(true)
    try {
      const resposta = await api.delete(`/avaliacoes/${dados.minha.id}`)
      setConfirmarExclusao(false)
      await recarregar(resposta.message)
    } catch (erro) {
      setConfirmarExclusao(false)
      setAviso({ tipo: 'erro', texto: erro.message })
    } finally {
      setExcluindo(false)
    }
  }

  const denunciar = async (id, motivo) => {
    const resposta = await api.post(`/avaliacoes/${id}/denuncias`, motivo ? { motivo } : {})
    return resposta.message
  }

  const resumo = dados?.resumo ?? { media: null, total: 0, distribuicao: {} }
  const minha = dados?.minha ?? null
  const permissao = dados?.permissao
  const temMais = dados ? estado.pagina < dados.paginacao.totalPaginas : false
  const voltarPara = { de: `${location.pathname}#avaliacoes` }

  return (
    <section
      id="avaliacoes"
      ref={refSecao}
      className={`avaliacoes ${destaque ? 'avaliacoes--destaque' : ''}`}
      aria-labelledby="titulo-avaliacoes"
    >
      <div className="avaliacoes__topo">
        <div>
          <span className="avaliacoes__marca">
            <Icone nome="reviews" tamanho={16} />
            Reputação
          </span>
          <h2 id="titulo-avaliacoes" className="avaliacoes__titulo">
            Avaliações dos clientes
          </h2>
        </div>
        {destaque && resumo.total > 0 && (
          <span className="avaliacoes__selo-destaque" title="Apresentação do plano Destaque; a nota é a mesma de qualquer plano">
            <Icone nome="workspace_premium" tamanho={16} />
            Reputação em destaque
          </span>
        )}
      </div>

      {rascunhoDescartado && (
        <StatusMessage tipo="info">
          {dados.minha
            ? 'Você já tinha avaliado este negócio. A sua avaliação está aqui embaixo: edite se quiser mudar.'
            : dados.permissao?.mensagem}
        </StatusMessage>
      )}

      {aviso && (
        <StatusMessage tipo={aviso.tipo} onFechar={() => setAviso(null)}>
          {aviso.texto}
        </StatusMessage>
      )}

      {estado.erro && !dados ? (
        <StatusMessage tipo="erro" titulo="Não foi possível carregar as avaliações" aoTentarDeNovo={tentarDeNovo}>
          <p>{estado.erro.message}</p>
        </StatusMessage>
      ) : (
        <div className="avaliacoes__grade">
          {/* Resumo: média, estrelas, total e a distribuição das notas */}
          <div className="avaliacoes__resumo" aria-busy={carregando && !dados}>
            {!dados ? (
              <div className="avaliacoes__esqueleto" aria-label="Carregando as avaliações" />
            ) : resumo.total ? (
              <>
                <p className="avaliacoes__media" aria-label={descricaoDaReputacao(resumo.media, resumo.total)}>
                  <strong aria-hidden="true">{formatarMedia(resumo.media)}</strong>
                  <span aria-hidden="true">de 5</span>
                </p>
                <Estrelas valor={resumo.media} total={resumo.total} tamanho={24} destaque={destaque} />
                <p className="avaliacoes__total">{textoDaQuantidade(resumo.total)}</p>
                <ul className="avaliacoes__barras" aria-label="Distribuição das notas">
                  {percentuaisDaDistribuicao(resumo.distribuicao, resumo.total).map(({ nota, quantidade, percentual }) => (
                    <li key={nota} className="avaliacoes__barra">
                      <span className="avaliacoes__barra-nota">
                        {nota}
                        <Icone nome="star" tamanho={14} />
                      </span>
                      <span className="avaliacoes__barra-trilho" aria-hidden="true">
                        <span className="avaliacoes__barra-cheia" style={{ width: `${percentual}%` }} />
                      </span>
                      <span className="avaliacoes__barra-qtd">
                        {quantidade}
                        <span className="visualmente-oculto">
                          {' '}
                          {quantidade === 1 ? 'avaliação' : 'avaliações'} com {nota} {nota === 1 ? 'estrela' : 'estrelas'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="avaliacoes__vazio">
                <Estrelas valor={0} total={0} tamanho={24} />
                <p>Este negócio ainda não possui avaliações.</p>
              </div>
            )}
          </div>

          {/* Avaliar: formulário, a avaliação de quem está vendo, ou o convite para entrar */}
          <div className="avaliacoes__acao">
            {!dados ? null : minha && minha.status === 'REMOVIDA' ? (
              <StatusMessage tipo="aviso" titulo="Sua avaliação foi removida pela moderação">
                <p>{minha.motivoRemocao ? `Motivo: ${minha.motivoRemocao}` : 'Ela não aparece mais no perfil.'}</p>
              </StatusMessage>
            ) : minha && !editando ? (
              <div className="avaliacoes__minha">
                <h3 className="avaliacoes__subtitulo">Sua avaliação</h3>
                <CartaoAvaliacao
                  avaliacao={minha}
                  destaque={destaque}
                  acoes={
                    <>
                      <button type="button" className="cartao-avaliacao__link" onClick={() => setEditando(true)}>
                        <Icone nome="edit" tamanho={16} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="cartao-avaliacao__link cartao-avaliacao__link--perigo"
                        onClick={() => setConfirmarExclusao(true)}
                      >
                        <Icone nome="delete" tamanho={16} />
                        Apagar
                      </button>
                    </>
                  }
                />
              </div>
            ) : minha && editando ? (
              <div className="avaliacoes__caixa">
                <h3 className="avaliacoes__subtitulo">Editar sua avaliação</h3>
                <FormAvaliacao
                  inicial={minha}
                  onEnviar={salvarEdicao}
                  onCancelar={() => setEditando(false)}
                  textoBotao="Salvar alterações"
                />
              </div>
            ) : permissao?.podeAvaliar ? (
              <div className="avaliacoes__caixa">
                <h3 className="avaliacoes__subtitulo">Avalie {nomeNegocio}</h3>
                <p className="avaliacoes__dica">Conte como foi a sua experiência para ajudar outros clientes.</p>
                <FormAvaliacao inicial={rascunho} onEnviar={publicar} />
              </div>
            ) : permissao?.motivo === 'LOGIN' ? (
              <div className="avaliacoes__caixa avaliacoes__convite">
                <h3 className="avaliacoes__subtitulo">Avalie {nomeNegocio}</h3>
                <p className="avaliacoes__dica">
                  Escolha as estrelas e conte como foi. Para publicar, confirmamos com o Google que é você: sem
                  cadastro e sem senha.
                </p>
                <FormAvaliacao inicial={rascunho} onEnviar={publicarComGoogle} textoBotao="Publicar com Google" />
                <p className="avaliacoes__dica avaliacoes__dica--rodape">
                  Ao publicar, você aceita os <Link to="/termos">Termos de Uso</Link> e a{' '}
                  <Link to="/privacidade">Política de Privacidade</Link>. Do Google usamos só o seu nome e e-mail.
                </p>
                <p className="avaliacoes__dica avaliacoes__dica--rodape">
                  Já avaliou? <a href={urlDoGoogle(voltarPara.de)}>Confirme com o Google</a> para ver e editar a sua.
                  Anuncia aqui?{' '}
                  <Link to="/login" state={voltarPara}>
                    Entre com e-mail e senha
                  </Link>
                  .
                </p>
              </div>
            ) : permissao?.mensagem ? (
              <StatusMessage tipo="info">{permissao.mensagem}</StatusMessage>
            ) : null}
          </div>
        </div>
      )}

      {/* Comentários */}
      {dados && resumo.total > 0 && (
        <div className="avaliacoes__lista-bloco">
          <div className="avaliacoes__lista-topo">
            <h3 className="avaliacoes__subtitulo">Comentários</h3>
            <label className="avaliacoes__ordem">
              <span>Ordenar por</span>
              <select className="campo__entrada" value={ordem} onChange={(evento) => setOrdem(evento.target.value)}>
                {ORDENS_DAS_AVALIACOES.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="avaliacoes__lista" aria-busy={carregando}>
            {estado.itens.map((avaliacao) => (
              <li key={avaliacao.id}>
                <CartaoAvaliacao
                  avaliacao={avaliacao}
                  destaque={destaque}
                  podeDenunciar={autenticado && !avaliacao.minha}
                  onDenunciar={(motivo) => denunciar(avaliacao.id, motivo)}
                />
              </li>
            ))}
          </ul>
          {temMais && (
            <div className="avaliacoes__mais">
              <Button variante="secundario" onClick={verMais} disabled={carregandoMais}>
                {carregandoMais ? 'Carregando...' : 'Ver mais avaliações'}
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        aberto={confirmarExclusao}
        titulo="Apagar sua avaliação?"
        mensagem="A nota e o comentário saem do perfil e a média é recalculada. Você poderá avaliar de novo depois."
        textoConfirmar="Apagar avaliação"
        carregando={excluindo}
        onConfirmar={excluir}
        onCancelar={() => setConfirmarExclusao(false)}
      />
    </section>
  )
}

export default SecaoAvaliacoes
