import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb } from '../lib/init-db.js';
import { query } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDb();

    // Auto-generate expiry notifications
    const { rows: expiringSoon } = await query(`
      SELECT i.id, c.name, i.expiry_date
      FROM inventory i
      JOIN chemicals c ON i.chemical_id = c.id
      WHERE i.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')::TEXT
        AND i.expiry_date >= CURRENT_DATE::TEXT
        AND i.expiry_date != ''
        AND i.expiry_date IS NOT NULL
        AND i.status = 'active'
    `);

    for (const item of expiringSoon) {
      const { rows: existing } = await query(
        `SELECT id FROM notifications WHERE item_id = $1 AND type = 'expiry'`,
        [item.id]
      );
      if (existing.length === 0) {
        await query(
          `INSERT INTO notifications (type, message, item_id) VALUES ('expiry', $1, $2)`,
          [`Chemical ${item.name} is expiring on ${item.expiry_date}`, item.id]
        );
      }
    }

    const { rows: total } = await query('SELECT COUNT(*)::INTEGER as count FROM chemicals');
    const { rows: lowStock } = await query("SELECT COUNT(*)::INTEGER as count FROM inventory WHERE quantity < 100 AND (expiry_date >= CURRENT_DATE::TEXT OR expiry_date IS NULL OR expiry_date = '')");
    const { rows: expired } = await query("SELECT COUNT(*)::INTEGER as count FROM inventory WHERE expiry_date < CURRENT_DATE::TEXT AND expiry_date != '' AND expiry_date IS NOT NULL");
    const { rows: hazardDistribution } = await query(`
      SELECT c.hazard_class as name, COUNT(*)::INTEGER as value
      FROM inventory i
      JOIN chemicals c ON i.chemical_id = c.id
      GROUP BY c.hazard_class
    `);

    res.json({
      totalChemicals: total[0],
      lowStock: lowStock[0],
      expired: expired[0],
      hazardDistribution,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
