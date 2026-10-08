import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import ContatoForm from '../../components/forms/ContatoForm/ContatoForm'
import Button from '../../components/ui/Button/Button'
import Icone from '../../components/ui/Icone/Icone'
import './Contato.css'
import Voltar from '../../components/ui/Voltar/Voltar'
import PerguntasFrequentes from '../../components/faq/PerguntasFrequentes/PerguntasFrequentes'

function Contato() {
  const [searchParams] = useSearchParams()
  const empreendedorInicial = searchParams.get('empreendedor') || ''

  const [empreendedores, setEmpreendedores] = useState([])
  const [carregouLista, setCarregouLista] = useState(false)

  // A lista de destinatários é opcional: se falhar, o formulário funciona sem o select
  useEffect(() => {
    let ativo = true
    api
      .get('/empreendedores')
      .then((resposta) => {
        if (ativo) setEmpreendedores(resposta.data)
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) setCarregouLista(true)
      })
    return () => {
      ativo = false
    }
  }, [])

  const enviar = (dados) => api.post('/contatos', dados)

  return (
    <>
      <header className="pagina-cabecalho">
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Central de ajuda</span>
          <h1>Fale com a gente</h1>
          <p>Veja se a sua dúvida já tem resposta. Se não tiver, escreva para a equipe ou para um empreendedor da vitrine.</p>
        </div>
      </header>

      <section className="container secao contato">
        <PerguntasFrequentes />

        <div className="contato__envio">
          <div className="contato__bloco-formulario">
            <h2 className="contato__titulo-formulario">Não encontrou a resposta?</h2>
            <p className="contato__subtitulo-formulario">Mande uma mensagem. A resposta chega no seu e-mail.</p>
          </div>

          <div className="contato__formulario">
            {/* Só monta o formulário depois de tentar carregar a lista, para o select
                já nascer com o destinatário pré-selecionado quando vier pela URL */}
            {carregouLista && (
              <ContatoForm
                empreendedores={empreendedores}
                empreendedorInicial={empreendedorInicial}
                onSubmit={enviar}
              />
            )}
          </div>
        </div>

        <aside className="contato__lateral">
          <div className="contato__caixa">
            <h2>Quer divulgar seu negócio?</h2>
            <p>
              Você mesmo cadastra a loja, o serviço ou a produção e escolhe um plano mensal para
              aparecer na vitrine do bairro.
            </p>
            <Button to="/cadastro" variante="secundario">
              <Icone nome="storefront" tamanho={20} />
              Quero divulgar meu negócio
            </Button>
            <div className="contato__gratuito">Planos a partir de R$ 50 por mês, sem comissão sobre as vendas</div>
          </div>

          <div className="contato__caixa">
            <h2>Prefere o WhatsApp?</h2>
            <p>
              Cada página de empreendedor tem um botão que abre a conversa direto no WhatsApp, sem
              passar pelo site.
            </p>
            <Button to="/empreendedores" variante="whatsapp">
              Ver lista de empreendedores
              <Icone nome="chat" tamanho={20} />
            </Button>
          </div>

          <div className="contato__horario">
            <Icone nome="schedule" tamanho={24} />
            <div>
              <strong>Atendimento da equipe</strong>
              Segunda a sexta, das 8h às 18h. Respondemos todas as mensagens em até 24 horas úteis.
            </div>
          </div>
        </aside>
      </section>
    </>
  )
}

export default Contato
