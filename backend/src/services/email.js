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

/** Endereço público do site, de onde o e-mail carrega a imagem do cabeçalho */
const enderecoDoSite = (env = process.env) => (env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * E-mail de recuperação de senha no visual do site, em cel shade.
 *
 * Leitores de e-mail não mostram SVG, fontes do site nem o letreiro feito em
 * CSS. Por isso o cabeçalho (serrilha, logo e letreiro) é uma imagem PNG
 * gerada a partir do próprio site (frontend/public/email/cabecalho.png), e a
 * sombra dura do cartão e do botão é feita com bordas mais grossas à direita e
 * embaixo, o que funciona até no Outlook. Sem imagens, o texto alternativo
 * mostra o nome do site.
 */
export function emailDeRecuperacao({ nome, link, minutos, site = enderecoDoSite() }) {
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
    'Comércio de bairro, Rondonópolis-MT. Sem comissão sobre as vendas.',
  ].join('\n');

  const l = escapar(link);
  const fonteTitulo = "'Arial Black','Arial Bold',Arial,Helvetica,sans-serif";
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapar(assunto)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8f6f0;font-family:Arial,Helvetica,sans-serif;color:#111827">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Seu link para criar uma nova senha. Vale por ${minutos} minutos.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f0">
      <tr>
        <td align="center" style="padding:28px 12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:3px solid #111827;border-right-width:8px;border-bottom-width:8px;border-radius:12px">
            <tr>
              <td style="padding:0;border-bottom:3px solid #111827;border-radius:9px 9px 0 0;overflow:hidden">
                <a href="${escapar(site)}" style="text-decoration:none">
                  <img src="${escapar(site)}/email/cabecalho.png" width="509" alt="VitrineRondon" style="display:block;width:100%;max-width:509px;height:auto;border:0;border-radius:9px 9px 0 0;font-family:${fonteTitulo};font-size:24px;color:#2b4aa6">
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#fbbf24;border:2px solid #111827;border-right-width:4px;border-bottom-width:4px;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#111827">Recuperar acesso</td>
                  </tr>
                </table>
                <h1 style="margin:18px 0 10px;font-family:${fonteTitulo};font-size:30px;line-height:1.15;font-weight:900;color:#2b4aa6;text-shadow:0 3px 0 #111827">Olá, ${escapar(primeiroNome)}!</h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#374151">Recebemos um pedido para criar uma nova senha na sua conta do <strong style="color:#17346e">VitrineRondon</strong>.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#fde68a;border:2px dashed #111827;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.5;color:#111827">
                      O botão abaixo vale por <strong>${minutos} minutos</strong> e funciona <strong>uma vez só</strong>.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 28px 26px">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td bgcolor="#fbbf24" style="background:#fbbf24;border:3px solid #111827;border-right-width:6px;border-bottom-width:6px;border-radius:10px">
                      <a href="${l}" style="display:block;padding:14px 30px;font-family:${fonteTitulo};font-size:17px;font-weight:900;color:#111827;text-decoration:none;border-top:3px solid #fde68a;border-radius:7px">Criar nova senha &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px">
                <p style="margin:0 0 6px;font-size:13px;color:#374151">Se o botão não abrir, copie este endereço no navegador:</p>
                <p style="margin:0 0 18px;font-size:13px;word-break:break-all"><a href="${l}" style="color:#17346e;font-weight:700">${l}</a></p>
                <p style="margin:0;padding-top:14px;border-top:2px dashed #cfc8b4;font-size:13px;line-height:1.5;color:#374151">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#17346e;border-top:3px solid #111827;border-radius:0 0 9px 9px;padding:18px 28px">
                <p style="margin:0 0 4px;font-family:${fonteTitulo};font-size:14px;font-weight:900;color:#fbbf24">Comércio de bairro &bull; <span style="white-space:nowrap">Rondonópolis-MT</span></p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#dbe4ff">Sem comissão sobre as vendas, com contato direto pelo WhatsApp. <a href="${escapar(site)}" style="color:#ffffff;font-weight:700">Visitar a vitrine</a></p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:#6b7280">Equipe VitrineRondon</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { assunto, html, texto };
}
