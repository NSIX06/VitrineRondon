-- Horário de atendimento estruturado: substitui o texto livre
-- `horario_funcionamento` e o interruptor manual `disponivel_atendimento`.

-- CreateTable
CREATE TABLE `horarios_atendimento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empreendedor_id` INTEGER NOT NULL,
    `dia_semana` TINYINT NOT NULL,
    `abre` VARCHAR(5) NOT NULL,
    `fecha` VARCHAR(5) NOT NULL,

    INDEX `horarios_atendimento_empreendedor_id_dia_semana_idx`(`empreendedor_id`, `dia_semana`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `horarios_atendimento` ADD CONSTRAINT `horarios_atendimento_empreendedor_id_fkey` FOREIGN KEY (`empreendedor_id`) REFERENCES `empreendedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Conversão de dados: o único texto livre existente é o do seed,
-- "Segunda a sábado, das 8h às 18h" (1 = segunda ... 6 = sábado).
-- O padrão só usa caracteres simples para casar também a versão
-- gravada com acentuação corrompida.
INSERT INTO `horarios_atendimento` (`empreendedor_id`, `dia_semana`, `abre`, `fecha`)
SELECT e.`id`, d.`dia`, '08:00', '18:00'
FROM `empreendedores` e
JOIN (SELECT 1 AS dia UNION ALL SELECT 2 UNION ALL SELECT 3
      UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d
WHERE e.`horario_funcionamento` LIKE 'Segunda a s%bado, das 8h %s 18h';

-- AlterTable (depois da conversão)
ALTER TABLE `empreendedores` DROP COLUMN `disponivel_atendimento`,
    DROP COLUMN `horario_funcionamento`;
