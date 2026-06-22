import { pool } from '../config/database.js';
import { CreateSecurityAnalysis, SecurityAnalysis } from '../models/SecurityAnalysis.js';
import { randomUUID } from 'crypto';

export class SecurityAnalysisService {
  async createAnalysis(data: CreateSecurityAnalysis): Promise<SecurityAnalysis> {
    const id = randomUUID();
    const now = new Date();

    const query = `
      INSERT INTO security_analyses (id, zone_id, title, description, risk_level, latitude, longitude, radius, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, zone_id, title, description, risk_level, latitude, longitude, radius, created_at, updated_at
    `;

    const result = await pool.query(query, [
      id,
      data.zone_id || null,
      data.title,
      data.description,
      data.risk_level,
      data.latitude,
      data.longitude,
      data.radius,
      now,
      now,
    ]);

    return result.rows[0];
  }

  async getAnalysisById(id: string): Promise<SecurityAnalysis | null> {
    const result = await pool.query(
      'SELECT * FROM security_analyses WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getAllAnalyses(): Promise<SecurityAnalysis[]> {
    const result = await pool.query(
      'SELECT * FROM security_analyses ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getAnalysesByZoneId(zoneId: string): Promise<SecurityAnalysis[]> {
    const result = await pool.query(
      'SELECT * FROM security_analyses WHERE zone_id = $1 ORDER BY created_at DESC',
      [zoneId]
    );
    return result.rows;
  }

  async updateAnalysis(id: string, data: Partial<CreateSecurityAnalysis>): Promise<SecurityAnalysis | null> {
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

    const query = `UPDATE security_analyses SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`;
    const result = await pool.query(query, values);

    return result.rows[0] || null;
  }

  async deleteAnalysis(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM security_analyses WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }
}

export const securityAnalysisService = new SecurityAnalysisService();
