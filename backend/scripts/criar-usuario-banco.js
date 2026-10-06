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
//
// Pode rodar quantas vezes quiser: se a conta existe, a senha e as permissões
// são realinhadas com o .env.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const NOME_VALIDO = /^[A-Za-z0-9_]+$/;

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
if (!NOME_VALIDO.test(usuario) || !NOME_VALIDO.test(banco)) {
  console.error('Usuário e banco devem ter só letras, números e _.');
  process.exit(1);
}
if (senha.length < 16) {
  console.error('A senha da conta da aplicação precisa de pelo menos 16 caracteres.');
  process.exit(1);
}

// A senha vai dentro de aspas simples no SQL
const literal = (texto) => `'${texto.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
const conta = `'${usuario}'@'localhost'`;

const prisma = new PrismaClient({ datasourceUrl: admin.toString(), log: [] });
try {
  await prisma.$executeRawUnsafe(`CREATE USER IF NOT EXISTS ${conta} IDENTIFIED BY ${literal(senha)}`);
  await prisma.$executeRawUnsafe(`ALTER USER ${conta} IDENTIFIED BY ${literal(senha)}`);
  // Parte do zero, para uma permissão antiga não sobrar
  await prisma.$executeRawUnsafe(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${conta}`);
  await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${banco}\`.* TO ${conta}`);
  const permissoes = await prisma.$queryRawUnsafe(`SHOW GRANTS FOR ${conta}`);
  console.log(`Conta ${usuario}@localhost pronta. Permissões:`);
  for (const linha of permissoes) console.log('  ' + Object.values(linha)[0]);
} catch (erro) {
  console.error('Não foi possível criar a conta:', erro.message.split('\n').at(-1));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
