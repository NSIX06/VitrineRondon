import { useState } from 'react'
import Button from '../../ui/Button/Button'
import Icone from '../../ui/Icone/Icone'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import { errosDoServidor } from '../../../services/validacoes'
import { digitosDoTelefone, telefoneCompleto } from '../../../services/telefone'
import EntradaTelefone from '../EntradaTelefone/EntradaTelefone'
import './ContatoForm.css'

const estadoInicial = {
  nome: '',
  email: '',
  telefone: '',
  mensagem: '',
}

const MINIMO_MENSAGEM = 5
const MAXIMO_MENSAGEM = 5000
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Regras de cada campo; devolve a mensagem de erro ou null */
const regras = {
  nome: (v) => (v.trim().length < 2 ? 'Informe seu nome' : null),
  email: (v) => (!EMAIL_VALIDO.test(v.trim()) ? 'Informe um e-mail válido' : null),
  mensagem: (v) =>
    v.trim().length < MINIMO_MENSAGEM
      ? `Escreva uma mensagem com ao menos ${MINIMO_MENSAGEM} caracteres`
      : null,
  // Opcional: vazio passa; preenchido, precisa estar completo
  telefone: (v) => (v && !telefoneCompleto(v) ? 'Telefone incompleto: informe DDD e número' : null),
}

/**
 * Formulário da central de ajuda, em duas colunas: quem escreve à esquerda, a
 * mensagem à direita. Vai sempre para a equipe do VitrineRondon; com um
 * negócio, o contato é direto pelo WhatsApp dele.
 * - `onSubmit(dados)`: Promise; ao resolver, o formulário mostra a confirmação
 */
function ContatoForm({ onSubmit }) {
  const [valores, setValores] = useState(estadoInicial)
  const [errosCampos, setErrosCampos] = useState({})
  // Campos que a pessoa já visitou: só eles mostram erro ou confirmação
  const [tocados, setTocados] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [enviando, setEnviando] = useState(false)
  // Depois de enviar: { destino, email }
  const [enviado, setEnviado] = useState(null)

  const validarCampo = (nome, valor) => regras[nome]?.(valor) ?? null

  const atualizarCampo = (evento) => {
    const { name, value } = evento.target
    setValores((anterior) => ({ ...anterior, [name]: value }))
    // Depois de visitado, o campo revalida enquanto a pessoa digita
    if (tocados[name] || errosCampos[name]) {
      setErrosCampos((anterior) => ({ ...anterior, [name]: validarCampo(name, value) }))
    }
  }

  const aoSair = (evento) => {
    const { name, value } = evento.target
    if (!regras[name]) return
    setTocados((anterior) => ({ ...anterior, [name]: true }))
    setErrosCampos((anterior) => ({ ...anterior, [name]: validarCampo(name, value) }))
  }

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)

    const erros = {}
    for (const nome of Object.keys(regras)) {
      const erro = validarCampo(nome, valores[nome])
      if (erro) erros[nome] = erro
    }
    setTocados({ nome: true, email: true, mensagem: true })
    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros)
      return
    }

    const dados = {
      nome: valores.nome.trim(),
      email: valores.email.trim(),
      telefone: digitosDoTelefone(valores.telefone) || null,
      mensagem: valores.mensagem.trim(),
    }

    setEnviando(true)
    try {
      await onSubmit(dados)
      setEnviado({ destino: 'a equipe do VitrineRondon', email: dados.email })
      setValores(estadoInicial)
      setErrosCampos({})
      setTocados({})
    } catch (erro) {
      const erros = errosDoServidor(erro)
      if (erros) setErrosCampos(erros)
      setErroGeral(erro.message || 'Não foi possível enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // Estado visual de um campo obrigatório: erro, ok ou neutro
  const situacao = (campo) => {
    if (errosCampos[campo]) return 'erro'
    // Campo opcional em branco fica neutro, sem o "ok" verde
    if (!valores[campo]) return ''
    if (tocados[campo] && !validarCampo(campo, valores[campo])) return 'ok'
    return ''
  }

  const classeEntrada = (campo) => {
    const s = situacao(campo)
    return `campo__entrada ${s === 'erro' ? 'campo__entrada--erro' : ''} ${s === 'ok' ? 'contato-form__entrada--ok' : ''}`
  }

  const tamanhoMensagem = valores.mensagem.trim().length
  const faltam = MINIMO_MENSAGEM - tamanhoMensagem

  if (enviado) {
    return (
      <div className="contato-form contato-form--enviado">
        <StatusMessage tipo="sucesso" titulo="Mensagem enviada">
          <p>
            Sua mensagem foi para <strong>{enviado.destino}</strong>. A resposta chega em{' '}
            <strong>{enviado.email}</strong>.
          </p>
        </StatusMessage>
        <Button variante="secundario" onClick={() => setEnviado(null)}>
          Escrever outra mensagem
        </Button>
      </div>
    )
  }

  return (
    <form className="formulario contato-form" onSubmit={aoEnviar} noValidate>
      {erroGeral && (
        <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
          {erroGeral}
        </StatusMessage>
      )}

      <div className="contato-form__colunas">
        <div className="contato-form__coluna">
          <div className="campo">
            <label className="campo__rotulo" htmlFor="contato-nome">
              Seu nome<span className="campo__obrigatorio">*</span>
            </label>
            <div className="contato-form__caixa">
              <input
                id="contato-nome"
                name="nome"
                className={classeEntrada('nome')}
                value={valores.nome}
                onChange={atualizarCampo}
                onBlur={aoSair}
                maxLength={150}
                autoComplete="name"
                placeholder="Como podemos te chamar?"
                aria-invalid={Boolean(errosCampos.nome)}
              />
              {situacao('nome') === 'ok' && <Icone nome="check_circle" tamanho={18} className="contato-form__ok" />}
            </div>
            {errosCampos.nome && <span className="campo__erro">{errosCampos.nome}</span>}
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="contato-email">
              E-mail<span className="campo__obrigatorio">*</span>
            </label>
            <div className="contato-form__caixa">
              <input
                id="contato-email"
                name="email"
                type="email"
                className={classeEntrada('email')}
                value={valores.email}
                onChange={atualizarCampo}
                onBlur={aoSair}
                maxLength={150}
                autoComplete="email"
                placeholder="voce@email.com"
                aria-invalid={Boolean(errosCampos.email)}
              />
              {situacao('email') === 'ok' && <Icone nome="check_circle" tamanho={18} className="contato-form__ok" />}
            </div>
            {errosCampos.email ? (
              <span className="campo__erro">{errosCampos.email}</span>
            ) : (
              <span className="campo__ajuda">A resposta chega neste e-mail.</span>
            )}
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="contato-telefone">
              Telefone
            </label>
            <EntradaTelefone
              id="contato-telefone"
              name="telefone"
              className={classeEntrada('telefone')}
              value={valores.telefone}
              onChange={atualizarCampo}
              onBlur={aoSair}
              placeholder="Opcional, ex.: (66) 99123-4567"
              aria-invalid={Boolean(errosCampos.telefone)}
            />
            {errosCampos.telefone && <span className="campo__erro">{errosCampos.telefone}</span>}
          </div>

          {/* Destinatário fixo: a central de ajuda fala só com a equipe */}
          <div className="contato-form__destino">
            <strong>Para: equipe do VitrineRondon</strong>
            <span className="contato-form__destino-info">
              Dúvidas, sugestões e problemas no site. Respondemos em até 24 horas úteis.
            </span>
            <span className="contato-form__destino-info">
              Quer falar com um negócio? Use o botão de WhatsApp na página dele.
            </span>
          </div>
        </div>

        <div className="contato-form__coluna contato-form__coluna--mensagem">
          <div className="campo contato-form__campo-mensagem">
            <label className="campo__rotulo" htmlFor="contato-mensagem">
              Mensagem<span className="campo__obrigatorio">*</span>
            </label>
            <textarea
              id="contato-mensagem"
              name="mensagem"
              className={classeEntrada('mensagem')}
              value={valores.mensagem}
              onChange={atualizarCampo}
              onBlur={aoSair}
              maxLength={MAXIMO_MENSAGEM}
              rows={9}
              placeholder="Conte para a equipe o que você precisa"
              aria-invalid={Boolean(errosCampos.mensagem)}
              aria-describedby="contato-contador"
            />
            <div className="contato-form__rodape-mensagem">
              {errosCampos.mensagem ? (
                <span className="campo__erro">{errosCampos.mensagem}</span>
              ) : (
                <span className="campo__ajuda">
                  {faltam > 0 && tamanhoMensagem > 0
                    ? `Faltam ${faltam} ${faltam === 1 ? 'caractere' : 'caracteres'}`
                    : ' '}
                </span>
              )}
              <span
                id="contato-contador"
                className={`contato-form__contador ${
                  valores.mensagem.length > MAXIMO_MENSAGEM * 0.9 ? 'contato-form__contador--alerta' : ''
                }`}
              >
                {valores.mensagem.length}/{MAXIMO_MENSAGEM}
              </span>
            </div>
          </div>

          <div className="formulario__acoes contato-form__acoes">
            <Button type="submit" disabled={enviando}>
              <Icone nome="send" tamanho={18} />
              {enviando ? 'Enviando...' : 'Enviar mensagem'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default ContatoForm
