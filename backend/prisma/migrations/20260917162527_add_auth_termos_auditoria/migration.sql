-- AlterTable
ALTER TABLE `empreendedores` ADD COLUMN `horario_funcionamento` VARCHAR(200) NULL,
    ADD COLUMN `usuario_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `telefone` VARCHAR(30) NOT NULL,
    `senha_hash` VARCHAR(100) NOT NULL,
    `perfil` VARCHAR(20) NOT NULL DEFAULT 'COMUM',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aceites_termos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `tipo_termo` VARCHAR(30) NOT NULL,
    `versao` VARCHAR(20) NOT NULL,
    `aceito` BOOLEAN NOT NULL DEFAULT true,
    `ip` VARCHAR(60) NULL,
    `user_agent` VARCHAR(300) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `aceites_termos_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logs_auditoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NULL,
    `usuario_nome` VARCHAR(150) NULL,
    `acao` VARCHAR(50) NOT NULL,
    `tipo_entidade` VARCHAR(50) NULL,
    `entidade_id` INTEGER NULL,
    `descricao` TEXT NULL,
    `valores_antes` JSON NULL,
    `valores_depois` JSON NULL,
    `ip` VARCHAR(60) NULL,
    `user_agent` VARCHAR(300) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SUCESSO',
    `erro_mensagem` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `logs_auditoria_usuario_id_idx`(`usuario_id`),
    INDEX `logs_auditoria_acao_idx`(`acao`),
    INDEX `logs_auditoria_tipo_entidade_idx`(`tipo_entidade`),
    INDEX `logs_auditoria_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `empreendedores_usuario_id_key` ON `empreendedores`(`usuario_id`);

-- AddForeignKey
ALTER TABLE `empreendedores` ADD CONSTRAINT `empreendedores_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aceites_termos` ADD CONSTRAINT `aceites_termos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs_auditoria` ADD CONSTRAINT `logs_auditoria_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

