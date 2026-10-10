import { useCallback, useEffect, useRef, useState } from 'react'

// O que conta como problema dentro do formulário: campo marcado ou o aviso
// geral de erro do servidor (que fica no topo)
const SELETOR_ERRO = '.status--erro, .campo__entrada--erro, [aria-invalid="true"], .campo__erro'

/**
 * Leva a pessoa até o primeiro campo com erro depois de uma validação que
 * falhou. Em formulários compridos (no celular, o do negócio passa de 3.000px)
 * o botão fica no fim e a mensagem lá em cima: sem isso o clique parecia
 * "não fazer nada" e o cadastro parecia travado.
 *
 * Uso: const [refForm, irParaErro] = useFocoNoErro()
 *      <form ref={refForm}> ... e chamar irParaErro() junto com setErros(...)
 */
export function useFocoNoErro() {
  const refForm = useRef(null)
  const [pedido, setPedido] = useState(0)

  // Roda depois que os erros foram desenhados na tela
  useEffect(() => {
    if (!pedido) return
    const alvo = refForm.current?.querySelector(SELETOR_ERRO)
    if (!alvo) return
    const campo = alvo.matches('input, select, textarea')
      ? alvo
      : alvo.closest('.campo, fieldset')?.querySelector('input, select, textarea')
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ;(campo ?? alvo).scrollIntoView({ block: 'center', behavior: reduzido ? 'auto' : 'smooth' })
    // Sem rolar de novo: o scrollIntoView acima já centralizou o campo
    campo?.focus({ preventScroll: true })
  }, [pedido])

  const irParaErro = useCallback(() => setPedido((n) => n + 1), [])
  return [refForm, irParaErro]
}
