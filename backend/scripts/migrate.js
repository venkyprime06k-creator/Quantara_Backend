import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

async function runMigrations() {
  const poolConfig = {
    connectionString: process.env.DATABASE_URL,
  };
  if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(poolConfig);
  const db = drizzle(pool);

  console.log('📦 Running database migrations...');

  try {
    await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
