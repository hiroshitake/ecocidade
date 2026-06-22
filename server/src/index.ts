import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { env } from './config/env.js';
import { checkConnection } from './config/database.js';
import { authRoutes } from './routes/auth.js';
import { reportRoutes } from './routes/reports.js';
import { dangerZoneRoutes } from './routes/dangerZones.js';
import { securityAnalysisRoutes } from './routes/securityAnalyses.js';

const app = fastify({
  logger: true,
});

// Register plugins
app.register(fastifyJwt, {
  secret: env.jwtSecret,
});

app.register(fastifyCors, {
  origin: env.corsOrigin,
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
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
async function start() {
  try {
    console.log('🔍 Verificando conexão com banco de dados...');
    const connected = await checkConnection();
    
    if (!connected) {
      throw new Error('Falha na conexão com o banco de dados');
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
