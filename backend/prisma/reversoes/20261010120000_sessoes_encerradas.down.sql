-- Reversão da migration 20261010120000_sessoes_encerradas.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261010120000_sessoes_encerradas.down.sql
DROP TABLE IF EXISTS `sessoes_encerradas`;
