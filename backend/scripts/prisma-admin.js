// Roda um comando do Prisma com a conta de administrador do banco.
//
// A conta da aplicação (DATABASE_URL) só lê e grava linhas, então não consegue
// criar nem alterar tabela. As migrations passam por aqui, trocando a URL pela
// de DATABASE_URL_MIGRACAO só para este comando.
//
//   node scripts/prisma-admin.js migrate deploy
//   node scripts/prisma-admin.js migrate status
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const urlAdmin = process.env.DATABASE_URL_MIGRACAO;
if (!urlAdmin) {
  console.error('Falta DATABASE_URL_MIGRACAO no backend/.env (a conta que pode criar e alterar tabelas).');
  process.exit(1);
}

const argumentos = process.argv.slice(2);
if (argumentos.length === 0) {
  console.error('Informe o comando do Prisma. Ex.: node scripts/prisma-admin.js migrate deploy');
  process.exit(1);
}

const resultado = spawnSync('npx', ['prisma', ...argumentos], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DATABASE_URL: urlAdmin },
});
process.exit(resultado.status ?? 1);
