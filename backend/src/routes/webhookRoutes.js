// Webhooks de gateways. Montado no app.js ANTES do express.json: a assinatura
// HMAC é calculada sobre o corpo exatamente como chegou, então o corpo precisa
// ficar cru (Buffer) aqui.
import express, { Router } from 'express';
import { receberWebhook } from '../controllers/assinaturaController.js';

const router = Router();

router.post('/abacatepay', express.raw({ type: '*/*', limit: '256kb' }), receberWebhook);

export default router;
