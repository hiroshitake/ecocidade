import { FastifyInstance } from 'fastify';
import { register, login, getProfile } from '../controllers/AuthController.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', register);
  fastify.post('/auth/login', login);
  fastify.get('/auth/profile', { preHandler: authenticateToken }, getProfile);
}
