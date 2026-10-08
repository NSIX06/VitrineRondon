-- Data da primeira publicação do negócio, para o selo "Novo na vitrine"

-- AlterTable
ALTER TABLE `empreendedores` ADD COLUMN `publicado_desde` DATETIME(3) NULL;

-- Negócios que já tiveram assinatura paga: a primeira vez que entraram na vitrine
UPDATE `empreendedores` e
JOIN (
  SELECT `empreendedor_id`, MIN(`inicio_em`) AS `inicio`
  FROM `assinaturas`
  WHERE `inicio_em` IS NOT NULL
  GROUP BY `empreendedor_id`
) a ON a.`empreendedor_id` = e.`id`
SET e.`publicado_desde` = a.`inicio`;
