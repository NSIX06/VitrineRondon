import { useRef, useState } from 'react'
import api from '../../../services/api'
import {
  TIPOS_IMAGEM,
  ehImagemEnviada,
  ehLinkDeImagem,
  problemaNoArquivo,
  urlImagem,
} from '../../../services/imagens'
import Button from '../../ui/Button/Button'
import Icone from '../../ui/Icone/Icone'
import './CampoImagem.css'

/**
 * Campo de imagem dos cadastros: envia um arquivo do computador (também dá
 * para arrastar e soltar) ou, para quem preferir, aceita um link.
 * O valor é sempre texto: "/uploads/<id>.webp" ou "https://...".
 * - `id`, `rotulo`, `ajuda`, `obrigatorio`: como nos outros campos
 * - `valor` / `onChange(novoValor)`: estado controlado pelo formulário
 * - `erro`: mensagem vinda da validação do formulário ou do servidor
 * - `onEnviando(bool)`: avisa o formulário para segurar o "Salvar" no envio
 */
function CampoImagem({
  id,
  rotulo,
  valor,
  onChange,
  erro,
  ajuda,
  obrigatorio = false,
  onEnviando,
}) {
  const entrada = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState(null)
  const [arrastando, setArrastando] = useState(false)
  const [previaFalhou, setPreviaFalhou] = useState(false)
  // Quem já usava link continua vendo o link; o padrão é enviar do computador
  const [modoLink, setModoLink] = useState(() => ehLinkDeImagem(valor) && !ehImagemEnviada(valor))

  const mudarValor = (novo) => {
    setErroEnvio(null)
    setPreviaFalhou(false)
    onChange(novo)
  }

  const enviarArquivo = async (arquivo) => {
    const problema = problemaNoArquivo(arquivo)
    if (problema) {
      setErroEnvio(problema)
      return
    }
    setErroEnvio(null)
    setEnviando(true)
    onEnviando?.(true)
    try {
      const resposta = await api.enviarImagem(arquivo)
      setModoLink(false)
      mudarValor(resposta.data.url)
    } catch (erroApi) {
      setErroEnvio(erroApi.message)
    } finally {
      setEnviando(false)
      onEnviando?.(false)
    }
  }

  const aoEscolher = (evento) => {
    const [arquivo] = evento.target.files
    // Limpa a seleção: escolher o mesmo arquivo de novo dispara outra vez
    evento.target.value = ''
    if (arquivo) enviarArquivo(arquivo)
  }

  const aoSoltar = (evento) => {
    evento.preventDefault()
    setArrastando(false)
    const [arquivo] = evento.dataTransfer.files
    if (arquivo && !enviando) enviarArquivo(arquivo)
  }

  const mensagemErro = erroEnvio || erro
  const temImagem = Boolean(valor?.trim())
  const idAjuda = `${id}-ajuda`

  return (
    <div className="campo campo-imagem">
      <span className="campo__rotulo" id={`${id}-rotulo`}>
        {rotulo}
        {obrigatorio && <span className="campo__obrigatorio">*</span>}
      </span>

      <div
        className={[
          'campo-imagem__area',
          arrastando && 'campo-imagem__area--arrastando',
          mensagemErro && 'campo-imagem__area--erro',
        ]
          .filter(Boolean)
          .join(' ')}
        onDragOver={(evento) => {
          evento.preventDefault()
          if (!enviando) setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
      >
        <div className="campo-imagem__previa" aria-live="polite">
          {temImagem && !previaFalhou ? (
            <img
              key={valor}
              src={urlImagem(valor.trim())}
              alt="Prévia da imagem escolhida"
              onError={() => setPreviaFalhou(true)}
            />
          ) : (
            <span className="campo-imagem__vazio">
              <Icone nome={previaFalhou ? 'broken_image' : 'add_photo_alternate'} tamanho={30} />
              {previaFalhou ? 'Não foi possível abrir essa imagem' : 'Nenhuma imagem'}
            </span>
          )}
          {enviando && (
            <span className="campo-imagem__enviando">
              <span className="campo-imagem__girando" aria-hidden="true" />
              Enviando...
            </span>
          )}
        </div>

        <div className="campo-imagem__acoes">
          <input
            ref={entrada}
            id={`${id}-arquivo`}
            type="file"
            accept={TIPOS_IMAGEM.join(',')}
            className="visualmente-oculto"
            tabIndex={-1}
            aria-hidden="true"
            onChange={aoEscolher}
          />
          <div className="campo-imagem__botoes">
            <Button
              variante="secundario"
              tamanho="sm"
              onClick={() => entrada.current?.click()}
              disabled={enviando}
              aria-describedby={idAjuda}
            >
              <Icone nome="upload" tamanho={18} />
              {enviando ? 'Enviando...' : temImagem ? 'Trocar imagem' : 'Escolher do computador'}
            </Button>
            {temImagem && !enviando && (
              <Button variante="texto" tamanho="sm" onClick={() => mudarValor('')}>
                Remover
              </Button>
            )}
          </div>
          <span className="campo__ajuda" id={idAjuda}>
            JPG, PNG ou WebP de até 5 MB. Também dá para arrastar a imagem até aqui.
          </span>

          <button
            type="button"
            className="campo-imagem__alternar"
            aria-expanded={modoLink}
            aria-controls={`${id}-link`}
            onClick={() => setModoLink((aberto) => !aberto)}
          >
            <Icone nome="link" tamanho={16} />
            {modoLink ? 'Esconder o campo de link' : 'Prefere colar um link da imagem?'}
          </button>
          {modoLink && (
            <input
              id={`${id}-link`}
              type="url"
              className={`campo__entrada ${mensagemErro ? 'campo__entrada--erro' : ''}`}
              aria-labelledby={`${id}-rotulo`}
              value={ehImagemEnviada(valor) ? '' : valor}
              onChange={(evento) => mudarValor(evento.target.value)}
              maxLength={500}
              placeholder="https://..."
            />
          )}
        </div>
      </div>

      {mensagemErro && <span className="campo__erro">{mensagemErro}</span>}
      {ajuda && <span className="campo__ajuda">{ajuda}</span>}
    </div>
  )
}

export default CampoImagem
