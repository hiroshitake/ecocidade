import { FastifyRequest, FastifyReply } from 'fastify';

declare global {
  namespace FastifyInstance {
    interface FastifyInstance {
      authenticate: any;
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (error) {
    reply.code(401).send({ error: 'Token inválido ou expirado' });
  }
}

export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    if (request.user?.role !== 'admin') {
      reply.code(403).send({ error: 'Acesso negado. Apenas administradores.' });
    }
  } catch (error) {
    reply.code(401).send({ error: 'Token inválido ou expirado' });
  }
}
