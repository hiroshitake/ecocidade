import { FastifyInstance } from 'fastify';
import {
    createSecurityAnalysis,
    deleteSecurityAnalysis,
    getAllSecurityAnalyses,
    getSecurityAnalysesByZone,
    getSecurityAnalysis,
    updateSecurityAnalysis,
} from '../controllers/SecurityAnalysisController.js';
import { authenticateAdmin } from '../middleware/auth.js';

export async function securityAnalysisRoutes(fastify: FastifyInstance) {
  fastify.post('/security-analyses', { preHandler: authenticateAdmin }, createSecurityAnalysis);
  fastify.get('/security-analyses/:id', getSecurityAnalysis);
  fastify.get('/security-analyses', getAllSecurityAnalyses);
  fastify.get('/security-analyses/by-zone/:zoneId', getSecurityAnalysesByZone);
  fastify.patch('/security-analyses/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    return updateSecurityAnalysis(request, reply);
  });
  fastify.delete('/security-analyses/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    return deleteSecurityAnalysis(request, reply);
  });
}
