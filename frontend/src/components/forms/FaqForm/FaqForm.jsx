import { useState } from 'react'
import Button from '../../ui/Button/Button'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import { LIMITES_FAQ, validarFaq } from '../../../services/faq'
import { errosDoServidor } from '../../../services/validacoes'
import './FaqForm.css'

const VAZIO = { pergunta: '', resposta: '', categoria: '', ordem: '0', ativo: true }

/**
 * Cadastro e edição de uma pergunta frequente.
 * - `inicial`: pergunta existente (edição) ou nada (cadastro)
 * - `categorias`: sugestões para o campo de categoria
 */
function FaqForm({ inicial, categorias = [], onSubmit, onCancelar }) {
  const modoEdicao = Boolean(inicial?.id)
  const [valores, setValores] = useState(() =>
    inicial
      ? {
          pergunta: inicial.pergunta,
          resposta: inicial.resposta,
          categoria: inicial.categoria ?? '',
          ordem: String(inicial.ordem ?? 0),
          ativo: inicial.ativo,
        }
      : VAZIO
  )
  const [errosCampos, setErrosCampos] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const atualizarCampo = (evento) => {
    const { name, value, type, checked } = evento.target
    setValores((anteriores) => ({ ...anteriores, [name]: type === 'checkbox' ? checked : value }))
    setErrosCampos((anteriores) => ({ ...anteriores, [name]: undefined }))
  }

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)
    const erros = validarFaq(valores)
    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros)
      return
    }

    setSalvando(true)
    try {
      await onSubmit({
        pergunta: valores.pergunta.trim(),
        resposta: valores.resposta.trim(),
        categoria: valores.categoria.trim() || null,
        ordem: Number(valores.ordem),
        ativo: valores.ativo,
      })
    } catch (erro) {
      const erros = errosDoServidor(erro)
      if (erros) setErrosCampos(erros)
      setErroGeral(erro.message || 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const classeEntrada = (campo) => `campo__entrada ${errosCampos[campo] ? 'campo__entrada--erro' : ''}`

  return (
    <form className="formulario faq-form" onSubmit={aoEnviar} noValidate>
      {erroGeral && (
        <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
          {erroGeral}
        </StatusMessage>
      )}

      <div className="campo">
        <label className="campo__rotulo" htmlFor="faq-pergunta">
          Pergunta<span className="campo__obrigatorio">*</span>
        </label>
        <input
          id="faq-pergunta"
          name="pergunta"
          className={classeEntrada('pergunta')}
          value={valores.pergunta}
          onChange={atualizarCampo}
          maxLength={LIMITES_FAQ.pergunta}
          placeholder="Como a pessoa escreveria a dúvida"
          autoFocus
        />
        {errosCampos.pergunta ? (
          <span className="campo__erro">{errosCampos.pergunta}</span>
        ) : (
          <span className="campo__ajuda">
            {valores.pergunta.length}/{LIMITES_FAQ.pergunta}
          </span>
        )}
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="faq-resposta">
          Resposta<span className="campo__obrigatorio">*</span>
        </label>
        <textarea
          id="faq-resposta"
          name="resposta"
          rows={6}
          className={classeEntrada('resposta')}
          value={valores.resposta}
          onChange={atualizarCampo}
          maxLength={LIMITES_FAQ.resposta}
        />
        {errosCampos.resposta ? (
          <span className="campo__erro">{errosCampos.resposta}</span>
        ) : (
          <span className="campo__ajuda">Texto simples. As quebras de linha aparecem como você digitar.</span>
        )}
      </div>

      <div className="faq-form__linha">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="faq-categoria">
            Assunto
          </label>
          <input
            id="faq-categoria"
            name="categoria"
            list="faq-categorias"
            className={classeEntrada('categoria')}
            value={valores.categoria}
            onChange={atualizarCampo}
            maxLength={LIMITES_FAQ.categoria}
            placeholder="Ex.: Para quem vende"
          />
          <datalist id="faq-categorias">
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria} />
            ))}
          </datalist>
          {errosCampos.categoria && <span className="campo__erro">{errosCampos.categoria}</span>}
        </div>

        <div className="campo">
          <label className="campo__rotulo" htmlFor="faq-ordem">
            Ordem
          </label>
          <input
            id="faq-ordem"
            name="ordem"
            type="number"
            min={0}
            max={LIMITES_FAQ.ordemMaxima}
            step={1}
            className={classeEntrada('ordem')}
            value={valores.ordem}
            onChange={atualizarCampo}
          />
          {errosCampos.ordem ? (
            <span className="campo__erro">{errosCampos.ordem}</span>
          ) : (
            <span className="campo__ajuda">Menor aparece primeiro.</span>
          )}
        </div>
      </div>

      <div className="campo campo--checkbox">
        <input id="faq-ativo" name="ativo" type="checkbox" checked={valores.ativo} onChange={atualizarCampo} />
        <label htmlFor="faq-ativo">Visível na central de ajuda</label>
      </div>

      <div className="formulario__acoes">
        <Button variante="secundario" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : modoEdicao ? 'Salvar alterações' : 'Criar pergunta'}
        </Button>
      </div>
    </form>
  )
}

export default FaqForm
