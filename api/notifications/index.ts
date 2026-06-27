import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb } from '../../lib/init-db.js';
import { query } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDb();
    const { rows } = await query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
