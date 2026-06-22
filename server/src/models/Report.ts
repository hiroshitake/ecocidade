import { z } from 'zod';

export const ReportSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  category: z.enum(['pollution', 'waste', 'deforestation', 'water', 'energy', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  image_url: z.string().nullable(),
  status: z.enum(['pending', 'investigating', 'resolved', 'rejected']),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Report = z.infer<typeof ReportSchema>;

export const CreateReportSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.enum(['pollution', 'waste', 'deforestation', 'water', 'energy', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

export type CreateReport = z.infer<typeof CreateReportSchema>;

export const UpdateReportSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'investigating', 'resolved', 'rejected']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export type UpdateReport = z.infer<typeof UpdateReportSchema>;
