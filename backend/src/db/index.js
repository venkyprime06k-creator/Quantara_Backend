import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL environment variable is required');
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // increased from 2000 for cloud latency
};

// Enable SSL for production (Neon.tech requires it)
if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema });

export async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function closeConnection() {
  await pool.end();
  console.log('Database connection closed');
}
