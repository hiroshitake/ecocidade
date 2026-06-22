import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDangerZoneSchema } from '../models/DangerZone.js';
import { dangerZoneService } from '../services/DangerZoneService.js';

export async function createDangerZone(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = CreateDangerZoneSchema.parse(request.body);
    const zone = await dangerZoneService.createDangerZone(data);

    reply.code(201).send(zone);
  } catch (error: any) {
    if (error.issues) {
      reply.code(400).send({ error: error.issues });
    } else {
      reply.code(500).send({ error: 'Erro ao criar zona de perigo' });
    }
  }
}

export async function getDangerZone(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const { id } = request.params;
    const zone = await dangerZoneService.getDangerZoneById(id);

    if (!zone) {
      reply.code(404).send({ error: 'Zona de perigo não encontrada' });
      return;
    }

    reply.send(zone);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar zona de perigo' });
  }
}

export async function getAllDangerZones(request: FastifyRequest, reply: FastifyReply) {
  try {
    const zones = await dangerZoneService.getAllDangerZones();
    reply.send(zones);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar zonas de perigo' });
  }
}

export async function getActiveDangerZones(request: FastifyRequest, reply: FastifyReply) {
  try {
    const zones = await dangerZoneService.getActiveDangerZones();
    reply.send(zones);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar zonas de perigo ativas' });
  }
}

export async function updateDangerZone(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const { id } = request.params;
    const zone = await dangerZoneService.getDangerZoneById(id);

    if (!zone) {
      reply.code(404).send({ error: 'Zona de perigo não encontrada' });
      return;
    }

    const updated = await dangerZoneService.updateDangerZone(id, request.body);
    reply.send(updated);
  } catch (error: any) {
    if (error.issues) {
      reply.code(400).send({ error: error.issues });
    } else {
      reply.code(500).send({ error: 'Erro ao atualizar zona de perigo' });
    }
  }
}

export async function deleteDangerZone(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const { id } = request.params;
    const zone = await dangerZoneService.getDangerZoneById(id);

    if (!zone) {
      reply.code(404).send({ error: 'Zona de perigo não encontrada' });
      return;
    }

    await dangerZoneService.deleteDangerZone(id);
    reply.send({ message: 'Zona de perigo deletada com sucesso' });
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar zona de perigo' });
  }
}
