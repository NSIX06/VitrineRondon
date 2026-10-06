import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import './ConfirmModal.css'

/**
 * Modal de confirmação para ações destrutivas (substitui window.confirm).
 * - `onConfirmar` pode ser assíncrono; `carregando` desabilita os botões enquanto executa.
 */
function ConfirmModal({
  aberto,
  titulo = 'Confirmar ação',
  mensagem,
  textoConfirmar = 'Excluir',
  textoCancelar = 'Cancelar',
  carregando = false,
  onConfirmar,
  onCancelar,
}) {
  return (
    <Modal aberto={aberto} titulo={titulo} onFechar={onCancelar} tamanho="sm">
      <div className="confirm-modal">
        <p className="confirm-modal__mensagem">{mensagem}</p>
        <div className="confirm-modal__acoes">
          <Button variante="secundario" onClick={onCancelar} disabled={carregando}>
            {textoCancelar}
          </Button>
          <Button variante="perigo" onClick={onConfirmar} disabled={carregando}>
            {carregando ? 'Excluindo...' : textoConfirmar}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmModal
