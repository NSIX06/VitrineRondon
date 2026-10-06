// Leitura dos documentos legais e regras de aceite
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const TIPOS_TERMO = {
  TERMOS_DE_USO: { arquivo: 'TERMOS_DE_USO.md', titulo: 'Termos de Uso' },
  POLITICA_PRIVACIDADE: { arquivo: 'POLITICA_DE_PRIVACIDADE.md', titulo: 'Política de Privacidade' },
};

/** Versão vigente. Deve bater com o cabeçalho dos arquivos .md */
export function versaoVigente() {
  return process.env.TERMOS_VERSAO || '1.0';
}

/** Conteúdo markdown de um documento */
export async function lerTermo(tipo) {
  const definicao = TIPOS_TERMO[tipo];
  if (!definicao) return null;
  const conteudo = await readFile(path.join(raizProjeto, definicao.arquivo), 'utf-8');
  return { tipo, titulo: definicao.titulo, versao: versaoVigente(), conteudo };
}

/**
 * Monta as linhas de aceite para gravar junto com o cadastro (mesma transação).
 * RN-TERMOS-01: só chega aqui se os dois aceites vieram como true.
 */
export function montarAceites({ ip, userAgent }) {
  const versao = versaoVigente();
  return Object.keys(TIPOS_TERMO).map((tipoTermo) => ({
    tipoTermo,
    versao,
    aceito: true,
    ip,
    userAgent,
  }));
}
