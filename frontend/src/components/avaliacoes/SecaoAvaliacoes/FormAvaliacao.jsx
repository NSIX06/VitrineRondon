import { useId, useState } from 'react'
import Button from '../../ui/Button/Button'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import Icone from '../../ui/Icone/Icone'
import Estrelas from '../Estrelas/Estrelas'
import {
  COMENTARIO_MAXIMO,
  ROTULOS_DAS_NOTAS,
  faixaDaMedia,
  validarAvaliacao,
} from '../../../services/avaliacoes'
import { errosDoServidor } from '../../../services/validacoes'

/**
 * Formulário de avaliação (publicar ou editar). As estrelas são um grupo de
 * botões de rádio de verdade: setas do teclado trocam a nota, e o leitor de
 * tela anuncia "4 estrelas, Bom". Passar o mouse mostra a nota antes do clique.
 *
 * - `inicial`: { nota, comentario } ao editar
 * - `onEnviar({ nota, comentario })`: Promise; se rejeitar, os erros aparecem aqui
 */
function FormAvaliacao({ inicial, onEnviar, onCancelar, textoBotao = 'Publicar avaliação' }) {
  const id = useId()
  const [nota, setNota] = useState(inicial?.nota ?? 0)
  const [passando, setPassando] = useState(0)
  const [comentario, setComentario] = useState(inicial?.comentario ?? '')
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const notaVisivel = passando || nota
  const restantes = COMENTARIO_MAXIMO - comentario.length

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)
    const encontrados = validarAvaliacao({ nota, comentario })
    if (Object.keys(encontrados).length) {
      setErros(encontrados)
      document.getElementById(encontrados.nota ? `${id}-nota-1` : `${id}-comentario`)?.focus()
      return
    }
    setEnviando(true)
    try {
      await onEnviar({ nota, comentario: comentario.trim() })
    } catch (erro) {
      const doServidor = errosDoServidor(erro)
      if (doServidor) setErros(doServidor)
      setErroGeral(erro.message || 'Não foi possível enviar a avaliação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="form-avaliacao" onSubmit={aoEnviar} noValidate>
      {erroGeral && (
        <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
          {erroGeral}
        </StatusMessage>
      )}

      <fieldset className="form-avaliacao__notas" aria-describedby={erros.nota ? `${id}-erro-nota` : undefined}>
        <legend className="campo__rotulo">
          Sua nota<span className="campo__obrigatorio">*</span>
        </legend>
        <div
          className="form-avaliacao__estrelas"
          onMouseLeave={() => setPassando(0)}
        >
          {[1, 2, 3, 4, 5].map((valor) => (
            <label
              key={valor}
              className={`form-avaliacao__estrela ${valor <= notaVisivel ? 'form-avaliacao__estrela--acesa' : ''}`}
              onMouseEnter={() => setPassando(valor)}
            >
              <input
                type="radio"
                id={`${id}-nota-${valor}`}
                name={`${id}-nota`}
                value={valor}
                checked={nota === valor}
                onChange={() => {
                  setNota(valor)
                  setErros((anterior) => ({ ...anterior, nota: undefined }))
                }}
                className="visualmente-oculto"
              />
              <Estrelas
                valor={valor <= notaVisivel ? 1 : 0}
                total={1}
                faixa={faixaDaMedia(notaVisivel, notaVisivel ? 1 : 0)}
                tamanho={34}
                quantidade={1}
                className="form-avaliacao__uma"
              />
              <span className="visualmente-oculto">
                {valor} {valor === 1 ? 'estrela' : 'estrelas'}, {ROTULOS_DAS_NOTAS[valor]}
              </span>
            </label>
          ))}
          <span className="form-avaliacao__rotulo-nota" aria-hidden="true">
            {notaVisivel ? ROTULOS_DAS_NOTAS[notaVisivel] : 'Toque nas estrelas'}
          </span>
        </div>
        {erros.nota && (
          <span id={`${id}-erro-nota`} className="campo__erro">
            {erros.nota}
          </span>
        )}
      </fieldset>

      <div className="campo">
        <label className="campo__rotulo" htmlFor={`${id}-comentario`}>
          Comentário<span className="campo__obrigatorio">*</span>
        </label>
        <textarea
          id={`${id}-comentario`}
          className={`campo__entrada form-avaliacao__texto ${erros.comentario ? 'campo__entrada--erro' : ''}`}
          value={comentario}
          onChange={(evento) => {
            setComentario(evento.target.value)
            if (erros.comentario) setErros((anterior) => ({ ...anterior, comentario: undefined }))
          }}
          maxLength={COMENTARIO_MAXIMO}
          rows={4}
          placeholder="Como foi o atendimento, a entrega, o resultado?"
          aria-describedby={`${id}-contador${erros.comentario ? ` ${id}-erro-comentario` : ''}`}
        />
        <span id={`${id}-contador`} className={`form-avaliacao__contador ${restantes < 50 ? 'form-avaliacao__contador--fim' : ''}`}>
          {comentario.length}/{COMENTARIO_MAXIMO}
        </span>
        {erros.comentario && (
          <span id={`${id}-erro-comentario`} className="campo__erro">
            {erros.comentario}
          </span>
        )}
      </div>

      <p className="form-avaliacao__nota-publica">
        <Icone nome="visibility" tamanho={16} />
        Sua avaliação aparece com o seu primeiro nome e a inicial do sobrenome.
      </p>

      <div className="form-avaliacao__acoes">
        {onCancelar && (
          <Button variante="secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variante="destaque" disabled={enviando}>
          <Icone nome={enviando ? 'progress_activity' : 'send'} tamanho={18} />
          {enviando ? 'Enviando...' : textoBotao}
        </Button>
      </div>
    </form>
  )
}

export default FormAvaliacao
