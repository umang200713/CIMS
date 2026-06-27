import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb } from '../../lib/init-db.js';
import { query } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDb();
    const { username, password } = req.body;
    const { rows } = await query(
      'SELECT id, username, role FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
