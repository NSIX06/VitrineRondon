// Cria (ou atualiza) a conta do MySQL que a aplicação usa no dia a dia.
//
// A API não precisa de mais que ler e gravar linhas: criar tabela, apagar
// banco, ver outros bancos e gerenciar usuários fica com a conta de
// administrador, usada só nas migrations. Assim, uma falha na API não entrega
// o servidor MySQL inteiro.
//
// Usa as duas URLs do .env:
//   DATABASE_URL           a conta da aplicação (é ela que este script cria)
//   DATABASE_URL_MIGRACAO  a conta de administrador (root), que tem poder para criar
//   BANCO_HOST_CONTA       de onde a conta pode entrar (padrão: localhost). Num
//                          banco na nuvem (Aiven), a API conecta de fora, então
//                          use "%" (qualquer endereço; a senha longa e o SSL
//                          obrigatório do provedor é que protegem)
//
// Pode rodar quantas vezes quiser: se a conta existe, a senha e as permissões
// são realinhadas com o .env.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const NOME_VALIDO = /^[A-Za-z0-9_]+$/;
// No TiDB Cloud Starter o usuário leva o prefixo do cluster: "3pTAoNNegb47Uc8.vitrine_app"
const USUARIO_VALIDO = /^([A-Za-z0-9]+\.)?[A-Za-z0-9_]+$/;
const HOST_VALIDO = /^(%|localhost|[A-Za-z0-9._%-]+)$/;

function lerUrl(variavel) {
  const valor = process.env[variavel];
  if (!valor) {
    console.error(`Falta ${variavel} no backend/.env`);
    process.exit(1);
  }
  return new URL(valor);
}

const app = lerUrl('DATABASE_URL');
const admin = lerUrl('DATABASE_URL_MIGRACAO');
const usuario = decodeURIComponent(app.username);
const senha = decodeURIComponent(app.password);
const banco = app.pathname.slice(1);

if (usuario === decodeURIComponent(admin.username)) {
  console.error('DATABASE_URL e DATABASE_URL_MIGRACAO usam a mesma conta. A da aplicação precisa ser outra.');
  process.exit(1);
}
if (!USUARIO_VALIDO.test(usuario) || !NOME_VALIDO.test(banco)) {
  console.error('Usuário e banco devem ter só letras, números e _ (o usuário pode ter o prefixo do TiDB com ponto).');
  process.exit(1);
}
const host = process.env.BANCO_HOST_CONTA || 'localhost';
if (!HOST_VALIDO.test(host)) {
  console.error('BANCO_HOST_CONTA deve ser "localhost", "%" ou um endereço (letras, números, ponto e hífen).');
  process.exit(1);
}
if (senha.length < 16) {
  console.error('A senha da conta da aplicação precisa de pelo menos 16 caracteres.');
  process.exit(1);
}

// A senha vai dentro de aspas simples no SQL
const literal = (texto) => `'${texto.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
const conta = `'${usuario}'@'${host}'`;

const prisma = new PrismaClient({ datasourceUrl: admin.toString(), log: [] });
try {
  await prisma.$executeRawUnsafe(`CREATE USER IF NOT EXISTS ${conta} IDENTIFIED BY ${literal(senha)}`);
  await prisma.$executeRawUnsafe(`ALTER USER ${conta} IDENTIFIED BY ${literal(senha)}`);
  // Parte do zero, para uma permissão antiga não sobrar. O TiDB não aceita a
  // forma curta do MySQL; nele, revoga no banco (conta nova não tem o que revogar)
  try {
    await prisma.$executeRawUnsafe(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${conta}`);
  } catch {
    await prisma.$executeRawUnsafe(`REVOKE ALL PRIVILEGES ON \`${banco}\`.* FROM ${conta}`).catch(() => {});
  }
  await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${banco}\`.* TO ${conta}`);
  const permissoes = await prisma.$queryRawUnsafe(`SHOW GRANTS FOR ${conta}`);
  console.log(`Conta ${usuario}@${host} pronta. Permissões:`);
  for (const linha of permissoes) console.log('  ' + Object.values(linha)[0]);
} catch (erro) {
  console.error('Não foi possível criar a conta:', erro.message.split('\n').at(-1));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
