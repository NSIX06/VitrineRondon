import { Suspense, lazy } from 'react'
import { useConsulta } from '../../../hooks/useConsulta'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import Spinner from '../../ui/Spinner/Spinner'
import StatusMessage from '../../ui/StatusMessage/StatusMessage'
import './DocumentoLegalModal.css'

// O leitor de markdown pesa mais que o resto do cadastro: só baixa quando
// alguém de fato abre um documento
const DocumentoLegal = lazy(() => import('../DocumentoLegal/DocumentoLegal'))

const TITULOS = {
  TERMOS_DE_USO: 'Termos de Uso',
  POLITICA_PRIVACIDADE: 'Política de Privacidade',
}

/**
 * Termos ou política por cima da tela atual. No cadastro, abrir o documento
 * em outra aba tirava a pessoa do formulário (no celular, de vez).
 * - `tipo`: "TERMOS_DE_USO" | "POLITICA_PRIVACIDADE"; nulo deixa fechado
 */
function DocumentoLegalModal({ tipo, aoFechar }) {
  const { dados, carregando, erro, recarregar } = useConsulta(tipo ? `/termos/${tipo}` : null, undefined, {
    manterAnterior: false,
  })
  const documento = dados?.data

  const carregandoTexto = <Spinner texto="Carregando o documento..." />

  return (
    <Modal aberto={Boolean(tipo)} titulo={TITULOS[tipo] ?? ''} onFechar={aoFechar} tamanho="lg">
      {carregando && carregandoTexto}

      {erro && (
        <StatusMessage
          tipo="erro"
          titulo="Não foi possível carregar o documento"
          acao={
            <Button variante="secundario" tamanho="sm" onClick={recarregar}>
              Tentar novamente
            </Button>
          }
        >
          <p>{erro.message}</p>
        </StatusMessage>
      )}

      {documento && (
        <>
          <p className="documento-modal__versao">Versão {documento.versao}</p>
          <Suspense fallback={carregandoTexto}>
            <DocumentoLegal conteudo={documento.conteudo} />
          </Suspense>
        </>
      )}

      <div className="documento-modal__rodape">
        <Button onClick={aoFechar}>Voltar ao formulário</Button>
      </div>
    </Modal>
  )
}

export default DocumentoLegalModal
