-- Avisos do gateway de pagamento já processados (proteção contra repetição)

-- CreateTable
CREATE TABLE `eventos_webhook` (
    `id` VARCHAR(100) NOT NULL,
    `recebido_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
