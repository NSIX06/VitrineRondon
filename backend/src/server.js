// Ponto de entrada do servidor
import 'dotenv/config';
import app from './app.js';
import prisma from './config/prisma.js';
import { encerrarVencidas } from './services/assinaturas.js';
import { problemaNaSessao } from './middlewares/auth.js';
import { problemaNoPagamento } from './services/pagamento/index.js';
import { problemaNasImagens } from './services/imagens.js';

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
  // Mesma ideia para o pagamento: sem chave, "Ir para o pagamento" dava erro 500
  const pagamento = problemaNoPagamento();
  if (pagamento) {
    console.error(`\n*** PAGAMENTO FORA DO AR: ${pagamento}.`);
    console.error('*** Defina ABACATEPAY_API_KEY (chave de Dev mode, abc_dev_...) nas variáveis de ambiente da API.\n');
  }
  // Sem Cloudinary em produção, as fotos enviadas sumiam no deploy seguinte
  const imagens = problemaNasImagens();
  if (imagens) {
    console.error(`\n*** ENVIO DE FOTOS FORA DO AR: ${imagens}.`);
    console.error('*** Defina CLOUDINARY_URL nas variáveis de ambiente da API (veja docs/DEPLOY_RENDER.md).\n');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) {
    console.error('*** APP_URL não definida: o checkout voltaria para http://localhost:5173. Defina o endereço do site.\n');
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
