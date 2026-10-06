// Configuração da aplicação Express
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { autenticarOpcional } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { limitePadrao } from './middlewares/rateLimit.js';
import { erroHttp } from './utils/erros.js';
import { lerOrigens, origemPermitida } from './utils/origens.js';

const app = express();
const producao = process.env.NODE_ENV === 'production';

// Atrás de proxy/load balancer (Render, Railway, nginx) o IP real e o protocolo
// chegam em X-Forwarded-*. Sem isso o rate limit veria todos como o mesmo IP.
if (producao) app.set('trust proxy', 1);

// Cabeçalhos de segurança. A API só devolve JSON, então a CSP pode ser mínima:
// nada de script/estilo/frame é servido daqui.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'none'"],
        'form-action': ["'none'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    // HSTS só faz sentido sob HTTPS; em dev o navegador fixaria localhost em https
    hsts: producao ? { maxAge: 31536000, includeSubDomains: true } : false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);

// Em produção recusa tráfego que não chegou por HTTPS (o proxy informa em
// X-Forwarded-Proto). Em dev o servidor é http://localhost e a checagem é pulada.
if (producao) {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
    return res.status(403).json({ success: false, message: 'HTTPS obrigatório' });
  });
}

// Comprime as respostas antes de enviar: o catálogo em JSON viaja bem menor e
// o navegador descomprime sozinho
app.use(compression());

// CORS restrito às origens conhecidas: a regra está em utils/origens.js
const listaDeOrigens = lerOrigens(process.env.CORS_ORIGINS);

app.use(
  cors({
    origin(origin, callback) {
      // Requisições sem Origin (curl, health check, app mobile) não são cross-origin
      if (!origin) return callback(null, true);
      if (origemPermitida(origin, { lista: listaDeOrigens, producao })) return callback(null, true);
      // A origem recusada fica no log; devolvê-la seria repetir para o cliente
      // o que ele mandou, sem nenhum ganho para quem está do outro lado
      console.warn(`CORS recusou a origem ${origin}`);
      return callback(erroHttp(403, 'Origem não permitida'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Limite de tamanho do corpo: sem isso um POST gigante consome memória à vontade
app.use(express.json({ limit: '256kb' }));

// Teto global de requisições por IP (o login tem um limite mais apertado próprio)
app.use('/api', limitePadrao);

// Log simples de requisições
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    const duracao = Date.now() - inicio;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracao}ms)`);
  });
  next();
});

// Rotas da API
app.use('/api', autenticarOpcional, routes);

// Quem abre o endereço do servidor no navegador cai aqui, e não num 404 seco.
// Em desenvolvimento a mensagem aponta o site; em produção não cita endereço
// nenhum, porque o site pode estar em outro domínio.
app.get(['/', '/api'], (req, res) => {
  res.json({
    success: true,
    message: producao
      ? 'API do VitrineLocal. As rotas começam em /api.'
      : 'API do VitrineLocal. Esta é a porta do servidor; o site fica em http://localhost:5173',
    saude: '/api/health',
  });
});

// Rota 404 para caminhos não mapeados. O endereço pedido não volta no texto:
// devolver o que o cliente escreveu abre porta para conteúdo forjado aparecer
// como se fosse mensagem do sistema.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
  });
});

// Tratamento global de erros (deve ser o último middleware)
app.use(errorHandler);

export default app;
