// Verificação de saúde da API, usada por quem monitora o servidor.
// Antes respondia "operando" sem olhar o banco: com o MySQL fora do ar, o
// monitor achava que estava tudo bem enquanto toda rota devolvia erro.
import prisma from '../config/prisma.js';
import { problemaNaSessao } from '../middlewares/auth.js';

const TEMPO_LIMITE_MS = 3000;

/** Faz a consulta mais simples possível, desistindo depois de `limiteMs` */
async function bancoResponde(limiteMs) {
  let relogio;
  const desistir = new Promise((_, rejeitar) => {
    relogio = setTimeout(() => rejeitar(new Error(`sem resposta do banco em ${limiteMs} ms`)), limiteMs);
  });
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, desistir]);
  } finally {
    clearTimeout(relogio);
  }
}

// GET /api/health
export function criarVerificacaoDeSaude({ limiteMs = TEMPO_LIMITE_MS } = {}) {
  return async (req, res) => {
    const agora = new Date().toISOString();
    // Só "ok" ou "indisponivel": o motivo (nome da variável) fica no log
    const login = problemaNaSessao() ? 'indisponivel' : 'ok';
    try {
      await bancoResponde(limiteMs);
      res.json({ success: true, message: 'API VitrineRondon operando', banco: 'ok', login, timestamp: agora });
    } catch (erro) {
      // O motivo (host, porta, código do driver) fica no log do servidor
      console.error('Health check: banco indisponível:', erro.message);
      res.status(503).json({ success: false, message: 'Banco de dados indisponível', banco: 'indisponivel', login, timestamp: agora });
    }
  };
}

export const verificarSaude = criarVerificacaoDeSaude();
