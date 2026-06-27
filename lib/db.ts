import { neon } from '@neondatabase/serverless';

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Go to Vercel Dashboard → Storage → Create a Neon Postgres database, then redeploy.');
  }
  return url;
};

export async function query(text: string, values?: any[]) {
  const sql = neon(getDatabaseUrl());
  const rows = values && values.length > 0
    ? await sql(text, values)
    : await sql(text);
  return { rows };
}
