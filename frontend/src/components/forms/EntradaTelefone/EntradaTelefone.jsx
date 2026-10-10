import { useLayoutEffect, useRef } from 'react'
import { formatarTelefone } from '../../../services/telefone'

const ehDigito = (c) => c >= '0' && c <= '9'
const contarDigitos = (texto) => [...texto].filter(ehDigito).length

/**
 * Campo de telefone com máscara brasileira, aplicada enquanto a pessoa digita
 * ou cola: "(66) 99123-4567" no celular e "(66) 3421-1234" no fixo.
 * É um <input type="tel"> comum: id, name, className e aria-* passam direto.
 * Sem maxLength de propósito: ele cortaria um número colado com +55 e espaços
 * antes da máscara limpar; a própria máscara para em 11 dígitos.
 * `onChange` recebe o evento com o valor já formatado; quem envia ao servidor
 * guarda só os dígitos (digitosDoTelefone).
 *
 * O cursor fica depois do mesmo dígito em que estava, mesmo com a máscara
 * inserindo parênteses e traço no meio; e apagar um símbolo da máscara apaga
 * o dígito antes dele, senão o Backspace "não fazia nada" em cima do traço.
 */
function EntradaTelefone({ value = '', onChange, ...props }) {
  const ref = useRef(null)
  // Quantos dígitos ficam antes do cursor depois da próxima renderização
  const cursorPendente = useRef(null)

  useLayoutEffect(() => {
    const campo = ref.current
    if (!campo || cursorPendente.current === null || document.activeElement !== campo) return
    let posicao = 0
    let vistos = 0
    while (posicao < campo.value.length && vistos < cursorPendente.current) {
      if (ehDigito(campo.value[posicao])) vistos++
      posicao++
    }
    cursorPendente.current = null
    campo.setSelectionRange(posicao, posicao)
  })

  const aoMudar = (evento) => {
    const campo = evento.target
    let bruto = campo.value
    let cursor = campo.selectionStart ?? bruto.length
    const anterior = formatarTelefone(value)

    // Apagou só um símbolo da máscara: some também o dígito antes dele
    const apagouSimbolo =
      bruto.length < anterior.length && contarDigitos(bruto) === contarDigitos(anterior)
    if (apagouSimbolo) {
      let alvo = cursor - 1
      while (alvo >= 0 && !ehDigito(bruto[alvo])) alvo--
      if (alvo >= 0) {
        bruto = bruto.slice(0, alvo) + bruto.slice(alvo + 1)
        cursor = alvo
      }
    }

    cursorPendente.current = contarDigitos(bruto.slice(0, cursor))
    const formatado = formatarTelefone(bruto)
    onChange?.({ ...evento, target: { name: campo.name, value: formatado, type: 'tel' } })
  }

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(66) 99123-4567"
      {...props}
      value={formatarTelefone(value)}
      onChange={aoMudar}
    />
  )
}

export default EntradaTelefone
