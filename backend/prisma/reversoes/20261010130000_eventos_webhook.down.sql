-- Reversão da migration 20261010130000_eventos_webhook.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261010130000_eventos_webhook.down.sql
DROP TABLE IF EXISTS `eventos_webhook`;
