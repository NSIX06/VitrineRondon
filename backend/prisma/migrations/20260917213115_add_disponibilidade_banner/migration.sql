-- AlterTable
ALTER TABLE `empreendedores` ADD COLUMN `disponivel_atendimento` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `configuracoes` (
    `chave` VARCHAR(60) NOT NULL,
    `valor` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

