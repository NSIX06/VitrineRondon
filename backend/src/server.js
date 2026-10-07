// Ponto de entrada do servidor
import 'dotenv/config';
import app from './app.js';
import prisma from './config/prisma.js';
import { encerrarVencidas } from './services/assinaturas.js';

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
