import { pool } from '../config/database.js';
import { CreateDangerZone, DangerZone } from '../models/DangerZone.js';
import { randomUUID } from 'crypto';

export class DangerZoneService {
  async createDangerZone(data: CreateDangerZone): Promise<DangerZone> {
    const id = randomUUID();
    const now = new Date();

    const query = `
      INSERT INTO danger_zones (id, name, description, latitude, longitude, radius, severity, active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, description, latitude, longitude, radius, severity, active, created_at, updated_at
    `;

    const result = await pool.query(query, [
      id,
      data.name,
      data.description,
      data.latitude,
      data.longitude,
      data.radius,
      data.severity,
      data.active,
      now,
      now,
    ]);

    return result.rows[0];
  }

  async getDangerZoneById(id: string): Promise<DangerZone | null> {
    const result = await pool.query(
      'SELECT * FROM danger_zones WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getAllDangerZones(): Promise<DangerZone[]> {
    const result = await pool.query(
      'SELECT * FROM danger_zones ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getActiveDangerZones(): Promise<DangerZone[]> {
    const result = await pool.query(
      'SELECT * FROM danger_zones WHERE active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async updateDangerZone(id: string, data: Partial<CreateDangerZone>): Promise<DangerZone | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });

    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    values.push(id);

    const query = `UPDATE danger_zones SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`;
    const result = await pool.query(query, values);

    return result.rows[0] || null;
  }

  async deleteDangerZone(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM danger_zones WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }
}

export const dangerZoneService = new DangerZoneService();
