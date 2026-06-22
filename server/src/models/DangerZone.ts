import { z } from 'zod';

export const DangerZoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  active: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type DangerZone = z.infer<typeof DangerZoneSchema>;

export const CreateDangerZoneSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(100),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  active: z.boolean().default(true),
});

export type CreateDangerZone = z.infer<typeof CreateDangerZoneSchema>;
