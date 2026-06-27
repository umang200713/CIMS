import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb } from '../../lib/init-db.js';
import { query } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDb();

    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM suppliers');
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const role = req.headers['x-user-role'];
      if (role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
      const { name, contact_info } = req.body;
      const { rows } = await query(
        'INSERT INTO suppliers (name, contact_info) VALUES ($1, $2) RETURNING id',
        [name, contact_info]
      );
      return res.json({ id: rows[0].id });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
