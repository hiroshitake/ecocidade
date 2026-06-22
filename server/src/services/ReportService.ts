import { pool } from '../config/database.js';
import { CreateReport, UpdateReport, Report } from '../models/Report.js';
import { randomUUID } from 'crypto';

export class ReportService {
  async createReport(userId: string, data: CreateReport, imageUrl?: string): Promise<Report> {
    const id = randomUUID();
    const now = new Date();

    const query = `
      INSERT INTO reports (id, user_id, title, description, latitude, longitude, category, severity, image_url, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, user_id, title, description, latitude, longitude, category, severity, image_url, status, created_at, updated_at
    `;

    const result = await pool.query(query, [
      id,
      userId,
      data.title,
      data.description,
      data.latitude,
      data.longitude,
      data.category,
      data.severity,
      imageUrl || null,
      'pending',
      now,
      now,
    ]);

    return result.rows[0];
  }

  async getReportById(id: string): Promise<Report | null> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getReportsByUserId(userId: string): Promise<Report[]> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getAllReports(limit = 50, offset = 0): Promise<Report[]> {
    const result = await pool.query(
      'SELECT * FROM reports ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  async updateReport(id: string, data: UpdateReport): Promise<Report | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title) {
      updates.push(`title = $${paramCount}`);
      values.push(data.title);
      paramCount++;
    }
    if (data.description) {
      updates.push(`description = $${paramCount}`);
      values.push(data.description);
      paramCount++;
    }
    if (data.status) {
      updates.push(`status = $${paramCount}`);
      values.push(data.status);
      paramCount++;
    }
    if (data.severity) {
      updates.push(`severity = $${paramCount}`);
      values.push(data.severity);
      paramCount++;
    }

    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    values.push(id);

    const query = `UPDATE reports SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`;
    const result = await pool.query(query, values);

    return result.rows[0] || null;
  }

  async deleteReport(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }
}

export const reportService = new ReportService();
