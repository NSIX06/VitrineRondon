-- AlterTable
ALTER TABLE `empreendedores` ADD COLUMN `bairro` VARCHAR(100) NULL,
    ADD COLUMN `cep` VARCHAR(9) NULL,
    ADD COLUMN `complemento` VARCHAR(100) NULL,
    ADD COLUMN `endereco` VARCHAR(200) NULL,
    ADD COLUMN `estado` VARCHAR(2) NOT NULL DEFAULT 'MT',
    ADD COLUMN `exibir_endereco` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `numero` VARCHAR(20) NULL;
