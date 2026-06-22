import { FastifyInstance } from 'fastify';
import {
  createReport,
  getReport,
  getUserReports,
  getAllReports,
  updateReport,
  deleteReport,
} from '../controllers/ReportController.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.post('/reports', { preHandler: authenticateToken }, createReport);
  fastify.get('/reports/my-reports', { preHandler: authenticateToken }, getUserReports);
  fastify.get('/reports/:id', getReport);
  fastify.get('/reports', getAllReports);
  fastify.patch('/reports/:id', { preHandler: authenticateToken }, updateReport);
  fastify.delete('/reports/:id', { preHandler: authenticateToken }, deleteReport);
}
