import { useMemo, useState } from 'react'
import { useConsulta } from '../../../hooks/useConsulta'
import { useAuth, PERFIS } from '../../../contexts/auth'
import { categoriasDoFaq, filtrarFaq } from '../../../services/faq'
import Acordeao from '../../ui/Acordeao/Acordeao'
import Button from '../../ui/Button/Button'
import Icone from '../../ui/Icone/Icone'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import './PerguntasFrequentes.css'

/**
 * Central de ajuda: perguntas ativas, com busca e filtro por categoria.
 * Quem administra vê um atalho para editar; a trava de verdade fica no servidor.
 */
function PerguntasFrequentes() {
  const { usuario } = useAuth()
  const podeAdministrar = usuario?.perfil === PERFIS.ADMIN

  const { dados, carregando, erro, recarregar } = useConsulta('/faq')
  const perguntas = useMemo(() => dados?.data ?? [], [dados])

  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')

  const categorias = useMemo(() => categoriasDoFaq(perguntas), [perguntas])
  const encontradas = useMemo(
    () => filtrarFaq(perguntas, { busca, categoria }),
    [perguntas, busca, categoria]
  )
  const temFiltro = Boolean(busca.trim() || categoria)

  const limpar = () => {
    setBusca('')
    setCategoria('')
  }

  return (
    <section className="perguntas" aria-labelledby="perguntas-titulo" id="perguntas-frequentes">
      <div className="perguntas__cabecalho">
        <div>
          <h2 id="perguntas-titulo">Perguntas frequentes</h2>
          <p>Talvez a sua dúvida já tenha resposta aqui.</p>
        </div>
        {podeAdministrar && (
          <Button variante="secundario" tamanho="sm" to="/admin?aba=faq">
            <Icone nome="edit" tamanho={18} />
            Administrar perguntas
          </Button>
        )}
      </div>

      {carregando && <Spinner texto="Carregando as perguntas..." />}

      {erro && (
        <StatusMessage
          tipo="erro"
          titulo="Não foi possível carregar as perguntas"
          acao={
            <Button variante="secundario" tamanho="sm" onClick={recarregar}>
              Tentar novamente
            </Button>
          }
        >
          <p>{erro.message}</p>
        </StatusMessage>
      )}

      {!carregando && !erro && perguntas.length > 0 && (
        <>
          <div className="perguntas__filtros">
            <div className="campo perguntas__busca">
              <label className="campo__rotulo" htmlFor="perguntas-busca">
                Buscar nas perguntas
              </label>
              <div className="perguntas__caixa-busca">
                <Icone nome="search" tamanho={20} className="perguntas__lupa" />
                <input
                  id="perguntas-busca"
                  type="search"
                  className="campo__entrada perguntas__entrada"
                  placeholder="Ex.: endereço, pagamento, cadastro"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  maxLength={100}
                />
              </div>
            </div>

            {categorias.length > 0 && (
              <div className="campo perguntas__categoria">
                <label className="campo__rotulo" htmlFor="perguntas-categoria">
                  Assunto
                </label>
                <select
                  id="perguntas-categoria"
                  className="campo__entrada"
                  value={categoria}
                  onChange={(evento) => setCategoria(evento.target.value)}
                >
                  <option value="">Todos os assuntos</option>
                  {categorias.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="perguntas__contagem" aria-live="polite">
            {temFiltro
              ? `${encontradas.length} de ${perguntas.length} ${perguntas.length === 1 ? 'pergunta' : 'perguntas'}`
              : `${perguntas.length} ${perguntas.length === 1 ? 'pergunta' : 'perguntas'}`}
          </p>

          {encontradas.length > 0 ? (
            <Acordeao
              itens={encontradas.map((p) => ({
                id: p.id,
                titulo: p.pergunta,
                conteudo: p.resposta,
                rotulo: categoria ? null : p.categoria,
              }))}
            />
          ) : (
            <StatusMessage tipo="vazio" titulo="Nenhuma pergunta encontrada">
              <p>Tente outra palavra ou outro assunto. Se a dúvida continuar, escreva para a gente logo abaixo.</p>
              <Button variante="secundario" tamanho="sm" onClick={limpar}>
                Limpar busca
              </Button>
            </StatusMessage>
          )}
        </>
      )}

      {!carregando && !erro && perguntas.length === 0 && (
        <StatusMessage tipo="vazio" titulo="Ainda não há perguntas publicadas">
          <p>Escreva sua dúvida no formulário logo abaixo e a equipe responde por e-mail.</p>
        </StatusMessage>
      )}
    </section>
  )
}

export default PerguntasFrequentes
