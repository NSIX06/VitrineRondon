-- Login com Google: vínculo entre a conta e o provedor externo. Contas
-- criadas pelo Google não têm senha nem telefone (colunas passam a aceitar
-- nulo; as contas existentes não mudam).
-- AlterTable
ALTER TABLE `usuarios` MODIFY `telefone` VARCHAR(30) NULL,
    MODIFY `senha_hash` VARCHAR(100) NULL;

-- CreateTable
CREATE TABLE `identidades_externas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `provedor` VARCHAR(20) NOT NULL,
    `sujeito` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ultimo_acesso_em` DATETIME(3) NULL,

    UNIQUE INDEX `identidades_externas_provedor_sujeito_key`(`provedor`, `sujeito`),
    UNIQUE INDEX `identidades_externas_usuario_id_provedor_key`(`usuario_id`, `provedor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `identidades_externas` ADD CONSTRAINT `identidades_externas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

