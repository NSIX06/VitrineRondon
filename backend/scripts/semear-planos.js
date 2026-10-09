// Cria ou atualiza os planos de assinatura (backend/prisma/planos.js) sem
// apagar nenhum dado. Pode rodar quantas vezes quiser, inclusive em produção.
//
//   npm run planos:semear     banco do .env
//   npm run tidb:planos       banco de produção (backend/.env.tidb)
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { semearPlanos } from '../prisma/planos.js';

const prisma = new PrismaClient();
try {
  const total = await semearPlanos(prisma);
  const planos = await prisma.plano.findMany({ orderBy: { ordem: 'asc' } });
  console.log(`${total} planos conferidos:`);
  for (const p of planos) {
    console.log(`  ${p.nome.padEnd(10)} R$ ${(p.precoCentavos / 100).toFixed(2)}  ${p.ativo ? 'ativo' : 'inativo'}`);
  }
} catch (erro) {
  console.error('Não foi possível gravar os planos:', erro.message.split('\n').at(-1));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
