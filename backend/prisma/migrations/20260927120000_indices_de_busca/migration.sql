-- Índices para os filtros da vitrine
-- CreateIndex
CREATE INDEX `empreendedores_ativo_categoria_idx` ON `empreendedores`(`ativo`, `categoria`);

-- CreateIndex
CREATE INDEX `empreendedores_ativo_bairro_idx` ON `empreendedores`(`ativo`, `bairro`);

-- CreateIndex
CREATE INDEX `produtos_disponivel_tipo_idx` ON `produtos`(`disponivel`, `tipo`);
