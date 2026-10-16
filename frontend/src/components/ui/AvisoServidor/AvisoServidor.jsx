import { useEffect, useState } from 'react'
import { aoMudarLentidao } from '../../../services/api'
import './AvisoServidor.css'

/**
 * Aviso preso ao pé da tela quando a API demora mais de 3 s para responder.
 * No plano gratuito ela dorme sem visitas e leva até 1 minuto para acordar:
 * sem o aviso, as telas pareciam travadas. Some sozinho quando a resposta chega.
 */
function AvisoServidor() {
  const [lento, setLento] = useState(false)
  useEffect(() => aoMudarLentidao(setLento), [])

  return (
    <div className={`aviso-servidor ${lento ? 'aviso-servidor--visivel' : ''}`} role="status" aria-live="polite">
      {lento && (
        <>
          <span className="aviso-servidor__giro" aria-hidden="true" />
          <span>
            <strong>Acordando o servidor…</strong> Na primeira visita isso pode levar até 1 minuto.
          </span>
        </>
      )}
    </div>
  )
}

export default AvisoServidor
