import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined in environment variables');
}

export default {
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql', // Use 'dialect' instead of 'driver' for drizzle-kit >=0.20
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Enable SSL for cloud databases (Neon, Supabase, etc.)
  ssl: process.env.NODE_ENV === 'production',
};
