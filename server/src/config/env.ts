import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:19000').split(','),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'ecocidade',
    password: process.env.DB_PASSWORD || 'change_me',
    name: process.env.DB_NAME || 'ecocidade',
    connectionString: process.env.DATABASE_URL,
  },
};
