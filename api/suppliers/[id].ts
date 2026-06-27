import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb } from '../../lib/init-db.js';
import { query } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDb();
    const { id } = req.query;

    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
      return res.json(rows[0] || null);
    }

    if (req.method === 'PATCH') {
      const role = req.headers['x-user-role'];
      if (role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
      const { name, contact_info } = req.body;
      await query('UPDATE suppliers SET name = $1, contact_info = $2 WHERE id = $3', [name, contact_info, id]);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
