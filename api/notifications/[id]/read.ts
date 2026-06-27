import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb } from '../../../lib/init-db.js';
import { query } from '../../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDb();
    const { id } = req.query;
    await query('UPDATE notifications SET is_read = 1 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
