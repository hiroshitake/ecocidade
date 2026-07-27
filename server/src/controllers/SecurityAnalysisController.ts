import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateSecurityAnalysisSchema } from '../models/SecurityAnalysis.js';
import { securityAnalysisService } from '../services/SecurityAnalysisService.js';

export async function createSecurityAnalysis(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = CreateSecurityAnalysisSchema.parse(request.body);
    const analysis = await securityAnalysisService.createAnalysis(data);

    reply.code(201).send(analysis);
  } catch (error: any) {
    if (error.issues) {
      reply.code(400).send({ error: error.issues });
    } else {
      reply.code(500).send({ error: 'Erro ao criar análise de segurança' });
    }
  }
}

export async function getSecurityAnalysis(request: FastifyRequest<any>, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const analysis = await securityAnalysisService.getAnalysisById(id);

    if (!analysis) {
      reply.code(404).send({ error: 'Análise não encontrada' });
      return;
    }

    reply.send(analysis);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar análise' });
  }
}

export async function getAllSecurityAnalyses(request: FastifyRequest, reply: FastifyReply) {
  try {
    const analyses = await securityAnalysisService.getAllAnalyses();
    reply.send(analyses);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar análises' });
  }
}

export async function getSecurityAnalysesByZone(request: FastifyRequest<{ Params: { zoneId: string } }>, reply: FastifyReply) {
  try {
    const { zoneId } = request.params;
    const analyses = await securityAnalysisService.getAnalysesByZoneId(zoneId);

    reply.send(analyses);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar análises' });
  }
}

export async function updateSecurityAnalysis(request: FastifyRequest<any>, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const analysis = await securityAnalysisService.getAnalysisById(id);

    if (!analysis) {
      reply.code(404).send({ error: 'Análise não encontrada' });
      return;
    }

    const updated = await securityAnalysisService.updateAnalysis(id, request.body as Parameters<typeof securityAnalysisService.updateAnalysis>[1]);
    reply.send(updated);
  } catch (error: any) {
    if (error.issues) {
      reply.code(400).send({ error: error.issues });
    } else {
      reply.code(500).send({ error: 'Erro ao atualizar análise' });
    }
  }
}

export async function deleteSecurityAnalysis(request: FastifyRequest<any>, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const analysis = await securityAnalysisService.getAnalysisById(id);

    if (!analysis) {
      reply.code(404).send({ error: 'Análise não encontrada' });
      return;
    }

    await securityAnalysisService.deleteAnalysis(id);
    reply.send({ message: 'Análise deletada com sucesso' });
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar análise' });
  }
}
