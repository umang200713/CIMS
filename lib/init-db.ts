import { query } from './db.js';

let initialized = false;

export async function initDb() {
  if (initialized) return;

  // Create tables
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_info TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS chemicals (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      cas_number TEXT UNIQUE,
      formula TEXT,
      hazard_class TEXT,
      storage_type TEXT,
      molecular_weight DOUBLE PRECISION,
      safety_info TEXT,
      storage_requirements TEXT,
      supplier_id INTEGER REFERENCES suppliers(id),
      sds_url TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      chemical_id INTEGER NOT NULL REFERENCES chemicals(id),
      quantity DOUBLE PRECISION NOT NULL,
      initial_quantity DOUBLE PRECISION,
      unit TEXT NOT NULL,
      location TEXT NOT NULL,
      container_size TEXT,
      batch_number TEXT,
      expiry_date TEXT,
      opened_at TEXT,
      status TEXT DEFAULT 'active'
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      inventory_id INTEGER NOT NULL REFERENCES inventory(id),
      type TEXT NOT NULL,
      quantity DOUBLE PRECISION NOT NULL,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      "user" TEXT,
      notes TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      item_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed data if empty
  const { rows: userRows } = await query('SELECT COUNT(*) as count FROM users');
  if (parseInt(userRows[0].count) === 0) {
    await query(`INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin'), ('tech', 'tech123', 'technician')`);
  }

  const { rows: supplierRows } = await query('SELECT COUNT(*) as count FROM suppliers');
  if (parseInt(supplierRows[0].count) === 0) {
    await query(`INSERT INTO suppliers (name, contact_info) VALUES ('Sigma-Aldrich', 'support@sigma.com'), ('Fisher Scientific', 'info@fisher.com')`);
  }

  const { rows: chemRows } = await query('SELECT COUNT(*) as count FROM chemicals');
  if (parseInt(chemRows[0].count) === 0) {
    const { rows: suppliers } = await query('SELECT id FROM suppliers ORDER BY id');
    const s1 = suppliers[0].id;
    const s2 = suppliers[1].id;

    const chemicals = [
      ["Ethanol","64-17-5","C2H5OH","Flammable","Flammable Cabinet",46.07,"Highly flammable liquid and vapor. Causes serious eye irritation.","Keep container tightly closed. Store in a well-ventilated place.",s1],
      ["Hydrochloric Acid","7647-01-0","HCl","Corrosive","Acid Cabinet",36.46,"May be corrosive to metals. Causes severe skin burns and eye damage.","Store in corrosive resistant container with a resistant inner liner.",s2],
      ["Sodium Hydroxide","1310-73-2","NaOH","Corrosive","Base Cabinet",40.00,"May be corrosive to metals. Causes severe skin burns and eye damage.","Store only in original container. Keep container tightly closed.",s1],
      ["Acetone","67-64-1","CH3COCH3","Flammable","Flammable Cabinet",58.08,"Highly flammable liquid and vapor. Causes serious eye irritation.","Keep away from heat, sparks, open flames, hot surfaces.",s1],
      ["Acetic Acid","64-19-7","CH3COOH","Corrosive","Acid Cabinet",60.05,"Flammable liquid and vapor. Causes severe skin burns and eye damage.","Keep away from heat, sparks, open flames. Store in a well-ventilated place.",s2],
      ["Nitric Acid","7697-37-2","HNO3","Oxidizer/Corrosive","Acid Cabinet",63.01,"May intensify fire; oxidizer. May be corrosive to metals. Causes severe skin burns.","Keep away from clothing and other combustible materials.",s1],
      ["Sulfuric Acid","7664-93-9","H2SO4","Corrosive","Acid Cabinet",98.08,"May be corrosive to metals. Causes severe skin burns and eye damage.","Store in corrosive resistant container with a resistant inner liner.",s2],
      ["Methanol","67-56-1","CH3OH","Flammable/Toxic","Flammable Cabinet",32.04,"Highly flammable liquid and vapor. Toxic if swallowed.","Store in a well-ventilated place. Keep cool. Store locked up.",s1],
      ["Isopropanol","67-63-0","C3H8O","Flammable","Flammable Cabinet",60.10,"Highly flammable liquid and vapor. Causes serious eye irritation.","Keep container tightly closed. Store in a well-ventilated place.",s2],
      ["Hexane","110-54-3","C6H14","Flammable","Flammable Cabinet",86.18,"Highly flammable liquid and vapor. May be fatal if swallowed.","Store in a well-ventilated place. Keep cool.",s1],
      ["Toluene","108-88-3","C7H8","Flammable","Flammable Cabinet",92.14,"Highly flammable liquid and vapor. Suspected of damaging fertility.","Keep away from heat. Store in a well-ventilated place.",s2],
      ["Dichloromethane","75-09-2","CH2Cl2","Toxic","Toxic Cabinet",84.93,"Harmful if swallowed. Causes skin irritation. Suspected of causing cancer.","Store in a well-ventilated place. Keep container tightly closed.",s1],
      ["Chloroform","67-66-3","CHCl3","Toxic","Toxic Cabinet",119.38,"Harmful if swallowed. Causes skin irritation. Suspected of causing cancer.","Store in a well-ventilated place. Keep container tightly closed.",s2],
      ["Tetrahydrofuran","109-99-9","C4H8O","Flammable","Flammable Cabinet",72.11,"Highly flammable liquid and vapor. Causes serious eye irritation.","Keep away from heat. Store in a well-ventilated place.",s1],
      ["Ethyl Acetate","141-78-6","C4H8O2","Flammable","Flammable Cabinet",88.11,"Highly flammable liquid and vapor. Causes serious eye irritation.","Keep container tightly closed. Store in a well-ventilated place.",s2],
      ["Ammonia Solution","1336-21-6","NH4OH","Corrosive","Base Cabinet",35.05,"Causes severe skin burns and eye damage. Very toxic to aquatic life.","Store locked up. Store in a well-ventilated place.",s1],
      ["Phosphoric Acid","7664-38-2","H3PO4","Corrosive","Acid Cabinet",98.00,"May be corrosive to metals. Causes severe skin burns and eye damage.","Store in corrosive resistant container.",s2],
      ["Potassium Hydroxide","1310-58-3","KOH","Corrosive","Base Cabinet",56.11,"Harmful if swallowed. Causes severe skin burns and eye damage.","Store only in original container.",s1],
      ["Hydrogen Peroxide (30%)","7722-84-1","H2O2","Oxidizer/Corrosive","Oxidizer Cabinet",34.01,"May intensify fire; oxidizer. Harmful if swallowed. Causes severe skin burns.","Keep away from heat. Store in a cool place.",s2],
      ["Sodium Carbonate","497-19-8","Na2CO3","Irritant","General Shelf",105.99,"Causes serious eye irritation.","Keep container tightly closed.",s1],
      ["Sodium Bicarbonate","144-55-8","NaHCO3","None","General Shelf",84.01,"Not a hazardous substance.","Store in a cool, dry place.",s2],
      ["Calcium Chloride","10043-52-4","CaCl2","Irritant","General Shelf",110.98,"Causes serious eye irritation.","Keep container tightly closed.",s1],
      ["Magnesium Sulfate","7487-88-9","MgSO4","None","General Shelf",120.37,"Not a hazardous substance.","Store in a cool, dry place.",s2],
      ["Potassium Permanganate","7722-64-7","KMnO4","Oxidizer","Oxidizer Cabinet",158.03,"May intensify fire; oxidizer. Harmful if swallowed.","Keep away from heat. Store locked up.",s1],
      ["Silver Nitrate","7761-88-8","AgNO3","Oxidizer/Corrosive","Oxidizer Cabinet",169.87,"May intensify fire; oxidizer. Causes severe skin burns.","Keep away from heat. Store locked up.",s2],
      ["Iodine","7553-56-2","I2","Toxic/Corrosive","Toxic Cabinet",253.81,"Harmful if swallowed. Causes skin irritation. Very toxic to aquatic life.","Store in a well-ventilated place. Keep cool.",s1],
      ["Phenolphthalein","77-09-8","C20H14O4","None","General Shelf",318.32,"Suspected of causing genetic defects. Suspected of causing cancer.","Store locked up.",s2],
      ["Methyl Orange","547-58-0","C14H14N3NaO3S","Toxic","General Shelf",327.33,"Toxic if swallowed.","Store locked up.",s1],
      ["Bromothymol Blue","76-59-5","C27H28Br2O5S","None","General Shelf",624.38,"Not a hazardous substance.","Store in a cool, dry place.",s2],
      ["Citric Acid","77-92-9","C6H8O7","Irritant","General Shelf",192.12,"Causes serious eye irritation.","Keep container tightly closed.",s1],
      ["Oxalic Acid","144-62-7","C2H2O4","Toxic/Corrosive","Acid Cabinet",90.03,"Harmful if swallowed. Causes severe skin burns and eye damage.","Store locked up.",s2],
      ["Barium Chloride","10361-37-2","BaCl2","Toxic","Toxic Cabinet",208.23,"Toxic if swallowed. Harmful if inhaled.","Store locked up.",s1],
      ["Copper(II) Sulfate","7758-98-7","CuSO4","Toxic","General Shelf",159.61,"Harmful if swallowed. Causes skin irritation. Very toxic to aquatic life.","Store in a well-ventilated place.",s2],
      ["Iron(III) Chloride","7705-08-0","FeCl3","Corrosive","General Shelf",162.20,"Harmful if swallowed. Causes skin irritation. Causes serious eye damage.","Store in corrosive resistant container.",s1],
      ["Zinc Sulfate","7733-02-0","ZnSO4","Toxic","General Shelf",161.47,"Harmful if swallowed. Causes serious eye damage. Very toxic to aquatic life.","Store in a well-ventilated place.",s2],
      ["Formaldehyde (37%)","50-00-0","CH2O","Toxic/Carcinogen","Toxic Cabinet",30.03,"Toxic if swallowed. Causes severe skin burns. May cause cancer.","Store locked up.",s2],
      ["Acetonitrile","75-05-8","CH3CN","Flammable/Toxic","Flammable Cabinet",41.05,"Highly flammable liquid and vapor. Harmful if swallowed.","Store in a well-ventilated place.",s1],
      ["Dimethyl Sulfoxide","67-68-5","C2H6OS","None","General Shelf",78.13,"Not a hazardous substance.","Store in a cool, dry place.",s2],
      ["Pyridine","110-86-1","C5H5N","Flammable/Toxic","Flammable Cabinet",79.10,"Highly flammable liquid and vapor. Harmful if swallowed.","Store in a well-ventilated place.",s2],
      ["Potassium Carbonate","584-08-7","K2CO3","Irritant","General Shelf",138.21,"Causes skin irritation. Causes serious eye irritation.","Store in a dry place.",s1],
      ["Ammonium Chloride","12125-02-9","NH4Cl","Irritant","General Shelf",53.49,"Harmful if swallowed. Causes serious eye irritation.","Keep container tightly closed.",s2],
      ["Calcium Carbonate","471-34-1","CaCO3","None","General Shelf",100.09,"Not a hazardous substance.","Store in a cool, dry place.",s1],
      ["Sodium Sulfate","7757-82-6","Na2SO4","None","General Shelf",142.04,"Not a hazardous substance.","Store in a cool, dry place.",s2],
      ["Potassium Nitrate","7757-79-1","KNO3","Oxidizer","Oxidizer Cabinet",101.10,"May intensify fire; oxidizer.","Keep away from heat.",s1],
      ["Potassium Iodide","7681-11-0","KI","None","General Shelf",166.00,"Not a hazardous substance.","Store in a cool, dry place.",s2],
      ["Sodium Iodide","7681-82-5","NaI","None","General Shelf",149.89,"Not a hazardous substance.","Store in a cool, dry place.",s1],
      ["Arsenic Trioxide","1327-53-3","As2O3","Toxic/Carcinogen","Toxic Cabinet",197.84,"Fatal if swallowed. May cause cancer.","Store locked up.",s1],
      ["Selenium Dioxide","7446-08-4","SeO2","Toxic","Toxic Cabinet",110.96,"Toxic if swallowed. Toxic if inhaled.","Store locked up.",s2],
    ];

    for (const chem of chemicals) {
      const { rows } = await query(
        `INSERT INTO chemicals (name, cas_number, formula, hazard_class, storage_type, molecular_weight, safety_info, storage_requirements, supplier_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (cas_number) DO NOTHING RETURNING id`,
        chem
      );

      if (rows.length > 0) {
        const chemId = rows[0].id;
        const qty = Math.floor(Math.random() * 1000) + 50;
        const unit = (chem[2] as string).includes('H') && (chem[2] as string).length < 10 ? 'mL' : 'g';

        const isExpired = Math.random() < 0.15;
        const expiry = new Date();
        if (isExpired) {
          expiry.setMonth(expiry.getMonth() - Math.floor(Math.random() * 6) - 1);
        } else {
          expiry.setFullYear(expiry.getFullYear() + Math.floor(Math.random() * 3) + 1);
        }
        const expiryStr = expiry.toISOString().split('T')[0];

        const isOpened = Math.random() < 0.1;
        const openedAt = isOpened
          ? new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 60)).toISOString()
          : null;

        const { rows: invRows } = await query(
          `INSERT INTO inventory (chemical_id, quantity, initial_quantity, unit, location, container_size, expiry_date, opened_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [chemId, qty, qty, unit, `Shelf ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(Math.random() * 10)}`, `${qty}${unit} Container`, expiryStr, openedAt]
        );

        if (invRows.length > 0) {
          await query(
            `INSERT INTO transactions (inventory_id, type, quantity, "user") VALUES ($1, 'purchase', $2, 'System Admin')`,
            [invRows[0].id, qty]
          );
        }
      }
    }

    // Expire a few items
    await query(`
      UPDATE inventory SET expiry_date = (CURRENT_DATE - INTERVAL '1 month')::TEXT
      WHERE id IN (SELECT id FROM inventory ORDER BY RANDOM() LIMIT 5)
    `);

    // Seed some usage transactions
    const { rows: invItems } = await query('SELECT id, quantity FROM inventory LIMIT 20');
    const users = ['admin', 'tech'];
    for (const item of invItems) {
      const useQty = Math.floor(Math.random() * 15) + 2;
      const user = users[Math.floor(Math.random() * users.length)];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      await query(
        `INSERT INTO transactions (inventory_id, type, quantity, "user", date) VALUES ($1, 'usage', $2, $3, $4)`,
        [item.id, useQty, user, date.toISOString()]
      );
      await query(`UPDATE inventory SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`, [useQty, item.id]);
    }
  }

  initialized = true;
}
