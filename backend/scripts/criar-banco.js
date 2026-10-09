// Cria o banco (ex.: vitrine_db) num servidor MySQL na nuvem que ainda não o tem.
//
// O TiDB Cloud vem só com o banco "test", e o Prisma não consegue conectar num
// banco que não existe. Este script entra pelo information_schema (que todo
// servidor MySQL/TiDB tem) com a conta de administrador e cria o banco da URL.
// Pode rodar de novo: se o banco já existe, nada muda.
//
//   node --env-file=.env.tidb scripts/criar-banco.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const valor = process.env.DATABASE_URL_MIGRACAO;
if (!valor) {
  console.error('Falta DATABASE_URL_MIGRACAO (a conta de administrador do banco).');
  process.exit(1);
}

const url = new URL(valor);
const banco = decodeURIComponent(url.pathname.slice(1));
if (!/^[A-Za-z0-9_]+$/.test(banco)) {
  console.error('O nome do banco na URL deve ter só letras, números e _.');
  process.exit(1);
}

url.pathname = '/information_schema';
const prisma = new PrismaClient({ datasourceUrl: url.toString(), log: [] });
try {
  await prisma.$executeRawUnsafe(
    `CREATE DATABASE IF NOT EXISTS \`${banco}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  const [versao] = await prisma.$queryRawUnsafe('SELECT VERSION() AS versao');
  console.log(`Banco ${banco} pronto (servidor ${versao.versao}).`);
} catch (erro) {
  console.error('Não foi possível criar o banco:', erro.message.split('\n').filter(Boolean).at(-1));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
