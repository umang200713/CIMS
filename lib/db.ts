import pkg from 'pg';
const { Pool } = pkg;

let pool: InstanceType<typeof Pool> | null = null;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Add it in Vercel project settings.');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function query(text: string, values?: any[]) {
  return getPool().query(text, values);
}
