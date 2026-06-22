import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function checkConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful at', res.rows[0].now);
    return true;
  } catch (err) {
    console.error('✗ Database connection failed:', err);
    return false;
  }
}
