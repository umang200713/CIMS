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
    const { quantity, user, date, notes } = req.body;

    const { rows } = await query('SELECT quantity FROM inventory WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const newQuantity = rows[0].quantity - quantity;
    if (newQuantity < 0) return res.status(400).json({ error: 'Insufficient stock' });

    await query('UPDATE inventory SET quantity = $1 WHERE id = $2', [newQuantity, id]);
    await query(
      `INSERT INTO transactions (inventory_id, type, quantity, "user", date, notes) VALUES ($1, 'disposal', $2, $3, $4, $5)`,
      [id, quantity, user || 'System Admin', date || new Date().toISOString(), notes]
    );

    res.json({ success: true, newQuantity });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
