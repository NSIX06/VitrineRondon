import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import Button from '../Button/Button'
import Icone from '../Icone/Icone'
import './PaginaErro.css'

/* O que o React Router mostra sozinho quando uma tela quebra é a pilha de
   chamadas: nomes de arquivo, caminhos internos e versões de biblioteca. Isso
   não ajuda quem está usando o site e conta a um estranho como ele é feito por
   dentro. Aqui o detalhe fica só no console do navegador, durante o
   desenvolvimento. */
function PaginaErro({ naoEncontrada: rotaInexistente = false }) {
  const erro = useRouteError()

  if (import.meta.env.DEV && erro) console.error('Falha na tela:', erro)

  const respostaDeRota = isRouteErrorResponse(erro)
  const naoEncontrada = rotaInexistente || (respostaDeRota && erro.status === 404)

  // Arquivo de tela que não chegou: acontece quando a conexão cai no meio da
  // navegação, e recarregar resolve
  const falhaDeCarregamento =
    !respostaDeRota && /dynamically imported module|Importing a module script/i.test(String(erro?.message || ''))

  const titulo = naoEncontrada
    ? 'Página não encontrada'
    : falhaDeCarregamento
      ? 'A tela não terminou de carregar'
      : 'Algo deu errado por aqui'

  const explicacao = naoEncontrada
    ? 'O endereço que você abriu não existe ou foi movido.'
    : falhaDeCarregamento
      ? 'Parece que a conexão falhou no meio do caminho. Recarregar costuma resolver.'
      : 'Tivemos um problema ao montar esta tela. Tente de novo em instantes.'

  return (
    <section className="container secao pagina-erro">
      <span className="pagina-erro__icone" aria-hidden="true">
        <Icone nome={naoEncontrada ? 'search_off' : 'error'} tamanho={40} />
      </span>
      <h1>{titulo}</h1>
      <p>{explicacao}</p>
      <div className="pagina-erro__acoes">
        <Button onClick={() => window.location.reload()}>Recarregar a página</Button>
        <Button variante="secundario" to="/">
          Voltar ao início
        </Button>
      </div>
    </section>
  )
}

export default PaginaErro
