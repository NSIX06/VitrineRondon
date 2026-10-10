-- Reversão da migration 20261011120000_logo_do_negocio.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261011120000_logo_do_negocio.down.sql
-- A linha em _prisma_migrations sai junto para que um próximo
-- "migrate deploy" aplique a migration de novo.
ALTER TABLE `empreendedores` DROP COLUMN `logo_url`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261011120000_logo_do_negocio';
