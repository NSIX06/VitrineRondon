-- Reversão da migration 20261008120000_publicacao_por_assinatura.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261008120000_publicacao_por_assinatura.down.sql
-- A linha em _prisma_migrations sai junto para que um próximo
-- "migrate deploy" aplique a migration de novo.
DROP INDEX `empreendedores_ativo_publicado_ate_idx` ON `empreendedores`;
ALTER TABLE `empreendedores` DROP COLUMN `publicado_ate`;
ALTER TABLE `assinaturas` DROP COLUMN `vigente_ate`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261008120000_publicacao_por_assinatura';
