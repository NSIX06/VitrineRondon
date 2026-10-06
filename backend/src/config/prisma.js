// Instância singleton do PrismaClient compartilhada por toda a aplicação
import { PrismaClient } from '@prisma/client';

const emDesenvolvimento = process.env.NODE_ENV === 'development';

const prisma = new PrismaClient({
  log: emDesenvolvimento ? ['query', 'warn', 'error'] : ['error'],
});

export default prisma;
