// Imagens enviadas do computador (fotos de negócio e de produto).
//
// O arquivo nunca é guardado como chegou: o sharp decodifica, gira conforme a
// orientação da câmera, reduz para no máximo 1600 px e regrava em WebP. Assim
// só sai daqui imagem de verdade (um .exe renomeado para .jpg falha na leitura),
// os metadados somem (inclusive a localização GPS das fotos de celular) e o
// tamanho em disco fica previsível.
//
// Onde o arquivo fica depende do ambiente:
// - com CLOUDINARY_URL (produção no Render, cujo disco gratuito é apagado a cada
//   deploy), a imagem vai para o Cloudinary e no banco fica o endereço https
//   dela, dentro da pasta CLOUDINARY_PASTA;
// - sem ela (desenvolvimento), vai para a pasta local e no banco fica o caminho
//   relativo "/uploads/<uuid>.webp".
// As imagens antigas, cadastradas por link (https://...), continuam valendo.
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import { erroHttp } from '../utils/erros.js';

const raizBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Pasta dos arquivos enviados (UPLOADS_DIR no .env, ou backend/uploads) */
export const PASTA_UPLOADS = path.resolve(raizBackend, process.env.UPLOADS_DIR || 'uploads');

/** Prefixo público dos arquivos; é o que fica gravado no banco */
const PREFIXO_UPLOADS = '/uploads/';

/** Formatos aceitos no envio. SVG fica de fora: pode carregar script. */
export const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB por arquivo
const LADO_MAXIMO = 1600;
// Teto de pixels na decodificação: barra "bomba de descompressão" (um PNG
// pequeno que se expande para gigabytes de memória ao abrir)
const PIXELS_MAXIMOS = 40_000_000;

// Só o nome que nós mesmos geramos: uuid v4 + .webp. Nada de "../" nem
// caminhos escolhidos por quem chama a API.
const NOME_GERADO = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/;
// Só HTTPS: com http:// a imagem viaja sem criptografia (o navegador avisa e
// pode bloquear) e pode ser trocada no caminho
const LINK_EXTERNO = /^https:\/\/\S+$/i;

/** O valor é um arquivo enviado por aqui e guardado na pasta local? */
export function ehUpload(valor) {
  if (typeof valor !== 'string' || !valor.startsWith(PREFIXO_UPLOADS)) return false;
  return NOME_GERADO.test(valor.slice(PREFIXO_UPLOADS.length));
}

// ---------------------------------------------------------------------------
// Cloudinary (produção). Fala direto com a API REST, sem SDK: são só duas
// chamadas assinadas, enviar e apagar.
// ---------------------------------------------------------------------------

/** Credenciais de CLOUDINARY_URL (cloudinary://chave:segredo@conta), ou null */
export function configuracaoNuvem() {
  const valor = process.env.CLOUDINARY_URL;
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== 'cloudinary:' || !url.hostname || !url.username || !url.password) return null;
    return {
      conta: url.hostname,
      chave: decodeURIComponent(url.username),
      segredo: decodeURIComponent(url.password),
      pasta: (process.env.CLOUDINARY_PASTA || 'vitrinelocal').replace(/[^A-Za-z0-9_-]/g, ''),
    };
  } catch {
    return null;
  }
}

/**
 * Motivo para o envio de imagens não funcionar direito, ou null. Em produção
 * sem Cloudinary a foto ia para o disco do Render, que é apagado a cada deploy:
 * o envio "dava certo" e a imagem sumia depois (erro 404 em todas as telas).
 */
export function problemaNasImagens() {
  if (process.env.CLOUDINARY_URL && !configuracaoNuvem()) {
    return 'CLOUDINARY_URL inválida (o formato é cloudinary://chave:segredo@conta)';
  }
  if (process.env.NODE_ENV === 'production' && !configuracaoNuvem()) {
    return 'CLOUDINARY_URL não definida: em produção o disco do servidor é apagado a cada deploy';
  }
  return null;
}

/** Assinatura da API: parâmetros em ordem alfabética, segredo no fim, SHA-1 */
export function assinarNuvem(parametros, segredo) {
  const texto = Object.keys(parametros)
    .sort()
    .map((nome) => `${nome}=${parametros[nome]}`)
    .join('&');
  return createHash('sha1').update(texto + segredo).digest('hex');
}

/**
 * Identificador da imagem no Cloudinary, se o endereço for uma imagem nossa
 * (da nossa conta, da nossa pasta e com nome gerado por nós). Link de qualquer
 * outra origem devolve null e nunca é apagado.
 */
export function idNaNuvem(valor, nuvem = configuracaoNuvem()) {
  if (!nuvem || typeof valor !== 'string') return null;
  const prefixo = `https://res.cloudinary.com/${nuvem.conta}/image/upload/`;
  if (!valor.startsWith(prefixo)) return null;
  const resto = valor.slice(prefixo.length).replace(/^v\d+\//, '');
  const [pasta, arquivo, ...sobra] = resto.split('/');
  if (sobra.length || pasta !== nuvem.pasta || !NOME_GERADO.test(arquivo ?? '')) return null;
  return `${pasta}/${arquivo.replace(/\.webp$/, '')}`;
}

async function chamarNuvem(nuvem, acao, parametros, arquivo) {
  const timestamp = Math.floor(Date.now() / 1000);
  const assinados = { ...parametros, timestamp };
  const corpo = new FormData();
  for (const [nome, valor] of Object.entries(assinados)) corpo.append(nome, String(valor));
  corpo.append('api_key', nuvem.chave);
  corpo.append('signature', assinarNuvem(assinados, nuvem.segredo));
  if (arquivo) corpo.append('file', new Blob([arquivo], { type: 'image/webp' }), 'imagem.webp');

  const resposta = await fetch(`https://api.cloudinary.com/v1_1/${nuvem.conta}/image/${acao}`, {
    method: 'POST',
    body: corpo,
    signal: AbortSignal.timeout(20_000),
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    // O detalhe fica no log; o cliente recebe a mensagem genérica de erro 500
    throw new Error(`Cloudinary ${acao} respondeu ${resposta.status}: ${dados?.error?.message ?? 'sem detalhe'}`);
  }
  return dados;
}

/** Link externo completo, só https */
function ehLinkExterno(valor) {
  if (!LINK_EXTERNO.test(valor)) return false;
  try {
    return new URL(valor).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Campo de imagem dos schemas: aceita um link http(s) completo, como sempre
 * aceitou (inclusive o endereço do Cloudinary), ou o caminho de um arquivo
 * enviado para a pasta local por /api/uploads/imagem.
 */
export function campoImagem(mensagem) {
  return z
    .string({ error: mensagem })
    .trim()
    .max(500, 'O endereço da imagem pode ter até 500 caracteres')
    .refine((valor) => !/^http:\/\//i.test(valor), { error: 'Use um link seguro, que comece com https://' })
    .refine((valor) => /^http:\/\//i.test(valor) || ehUpload(valor) || ehLinkExterno(valor), { error: mensagem });
}

/**
 * Converte o arquivo recebido em WebP otimizado e guarda no Cloudinary (se
 * configurado) ou na pasta de uploads. Devolve o endereço para salvar no
 * cadastro: "https://res.cloudinary.com/..." ou "/uploads/<uuid>.webp".
 */
export async function salvarImagem(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw erroHttp(400, 'Escolha uma imagem para enviar');
  }
  // Melhor recusar agora do que aceitar uma foto que some no próximo deploy
  const problema = problemaNasImagens();
  if (problema) {
    console.error(`Envio de imagem recusado: ${problema}`);
    throw erroHttp(503, 'O envio de fotos está temporariamente indisponível. Tente novamente mais tarde');
  }

  let convertida;
  try {
    convertida = await sharp(buffer, { limitInputPixels: PIXELS_MAXIMOS, animated: false })
      .rotate() // aplica a orientação EXIF antes de descartar os metadados
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    // Arquivo corrompido, que não é imagem, ou grande demais em pixels
    throw erroHttp(415, 'Não foi possível ler essa imagem. Envie um arquivo JPG, PNG ou WebP');
  }

  const id = randomUUID();
  const nuvem = configuracaoNuvem();
  if (nuvem) {
    // A pasta vai dentro do public_id (e não no parâmetro "folder"): assim o
    // endereço sai igual nas contas com pastas fixas e nas com pastas dinâmicas
    const enviada = await chamarNuvem(nuvem, 'upload', { public_id: `${nuvem.pasta}/${id}` }, convertida);
    return enviada.secure_url;
  }

  await mkdir(PASTA_UPLOADS, { recursive: true });
  const nome = `${id}.webp`;
  await writeFile(path.join(PASTA_UPLOADS, nome), convertida, { flag: 'wx' });
  return `${PREFIXO_UPLOADS}${nome}`;
}

/**
 * Apaga um arquivo enviado que deixou de ser usado. Só age sobre caminhos
 * gerados por nós e só se nenhum produto ou negócio ainda apontar para
 * ele (o mesmo arquivo pode ter sido reaproveitado em outro cadastro).
 * Falhar aqui nunca derruba a operação principal: no pior caso sobra um
 * arquivo esquecido na pasta.
 */
export async function apagarSeOrfa(prisma, caminho) {
  const nuvem = configuracaoNuvem();
  const idRemoto = idNaNuvem(caminho, nuvem);
  if (!ehUpload(caminho) && !idRemoto) return;
  try {
    const [produtos, negocios] = await Promise.all([
      prisma.produto.count({ where: { imagem: caminho } }),
      // A mesma imagem pode ser capa ou foto do perfil de algum negócio
      prisma.empreendedor.count({ where: { OR: [{ fotoUrl: caminho }, { logoUrl: caminho }] } }),
    ]);
    if (produtos + negocios > 0) return;
    if (idRemoto) {
      await chamarNuvem(nuvem, 'destroy', { invalidate: true, public_id: idRemoto });
      return;
    }
    await unlink(path.join(PASTA_UPLOADS, caminho.slice(PREFIXO_UPLOADS.length)));
  } catch (erro) {
    if (erro?.code !== 'ENOENT') console.error('Não foi possível apagar a imagem antiga', caminho, erro);
  }
}

/** Atalho para trocas: apaga a imagem anterior se ela mudou e ficou sem uso */
export async function apagarSeTrocou(prisma, anterior, atual) {
  if (anterior && anterior !== atual) await apagarSeOrfa(prisma, anterior);
}
