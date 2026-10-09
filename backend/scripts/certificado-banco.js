// Baixa o certificado da autoridade (CA) de um MySQL na nuvem, direto do servidor.
//
// Serve para provedores que exigem TLS mas não oferecem o arquivo da CA para
// download (como o Clever Cloud). O servidor MySQL apresenta a cadeia de
// certificados no início da conexão; este script a lê com o openssl (vem com o
// Git para Windows), mostra quem assinou o quê e salva a CA em
// prisma/certificados/<nome>.pem, para o Prisma conferir o servidor com
// sslaccept=strict (sem desligar a verificação).
//
// Uso:
//   node --env-file=.env.nuvem scripts/certificado-banco.js            (lê host e porta de DATABASE_URL_MIGRACAO)
//   node scripts/certificado-banco.js HOST PORTA [nome-do-arquivo]
//
// Confira a impressão digital (SHA-256) mostrada: se puder, compare com a do
// painel do provedor ou rode o script de outra rede. Assim você sabe que
// baixou o certificado do servidor certo.
import { execFileSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pasta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../prisma/certificados');

/** Host e porta: da linha de comando ou da URL de migração do .env */
function destino() {
  const [host, porta, nome] = process.argv.slice(2);
  if (host) return { host, porta: Number(porta) || 3306, nome: nome || 'nuvem-ca' };
  const url = process.env.DATABASE_URL_MIGRACAO || process.env.DATABASE_URL;
  if (!url) {
    console.error('Informe HOST e PORTA, ou rode com --env-file=.env.nuvem (que tem DATABASE_URL_MIGRACAO).');
    process.exit(1);
  }
  const { hostname, port } = new URL(url);
  return { host: hostname, porta: Number(port) || 3306, nome: 'nuvem-ca' };
}

/** Cadeia apresentada pelo servidor, com STARTTLS do protocolo MySQL */
function cadeiaDoServidor(host, porta) {
  let saida;
  try {
    saida = execFileSync(
      'openssl',
      ['s_client', '-starttls', 'mysql', '-connect', `${host}:${porta}`, '-servername', host, '-showcerts'],
      { input: '', encoding: 'utf8', timeout: 20_000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (erro) {
    // O s_client sai com erro quando a cadeia não é de uma CA pública, mas a saída vem completa
    saida = erro.stdout || '';
    if (!saida.includes('BEGIN CERTIFICATE')) {
      console.error(`Não foi possível ler o certificado de ${host}:${porta}.`);
      console.error(erro.code === 'ENOENT' ? 'O openssl não foi encontrado (rode pelo Git Bash).' : (erro.stderr || erro.message).trim());
      process.exit(1);
    }
  }
  const blocos = saida.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
  return blocos.map((pem) => new X509Certificate(pem));
}

const { host, porta, nome } = destino();
const cadeia = cadeiaDoServidor(host, porta);
if (cadeia.length === 0) {
  console.error('O servidor não apresentou certificado. Ele aceita conexão sem TLS?');
  process.exit(1);
}

console.log(`Cadeia apresentada por ${host}:${porta}:`);
cadeia.forEach((cert, i) => {
  console.log(`  ${i}. ${cert.subject.replace(/\n/g, ', ')}`);
  console.log(`     assinado por: ${cert.issuer.replace(/\n/g, ', ')}`);
  console.log(`     válido até: ${cert.validTo}`);
});

// O Prisma com sslaccept=strict confere também se o nome no certificado do
// servidor bate com o endereço usado na URL
const nomeConfere = Boolean(cadeia[0].checkHost(host));
console.log(
  nomeConfere
    ? `\nO nome do certificado confere com ${host}: a verificação estrita do Prisma vai aceitar.`
    : `\nATENÇÃO: o nome do certificado NÃO confere com ${host}. Com sslaccept=strict o Prisma recusa a conexão\n` +
        'mesmo com a CA certa. Veja no painel do provedor se há outro endereço (o nome que aparece no certificado)\n' +
        'ou leia a seção "Clever Cloud" em docs/DEPLOY_RENDER.md.'
);

// A CA é o último certificado da cadeia que assina a si mesmo (raiz). Se o
// servidor não manda a raiz, a cadeia é de uma CA pública e não precisa de arquivo.
const raiz = [...cadeia].reverse().find((cert) => cert.subject === cert.issuer && cert.ca);
if (!raiz) {
  console.log('\nO servidor não enviou uma CA própria: o certificado deve ser de uma autoridade pública.');
  console.log('Tente a URL só com ?sslaccept=strict, sem sslcert.');
  process.exit(0);
}

mkdirSync(pasta, { recursive: true });
const arquivo = path.join(pasta, `${nome}.pem`);
writeFileSync(arquivo, raiz.toString());
const digital = createHash('sha256').update(raiz.raw).digest('hex').match(/../g).join(':').toUpperCase();
console.log(`\nCA salva em prisma/certificados/${nome}.pem`);
console.log(`Impressão digital SHA-256: ${digital}`);
console.log(`Na URL do banco: ?sslcert=certificados/${nome}.pem&sslaccept=strict`);
