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
      const { rows } = await query('SELECT * FROM chemicals WHERE id = $1', [id]);
      return res.json(rows[0] || null);
    }

    if (req.method === 'PATCH') {
      const role = req.headers['x-user-role'];
      if (role !== 'admin' && role !== 'technician') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const { name, cas_number, formula, hazard_class, storage_type, molecular_weight, safety_info, storage_requirements, supplier_id, physical_state } = req.body;
      await query(
        `UPDATE chemicals 
         SET name = $1, cas_number = $2, formula = $3, hazard_class = $4, storage_type = $5, 
             molecular_weight = $6, safety_info = $7, storage_requirements = $8, supplier_id = $9, physical_state = $10
         WHERE id = $11`,
        [name, cas_number, formula, hazard_class, storage_type, molecular_weight, safety_info, storage_requirements, supplier_id, physical_state, id]
      );
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
