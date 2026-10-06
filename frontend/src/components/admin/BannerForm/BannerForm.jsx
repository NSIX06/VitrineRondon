import { useEffect, useState } from 'react'
import api from '../../../services/api'
import Button from '../../ui/Button/Button'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import './BannerForm.css'

const URL_VALIDA = /^https?:\/\/\S+$/i

/**
 * Troca da imagem do banner da página inicial.
 * Sem imagem definida, a Home volta a mostrar a foto do item mais recente.
 * - `onSalvo(mensagem)`: chamado depois de salvar ou remover
 * - `onCancelar`: fecha sem salvar
 */
function BannerForm({ onSalvo, onCancelar }) {
  const [valores, setValores] = useState({ imagemUrl: '', legenda: '' })
  const [atual, setAtual] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [erroUrl, setErroUrl] = useState(null)
  // Situação da prévia: 'vazia' | 'carregando' | 'ok' | 'falhou'
  const [previa, setPrevia] = useState('vazia')

  useEffect(() => {
    let ativo = true
    api
      .get('/configuracoes/banner')
      .then((resposta) => {
        if (!ativo) return
        setAtual(resposta.data)
        setValores({
          imagemUrl: resposta.data.imagemUrl ?? '',
          legenda: resposta.data.legenda ?? '',
        })
        setPrevia(resposta.data.imagemUrl ? 'carregando' : 'vazia')
      })
      .catch((erroApi) => ativo && setErro(erroApi.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  const alterar = (evento) => {
    const { name, value } = evento.target
    setValores((anterior) => ({ ...anterior, [name]: value }))
    if (name === 'imagemUrl') {
      setErroUrl(null)
      const limpa = value.trim()
      setPrevia(!limpa ? 'vazia' : URL_VALIDA.test(limpa) ? 'carregando' : 'vazia')
    }
  }

  const enviar = async (imagemUrl, legenda) => {
    setErro(null)
    setSalvando(true)
    try {
      const resposta = await api.put('/configuracoes/banner', { imagemUrl, legenda })
      onSalvo(resposta.message)
    } catch (erroApi) {
      const doCampo = erroApi.data?.errors?.find((e) => e.campo === 'imagemUrl')
      if (doCampo) setErroUrl(doCampo.mensagem)
      else setErro(erroApi.message)
    } finally {
      setSalvando(false)
    }
  }

  const salvar = (evento) => {
    evento.preventDefault()
    const url = valores.imagemUrl.trim()
    if (!URL_VALIDA.test(url)) {
      setErroUrl('Informe o endereço completo da imagem, começando com http:// ou https://')
      return
    }
    if (previa === 'falhou') {
      setErroUrl('Essa imagem não abriu. Confira o endereço antes de salvar.')
      return
    }
    enviar(url, valores.legenda.trim() || null)
  }

  if (carregando) return <Spinner texto="Carregando o banner atual..." />

  const urlDigitada = valores.imagemUrl.trim()
  const mostraImagem = previa === 'carregando' || previa === 'ok'

  return (
    <form className="formulario banner-form" onSubmit={salvar} noValidate>
      {erro && (
        <StatusMessage tipo="erro" onFechar={() => setErro(null)}>
          {erro}
        </StatusMessage>
      )}

      <p className="banner-form__explica">
        É a imagem do cartaz ao lado do título da página inicial.{' '}
        {atual?.imagemUrl
          ? 'Hoje ela está definida por aqui.'
          : 'Hoje nenhuma foi escolhida, então aparece a foto do item mais recente da vitrine.'}
      </p>

      <div className="banner-form__grade">
        <div className="banner-form__campos">
          <div className="campo">
            <label className="campo__rotulo" htmlFor="banner-url">
              Endereço da imagem<span className="campo__obrigatorio">*</span>
            </label>
            <input
              id="banner-url"
              name="imagemUrl"
              type="url"
              className={`campo__entrada ${erroUrl ? 'campo__entrada--erro' : ''}`}
              value={valores.imagemUrl}
              onChange={alterar}
              placeholder="https://..."
              maxLength={500}
            />
            {erroUrl ? (
              <span className="campo__erro">{erroUrl}</span>
            ) : (
              <span className="campo__ajuda">
                Use uma foto que você tenha direito de publicar. Formato de retrato fica melhor.
              </span>
            )}
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="banner-legenda">
              Legenda
            </label>
            <input
              id="banner-legenda"
              name="legenda"
              className="campo__entrada"
              value={valores.legenda}
              onChange={alterar}
              placeholder="Ex.: Feira do Produtor, Vila Aurora"
              maxLength={120}
            />
            <span className="campo__ajuda">{valores.legenda.length}/120 caracteres</span>
          </div>
        </div>

        <figure className="banner-form__previa" aria-live="polite">
          <div className="banner-form__moldura">
            {mostraImagem && (
              <img
                key={urlDigitada}
                src={urlDigitada}
                alt="Prévia do banner"
                onLoad={() => setPrevia('ok')}
                onError={() => setPrevia('falhou')}
              />
            )}
            {previa === 'vazia' && <span>A prévia aparece quando o endereço estiver completo</span>}
            {previa === 'falhou' && (
              <span className="banner-form__falhou">Não foi possível abrir essa imagem</span>
            )}
          </div>
          <figcaption>{valores.legenda.trim() || 'Comércio de bairro em Rondonópolis'}</figcaption>
        </figure>
      </div>

      <div className="formulario__acoes banner-form__acoes">
        {atual?.imagemUrl && (
          <Button
            variante="perigo"
            disabled={salvando}
            onClick={() => enviar(null, null)}
            className="banner-form__remover"
          >
            Voltar para a foto automática
          </Button>
        )}
        <Button variante="secundario" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando || previa === 'carregando'}>
          {salvando ? 'Salvando...' : 'Salvar banner'}
        </Button>
      </div>
    </form>
  )
}

export default BannerForm
