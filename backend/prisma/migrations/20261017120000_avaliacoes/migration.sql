-- Avaliações dos negócios pelos clientes (nota de 1 a 5 e comentário) e as
-- denúncias de avaliações. Uma avaliação por pessoa por negócio.
-- CreateTable
CREATE TABLE `avaliacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empreendedor_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `nota` TINYINT NOT NULL,
    `comentario` VARCHAR(1000) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PUBLICADA',
    `motivo_remocao` VARCHAR(300) NULL,
    `removida_em` DATETIME(3) NULL,
    `denuncias` INTEGER NOT NULL DEFAULT 0,
    `editada_em` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `avaliacoes_empreendedor_id_status_created_at_idx`(`empreendedor_id`, `status`, `created_at`),
    INDEX `avaliacoes_empreendedor_id_status_nota_idx`(`empreendedor_id`, `status`, `nota`),
    INDEX `avaliacoes_status_denuncias_idx`(`status`, `denuncias`),
    INDEX `avaliacoes_usuario_id_idx`(`usuario_id`),
    UNIQUE INDEX `avaliacoes_empreendedor_id_usuario_id_key`(`empreendedor_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `denuncias_avaliacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `avaliacao_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `motivo` VARCHAR(300) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `denuncias_avaliacao_usuario_id_idx`(`usuario_id`),
    UNIQUE INDEX `denuncias_avaliacao_avaliacao_id_usuario_id_key`(`avaliacao_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `avaliacoes` ADD CONSTRAINT `avaliacoes_empreendedor_id_fkey` FOREIGN KEY (`empreendedor_id`) REFERENCES `empreendedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avaliacoes` ADD CONSTRAINT `avaliacoes_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `denuncias_avaliacao` ADD CONSTRAINT `denuncias_avaliacao_avaliacao_id_fkey` FOREIGN KEY (`avaliacao_id`) REFERENCES `avaliacoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `denuncias_avaliacao` ADD CONSTRAINT `denuncias_avaliacao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

