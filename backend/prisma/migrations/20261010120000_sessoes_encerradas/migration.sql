-- Sessões encerradas pelo botão Sair (o token deixa de valer antes de expirar)

-- CreateTable
CREATE TABLE `sessoes_encerradas` (
    `jti` VARCHAR(36) NOT NULL,
    `expira_em` DATETIME(3) NOT NULL,

    INDEX `sessoes_encerradas_expira_em_idx`(`expira_em`),
    PRIMARY KEY (`jti`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
