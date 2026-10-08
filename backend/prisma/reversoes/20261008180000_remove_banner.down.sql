-- Reversão da migration 20261008180000_remove_banner.
-- O Prisma só anda para frente; para desfazer, rode este arquivo com
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/reversoes/20261008180000_remove_banner.down.sql
-- Recria a tabela vazia (o banner que existia não volta). A linha em
-- _prisma_migrations sai junto para que um próximo "migrate deploy" aplique a
-- migration de novo.
CREATE TABLE IF NOT EXISTS `configuracoes` (
    `chave` VARCHAR(60) NOT NULL,
    `valor` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261008180000_remove_banner';
