-- Reversão da migration 20261012120000_enquadramento_dos_itens.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261012120000_enquadramento_dos_itens.down.sql
-- A linha em _prisma_migrations sai junto para que um próximo
-- "migrate deploy" aplique a migration de novo.
ALTER TABLE `produtos` DROP COLUMN `imagem_foco`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261012120000_enquadramento_dos_itens';
