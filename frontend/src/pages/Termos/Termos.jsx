import { Link } from 'react-router-dom'
import { useConsulta } from '../../hooks/useConsulta'
import DocumentoLegal from '../../components/legal/DocumentoLegal/DocumentoLegal'
import Spinner from '../../components/ui/Spinner/Spinner'
import StatusMessage from '../../components/ui/StatusMessage/StatusMessage'
import Button from '../../components/ui/Button/Button'
import './Termos.css'
import Voltar from '../../components/ui/Voltar/Voltar'

/**
 * Página de leitura dos documentos legais.
 * - `tipo`: "TERMOS_DE_USO" | "POLITICA_PRIVACIDADE"
 * O conteúdo vem do backend, que lê os arquivos .md da raiz do projeto.
 */
function Termos({ tipo }) {
  // Mesmo cache do modal do cadastro: quem já leu lá não baixa de novo aqui
  const { dados, carregando, erro } = useConsulta(`/termos/${tipo}`, undefined, { manterAnterior: false })
  const documento = dados?.data

  const outro =
    tipo === 'TERMOS_DE_USO'
      ? { para: '/privacidade', rotulo: 'Política de Privacidade' }
      : { para: '/termos', rotulo: 'Termos de Uso' }

  return (
    <>
      <header className="pagina-cabecalho faixa faixa--branca">
        <div className="container">
          <Voltar para="/" rotulo="Início" />
          <span className="pagina-cabecalho__marca">Documento legal</span>
          <h1>{documento?.titulo || (tipo === 'TERMOS_DE_USO' ? 'Termos de Uso' : 'Política de Privacidade')}</h1>
          {documento && <p>Versão {documento.versao}. Leia com atenção antes de aceitar.</p>}
        </div>
      </header>

      <section className="container secao termos">
        {carregando && <Spinner texto="Carregando o documento..." />}

        {erro && !carregando && (
          <StatusMessage tipo="erro" titulo="Não foi possível carregar o documento">
            <p>{erro.message}</p>
          </StatusMessage>
        )}

        {documento && !carregando && (
          <>
            <div className="termos__documento">
              <DocumentoLegal conteudo={documento.conteudo} />
            </div>
            <aside className="termos__lateral">
              <div className="termos__caixa">
                <h2>Também leia</h2>
                <Link to={outro.para}>{outro.rotulo}</Link>
              </div>
              <div className="termos__caixa">
                <h2>Pronto para começar?</h2>
                <p>O aceite destes documentos é registrado no seu cadastro, com versão, data e hora.</p>
                <Button to="/cadastro" tamanho="sm">
                  Criar conta
                </Button>
              </div>
            </aside>
          </>
        )}
      </section>
    </>
  )
}

export default Termos
