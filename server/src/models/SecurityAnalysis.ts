import { z } from 'zod';

export const SecurityAnalysisSchema = z.object({
  id: z.string().uuid(),
  zone_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type SecurityAnalysis = z.infer<typeof SecurityAnalysisSchema>;

export const CreateSecurityAnalysisSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(10),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(100),
  zone_id: z.string().uuid().optional(),
});

export type CreateSecurityAnalysis = z.infer<typeof CreateSecurityAnalysisSchema>;
