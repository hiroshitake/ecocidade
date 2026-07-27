import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastify from 'fastify';
import { checkConnection } from './config/database.js';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { dangerZoneRoutes } from './routes/dangerZones.js';
import { reportRoutes } from './routes/reports.js';
import { securityAnalysisRoutes } from './routes/securityAnalyses.js';

const app = fastify({
  logger: true,
});

let dbReady = false;

// Register plugins
app.register(fastifyJwt, {
  secret: env.jwtSecret,
});

const allowedOrigins = Array.from(new Set([
  ...env.corsOrigin,
  'https://ecocidadetcc.netlify.app',
  'http://localhost:3000',
  'http://10.0.2.2:3000',
  'http://localhost:19000',
  'http://localhost:8081',
]));

app.register(fastifyCors, {
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }

    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.netlify.app');

    if (isAllowed) {
      cb(null, true);
      return;
    }

    cb(new Error('CORS not allowed'), false);
  },
  credentials: true,
});

app.register(fastifyMultipart, {
  limits: {
    fileSize: env.maxFileSize,
  },
});

// Register routes
app.register(authRoutes);
app.register(reportRoutes);
app.register(dangerZoneRoutes);
app.register(securityAnalysisRoutes);

// Health check
app.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbReady ? 'connected' : 'disconnected',
  };
});

// Start server
async function start() {
  try {
    console.log('🔍 Verificando conexão com banco de dados...');
    const connected = await checkConnection();
    dbReady = connected;

    if (!connected) {
      console.warn('⚠️ Banco de dados indisponível; o servidor continuará em modo degradado até a conexão ser restabelecida.');
    }

    await app.listen({ port: env.port, host: '0.0.0.0' });
    console.log(`✓ Servidor rodando em http://localhost:${env.port}`);
  } catch (err) {
    console.error('✗ Erro ao iniciar servidor:', err);
    process.exit(1);
  }
}

start();

export default app;
