import { FastifyInstance } from 'fastify';
import {
    createDangerZone,
    deleteDangerZone,
    getActiveDangerZones,
    getAllDangerZones,
    getDangerZone,
    updateDangerZone,
} from '../controllers/DangerZoneController.js';
import { authenticateAdmin } from '../middleware/auth.js';

export async function dangerZoneRoutes(fastify: FastifyInstance) {
  fastify.post('/danger-zones', { preHandler: authenticateAdmin }, createDangerZone);
  fastify.get('/danger-zones/:id', getDangerZone);
  fastify.get('/danger-zones/active/all', getActiveDangerZones);
  fastify.get('/danger-zones', getAllDangerZones);
  fastify.patch('/danger-zones/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    return updateDangerZone(request, reply);
  });
  fastify.delete('/danger-zones/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    return deleteDangerZone(request, reply);
  });
}
