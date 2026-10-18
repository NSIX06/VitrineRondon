import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/auth'
import BotaoGoogle from '../../components/auth/BotaoGoogle/BotaoGoogle'
import CartaoAvaliacao from '../../components/avaliacoes/SecaoAvaliacoes/CartaoAvaliacao'
import FormAvaliacao from '../../components/avaliacoes/SecaoAvaliacoes/FormAvaliacao'
import Button from '../../components/ui/Button/Button'
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal'
import Icone from '../../components/ui/Icone/Icone'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import '../../components/avaliacoes/SecaoAvaliacoes/SecaoAvaliacoes.css'
import './MinhasAvaliacoes.css'

/**
 * As avaliações de quem confirmou com o Google, em todos os negócios: ver,
 * editar e apagar num lugar só. Sem sessão, pede a confirmação com o Google
 * aqui mesmo (não manda para o login dos empreendedores).
 */
function MinhasAvaliacoes() {
  const { usuario, carregando: verificandoSessao } = useAuth()
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState(null)
  const [editando, setEditando] = useState(null)
  const [apagando, setApagando] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null)

  const buscar = useCallback(
    () =>
      api
        .get('/avaliacoes/minhas')
        .then((resposta) => {
          setLista(resposta.data)
          setErro(null)
        })
        .catch((falha) => setErro(falha.message)),
    []
  )

  useEffect(() => {
    if (usuario) buscar()
  }, [usuario, buscar])

  const salvar = async (avaliacao, valores) => {
    const resposta = await api.put(`/avaliacoes/${avaliacao.id}`, valores)
    setEditando(null)
    setAviso({ tipo: 'sucesso', texto: resposta.message })
    await buscar()
  }

  const apagar = async () => {
    setOcupado(true)
    try {
      const resposta = await api.delete(`/avaliacoes/${apagando.id}`)
      setAviso({ tipo: 'sucesso', texto: resposta.message })
      await buscar()
    } catch (falha) {
      setAviso({ tipo: 'erro', texto: falha.message })
    } finally {
      setApagando(null)
      setOcupado(false)
    }
  }

  return (
    <>
      <header className="pagina-cabecalho faixa faixa--ceu">
        <div className="container">
          <span className="pagina-cabecalho__marca">Suas avaliações</span>
          <h1>Minhas avaliações</h1>
          <p>As notas e os comentários que você deixou nos negócios da vitrine. Edite ou apague quando quiser.</p>
        </div>
      </header>

      <section className="container secao minhas-avaliacoes">
        {verificandoSessao ? (
          <Spinner texto="Carregando..." />
        ) : !usuario ? (
          <div className="minhas-avaliacoes__confirmar">
            <h2 className="avaliacoes__subtitulo">Confirme que é você</h2>
            <p className="avaliacoes__dica">Para ver e editar as suas avaliações, confirme com o Google. Sem senha.</p>
            <BotaoGoogle destino="/minhas-avaliacoes" />
          </div>
        ) : (
          <>
            {aviso && (
              <StatusMessage tipo={aviso.tipo} onFechar={() => setAviso(null)}>
                {aviso.texto}
              </StatusMessage>
            )}
            {erro && !lista && (
              <StatusMessage tipo="erro" titulo="Não foi possível carregar as suas avaliações" aoTentarDeNovo={buscar}>
                <p>{erro}</p>
              </StatusMessage>
            )}
            {!lista && !erro && <Spinner texto="Carregando as suas avaliações..." />}
            {lista && lista.length === 0 && (
              <StatusMessage tipo="vazio" titulo="Você ainda não avaliou nenhum negócio">
                <p>Abra o perfil de um negócio que já te atendeu e conte como foi.</p>
                <Button to="/empreendedores" variante="secundario" tamanho="sm">
                  Ver os empreendedores
                </Button>
              </StatusMessage>
            )}
            {lista && lista.length > 0 && (
              <ul className="minhas-avaliacoes__lista">
                {lista.map((avaliacao) => (
                  <li key={avaliacao.id} className="minhas-avaliacoes__item">
                    <Link to={`/empreendedores/${avaliacao.negocio.id}#avaliacoes`} className="minhas-avaliacoes__negocio">
                      <Icone nome={avaliacao.negocio.emDestaque ? 'star' : 'storefront'} tamanho={18} />
                      {avaliacao.negocio.nomeNegocio}
                    </Link>
                    {avaliacao.status === 'REMOVIDA' && (
                      <StatusMessage tipo="aviso" titulo="Removida pela moderação">
                        <p>{avaliacao.motivoRemocao ? `Motivo: ${avaliacao.motivoRemocao}` : 'Ela não aparece mais no perfil.'}</p>
                      </StatusMessage>
                    )}
                    {editando === avaliacao.id ? (
                      <div className="avaliacoes__caixa">
                        <FormAvaliacao
                          inicial={avaliacao}
                          onEnviar={(valores) => salvar(avaliacao, valores)}
                          onCancelar={() => setEditando(null)}
                          textoBotao="Salvar alterações"
                        />
                      </div>
                    ) : (
                      <CartaoAvaliacao
                        avaliacao={avaliacao}
                        destaque={avaliacao.negocio.emDestaque}
                        acoes={
                          <>
                            {avaliacao.status !== 'REMOVIDA' && (
                              <button type="button" className="cartao-avaliacao__link" onClick={() => setEditando(avaliacao.id)}>
                                <Icone nome="edit" tamanho={16} />
                                Editar
                              </button>
                            )}
                            <button
                              type="button"
                              className="cartao-avaliacao__link cartao-avaliacao__link--perigo"
                              onClick={() => setApagando(avaliacao)}
                            >
                              <Icone nome="delete" tamanho={16} />
                              Apagar
                            </button>
                          </>
                        }
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <ConfirmModal
        aberto={Boolean(apagando)}
        titulo="Apagar sua avaliação?"
        mensagem={`A avaliação sai do perfil de ${apagando?.negocio.nomeNegocio ?? 'do negócio'} e a média é recalculada.`}
        textoConfirmar="Apagar avaliação"
        carregando={ocupado}
        onConfirmar={apagar}
        onCancelar={() => setApagando(null)}
      />
    </>
  )
}

export default MinhasAvaliacoes
