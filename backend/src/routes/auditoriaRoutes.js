// Rotas de Auditoria — somente o administrador consulta.
// Usuários comuns e empreendedores não têm acesso à auditoria global.
import { Router } from 'express';
import { autenticar, exigirPerfil, PERFIS } from '../middlewares/auth.js';
import { listarLogs, buscarLog, opcoesAuditoria } from '../controllers/auditoriaController.js';

const router = Router();

// Todas as rotas deste módulo exigem administrador
router.use(autenticar, exigirPerfil(PERFIS.ADMIN));

// /opcoes vem antes de /:id para não ser capturada como um id
router.get('/opcoes', opcoesAuditoria);
router.get('/', listarLogs);
router.get('/:id', buscarLog);

export default router;
