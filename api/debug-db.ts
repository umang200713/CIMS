import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';
import { initDb } from '../lib/init-db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();
    
    const { rows: chemicalCount } = await query('SELECT COUNT(*)::INTEGER as count FROM chemicals');
    const { rows: inventoryCount } = await query('SELECT COUNT(*)::INTEGER as count FROM inventory');
    const { rows: transactionCount } = await query('SELECT COUNT(*)::INTEGER as count FROM transactions');
    
    const { rows: chemicals } = await query('SELECT id, name, cas_number FROM chemicals ORDER BY id');
    
    res.json({
      summary: {
        chemicals_count: chemicalCount[0].count,
        inventory_count: inventoryCount[0].count,
        transactions_count: transactionCount[0].count
      },
      chemicals
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
