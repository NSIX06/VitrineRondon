// Cadastra (ou confere) o webhook do AbacatePay para o endereço público da API.
// O webhook exige HTTPS público: no localhost a ativação vem da conciliação
// (o painel consulta o gateway ao voltar do checkout), então isto só é
// necessário com a API no ar (ex.: Render).
//
//   npm run abacatepay:webhook -- https://vitrinelocal-api.onrender.com
//
// Usa ABACATEPAY_API_KEY e ABACATEPAY_WEBHOOK_SECRET do .env. O mesmo segredo
// precisa estar na API publicada (variável ABACATEPAY_WEBHOOK_SECRET).
import 'dotenv/config';
import { EVENTOS_DO_WEBHOOK, criarWebhook, listarWebhooks } from '../src/services/pagamento/abacatepay.js';

// Os mesmos eventos que a API sabe tratar
const EVENTOS = Object.keys(EVENTOS_DO_WEBHOOK);

const base = (process.argv[2] || '').replace(/\/$/, '');
const chave = process.env.ABACATEPAY_API_KEY;
const segredo = process.env.ABACATEPAY_WEBHOOK_SECRET;

if (!/^https:\/\//.test(base)) {
  console.error('Informe o endereço HTTPS da API. Ex.: npm run abacatepay:webhook -- https://vitrinelocal-api.onrender.com');
  process.exit(1);
}
if (!chave || !segredo) {
  console.error('Defina ABACATEPAY_API_KEY e ABACATEPAY_WEBHOOK_SECRET no backend/.env.');
  process.exit(1);
}

const endpoint = `${base}/api/webhooks/abacatepay`;
try {
  const igual = (await listarWebhooks()).find((w) => w.endpoint === endpoint);
  if (igual) {
    console.log(`Já existe um webhook para ${endpoint} (${igual.id}), com os eventos: ${igual.events.join(', ')}`);
    console.log('Para trocar o segredo, apague esse webhook no painel do AbacatePay e rode este comando de novo.');
  } else {
    const criado = await criarWebhook({
      nome: 'VitrineRondon - assinaturas',
      endpoint,
      segredo,
      eventos: EVENTOS,
    });
    console.log(`Webhook criado (${criado.id}) para ${endpoint}`);
    console.log(`Modo de teste: ${criado.devMode ? 'sim' : 'não'}. Eventos: ${EVENTOS.join(', ')}`);
  }
} catch (erro) {
  console.error('Não foi possível cadastrar o webhook:', erro.message);
  process.exitCode = 1;
}
