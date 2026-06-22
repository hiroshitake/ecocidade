import { FastifyInstance } from 'fastify';
import {
  createDangerZone,
  getDangerZone,
  getAllDangerZones,
  getActiveDangerZones,
  updateDangerZone,
  deleteDangerZone,
} from '../controllers/DangerZoneController.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

export async function dangerZoneRoutes(fastify: FastifyInstance) {
  fastify.post('/danger-zones', { preHandler: authenticateAdmin }, createDangerZone);
  fastify.get('/danger-zones/:id', getDangerZone);
  fastify.get('/danger-zones/active/all', getActiveDangerZones);
  fastify.get('/danger-zones', getAllDangerZones);
  fastify.patch('/danger-zones/:id', { preHandler: authenticateAdmin }, updateDangerZone);
  fastify.delete('/danger-zones/:id', { preHandler: authenticateAdmin }, deleteDangerZone);
}
