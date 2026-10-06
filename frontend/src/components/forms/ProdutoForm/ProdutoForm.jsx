import { useState } from 'react'
import Button from '../../ui/Button/Button'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import './ProdutoForm.css'

const estadoInicialPadrao = {
  nome: '',
  descricao: '',
  preco: '',
  tipo: 'produto',
  imagem: '',
  disponivel: true,
  empreendedorId: '',
}

/** Converte um registro da API no estado do formulário (modo edição) */
function montarEstadoInicial(initialData, negocioFixo) {
  if (!initialData) {
    // Na área do empreendedor o negócio já é conhecido e não se escolhe
    return { ...estadoInicialPadrao, empreendedorId: negocioFixo?.id ?? '' }
  }
  return {
    nome: initialData.nome ?? '',
    descricao: initialData.descricao ?? '',
    preco: initialData.preco ?? '',
    tipo: initialData.tipo ?? 'produto',
    imagem: initialData.imagem ?? '',
    disponivel: initialData.disponivel ?? true,
    empreendedorId: initialData.empreendedorId ?? negocioFixo?.id ?? '',
  }
}

/**
 * Formulário de produto/serviço. Serve para criar e editar.
 * - `initialData`: registro existente (modo edição) ou undefined (modo criação)
 * - `empreendedores`: lista para o select de vínculo (área administrativa)
 * - `negocioFixo`: quando informado, o item pertence obrigatoriamente a esse
 *   negócio e o select some (usado na área do próprio empreendedor)
 * - `onSubmit(dados)`: deve retornar uma Promise; se rejeitar, o erro é exibido aqui
 * - `onCancelar`: fecha o formulário sem salvar
 * O componente é remontado pelo Modal a cada abertura, então o estado inicial
 * é calculado uma única vez a partir de `initialData`.
 */
function ProdutoForm({ initialData, empreendedores = [], negocioFixo, onSubmit, onCancelar }) {
  const [valores, setValores] = useState(() => montarEstadoInicial(initialData, negocioFixo))
  const [errosCampos, setErrosCampos] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const modoEdicao = Boolean(initialData?.id)

  const atualizarCampo = (evento) => {
    const { name, value, type, checked } = evento.target
    setValores((anterior) => ({ ...anterior, [name]: type === 'checkbox' ? checked : value }))
    if (errosCampos[name]) {
      setErrosCampos((anterior) => ({ ...anterior, [name]: undefined }))
    }
  }

  // Validação local antes de enviar (o servidor valida de novo com Zod)
  const validar = () => {
    const erros = {}
    if (!valores.nome.trim() || valores.nome.trim().length < 2) {
      erros.nome = 'Informe um nome com ao menos 2 caracteres'
    }
    const preco = Number(String(valores.preco).replace(',', '.'))
    if (!valores.preco || Number.isNaN(preco) || preco <= 0) {
      erros.preco = 'Informe um preço maior que zero'
    }
    if (!valores.empreendedorId) {
      erros.empreendedorId = 'Selecione o empreendedor'
    }
    return erros
  }

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)

    const erros = validar()
    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros)
      return
    }

    const dados = {
      nome: valores.nome.trim(),
      descricao: valores.descricao.trim() || null,
      preco: Number(String(valores.preco).replace(',', '.')),
      tipo: valores.tipo,
      imagem: valores.imagem.trim() || null,
      disponivel: valores.disponivel,
      empreendedorId: Number(valores.empreendedorId),
    }

    setSalvando(true)
    try {
      await onSubmit(dados)
    } catch (erro) {
      // Erros de validação do backend vêm como lista { campo, mensagem }
      if (erro.data?.errors?.length) {
        const mapa = {}
        erro.data.errors.forEach(({ campo, mensagem }) => {
          mapa[campo] = mensagem
        })
        setErrosCampos(mapa)
      }
      setErroGeral(erro.message || 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form className="formulario produto-form" onSubmit={aoEnviar} noValidate>
      {erroGeral && (
        <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
          {erroGeral}
        </StatusMessage>
      )}

      <div className="campo">
        <label className="campo__rotulo" htmlFor="produto-nome">
          Nome<span className="campo__obrigatorio">*</span>
        </label>
        <input
          id="produto-nome"
          name="nome"
          className={`campo__entrada ${errosCampos.nome ? 'campo__entrada--erro' : ''}`}
          value={valores.nome}
          onChange={atualizarCampo}
          maxLength={150}
          placeholder="Ex.: Bolo de cenoura com chocolate"
        />
        {errosCampos.nome && <span className="campo__erro">{errosCampos.nome}</span>}
      </div>

      <div className="formulario__linha">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="produto-preco">
            Preço (R$)<span className="campo__obrigatorio">*</span>
          </label>
          <input
            id="produto-preco"
            name="preco"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            className={`campo__entrada ${errosCampos.preco ? 'campo__entrada--erro' : ''}`}
            value={valores.preco}
            onChange={atualizarCampo}
            placeholder="0,00"
          />
          {errosCampos.preco && <span className="campo__erro">{errosCampos.preco}</span>}
        </div>

        <div className="campo">
          <label className="campo__rotulo" htmlFor="produto-tipo">
            Tipo
          </label>
          <select
            id="produto-tipo"
            name="tipo"
            className="campo__entrada"
            value={valores.tipo}
            onChange={atualizarCampo}
          >
            <option value="produto">Produto</option>
            <option value="servico">Serviço</option>
          </select>
        </div>
      </div>

      {negocioFixo ? (
        <div className="campo">
          <span className="campo__rotulo">Negócio</span>
          <p className="produto-form__negocio">{negocioFixo.nomeNegocio}</p>
          <span className="campo__ajuda">
            O item será publicado na vitrine deste negócio.
          </span>
        </div>
      ) : (
      <div className="campo">
        <label className="campo__rotulo" htmlFor="produto-empreendedor">
          Empreendedor<span className="campo__obrigatorio">*</span>
        </label>
        <select
          id="produto-empreendedor"
          name="empreendedorId"
          className={`campo__entrada ${errosCampos.empreendedorId ? 'campo__entrada--erro' : ''}`}
          value={valores.empreendedorId}
          onChange={atualizarCampo}
        >
          <option value="">Selecione...</option>
          {empreendedores.map((empreendedor) => (
            <option key={empreendedor.id} value={empreendedor.id}>
              {empreendedor.nomeNegocio} ({empreendedor.cidade})
            </option>
          ))}
        </select>
        {errosCampos.empreendedorId && (
          <span className="campo__erro">{errosCampos.empreendedorId}</span>
        )}
        {empreendedores.length === 0 && (
          <span className="campo__ajuda">Cadastre um empreendedor antes de criar produtos.</span>
        )}
      </div>
      )}

      <div className="campo">
        <label className="campo__rotulo" htmlFor="produto-descricao">
          Descrição
        </label>
        <textarea
          id="produto-descricao"
          name="descricao"
          className="campo__entrada"
          value={valores.descricao}
          onChange={atualizarCampo}
          maxLength={2000}
          rows={3}
          placeholder="Detalhes, tamanhos, prazo de entrega..."
        />
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="produto-imagem">
          URL da imagem
        </label>
        <input
          id="produto-imagem"
          name="imagem"
          type="url"
          className={`campo__entrada ${errosCampos.imagem ? 'campo__entrada--erro' : ''}`}
          value={valores.imagem}
          onChange={atualizarCampo}
          maxLength={500}
          placeholder="https://..."
        />
        {errosCampos.imagem && <span className="campo__erro">{errosCampos.imagem}</span>}
        <span className="campo__ajuda">Opcional. Sem imagem, a vitrine mostra uma ilustração padrão.</span>
      </div>

      <div className="campo campo--checkbox">
        <input
          id="produto-disponivel"
          name="disponivel"
          type="checkbox"
          checked={valores.disponivel}
          onChange={atualizarCampo}
        />
        <label htmlFor="produto-disponivel">Disponível na vitrine</label>
      </div>

      <div className="formulario__acoes">
        <Button variante="secundario" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : modoEdicao ? 'Salvar alterações' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  )
}

export default ProdutoForm
