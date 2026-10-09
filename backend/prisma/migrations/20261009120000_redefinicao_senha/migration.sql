-- "Esqueci a senha": pedidos de redefinição e a data da última troca de senha

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `senha_alterada_em` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `redefinicoes_senha` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expira_em` DATETIME(3) NOT NULL,
    `usado_em` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `redefinicoes_senha_token_hash_key`(`token_hash`),
    INDEX `redefinicoes_senha_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `redefinicoes_senha` ADD CONSTRAINT `redefinicoes_senha_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
