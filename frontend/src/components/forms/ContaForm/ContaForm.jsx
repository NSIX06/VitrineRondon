import { useState } from 'react'
import Button from '../../ui/Button/Button'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import AceiteTermos from '../AceiteTermos/AceiteTermos'
import CampoSenha from '../CampoSenha/CampoSenha'
import { validarAceites, errosDoServidor } from '../../../services/validacoes'
import './ContaForm.css'

const estadoInicial = {
  nome: '',
  email: '',
  telefone: '',
  senha: '',
  confirmacaoSenha: '',
}

const aceitesIniciais = { termosDeUso: false, politicaPrivacidade: false }

/**
 * Dados da conta (nome, e-mail, telefone, senha) mais o aceite dos termos.
 * Usado no cadastro de usuário comum e como primeira etapa do cadastro de empreendedor.
 * - `onSubmit({ conta, aceites })`: Promise; se rejeitar, os erros do servidor aparecem aqui
 * - `textoBotao`: rótulo do botão de envio
 * - `valoresIniciais`: para voltar de uma etapa seguinte sem perder o que foi digitado
 */
function ContaForm({ onSubmit, textoBotao = 'Criar conta', valoresIniciais, versaoTermos }) {
  const [valores, setValores] = useState(() => ({ ...estadoInicial, ...valoresIniciais?.conta }))
  const [aceites, setAceites] = useState(() => ({ ...aceitesIniciais, ...valoresIniciais?.aceites }))
  const [errosCampos, setErrosCampos] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const atualizarCampo = (evento) => {
    const { name, value } = evento.target
    setValores((anterior) => ({ ...anterior, [name]: value }))
    if (errosCampos[name]) setErrosCampos((anterior) => ({ ...anterior, [name]: undefined }))
  }

  const atualizarAceites = (novos) => {
    setAceites(novos)
    setErrosCampos((anterior) => ({ ...anterior, termosDeUso: undefined, politicaPrivacidade: undefined }))
  }

  const validar = () => {
    const erros = {}
    if (valores.nome.trim().length < 2) erros.nome = 'Informe seu nome'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email.trim())) erros.email = 'Informe um e-mail válido'
    const digitos = valores.telefone.replace(/\D/g, '')
    if (digitos.length < 10 || digitos.length > 13) erros.telefone = 'Informe o telefone com DDD'
    if (valores.senha.length < 8) erros.senha = 'A senha deve ter ao menos 8 caracteres'
    else if (!/[A-Za-z]/.test(valores.senha) || !/\d/.test(valores.senha)) {
      erros.senha = 'Use letras e números na senha'
    }
    if (valores.confirmacaoSenha !== valores.senha) erros.confirmacaoSenha = 'As senhas não conferem'
    return { ...erros, ...validarAceites(aceites) }
  }

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)
    const erros = validar()
    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros)
      return
    }
    setEnviando(true)
    try {
      await onSubmit({
        conta: {
          nome: valores.nome.trim(),
          email: valores.email.trim().toLowerCase(),
          telefone: valores.telefone.replace(/\D/g, ''),
          senha: valores.senha,
          confirmacaoSenha: valores.confirmacaoSenha,
        },
        aceites,
      })
    } catch (erro) {
      const erros = errosDoServidor(erro, ['conta.', 'aceites.'])
      if (erros) setErrosCampos(erros)
      setErroGeral(erro.message || 'Não foi possível concluir. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const classe = (campo) => `campo__entrada ${errosCampos[campo] ? 'campo__entrada--erro' : ''}`

  return (
    <form className="formulario conta-form" onSubmit={aoEnviar} noValidate>
      {erroGeral && (
        <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
          {erroGeral}
        </StatusMessage>
      )}

      <div className="campo">
        <label className="campo__rotulo" htmlFor="conta-nome">
          Nome<span className="campo__obrigatorio">*</span>
        </label>
        <input
          id="conta-nome"
          name="nome"
          className={classe('nome')}
          value={valores.nome}
          onChange={atualizarCampo}
          maxLength={150}
          autoComplete="name"
        />
        {errosCampos.nome && <span className="campo__erro">{errosCampos.nome}</span>}
      </div>

      <div className="formulario__linha">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="conta-email">
            E-mail<span className="campo__obrigatorio">*</span>
          </label>
          <input
            id="conta-email"
            name="email"
            type="email"
            className={classe('email')}
            value={valores.email}
            onChange={atualizarCampo}
            maxLength={150}
            autoComplete="email"
          />
          {errosCampos.email && <span className="campo__erro">{errosCampos.email}</span>}
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="conta-telefone">
            Telefone<span className="campo__obrigatorio">*</span>
          </label>
          <input
            id="conta-telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            className={classe('telefone')}
            value={valores.telefone}
            onChange={atualizarCampo}
            maxLength={30}
            autoComplete="tel"
            placeholder="66 99123-4567"
          />
          {errosCampos.telefone && <span className="campo__erro">{errosCampos.telefone}</span>}
        </div>
      </div>

      <div className="formulario__linha">
        <CampoSenha
          id="conta-senha"
          name="senha"
          rotulo="Senha"
          obrigatorio
          valor={valores.senha}
          onChange={atualizarCampo}
          erro={errosCampos.senha}
          ajuda="Mínimo de 8 caracteres, com letras e números."
          autoComplete="new-password"
          maxLength={72}
        />
        <CampoSenha
          id="conta-confirmacao"
          name="confirmacaoSenha"
          rotulo="Confirmar senha"
          obrigatorio
          valor={valores.confirmacaoSenha}
          onChange={atualizarCampo}
          erro={errosCampos.confirmacaoSenha}
          autoComplete="new-password"
          maxLength={72}
        />
      </div>

      <AceiteTermos valores={aceites} onChange={atualizarAceites} erros={errosCampos} versao={versaoTermos} />

      <div className="formulario__acoes conta-form__acoes">
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Enviando...' : textoBotao}
        </Button>
      </div>
    </form>
  )
}

export default ContaForm
