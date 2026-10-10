// Senhas que não podem ser usadas: as mais comuns no Brasil que passam na regra
// de "letras e números", variações do nome do site e as senhas de exemplo que
// aparecem no repositório (que é público). O NIST SP 800-63B-4 recomenda bloquear
// senhas conhecidas em vez de exigir combinações de símbolos.

const COMUNS = [
  // sequências e teclado
  'abc12345', 'abcd1234', 'abc123456', 'a1234567', 'a12345678', '123456a', '1234567a', '12345678a', '123456789a',
  '1q2w3e4r', '1q2w3e4r5t', 'q1w2e3r4', 'q1w2e3r4t5', 'qwerty123', 'qwerty1234', 'asd12345', 'asdf1234', 'zxcv1234',
  'aa123456', 'abc123abc', 'teste123', 'teste1234', 'test1234',
  // português
  'senha123', 'senha1234', 'senha12345', 'senha123456', 'minhasenha1', 'mudar123', 'mudar1234', 'trocar123',
  'brasil123', 'brasil2026', 'amor1234', 'deus1234', 'jesus123', 'familia123', 'flamengo1', 'flamengo123',
  'corinthians1', 'palmeiras1', 'saopaulo123', 'vasco1234', 'gremio1234', 'cruzeiro1',
  // inglês
  'password1', 'password123', 'passw0rd', 'iloveyou1', 'welcome1', 'welcome123', 'letmein1', 'monkey123',
  'admin123', 'admin1234', 'admin2026', 'root1234', 'user1234',
  // o próprio site e a cidade
  'vitrine123', 'vitrine2026', 'vitrinerondon1', 'vitrinerondon2026', 'rondon123', 'rondonopolis1', 'rondonopolis2026',
  // senhas de exemplo publicadas no repositório
  'admin@2026', 'carlos@2026', 'defina-uma-senha-forte',
];

const BLOQUEADAS = new Set(COMUNS);

/** A senha está na lista de bloqueio? (sem diferenciar maiúsculas de minúsculas) */
export function ehSenhaComum(senha) {
  return BLOQUEADAS.has(String(senha ?? '').trim().toLowerCase());
}

/**
 * Senha aceitável para uma conta privilegiada criada por script (seed):
 * longa, fora da lista de bloqueio e sem ser só letras ou só números.
 * Devolve o motivo da recusa, ou null se estiver boa.
 */
export function problemaSenhaPrivilegiada(senha) {
  const valor = String(senha ?? '');
  if (valor.length < 14) return 'precisa de pelo menos 14 caracteres';
  if (ehSenhaComum(valor)) return 'é uma senha comum ou de exemplo, publicada no repositório';
  if (!/[A-Za-z]/.test(valor) || !/\d/.test(valor)) return 'precisa ter letras e números';
  return null;
}
