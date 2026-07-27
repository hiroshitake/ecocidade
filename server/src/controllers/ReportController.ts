import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';
import { CreateReportSchema, UpdateReportSchema } from '../models/Report.js';
import { reportService } from '../services/ReportService.js';

export async function createAnonymousReport(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as any;
    const rawData = body?.data && typeof body.data === 'string' ? JSON.parse(body.data) : body;
    const data = CreateReportSchema.parse(rawData || {});

    const report = await reportService.createReport(null, data, undefined);
    reply.code(201).send(report);
  } catch (error: any) {
    if (error.issues) {
      reply.code(400).send({ error: error.issues });
    } else {
      reply.code(500).send({ error: 'Erro ao criar relatório anônimo' });
    }
  }
}

export async function createReport(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as any;
    const rawData = body?.data && typeof body.data === 'string' ? JSON.parse(body.data) : body;
    const data = CreateReportSchema.parse(rawData || {});
    let imageUrl: string | undefined;

    // Handle file upload if provided
    const files = await request.file();
    if (files) {
      const filename = `${Date.now()}-${files.filename}`;
      const filepath = path.join(env.uploadDir, filename);
      
      await fs.mkdir(env.uploadDir, { recursive: true });
      const buffer = await files.toBuffer();
      await fs.writeFile(filepath, buffer);
      
      imageUrl = `/uploads/${filename}`;
    }

    const report = await reportService.createReport((request.user as { id?: string } | undefined)?.id ?? null, data, imageUrl);

    reply.code(201).send(report);
  } catch (error: any) {
    if (error.issues) {
      reply.code(400).send({ error: error.issues });
    } else {
      reply.code(500).send({ error: 'Erro ao criar relatório' });
    }
  }
}

export async function getReport(request: FastifyRequest<any>, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const report = await reportService.getReportById(id);

    if (!report) {
      reply.code(404).send({ error: 'Relatório não encontrado' });
      return;
    }

    reply.send(report);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar relatório' });
  }
}

export async function getUserReports(request: FastifyRequest, reply: FastifyReply) {
  try {
    const reports = await reportService.getReportsByUserId((request.user as { id?: string } | undefined)?.id ?? '');
    reply.send(reports);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar relatórios' });
  }
}

export async function getAllReports(request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) {
  try {
    const limit = parseInt(request.query.limit || '50', 10);
    const offset = parseInt(request.query.offset || '0', 10);

    const reports = await reportService.getAllReports(limit, offset);
    reply.send(reports);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar relatórios' });
  }
}

export async function updateReport(request: FastifyRequest<any>, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const data = UpdateReportSchema.parse(request.body);

    const report = await reportService.getReportById(id);
    if (!report) {
      reply.code(404).send({ error: 'Relatório não encontrado' });
      return;
    }

    if (report.user_id !== (request.user as any)?.id && (request.user as any)?.role !== 'admin') {
      reply.code(403).send({ error: 'Acesso negado' });
      return;
    }

    const updated = await reportService.updateReport(id, data);
    reply.send(updated);
  } catch (error: any) {
    if (error.issues) {
      reply.code(400).send({ error: error.issues });
    } else {
      reply.code(500).send({ error: 'Erro ao atualizar relatório' });
    }
  }
}

export async function deleteReport(request: FastifyRequest<any>, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const report = await reportService.getReportById(id);
    if (!report) {
      reply.code(404).send({ error: 'Relatório não encontrado' });
      return;
    }

    if (report.user_id !== (request.user as any)?.id && (request.user as any)?.role !== 'admin') {
      reply.code(403).send({ error: 'Acesso negado' });
      return;
    }

    await reportService.deleteReport(id);
    reply.send({ message: 'Relatório deletado com sucesso' });
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar relatório' });
  }
}
