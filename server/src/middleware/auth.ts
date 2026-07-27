import { FastifyReply, FastifyRequest } from 'fastify';

type AuthUser = {
  id: string;
  email: string;
  role: string;
};

function getRequestUser(request: FastifyRequest): AuthUser | undefined {
  const user = request.user as Partial<AuthUser> | undefined;
  if (!user) return undefined;

  return {
    id: typeof user.id === 'string' ? user.id : '',
    email: typeof user.email === 'string' ? user.email : '',
    role: typeof user.role === 'string' ? user.role : 'user',
  };
}

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Token inválido ou expirado' });
  }
}

export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const user = getRequestUser(request);
    if (user?.role !== 'admin') {
      reply.code(403).send({ error: 'Acesso negado. Apenas administradores.' });
    }
  } catch {
    reply.code(401).send({ error: 'Token inválido ou expirado' });
  }
}
