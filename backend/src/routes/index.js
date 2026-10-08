// Roteador central da API
import { Router } from 'express';
import produtoRoutes from './produtoRoutes.js';
import empreendedorRoutes from './empreendedorRoutes.js';
import contatoRoutes from './contatoRoutes.js';
import authRoutes from './authRoutes.js';
import termosRoutes from './termosRoutes.js';
import auditoriaRoutes from './auditoriaRoutes.js';
import usuarioRoutes from './usuarioRoutes.js';
import faqRoutes from './faqRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import assinaturaRoutes, { planoRoutes } from './assinaturaRoutes.js';
import metricaRoutes from './metricaRoutes.js';
import divulgacaoRoutes from './divulgacaoRoutes.js';
import { verificarSaude } from '../controllers/saudeController.js';

const router = Router();

// Verificação de saúde da API, incluindo o banco
router.get('/health', verificarSaude);

router.use('/produtos', produtoRoutes);
router.use('/empreendedores', empreendedorRoutes);
router.use('/contatos', contatoRoutes);
router.use('/auth', authRoutes);
router.use('/termos', termosRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/faq', faqRoutes);
router.use('/uploads', uploadRoutes);
router.use('/planos', planoRoutes);
router.use('/assinaturas', assinaturaRoutes);
router.use('/metricas', metricaRoutes);
router.use('/divulgacoes', divulgacaoRoutes);

export default router;
