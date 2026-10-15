// Política padrão de Trusted Types. Com a CSP "require-trusted-types-for
// 'script'", o navegador recusa texto comum nos pontos onde HTML ou script
// podem ser injetados (innerHTML, script.src, eval...) e passa esse texto por
// esta política. Ela é o único lugar que decide o que pode virar HTML:
//
// - texto sem "<" passa: sem "<" não há como criar elemento (só texto e
//   entidades como "&amp;");
// - HTML só passa se for exatamente um dos textos fixos do mapa (mapaHtml.js);
// - script em texto (eval, new Function, setTimeout com texto) não tem
//   conversor aqui, então continua proibido;
// - endereço de script só do próprio site.
//
// O site em si não escreve HTML por texto (nada de dangerouslySetInnerHTML ou
// innerHTML); quem precisava era só o Leaflet. Navegador sem Trusted Types
// (Firefox, Safari antigo) ignora tudo isto.
import { HTML_DO_MAPA } from '../components/ui/Mapa/mapaHtml.js'

const HTML_PERMITIDO = new Set(HTML_DO_MAPA)

/** O texto pode virar HTML? (exportado para os testes) */
export function htmlPermitido(html) {
  return !html.includes('<') || HTML_PERMITIDO.has(html)
}

/** O endereço de script é do próprio site? */
export function scriptPermitido(url, origem = window.location.origin) {
  try {
    return new URL(url, origem).origin === origem
  } catch {
    return false
  }
}

export function instalarPoliticaPadrao() {
  if (typeof window === 'undefined' || !window.trustedTypes?.createPolicy) return null
  // Só pode existir uma política "default": instalar de novo (recarga do Vite) não deve quebrar
  if (window.trustedTypes.defaultPolicy) return window.trustedTypes.defaultPolicy
  return window.trustedTypes.createPolicy('default', {
    createHTML(html) {
      if (htmlPermitido(html)) return html
      throw new TypeError('HTML recusado pela política de Trusted Types')
    },
    createScriptURL(url) {
      if (scriptPermitido(url)) return url
      throw new TypeError('Endereço de script recusado pela política de Trusted Types')
    },
  })
}

instalarPoliticaPadrao()
