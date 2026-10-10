// Cria (ou atualiza) uma conta de administrador com senha aleatória de 8
// caracteres, mostrada uma única vez no terminal de quem rodou o comando.
//
//   npm run admin:criar -- adminvitrine@gmail.com        (banco do .env)
//   npm run tidb:criar-admin -- adminvitrine@gmail.com   (TiDB, produção)
//
// A senha não é gravada em arquivo nem em log: anote na hora e troque depois
// pelo "Esqueci a senha", se quiser. Se a conta já existe, ela vira ADMIN,
// ganha a senha nova e as sessões abertas antes deixam de valer.
//
// Atenção: 8 caracteres é o mínimo. Para a conta que manda em tudo, uma senha
// maior (14+) é bem mais segura; dá para trocar depois pelo próprio site.
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { ehSenhaComum } from '../src/services/senhasComuns.js';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Sem caracteres que se confundem ao anotar (0/O, 1/l/I)
const GRUPOS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '@#$%&*!?'];
const TAMANHO = 8;

/** 8 caracteres com ao menos uma maiúscula, uma minúscula, um número e um símbolo */
function gerarSenha() {
  const todos = GRUPOS.join('');
  const letras = GRUPOS.map((grupo) => grupo[randomInt(grupo.length)]);
  while (letras.length < TAMANHO) letras.push(todos[randomInt(todos.length)]);
  // Embaralha (Fisher-Yates) para os obrigatórios não ficarem sempre no começo
  for (let i = letras.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [letras[i], letras[j]] = [letras[j], letras[i]];
  }
  return letras.join('');
}

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!EMAIL_VALIDO.test(email)) {
    console.error('Informe o e-mail: npm run admin:criar -- adminvitrine@gmail.com');
    process.exit(1);
  }

  let senha = gerarSenha();
  while (ehSenhaComum(senha)) senha = gerarSenha();
  const senhaHash = await bcrypt.hash(senha, 10);
  const host = new URL(process.env.DATABASE_URL).hostname;

  const prisma = new PrismaClient();
  try {
    const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
    if (existente) {
      await prisma.usuario.update({
        where: { id: existente.id },
        // senhaAlteradaEm derruba as sessões abertas com a senha antiga
        data: { senhaHash, perfil: 'ADMIN', ativo: true, senhaAlteradaEm: new Date() },
      });
    } else {
      const versao = process.env.TERMOS_VERSAO || '1.1';
      await prisma.usuario.create({
        data: {
          nome: 'Administrador',
          email,
          telefone: '66999990000',
          senhaHash,
          perfil: 'ADMIN',
          aceites: {
            create: [
              { tipoTermo: 'TERMOS_DE_USO', versao, ip: '127.0.0.1', userAgent: 'scripts/criar-admin' },
              { tipoTermo: 'POLITICA_PRIVACIDADE', versao, ip: '127.0.0.1', userAgent: 'scripts/criar-admin' },
            ],
          },
        },
      });
    }
    await prisma.logAuditoria.create({
      data: {
        acao: existente ? 'UPDATE' : 'CADASTRO',
        tipoEntidade: 'Usuario',
        status: 'SUCESSO',
        descricao: `${existente ? 'Conta promovida/atualizada' : 'Conta criada'} como ADMIN por script: ${email}`,
      },
    }).catch(() => {}); // a trilha é bem-vinda, mas não pode impedir a conta

    console.log(`\nAdministrador ${existente ? 'atualizado' : 'criado'} no banco ${host}`);
    console.log(`  E-mail: ${email}`);
    console.log(`  Senha:  ${senha}`);
    console.log('\nAnote a senha agora: ela não fica guardada em lugar nenhum.\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error('Não foi possível criar o administrador:', erro.message);
  process.exit(1);
});
