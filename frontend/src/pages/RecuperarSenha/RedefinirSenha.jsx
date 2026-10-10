import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import Button from '../../components/ui/Button/Button'
import Icone from '../../components/ui/Icone/Icone'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import CampoSenha from '../../components/forms/CampoSenha/CampoSenha'
import PainelAcesso from '../Login/PainelAcesso'
import { errosDoServidor } from '../../services/validacoes'
import '../Login/Login.css'

const FOTO = 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200'

/** Mesmas regras do servidor e do cadastro */
function errosDaSenha({ senha, confirmacaoSenha }) {
  const erros = {}
  if (senha.length < 8) erros.senha = 'A senha deve ter ao menos 8 caracteres'
  else if (senha.length > 72) erros.senha = 'A senha deve ter no máximo 72 caracteres'
  else if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) erros.senha = 'Use letras e números'
  if (confirmacaoSenha !== senha) erros.confirmacaoSenha = 'As senhas não conferem'
  return erros
}

/**
 * Segundo passo: aberta pelo link do e-mail (?codigo=...). Confere o link,
 * pede a senha nova duas vezes e, no fim, manda a pessoa entrar de novo.
 */
function RedefinirSenha() {
  const [parametros] = useSearchParams()
  const codigo = parametros.get('codigo') || ''
  // 'verificando' | 'valido' | 'invalido' | 'concluido'
  const [etapa, setEtapa] = useState(codigo ? 'verificando' : 'invalido')
  const [aviso, setAviso] = useState(codigo ? null : 'Este link não é válido. Peça um novo na tela de recuperação.')
  const [valores, setValores] = useState({ senha: '', confirmacaoSenha: '' })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!codigo) return undefined
    let ativo = true
    api
      .post('/auth/redefinir-senha/verificar', { codigo })
      .then(() => ativo && setEtapa('valido'))
      .catch((falha) => {
        if (!ativo) return
        setAviso(falha.message)
        setEtapa('invalido')
      })
    return () => {
      ativo = false
    }
  }, [codigo])

  const atualizar = (evento) => {
    const { name, value } = evento.target
    setValores((anterior) => ({ ...anterior, [name]: value }))
    if (erros[name]) setErros((anterior) => ({ ...anterior, [name]: undefined }))
  }

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)
    const novosErros = errosDaSenha(valores)
    if (Object.keys(novosErros).length) {
      setErros(novosErros)
      return
    }
    setEnviando(true)
    try {
      await api.post('/auth/redefinir-senha', { codigo, ...valores })
      setEtapa('concluido')
    } catch (falha) {
      // Link vencido ou usado no meio do caminho: mostra o aviso com o caminho de volta
      const doServidor = errosDoServidor(falha)
      if (falha.status === 410) {
        setAviso(falha.message)
        setEtapa('invalido')
      } else if (doServidor) {
        // Ex.: senha comum recusada pelo servidor: mostra no próprio campo
        setErros(doServidor)
      } else {
        setErroGeral(falha.message || 'Não foi possível trocar a senha agora. Tente de novo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="container secao login">
      <div className="login__moldura">
        <div className="login__lado">
          <div className="login__conteudo">
            <span className="pagina-cabecalho__marca">Recuperar acesso</span>
            <h1 className="login__titulo">Criar nova senha</h1>

            {etapa === 'verificando' && <Spinner texto="Conferindo o link..." />}

            {etapa === 'invalido' && (
              <div className="login__aviso login__aviso--erro" role="alert">
                <span className="login__aviso-icone">
                  <Icone nome="link_off" tamanho={28} />
                </span>
                <p>{aviso}</p>
                <Button to="/esqueci-senha" variante="secundario">
                  <Icone nome="send" tamanho={18} />
                  Pedir um novo link
                </Button>
              </div>
            )}

            {etapa === 'concluido' && (
              <div className="login__aviso" role="status">
                <span className="login__aviso-icone">
                  <Icone nome="lock_reset" tamanho={28} />
                </span>
                <p>
                  <strong>Senha alterada.</strong> Por segurança, as sessões abertas antes da troca foram encerradas.
                  Entre com a nova senha.
                </p>
                <Button to="/login">
                  <Icone nome="login" tamanho={18} />
                  Entrar
                </Button>
              </div>
            )}

            {etapa === 'valido' && (
              <>
                <p className="login__texto">Escolha uma senha nova, com pelo menos 8 caracteres, letras e números.</p>
                {erroGeral && (
                  <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
                    {erroGeral}
                  </StatusMessage>
                )}
                <form className="formulario" onSubmit={aoEnviar} noValidate>
                  <CampoSenha
                    id="nova-senha"
                    name="senha"
                    rotulo="Nova senha"
                    valor={valores.senha}
                    onChange={atualizar}
                    erro={erros.senha}
                    ajuda="Mínimo de 8 caracteres, com letras e números."
                    autoComplete="new-password"
                    maxLength={72}
                    autoFocus
                  />
                  <CampoSenha
                    id="nova-senha-confirmacao"
                    name="confirmacaoSenha"
                    rotulo="Repita a nova senha"
                    valor={valores.confirmacaoSenha}
                    onChange={atualizar}
                    erro={erros.confirmacaoSenha}
                    autoComplete="new-password"
                    maxLength={72}
                  />
                  <Button type="submit" disabled={enviando} className="login__botao">
                    <Icone nome="lock_reset" tamanho={18} />
                    {enviando ? 'Salvando...' : 'Salvar nova senha'}
                  </Button>
                </form>
                <p className="login__rodape">
                  Lembrou a senha? <Link to="/login">Entrar</Link>
                </p>
              </>
            )}
          </div>
        </div>

        <PainelAcesso
          fotos={{ unica: FOTO }}
          ativa="unica"
          frase="Senha nova, mesma vitrine. Seu negócio continua no mesmo lugar."
          autor="Equipe VitrineRondon"
        />
      </div>
    </section>
  )
}

export default RedefinirSenha
