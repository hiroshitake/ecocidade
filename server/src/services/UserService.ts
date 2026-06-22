import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { CreateUser, User } from '../models/User.js';
import { randomUUID } from 'crypto';

export class UserService {
  async createUser(userData: CreateUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const now = new Date();

    const query = `
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, password_hash, name, role, created_at, updated_at
    `;

    try {
      const result = await pool.query(query, [
        id,
        userData.email,
        hashedPassword,
        userData.name,
        'user',
        now,
        now,
      ]);
      return result.rows[0];
    } catch (err: any) {
      if (err.code === '23505') {
        throw new Error('Email já cadastrado');
      }
      throw err;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export const userService = new UserService();
