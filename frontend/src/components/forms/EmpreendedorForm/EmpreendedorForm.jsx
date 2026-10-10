import { useEffect, useState } from 'react'
import Button from '../../ui/Button/Button'
import Icone from '../../ui/Icone/Icone'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import Mapa from '../../ui/Mapa/MapaPreguicoso'
import HorariosEditor from '../HorariosEditor/HorariosEditor'
import CampoImagem from '../CampoImagem/CampoImagem'
import { errosDosHorarios } from '../../../services/horarios'
import { CATEGORIAS } from '../../../services/constantes'
import { geocodificarEndereco, montarEnderecoTexto } from '../../../services/geocodificacao'
import { errosDoServidor } from '../../../services/validacoes'
import { digitosDoTelefone, telefoneCompleto } from '../../../services/telefone'
import { useFocoNoErro } from '../../../hooks/useFocoNoErro'
import CaixaDeMarcar from '../../ui/CaixaDeMarcar/CaixaDeMarcar'
import EntradaTelefone from '../EntradaTelefone/EntradaTelefone'
import ResumoDeErros from '../ResumoDeErros/ResumoDeErros'
import './EmpreendedorForm.css'

const estadoInicialPadrao = {
  nomeNegocio: '',
  responsavel: '',
  descricao: '',
  // Sem padrão: quem cadastra escolhe uma categoria da lista
  categoria: '',
  cidade: 'Rondonópolis',
  estado: 'MT',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cep: '',
  latitude: '',
  longitude: '',
  exibirEndereco: true,
  whatsapp: '',
  instagram: '',
  fotoUrl: '',
  // Semana de atendimento: sem nenhum intervalo, a página mostra "Indisponível"
  horarios: [],
  ativo: true,
}

/** Converte um registro da API no estado do formulário (modo edição) */
function montarEstadoInicial(initialData) {
  if (!initialData) return estadoInicialPadrao
  return {
    nomeNegocio: initialData.nomeNegocio ?? '',
    responsavel: initialData.responsavel ?? '',
    descricao: initialData.descricao ?? '',
    categoria: initialData.categoria ?? '',
    cidade: initialData.cidade ?? 'Rondonópolis',
    estado: initialData.estado ?? 'MT',
    endereco: initialData.endereco ?? '',
    numero: initialData.numero ?? '',
    complemento: initialData.complemento ?? '',
    bairro: initialData.bairro ?? '',
    cep: initialData.cep ?? '',
    latitude: initialData.latitude ?? '',
    longitude: initialData.longitude ?? '',
    exibirEndereco: initialData.exibirEndereco ?? true,
    whatsapp: initialData.whatsapp ?? '',
    instagram: initialData.instagram ?? '',
    fotoUrl: initialData.fotoUrl ?? '',
    horarios: (initialData.horarios ?? []).map(({ diaSemana, abre, fecha }) => ({ diaSemana, abre, fecha })),
    ativo: initialData.ativo ?? true,
  }
}

const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE',
  'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

/**
 * Formulário de empreendedor. Serve para criar e editar.
 * Mesmo contrato do ProdutoForm: `initialData`, `onSubmit(dados)` e `onCancelar`.
 * Inclui a localização do negócio: endereço, bairro, CEP e, opcionalmente,
 * as coordenadas encontradas pelo botão "Localizar no mapa" (OpenStreetMap).
 */
function EmpreendedorForm({
  initialData,
  onSubmit,
  onCancelar,
  textoEnviar,
  textoCancelar = 'Cancelar',
  // Administração: mostra a suspensão por moderação
  moderacao = false,
}) {
  const [valores, setValores] = useState(() => montarEstadoInicial(initialData))
  const [errosCampos, setErrosCampos] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  // Estado do geocodificador: { tipo: 'ok' | 'erro' | 'aviso', mensagem }
  const [localizacao, setLocalizacao] = useState(null)
  const [localizando, setLocalizando] = useState(false)
  const [refForm, irParaErro] = useFocoNoErro()
  // Salvando há mais de alguns segundos: o servidor pode estar acordando
  const [demorando, setDemorando] = useState(false)

  useEffect(() => {
    if (!salvando) return undefined
    const relogio = setTimeout(() => setDemorando(true), 6000)
    return () => {
      clearTimeout(relogio)
      setDemorando(false)
    }
  }, [salvando])

  const modoEdicao = Boolean(initialData?.id)

  const atualizarCampo = (evento) => {
    const { name, value, type, checked } = evento.target
    setValores((anterior) => ({ ...anterior, [name]: type === 'checkbox' ? checked : value }))
    if (errosCampos[name]) {
      setErrosCampos((anterior) => ({ ...anterior, [name]: undefined }))
    }
    // Se o endereço mudar, as coordenadas antigas deixam de valer
    if (['endereco', 'numero', 'bairro', 'cidade', 'estado', 'cep'].includes(name)) {
      setLocalizacao(null)
    }
  }

  const validar = () => {
    const erros = {}
    if (valores.nomeNegocio.trim().length < 2) {
      erros.nomeNegocio = 'Informe o nome do negócio'
    }
    if (valores.responsavel.trim().length < 2) {
      erros.responsavel = 'Informe o nome do responsável'
    }
    if (valores.cidade.trim().length < 2) {
      erros.cidade = 'Informe a cidade'
    }
    if (!CATEGORIAS.includes(valores.categoria)) {
      erros.categoria = 'Escolha uma categoria'
    }
    if (Object.keys(errosDosHorarios(valores.horarios)).length > 0) {
      erros.horarios = 'Corrija os horários de atendimento marcados'
    }
    if (!telefoneCompleto(valores.whatsapp)) {
      erros.whatsapp = 'Informe o WhatsApp com DDD, ex.: (66) 99123-4567'
    }
    const cep = valores.cep.trim()
    if (cep && !/^\d{5}-?\d{3}$/.test(cep)) {
      erros.cep = 'CEP no formato 00000-000'
    }
    const lat = valores.latitude === '' ? null : Number(valores.latitude)
    const lng = valores.longitude === '' ? null : Number(valores.longitude)
    if ((lat === null) !== (lng === null)) {
      erros.latitude = 'Informe latitude e longitude juntas, ou deixe as duas em branco'
    }
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      erros.latitude = 'Latitude deve estar entre -90 e 90'
    }
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      erros.longitude = 'Longitude deve estar entre -180 e 180'
    }
    return erros
  }

  // Busca as coordenadas do endereço digitado (OpenStreetMap Nominatim)
  const localizarNoMapa = async () => {
    if (!valores.endereco.trim() || !valores.cidade.trim()) {
      setLocalizacao({ tipo: 'aviso', mensagem: 'Preencha ao menos a rua e a cidade para localizar.' })
      return
    }
    setLocalizando(true)
    setLocalizacao(null)
    try {
      const resultado = await geocodificarEndereco(valores)
      if (!resultado) {
        setLocalizacao({
          tipo: 'aviso',
          mensagem:
            'Endereço não encontrado. Confira os dados ou informe latitude e longitude manualmente.',
        })
        return
      }
      setValores((anterior) => ({
        ...anterior,
        latitude: String(resultado.latitude),
        longitude: String(resultado.longitude),
      }))
      setErrosCampos((anterior) => ({ ...anterior, latitude: undefined, longitude: undefined }))
      setLocalizacao({
        tipo: 'ok',
        mensagem: `Encontrado: ${resultado.descricao}. Confira no mapa abaixo antes de salvar.`,
      })
    } catch {
      setLocalizacao({
        tipo: 'erro',
        mensagem: 'Não foi possível consultar o serviço de mapas agora. Tente de novo ou informe as coordenadas.',
      })
    } finally {
      setLocalizando(false)
    }
  }

  const aoEnviar = async (evento) => {
    evento.preventDefault()
    setErroGeral(null)

    const erros = validar()
    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros)
      irParaErro()
      return
    }

    const dados = {
      nomeNegocio: valores.nomeNegocio.trim(),
      responsavel: valores.responsavel.trim(),
      descricao: valores.descricao.trim() || null,
      categoria: valores.categoria,
      cidade: valores.cidade.trim(),
      estado: valores.estado,
      endereco: valores.endereco.trim() || null,
      numero: valores.numero.trim() || null,
      complemento: valores.complemento.trim() || null,
      bairro: valores.bairro.trim() || null,
      cep: valores.cep.trim() || null,
      latitude: valores.latitude === '' ? null : Number(valores.latitude),
      longitude: valores.longitude === '' ? null : Number(valores.longitude),
      exibirEndereco: valores.exibirEndereco,
      // Guarda apenas os dígitos: facilita montar o link do WhatsApp depois
      whatsapp: digitosDoTelefone(valores.whatsapp),
      instagram: valores.instagram.trim() || null,
      fotoUrl: valores.fotoUrl.trim() || null,
      // A semana vai inteira: o servidor substitui os horários anteriores
      horarios: valores.horarios,
      // Suspender é moderação: só a administração envia (o servidor ignora o dono)
      ...(moderacao ? { ativo: valores.ativo } : {}),
    }

    setSalvando(true)
    try {
      await onSubmit(dados)
    } catch (erro) {
      const erros = errosDoServidor(erro)
      if (erros) setErrosCampos(erros)
      setErroGeral(erro.message || 'Não foi possível salvar. Tente novamente.')
      irParaErro()
    } finally {
      setSalvando(false)
    }
  }

  const classeEntrada = (campo) =>
    `campo__entrada ${errosCampos[campo] ? 'campo__entrada--erro' : ''}`

  // Erros do servidor nos horários chegam como "horarios.3.fecha": o editor
  // precisa só do índice do intervalo para marcar o campo certo
  const errosHorariosServidor = {}
  for (const [campo, mensagem] of Object.entries(errosCampos)) {
    const achado = /^horarios\.(\d+)\./.exec(campo)
    if (achado && mensagem) errosHorariosServidor[Number(achado[1])] = mensagem
  }

  const temCoordenadas = valores.latitude !== '' && valores.longitude !== ''

  return (
    <form ref={refForm} className="formulario empreendedor-form" onSubmit={aoEnviar} noValidate>
      {erroGeral && (
        <StatusMessage tipo="erro" onFechar={() => setErroGeral(null)}>
          {erroGeral}
        </StatusMessage>
      )}

      <div className="empreendedor-form__grade">
        <div className="empreendedor-form__coluna empreendedor-form__coluna--dados">
          <div className="formulario__linha">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-nome">
                Nome do negócio<span className="campo__obrigatorio">*</span>
              </label>
              <input
                id="emp-nome"
                name="nomeNegocio"
                className={classeEntrada('nomeNegocio')}
                value={valores.nomeNegocio}
                onChange={atualizarCampo}
                maxLength={150}
                placeholder="Ex.: Doces da Dona Lu"
              />
              {errosCampos.nomeNegocio && (
                <span className="campo__erro">{errosCampos.nomeNegocio}</span>
              )}
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-responsavel">
                Responsável<span className="campo__obrigatorio">*</span>
              </label>
              <input
                id="emp-responsavel"
                name="responsavel"
                className={classeEntrada('responsavel')}
                value={valores.responsavel}
                onChange={atualizarCampo}
                maxLength={150}
                placeholder="Nome de quem atende"
              />
              {errosCampos.responsavel && (
                <span className="campo__erro">{errosCampos.responsavel}</span>
              )}
            </div>
          </div>

          <div className="formulario__linha">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-categoria">
                Categoria<span className="campo__obrigatorio">*</span>
              </label>
              <select
                id="emp-categoria"
                name="categoria"
                className={`campo__entrada ${errosCampos.categoria ? 'campo__entrada--erro' : ''}`}
                value={valores.categoria}
                onChange={atualizarCampo}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
              {errosCampos.categoria && <span className="campo__erro">{errosCampos.categoria}</span>}
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-whatsapp">
                WhatsApp<span className="campo__obrigatorio">*</span>
              </label>
              <EntradaTelefone
                id="emp-whatsapp"
                name="whatsapp"
                className={classeEntrada('whatsapp')}
                value={valores.whatsapp}
                onChange={atualizarCampo}
                aria-invalid={Boolean(errosCampos.whatsapp)}
              />
              {errosCampos.whatsapp && <span className="campo__erro">{errosCampos.whatsapp}</span>}
              <span className="campo__ajuda">Com DDD. Celular ou fixo.</span>
            </div>
          </div>

          <div className="formulario__linha">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-instagram">
                Instagram
              </label>
              <input
                id="emp-instagram"
                name="instagram"
                className="campo__entrada"
                value={valores.instagram}
                onChange={atualizarCampo}
                maxLength={100}
                placeholder="@seunegocio"
              />
            </div>
          </div>

          <CampoImagem
            id="emp-foto"
            rotulo="Foto do negócio"
            valor={valores.fotoUrl}
            onChange={(fotoUrl) => {
              setValores((anterior) => ({ ...anterior, fotoUrl }))
              if (errosCampos.fotoUrl) setErrosCampos((anterior) => ({ ...anterior, fotoUrl: undefined }))
            }}
            erro={errosCampos.fotoUrl}
            ajuda="Aparece no card da vitrine e no topo da sua página. Foto horizontal fica melhor."
            onEnviando={setEnviandoImagem}
          />

          <div className="campo">
            <label className="campo__rotulo" htmlFor="emp-descricao">
              Descrição
            </label>
            <textarea
              id="emp-descricao"
              name="descricao"
              className="campo__entrada"
              value={valores.descricao}
              onChange={atualizarCampo}
              maxLength={2000}
              rows={3}
              placeholder="O que você faz, há quanto tempo, como atende..."
            />
          </div>
        </div>

        <fieldset className="empreendedor-form__grupo empreendedor-form__coluna">
          <legend className="empreendedor-form__legenda">
            <Icone nome="location_on" tamanho={18} />
            Localização do negócio
          </legend>
          <p className="campo__ajuda empreendedor-form__ajuda">
            O endereço aparece na página pública e no mapa. Se você atende em casa e prefere não
            divulgar o número, desmarque a opção no fim deste bloco: só o bairro será exibido.
          </p>

          <div className="formulario__linha formulario__linha--endereco">
            <div className="campo campo--largo">
              <label className="campo__rotulo" htmlFor="emp-endereco">
                Rua / Avenida
              </label>
              <input
                id="emp-endereco"
                name="endereco"
                className={classeEntrada('endereco')}
                value={valores.endereco}
                onChange={atualizarCampo}
                maxLength={200}
                placeholder="Ex.: Rua Rio Branco"
              />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-numero">
                Número
              </label>
              <input
                id="emp-numero"
                name="numero"
                className="campo__entrada"
                value={valores.numero}
                onChange={atualizarCampo}
                maxLength={20}
                placeholder="Ex.: 876"
              />
            </div>
          </div>

          <div className="formulario__linha">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-complemento">
                Complemento
              </label>
              <input
                id="emp-complemento"
                name="complemento"
                className="campo__entrada"
                value={valores.complemento}
                onChange={atualizarCampo}
                maxLength={100}
                placeholder="Loja, sala, fundos..."
              />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-bairro">
                Bairro
              </label>
              <input
                id="emp-bairro"
                name="bairro"
                className="campo__entrada"
                value={valores.bairro}
                onChange={atualizarCampo}
                maxLength={100}
                placeholder="Ex.: Vila Aurora"
              />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-cep">
                CEP
              </label>
              <input
                id="emp-cep"
                name="cep"
                inputMode="numeric"
                className={classeEntrada('cep')}
                value={valores.cep}
                onChange={atualizarCampo}
                maxLength={9}
                placeholder="78700-000"
              />
              {errosCampos.cep && <span className="campo__erro">{errosCampos.cep}</span>}
            </div>
          </div>

          <div className="formulario__linha formulario__linha--cidade">
            <div className="campo campo--largo">
              <label className="campo__rotulo" htmlFor="emp-cidade">
                Cidade<span className="campo__obrigatorio">*</span>
              </label>
              <input
                id="emp-cidade"
                name="cidade"
                className={classeEntrada('cidade')}
                value={valores.cidade}
                onChange={atualizarCampo}
                maxLength={100}
                placeholder="Ex.: Rondonópolis"
              />
              {errosCampos.cidade && <span className="campo__erro">{errosCampos.cidade}</span>}
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-estado">
                Estado
              </label>
              <select
                id="emp-estado"
                name="estado"
                className="campo__entrada"
                value={valores.estado}
                onChange={atualizarCampo}
              >
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="empreendedor-form__mapa-acoes">
            <Button variante="secundario" tamanho="sm" onClick={localizarNoMapa} disabled={localizando}>
              <Icone nome="my_location" tamanho={18} />
              {localizando ? 'Localizando...' : 'Localizar no mapa'}
            </Button>
            <span className="campo__ajuda">
              Busca as coordenadas de "{montarEnderecoTexto(valores) || 'endereço'}" no OpenStreetMap.
            </span>
          </div>

          {localizacao && (
            <StatusMessage tipo={localizacao.tipo === 'ok' ? 'sucesso' : localizacao.tipo}>
              {localizacao.mensagem}
            </StatusMessage>
          )}

          <div className="formulario__linha">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-latitude">
                Latitude
              </label>
              <input
                id="emp-latitude"
                name="latitude"
                inputMode="decimal"
                className={classeEntrada('latitude')}
                value={valores.latitude}
                onChange={atualizarCampo}
                placeholder="-16.4673"
              />
              {errosCampos.latitude && <span className="campo__erro">{errosCampos.latitude}</span>}
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="emp-longitude">
                Longitude
              </label>
              <input
                id="emp-longitude"
                name="longitude"
                inputMode="decimal"
                className={classeEntrada('longitude')}
                value={valores.longitude}
                onChange={atualizarCampo}
                placeholder="-54.6372"
              />
              {errosCampos.longitude && <span className="campo__erro">{errosCampos.longitude}</span>}
            </div>
          </div>

          {temCoordenadas && (
            <div className="empreendedor-form__previa">
              <Mapa
                latitude={valores.latitude}
                longitude={valores.longitude}
                endereco={valores}
                titulo={valores.nomeNegocio || 'Seu negócio'}
                buscarPeloEndereco={false}
                altura="220px"
              />
            </div>
          )}

          <div className="campo campo--checkbox">
            <CaixaDeMarcar
              id="emp-exibir-endereco"
              name="exibirEndereco"
              checked={valores.exibirEndereco}
              onChange={atualizarCampo}
            />
            <label htmlFor="emp-exibir-endereco">
              Mostrar o endereço completo na página pública (desmarque para exibir só o bairro)
            </label>
          </div>
        </fieldset>

        <div className="empreendedor-form__coluna empreendedor-form__coluna--horarios">
          <HorariosEditor
            valor={valores.horarios}
            onChange={(horarios) => {
              setValores((anterior) => ({ ...anterior, horarios }))
              if (errosCampos.horarios) setErrosCampos((anterior) => ({ ...anterior, horarios: undefined }))
            }}
            errosServidor={errosHorariosServidor}
          />
          {errosCampos.horarios && <span className="campo__erro">{errosCampos.horarios}</span>}
        </div>
      </div>

      {moderacao && (
        <div className="campo campo--checkbox">
          <CaixaDeMarcar
            id="emp-ativo"
            name="ativo"
            checked={valores.ativo}
            onChange={atualizarCampo}
          />
          <label htmlFor="emp-ativo">
            Liberado pela moderação (desmarque para suspender: o negócio sai da vitrine mesmo com plano pago)
          </label>
        </div>
      )}

      <ResumoDeErros erros={errosCampos} aoIr={irParaErro} />

      {demorando && (
        <p className="campo__ajuda empreendedor-form__demora" role="status">
          Ainda salvando... Se o site ficou um tempo sem uso, o servidor leva até 1 minuto para
          acordar. Não feche a página.
        </p>
      )}

      <div className="formulario__acoes">
        <Button variante="secundario" onClick={onCancelar} disabled={salvando}>
          {textoCancelar}
        </Button>
        <Button type="submit" disabled={salvando || enviandoImagem}>
          {salvando ? 'Salvando...' : textoEnviar || (modoEdicao ? 'Salvar alterações' : 'Cadastrar')}
        </Button>
      </div>
    </form>
  )
}

export default EmpreendedorForm
