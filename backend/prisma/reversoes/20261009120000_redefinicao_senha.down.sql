-- Reversão da migration 20261009120000_redefinicao_senha.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261009120000_redefinicao_senha.down.sql
DROP TABLE IF EXISTS `redefinicoes_senha`;
ALTER TABLE `usuarios` DROP COLUMN `senha_alterada_em`;
