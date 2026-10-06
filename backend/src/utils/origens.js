// Quem pode chamar a API de dentro de um navegador (CORS).

// A própria máquina, em qualquer porta. O Vite troca de porta sozinho quando
// a 5173 está ocupada (foi assim que um segundo servidor na 5174 ficou sem
// acesso à API), e o "vite preview" usa a 4173.
const MAQUINA_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/;

/** Lê a lista de CORS_ORIGINS (separada por vírgula) */
export function lerOrigens(texto = '') {
  return texto
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
}

/**
 * Decide se uma origem pode chamar a API.
 * - Com CORS_ORIGINS preenchida, vale só a lista, em qualquer ambiente.
 * - Sem a lista, em desenvolvimento a própria máquina passa; em produção,
 *   nada passa: esquecer de configurar fecha a API em vez de abri-la.
 */
export function origemPermitida(origem, { lista = [], producao = false } = {}) {
  if (lista.length) return lista.includes(origem);
  if (producao) return false;
  return MAQUINA_LOCAL.test(origem);
}
