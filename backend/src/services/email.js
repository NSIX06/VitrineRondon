// Envio de e-mails transacionais (por enquanto, só a recuperação de senha).
//
// Funciona com o Resend ou com o Brevo, escolhido no .env, pela API HTTP de
// cada um (sem biblioteca extra):
//   EMAIL_PROVEDOR="resend"  + RESEND_API_KEY
//   EMAIL_PROVEDOR="brevo"   + BREVO_API_KEY
//   EMAIL_REMETENTE="VitrineRondon <nao-responda@seudominio.com.br>"
// Sem provedor configurado, fora de produção o e-mail é só mostrado no log do
// servidor (para testar o fluxo sem conta em lugar nenhum). A chave nunca vai
// para o log.

const TEMPO_LIMITE_MS = 10_000;

export const PROVEDORES = {
  resend: {
    variavelChave: 'RESEND_API_KEY',
    url: 'https://api.resend.com/emails',
    cabecalhos: (chave) => ({ Authorization: `Bearer ${chave}` }),
    corpo: ({ remetente, para, assunto, html, texto }) => ({
      from: remetente.formatado,
      to: [para],
      subject: assunto,
      html,
      text: texto,
    }),
  },
  brevo: {
    variavelChave: 'BREVO_API_KEY',
    url: 'https://api.brevo.com/v3/smtp/email',
    cabecalhos: (chave) => ({ 'api-key': chave, Accept: 'application/json' }),
    corpo: ({ remetente, para, assunto, html, texto }) => ({
      sender: remetente.nome ? { name: remetente.nome, email: remetente.email } : { email: remetente.email },
      to: [{ email: para }],
      subject: assunto,
      htmlContent: html,
      textContent: texto,
    }),
  },
};

/** "Nome <email@x.com>" ou só "email@x.com" -> { nome, email, formatado } */
export function lerRemetente(valor) {
  const texto = String(valor || '').trim();
  const comNome = texto.match(/^(.*)<\s*([^>]+)\s*>$/);
  const nome = comNome ? comNome[1].trim().replace(/^"|"$/g, '') : '';
  const email = (comNome ? comNome[2] : texto).trim();
  return { nome, email, formatado: nome ? `${nome} <${email}>` : email };
}

/** Provedor configurado no .env, ou null se faltar algo */
export function configuracaoDeEmail(env = process.env) {
  const nome = String(env.EMAIL_PROVEDOR || '').trim().toLowerCase();
  const provedor = PROVEDORES[nome];
  const chave = provedor ? env[provedor.variavelChave] : '';
  const remetente = lerRemetente(env.EMAIL_REMETENTE);
  if (!provedor || !chave || !remetente.email) return null;
  return { nome, provedor, chave, remetente };
}

/**
 * Envia um e-mail. Nunca lança erro: devolve { enviado, motivo } para quem
 * chamou decidir. Falhas vão para o log sem a chave e sem o corpo do e-mail.
 */
export async function enviarEmail({ para, assunto, html, texto }, { env = process.env, buscar = fetch } = {}) {
  const config = configuracaoDeEmail(env);
  if (!config) {
    if (env.NODE_ENV !== 'production') {
      console.info(`[email] Sem provedor configurado. E-mail que seria enviado para ${para}:\n${assunto}\n\n${texto}`);
      return { enviado: false, motivo: 'simulado' };
    }
    console.warn('[email] EMAIL_PROVEDOR, chave ou EMAIL_REMETENTE ausentes: e-mail não enviado.');
    return { enviado: false, motivo: 'sem-configuracao' };
  }

  const { nome, provedor, chave, remetente } = config;
  try {
    const resposta = await buscar(provedor.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...provedor.cabecalhos(chave) },
      body: JSON.stringify(provedor.corpo({ remetente, para, assunto, html, texto })),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) {
      console.error(`[email] ${nome} recusou o envio (HTTP ${resposta.status}).`);
      return { enviado: false, motivo: `http-${resposta.status}` };
    }
    return { enviado: true };
  } catch (erro) {
    console.error(`[email] Falha ao falar com o ${nome}: ${erro.name}`);
    return { enviado: false, motivo: 'falha-de-rede' };
  }
}

/** Escapa texto para entrar no HTML do e-mail */
const escapar = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** E-mail de recuperação de senha, no visual do site (anil e dourado) */
export function emailDeRecuperacao({ nome, link, minutos }) {
  const primeiroNome = String(nome || '').split(' ')[0] || 'tudo bem';
  const assunto = 'Crie uma nova senha no VitrineRondon';
  const texto = [
    `Olá, ${primeiroNome}!`,
    '',
    'Recebemos um pedido para criar uma nova senha na sua conta do VitrineRondon.',
    `Abra o link abaixo em até ${minutos} minutos. Ele funciona uma vez só:`,
    '',
    link,
    '',
    'Se não foi você, ignore este e-mail: sua senha continua a mesma.',
    '',
    'Equipe VitrineRondon',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f8f6f0;font-family:Arial,Helvetica,sans-serif;color:#111827">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:3px solid #111827;border-radius:12px">
      <tr>
        <td style="background:#17346e;padding:20px 24px;border-radius:9px 9px 0 0;border-bottom:3px solid #111827">
          <span style="font-size:22px;font-weight:800;color:#ffffff">Vitrine</span><span style="font-size:22px;font-weight:800;color:#fbbf24">Rondon</span>
        </td>
      </tr>
      <tr>
        <td style="padding:24px">
          <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#17346e">Olá, ${escapar(primeiroNome)}!</p>
          <p style="margin:0 0 12px;line-height:1.5">Recebemos um pedido para criar uma nova senha na sua conta do VitrineRondon.</p>
          <p style="margin:0 0 20px;line-height:1.5">O botão abaixo vale por <strong>${minutos} minutos</strong> e funciona uma vez só.</p>
          <p style="margin:0 0 24px">
            <a href="${escapar(link)}" style="display:inline-block;padding:12px 20px;background:#fbbf24;color:#111827;font-weight:700;text-decoration:none;border:2px solid #111827;border-radius:8px">Criar nova senha</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#374151">Se o botão não abrir, copie este endereço no navegador:</p>
          <p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${escapar(link)}" style="color:#17346e">${escapar(link)}</a></p>
          <p style="margin:0;font-size:13px;color:#374151">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { assunto, html, texto };
}
