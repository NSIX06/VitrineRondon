-- CreateTable
CREATE TABLE `empreendedores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome_negocio` VARCHAR(150) NOT NULL,
    `responsavel` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `categoria` VARCHAR(50) NOT NULL DEFAULT 'Geral',
    `cidade` VARCHAR(100) NOT NULL,
    `whatsapp` VARCHAR(30) NOT NULL,
    `instagram` VARCHAR(100) NULL,
    `foto_url` VARCHAR(500) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produtos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `preco` DOUBLE NOT NULL,
    `tipo` VARCHAR(20) NOT NULL DEFAULT 'produto',
    `imagem` VARCHAR(500) NULL,
    `disponivel` BOOLEAN NOT NULL DEFAULT true,
    `empreendedor_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `produtos_empreendedor_id_idx`(`empreendedor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contatos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `telefone` VARCHAR(30) NULL,
    `mensagem` TEXT NOT NULL,
    `lido` BOOLEAN NOT NULL DEFAULT false,
    `empreendedor_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `produtos` ADD CONSTRAINT `produtos_empreendedor_id_fkey` FOREIGN KEY (`empreendedor_id`) REFERENCES `empreendedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contatos` ADD CONSTRAINT `contatos_empreendedor_id_fkey` FOREIGN KEY (`empreendedor_id`) REFERENCES `empreendedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
