import { FastifyInstance } from 'fastify';
import {
    createAnonymousReport,
    createReport,
    deleteReport,
    getAllReports,
    getReport,
    getUserReports,
    updateReport,
} from '../controllers/ReportController.js';
import { authenticateToken } from '../middleware/auth.js';

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.post('/reports/anonymous', createAnonymousReport);
  fastify.post('/reports', { preHandler: authenticateToken }, createReport);
  fastify.get('/reports/my-reports', { preHandler: authenticateToken }, getUserReports);
  fastify.get('/reports/:id', getReport);
  fastify.get('/reports', getAllReports);
  fastify.patch('/reports/:id', { preHandler: authenticateToken }, async (request, reply) => {
    return updateReport(request, reply);
  });
  fastify.delete('/reports/:id', { preHandler: authenticateToken }, async (request, reply) => {
    return deleteReport(request, reply);
  });
}
