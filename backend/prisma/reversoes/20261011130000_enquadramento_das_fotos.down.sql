-- Reversão da migration 20261011130000_enquadramento_das_fotos.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261011130000_enquadramento_das_fotos.down.sql
-- A linha em _prisma_migrations sai junto para que um próximo
-- "migrate deploy" aplique a migration de novo.
ALTER TABLE `empreendedores` DROP COLUMN `foto_foco`;
ALTER TABLE `empreendedores` DROP COLUMN `logo_foco`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261011130000_enquadramento_das_fotos';
