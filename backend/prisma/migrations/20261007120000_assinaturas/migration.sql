-- AlterTable
ALTER TABLE `empreendedores` ADD COLUMN `autoriza_divulgacao` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `autoriza_divulgacao_em` DATETIME(3) NULL,
    ADD COLUMN `em_destaque` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `plano_atual` VARCHAR(20) NOT NULL DEFAULT 'NENHUM';

-- CreateTable
CREATE TABLE `planos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(30) NOT NULL,
    `titulo` VARCHAR(60) NOT NULL,
    `chamada` VARCHAR(160) NULL,
    `descricao` TEXT NULL,
    `preco_centavos` INTEGER NOT NULL,
    `ciclo` VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    `destaque` BOOLEAN NOT NULL DEFAULT false,
    `metricas_ampliadas` BOOLEAN NOT NULL DEFAULT false,
    `divulgacao` BOOLEAN NOT NULL DEFAULT false,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `gateway_produto_id` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `planos_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assinaturas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empreendedor_id` INTEGER NOT NULL,
    `plano_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    `gateway_checkout_id` VARCHAR(100) NULL,
    `gateway_assinatura_id` VARCHAR(100) NULL,
    `checkout_url` VARCHAR(500) NULL,
    `inicio_em` DATETIME(3) NULL,
    `proxima_cobranca` DATETIME(3) NULL,
    `cancelada_em` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assinaturas_gateway_checkout_id_key`(`gateway_checkout_id`),
    UNIQUE INDEX `assinaturas_gateway_assinatura_id_key`(`gateway_assinatura_id`),
    INDEX `assinaturas_empreendedor_id_status_idx`(`empreendedor_id`, `status`),
    INDEX `assinaturas_plano_id_idx`(`plano_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `divulgacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empreendedor_id` INTEGER NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `canal` VARCHAR(40) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PLANEJADA',
    `publicada_em` DATETIME(3) NULL,
    `link` VARCHAR(500) NULL,
    `alcance` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `divulgacoes_empreendedor_id_idx`(`empreendedor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metricas_diarias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empreendedor_id` INTEGER NOT NULL,
    `dia` DATE NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `referencia_id` INTEGER NOT NULL DEFAULT 0,
    `quantidade` INTEGER NOT NULL DEFAULT 0,

    INDEX `metricas_diarias_empreendedor_id_dia_idx`(`empreendedor_id`, `dia`),
    UNIQUE INDEX `metricas_diarias_empreendedor_id_dia_tipo_referencia_id_key`(`empreendedor_id`, `dia`, `tipo`, `referencia_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `empreendedores_ativo_em_destaque_idx` ON `empreendedores`(`ativo`, `em_destaque`);

-- AddForeignKey
ALTER TABLE `assinaturas` ADD CONSTRAINT `assinaturas_empreendedor_id_fkey` FOREIGN KEY (`empreendedor_id`) REFERENCES `empreendedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assinaturas` ADD CONSTRAINT `assinaturas_plano_id_fkey` FOREIGN KEY (`plano_id`) REFERENCES `planos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `divulgacoes` ADD CONSTRAINT `divulgacoes_empreendedor_id_fkey` FOREIGN KEY (`empreendedor_id`) REFERENCES `empreendedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metricas_diarias` ADD CONSTRAINT `metricas_diarias_empreendedor_id_fkey` FOREIGN KEY (`empreendedor_id`) REFERENCES `empreendedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

