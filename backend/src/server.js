// Ponto de entrada do servidor
import 'dotenv/config';
import app from './app.js';
import prisma from './config/prisma.js';
import { encerrarVencidas } from './services/assinaturas.js';
import { problemaNaSessao } from './middlewares/auth.js';

const PORT = process.env.PORT || 3001;
const UMA_HORA = 60 * 60 * 1000;

/** Zera plano e selo de quem teve o período pago encerrado (a vitrine já os esconde pela data) */
async function varrerVencidas() {
  try {
    const total = await encerrarVencidas();
    if (total) console.log(`Assinaturas vencidas encerradas: ${total} negócio(s)`);
  } catch (erro) {
    console.error('Falha ao encerrar assinaturas vencidas:', erro.message);
  }
}

async function iniciarServidor() {
  // Sem chave de sessão a vitrine abre, mas ninguém entra nem se cadastra:
  // o aviso fica no topo do log, em vez de só aparecer no primeiro login
  const problema = problemaNaSessao();
  if (problema) {
    console.error(`\n*** LOGIN E CADASTRO FORA DO AR: ${problema}.`);
    console.error('*** Defina JWT_SECRET (texto longo e aleatório) nas variáveis de ambiente da API e reinicie.\n');
  }

  try {
    await prisma.$connect();
    console.log('Conectado ao banco de dados MySQL');

    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
    varrerVencidas();
    setInterval(varrerVencidas, UMA_HORA).unref();
  } catch (erro) {
    console.error('Falha ao conectar ao banco de dados:', erro.message);
    process.exit(1);
  }
}

// Encerramento limpo da conexão com o banco. SIGINT é o Ctrl+C; SIGTERM é
// como hospedagens e gerenciadores de processo pedem para desligar. Sem tratar
// o segundo, as conexões ficavam penduradas no MySQL até o tempo limite dele.
async function encerrar(sinal) {
  await prisma.$disconnect();
  console.log(`\nServidor encerrado (${sinal})`);
  process.exit(0);
}
process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));

iniciarServidor();
