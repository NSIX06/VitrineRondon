-- Reversão da migration 20260927140000_perguntas_frequentes.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20260927140000_perguntas_frequentes.down.sql
-- Apaga as perguntas cadastradas. A linha em _prisma_migrations sai junto
-- para que um próximo "migrate deploy" aplique a migration de novo.
DROP TABLE IF EXISTS `perguntas_frequentes`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20260927140000_perguntas_frequentes';
