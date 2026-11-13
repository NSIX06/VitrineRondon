// Conversão do documento OpenAPI (objeto JS) para YAML, sem dependência.
// Cobre o que o documento usa: objetos, listas, textos, números, booleanos e
// null. Todo texto sai entre aspas duplas no formato do JSON, que o YAML aceita
// como está: nada de ambiguidade com "sim", "no", "1.0", ":" ou "#".

const CHAVE_SIMPLES = /^[A-Za-z_$][A-Za-z0-9_$.-]*$/;

const chave = (nome) => (CHAVE_SIMPLES.test(nome) ? nome : JSON.stringify(nome));

function escalar(valor) {
  if (valor === null || valor === undefined) return 'null';
  if (typeof valor === 'string') return JSON.stringify(valor);
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  throw new TypeError(`Valor sem representação em YAML: ${typeof valor}`);
}

const ehComposto = (valor) => valor !== null && typeof valor === 'object';
const vazio = (valor) => (Array.isArray(valor) ? valor.length === 0 : Object.keys(valor).length === 0);

function linhas(valor, recuo) {
  const espaco = ' '.repeat(recuo);
  const saida = [];
  if (Array.isArray(valor)) {
    for (const item of valor) {
      if (!ehComposto(item) || vazio(item)) {
        saida.push(`${espaco}- ${ehComposto(item) ? (Array.isArray(item) ? '[]' : '{}') : escalar(item)}`);
        continue;
      }
      // O primeiro campo do item vai na mesma linha do "-"
      const internas = linhas(item, recuo + 2);
      saida.push(`${espaco}- ${internas[0].trimStart()}`, ...internas.slice(1));
    }
    return saida;
  }
  for (const [nome, item] of Object.entries(valor)) {
    if (item === undefined) continue;
    if (!ehComposto(item)) saida.push(`${espaco}${chave(nome)}: ${escalar(item)}`);
    else if (vazio(item)) saida.push(`${espaco}${chave(nome)}: ${Array.isArray(item) ? '[]' : '{}'}`);
    else saida.push(`${espaco}${chave(nome)}:`, ...linhas(item, Array.isArray(item) ? recuo : recuo + 2));
  }
  return saida;
}

/** Objeto -> texto YAML (blocos com 2 espaços) */
export function paraYaml(documento) {
  return `${linhas(documento, 0).join('\n')}\n`;
}
