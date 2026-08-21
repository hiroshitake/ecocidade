import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function run() {
  try {
    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!databaseUrl) {
      console.error(
        "DATABASE_URL not set. Set DATABASE_URL to your Postgres connection string.",
      );
      process.exit(1);
    }

    const sqlPath = path.resolve(__dirname, "../../../supabase-schema.sql");
    if (!fs.existsSync(sqlPath)) {
      console.error("supabase-schema.sql not found at", sqlPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");

    const pool = new Pool({ connectionString: databaseUrl });
    console.log("🔄 Conectando ao banco...");
    await pool.query("SELECT 1");
    console.log("🔄 Executando SQL do arquivo supabase-schema.sql");

    // Execute all statements in the file at once. Postgres supports multi-statement queries.
    await pool.query(sql);

    console.log("✓ Migração aplicada com sucesso.");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("✗ Erro ao aplicar migração Supabase:", err);
    process.exit(1);
  }
}

run();
