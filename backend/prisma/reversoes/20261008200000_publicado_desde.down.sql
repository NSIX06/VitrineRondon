-- Reversão da migration 20261008200000_publicado_desde.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261008200000_publicado_desde.down.sql
-- A linha em _prisma_migrations sai junto para que um próximo
-- "migrate deploy" aplique a migration de novo.
ALTER TABLE `empreendedores` DROP COLUMN `publicado_desde`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261008200000_publicado_desde';
