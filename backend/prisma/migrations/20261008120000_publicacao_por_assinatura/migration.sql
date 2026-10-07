-- Publicação condicionada à assinatura: só negócio com plano em vigor aparece
-- na vitrine pública. Negócios sem assinatura ficam guardados como rascunho.

-- AlterTable
ALTER TABLE `assinaturas` ADD COLUMN `vigente_ate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `empreendedores` ADD COLUMN `publicado_ate` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `empreendedores_ativo_publicado_ate_idx` ON `empreendedores`(`ativo`, `publicado_ate`);

-- Assinaturas ativas: o período pago vai até a próxima cobrança, mais um dia
UPDATE `assinaturas`
SET `vigente_ate` = DATE_ADD(`proxima_cobranca`, INTERVAL 1 DAY)
WHERE `status` = 'ATIVA' AND `proxima_cobranca` IS NOT NULL;

-- Negócios com assinatura ativa continuam publicados até o fim do período
UPDATE `empreendedores` e
JOIN (
  SELECT `empreendedor_id`, MAX(`vigente_ate`) AS `fim`
  FROM `assinaturas`
  WHERE `status` = 'ATIVA'
  GROUP BY `empreendedor_id`
) a ON a.`empreendedor_id` = e.`id`
SET e.`publicado_ate` = a.`fim`;
