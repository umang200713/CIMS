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
      const { rows } = await query(`
        SELECT i.*, c.name as chemical_name, c.cas_number, c.formula, c.hazard_class,
               c.storage_type, c.molecular_weight, c.safety_info, c.storage_requirements
        FROM inventory i
        JOIN chemicals c ON i.chemical_id = c.id
        WHERE i.status = 'active'
      `);
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const role = req.headers['x-user-role'];
      if (role !== 'admin' && role !== 'technician') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const { chemical_id, quantity, unit, location, container_size, batch_number, expiry_date } = req.body;
      const { rows } = await query(
        `INSERT INTO inventory (chemical_id, quantity, initial_quantity, unit, location, container_size, batch_number, expiry_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [chemical_id, quantity, quantity, unit, location, container_size, batch_number, expiry_date]
      );
      await query(
        `INSERT INTO transactions (inventory_id, type, quantity, "user") VALUES ($1, 'purchase', $2, 'System Admin')`,
        [rows[0].id, quantity]
      );
      return res.json({ id: rows[0].id });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
