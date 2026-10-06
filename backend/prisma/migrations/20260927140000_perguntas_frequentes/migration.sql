-- Central de ajuda: perguntas frequentes administráveis
-- CreateTable
CREATE TABLE `perguntas_frequentes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pergunta` VARCHAR(300) NOT NULL,
    `resposta` TEXT NOT NULL,
    `categoria` VARCHAR(80) NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `perguntas_frequentes_ativo_ordem_idx`(`ativo`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

