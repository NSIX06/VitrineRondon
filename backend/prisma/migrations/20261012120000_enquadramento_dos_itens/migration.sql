-- Enquadramento da foto dos produtos e serviços: o ponto que fica à vista no
-- corte e, opcionalmente, o zoom ("50% 30% 1.4")
ALTER TABLE `produtos` ADD COLUMN `imagem_foco` VARCHAR(20) NULL;
