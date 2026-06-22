import { FastifyInstance } from 'fastify';
import {
  createSecurityAnalysis,
  getSecurityAnalysis,
  getAllSecurityAnalyses,
  getSecurityAnalysesByZone,
  updateSecurityAnalysis,
  deleteSecurityAnalysis,
} from '../controllers/SecurityAnalysisController.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

export async function securityAnalysisRoutes(fastify: FastifyInstance) {
  fastify.post('/security-analyses', { preHandler: authenticateAdmin }, createSecurityAnalysis);
  fastify.get('/security-analyses/:id', getSecurityAnalysis);
  fastify.get('/security-analyses', getAllSecurityAnalyses);
  fastify.get('/security-analyses/by-zone/:zoneId', getSecurityAnalysesByZone);
  fastify.patch('/security-analyses/:id', { preHandler: authenticateAdmin }, updateSecurityAnalysis);
  fastify.delete('/security-analyses/:id', { preHandler: authenticateAdmin }, deleteSecurityAnalysis);
}
