-- Enquadramento das fotos do negócio: o ponto que fica à vista no corte ("50% 30%")
ALTER TABLE `empreendedores` ADD COLUMN `foto_foco` VARCHAR(20) NULL;
ALTER TABLE `empreendedores` ADD COLUMN `logo_foco` VARCHAR(20) NULL;
