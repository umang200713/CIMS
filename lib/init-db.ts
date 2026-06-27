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
  if (parseInt(chemRows[0].count) < 100) {
    const { rows: suppliers } = await query('SELECT id FROM suppliers ORDER BY id');
    const s1 = suppliers[0].id;
    const s2 = suppliers[1].id;

    const chemicals = [
      ["Ethanol", "64-17-5", "C2H5OH", "Flammable", "Flammable Cabinet", 46.07, "Highly flammable liquid and vapor. Causes serious eye irritation.", "Keep container tightly closed. Store in a well-ventilated place.", s1],
      ["Hydrochloric Acid", "7647-01-0", "HCl", "Corrosive", "Acid Cabinet", 36.46, "May be corrosive to metals. Causes severe skin burns and eye damage.", "Store in corrosive resistant container with a resistant inner liner.", s2],
      ["Sodium Hydroxide", "1310-73-2", "NaOH", "Corrosive", "Base Cabinet", 40.00, "May be corrosive to metals. Causes severe skin burns and eye damage.", "Store only in original container. Keep container tightly closed.", s1],
      ["Acetone", "67-64-1", "CH3COCH3", "Flammable", "Flammable Cabinet", 58.08, "Highly flammable liquid and vapor. Causes serious eye irritation.", "Keep away from heat, sparks, open flames, hot surfaces.", s1],
      ["Acetic Acid", "64-19-7", "CH3COOH", "Corrosive", "Acid Cabinet", 60.05, "Flammable liquid and vapor. Causes severe skin burns and eye damage.", "Keep away from heat, sparks, open flames. Store in a well-ventilated place.", s2],
      ["Nitric Acid", "7697-37-2", "HNO3", "Oxidizer/Corrosive", "Acid Cabinet", 63.01, "May intensify fire; oxidizer. May be corrosive to metals. Causes severe skin burns.", "Keep away from clothing and other combustible materials.", s1],
      ["Sulfuric Acid", "7664-93-9", "H2SO4", "Corrosive", "Acid Cabinet", 98.08, "May be corrosive to metals. Causes severe skin burns and eye damage.", "Store in corrosive resistant container with a resistant inner liner.", s2],
      ["Methanol", "67-56-1", "CH3OH", "Flammable/Toxic", "Flammable Cabinet", 32.04, "Highly flammable liquid and vapor. Toxic if swallowed.", "Store in a well-ventilated place. Keep cool. Store locked up.", s1],
      ["Isopropanol", "67-63-0", "C3H8O", "Flammable", "Flammable Cabinet", 60.10, "Highly flammable liquid and vapor. Causes serious eye irritation.", "Keep container tightly closed. Store in a well-ventilated place.", s2],
      ["Hexane", "110-54-3", "C6H14", "Flammable", "Flammable Cabinet", 86.18, "Highly flammable liquid and vapor. May be fatal if swallowed.", "Store in a well-ventilated place. Keep cool.", s1],
      ["Toluene", "108-88-3", "C7H8", "Flammable", "Flammable Cabinet", 92.14, "Highly flammable liquid and vapor. Suspected of damaging fertility.", "Keep away from heat. Store in a well-ventilated place.", s2],
      ["Dichloromethane", "75-09-2", "CH2Cl2", "Toxic", "Toxic Cabinet", 84.93, "Harmful if swallowed. Causes skin irritation. Suspected of causing cancer.", "Store in a well-ventilated place. Keep container tightly closed.", s1],
      ["Chloroform", "67-66-3", "CHCl3", "Toxic", "Toxic Cabinet", 119.38, "Harmful if swallowed. Causes skin irritation. Suspected of causing cancer.", "Store in a well-ventilated place. Keep container tightly closed.", s2],
      ["Tetrahydrofuran", "109-99-9", "C4H8O", "Flammable", "Flammable Cabinet", 72.11, "Highly flammable liquid and vapor. Causes serious eye irritation.", "Keep away from heat. Store in a well-ventilated place.", s1],
      ["Ethyl Acetate", "141-78-6", "C4H8O2", "Flammable", "Flammable Cabinet", 88.11, "Highly flammable liquid and vapor. Causes serious eye irritation.", "Keep container tightly closed. Store in a well-ventilated place.", s2],
      ["Ammonia Solution", "1336-21-6", "NH4OH", "Corrosive", "Base Cabinet", 35.05, "Causes severe skin burns and eye damage. Very toxic to aquatic life.", "Store locked up. Store in a well-ventilated place.", s1],
      ["Phosphoric Acid", "7664-38-2", "H3PO4", "Corrosive", "Acid Cabinet", 98.00, "May be corrosive to metals. Causes severe skin burns and eye damage.", "Store in corrosive resistant container.", s2],
      ["Potassium Hydroxide", "1310-58-3", "KOH", "Corrosive", "Base Cabinet", 56.11, "Harmful if swallowed. Causes severe skin burns and eye damage.", "Store only in original container.", s1],
      ["Hydrogen Peroxide (30%)", "7722-84-1", "H2O2", "Oxidizer/Corrosive", "Oxidizer Cabinet", 34.01, "May intensify fire; oxidizer. Harmful if swallowed. Causes severe skin burns.", "Keep away from heat. Store in a cool place.", s2],
      ["Sodium Carbonate", "497-19-8", "Na2CO3", "Irritant", "General Shelf", 105.99, "Causes serious eye irritation.", "Keep container tightly closed.", s1],
      ["Sodium Bicarbonate", "144-55-8", "NaHCO3", "None", "General Shelf", 84.01, "Not a hazardous substance.", "Store in a cool, dry place.", s2],
      ["Calcium Chloride", "10043-52-4", "CaCl2", "Irritant", "General Shelf", 110.98, "Causes serious eye irritation.", "Keep container tightly closed.", s1],
      ["Magnesium Sulfate", "7487-88-9", "MgSO4", "None", "General Shelf", 120.37, "Not a hazardous substance.", "Store in a cool, dry place.", s2],
      ["Potassium Permanganate", "7722-64-7", "KMnO4", "Oxidizer", "Oxidizer Cabinet", 158.03, "May intensify fire; oxidizer. Harmful if swallowed.", "Keep away from heat. Store locked up.", s1],
      ["Silver Nitrate", "7761-88-8", "AgNO3", "Oxidizer/Corrosive", "Oxidizer Cabinet", 169.87, "May intensify fire; oxidizer. Causes severe skin burns.", "Keep away from heat. Store locked up.", s2],
      ["Iodine", "7553-56-2", "I2", "Toxic/Corrosive", "Toxic Cabinet", 253.81, "Harmful if swallowed. Causes skin irritation. Very toxic to aquatic life.", "Store in a well-ventilated place. Keep cool.", s1],
      ["Phenolphthalein", "77-09-8", "C20H14O4", "None", "General Shelf", 318.32, "Suspected of causing genetic defects. Suspected of causing cancer.", "Store locked up.", s2],
      ["Methyl Orange", "547-58-0", "C14H14N3NaO3S", "Toxic", "General Shelf", 327.33, "Toxic if swallowed.", "Store locked up.", s1],
      ["Bromothymol Blue", "76-59-5", "C27H28Br2O5S", "None", "General Shelf", 624.38, "Not a hazardous substance.", "Store in a cool, dry place.", s2],
      ["Citric Acid", "77-92-9", "C6H8O7", "Irritant", "General Shelf", 192.12, "Causes serious eye irritation.", "Keep container tightly closed.", s1],
      ["Oxalic Acid", "144-62-7", "C2H2O4", "Toxic/Corrosive", "Acid Cabinet", 90.03, "Harmful if swallowed. Causes severe skin burns and eye damage.", "Store locked up.", s2],
      ["Barium Chloride", "10361-37-2", "BaCl2", "Toxic", "Toxic Cabinet", 208.23, "Toxic if swallowed. Harmful if inhaled.", "Store locked up.", s1],
      ["Copper(II) Sulfate", "7758-98-7", "CuSO4", "Toxic", "General Shelf", 159.61, "Harmful if swallowed. Causes skin irritation. Very toxic to aquatic life.", "Store in a well-ventilated place.", s2],
      ["Iron(III) Chloride", "7705-08-0", "FeCl3", "Corrosive", "General Shelf", 162.20, "Harmful if swallowed. Causes skin irritation. Causes serious eye damage.", "Store in corrosive resistant container.", s1],
      ["Zinc Sulfate", "7733-02-0", "ZnSO4", "Toxic", "General Shelf", 161.47, "Harmful if swallowed. Causes serious eye damage. Very toxic to aquatic life.", "Store in a well-ventilated place.", s2],
      ["Manganese(II) Chloride", "7773-01-5", "MnCl2", "Toxic", "General Shelf", 125.84, "Harmful if swallowed. Causes serious eye damage.", "Keep container tightly closed.", s1],
      ["Cobalt(II) Chloride", "7646-79-9", "CoCl2", "Toxic/Carcinogen", "Toxic Cabinet", 129.84, "Harmful if swallowed. May cause allergy or asthma symptoms.", "Store locked up.", s2],
      ["Nickel(II) Sulfate", "7786-81-4", "NiSO4", "Toxic/Carcinogen", "Toxic Cabinet", 154.75, "Harmful if swallowed. Causes skin irritation. May cause cancer.", "Store locked up.", s1],
      ["Lead(II) Nitrate", "10099-74-8", "Pb(NO3)2", "Toxic", "Toxic Cabinet", 331.21, "Harmful if swallowed. May damage fertility or the unborn child.", "Store locked up.", s2],
      ["Mercury(II) Chloride", "7487-94-7", "HgCl2", "Toxic", "Toxic Cabinet", 271.50, "Fatal if swallowed. Causes severe skin burns and eye damage.", "Store locked up.", s1],
      ["Potassium Dichromate", "7778-50-9", "K2Cr2O7", "Oxidizer/Toxic", "Oxidizer Cabinet", 294.18, "May intensify fire; oxidizer. Fatal if inhaled. May cause cancer.", "Store locked up.", s2],
      ["Sodium Azide", "26628-22-8", "NaN3", "Toxic", "Toxic Cabinet", 65.01, "Fatal if swallowed. Fatal in contact with skin. Very toxic to aquatic life.", "Store locked up.", s1],
      ["Formaldehyde (37%)", "50-00-0", "CH2O", "Toxic/Carcinogen", "Toxic Cabinet", 30.03, "Toxic if swallowed. Causes severe skin burns. May cause cancer.", "Store locked up.", s2],
      ["Acetonitrile", "75-05-8", "CH3CN", "Flammable/Toxic", "Flammable Cabinet", 41.05, "Highly flammable liquid and vapor. Harmful if swallowed.", "Store in a well-ventilated place.", s1],
      ["Dimethyl Sulfoxide (DMSO)", "67-68-5", "C2H6OS", "None", "General Shelf", 78.13, "Not a hazardous substance.", "Store in a cool, dry place.", s2],
      ["N,N-Dimethylformamide (DMF)", "68-12-2", "C3H7NO", "Toxic", "Toxic Cabinet", 73.09, "Flammable liquid and vapor. Harmful in contact with skin.", "Store locked up.", s1],
      ["Pyridine", "110-86-1", "C5H5N", "Flammable/Toxic", "Flammable Cabinet", 79.10, "Highly flammable liquid and vapor. Harmful if swallowed.", "Store in a well-ventilated place.", s2],
      ["Triethylamine", "121-44-8", "C6H15N", "Flammable/Corrosive", "Flammable Cabinet", 101.19, "Highly flammable liquid and vapor. Harmful if swallowed.", "Store in a well-ventilated place.", s1],
      ["Piperidine", "110-89-4", "C5H11N", "Flammable/Toxic", "Flammable Cabinet", 85.15, "Highly flammable liquid and vapor. Toxic if swallowed.", "Store locked up.", s2],
      ["Hydrazine Hydrate", "10217-52-4", "H6N2O", "Toxic/Corrosive", "Toxic Cabinet", 50.06, "Toxic if swallowed. Causes severe skin burns. May cause cancer.", "Store locked up.", s1],
      ["Sodium Hydride (60% in oil)", "7646-69-7", "NaH", "Flammable/Reactive", "Flammable Cabinet", 24.00, "In contact with water releases flammable gases which may ignite spontaneously.", "Keep away from water. Store under inert gas.", s2],
      ["Lithium Aluminum Hydride", "16853-85-3", "LiAlH4", "Flammable/Reactive", "Flammable Cabinet", 37.95, "In contact with water releases flammable gases which may ignite spontaneously.", "Keep away from water. Store under inert gas.", s1],
      ["Borane Dimethyl Sulfide", "13292-87-0", "C2H9BS", "Flammable/Reactive", "Flammable Cabinet", 75.97, "Highly flammable liquid and vapor. In contact with water releases flammable gases.", "Keep away from water. Store under inert gas.", s2],
      ["Thionyl Chloride", "7719-09-7", "SOCl2", "Toxic/Corrosive", "Acid Cabinet", 118.97, "Reacts violently with water. Harmful if swallowed. Causes severe skin burns.", "Keep away from water. Store locked up.", s1],
      ["Oxalyl Chloride", "79-37-8", "C2Cl2O2", "Toxic/Corrosive", "Acid Cabinet", 126.93, "Reacts violently with water. Fatal if inhaled. Causes severe skin burns.", "Keep away from water. Store locked up.", s2],
      ["Benzoyl Chloride", "98-88-4", "C7H5ClO", "Toxic/Corrosive", "Acid Cabinet", 140.57, "Harmful if swallowed. Causes severe skin burns and eye damage.", "Store locked up.", s1],
      ["Potassium Carbonate", "584-08-7", "K2CO3", "Irritant", "General Shelf", 138.21, "Causes skin irritation. Causes serious eye irritation.", "Store in a dry place.", s1],
      ["Ammonium Chloride", "12125-02-9", "NH4Cl", "Irritant", "General Shelf", 53.49, "Harmful if swallowed. Causes serious eye irritation.", "Keep container tightly closed.", s2],
      ["Calcium Carbonate", "471-34-1", "CaCO3", "None", "General Shelf", 100.09, "Not a hazardous substance.", "Store in a cool, dry place.", s1],
      ["Sodium Sulfate", "7757-82-6", "Na2SO4", "None", "General Shelf", 142.04, "Not a hazardous substance.", "Store in a cool, dry place.", s2],
      ["Potassium Nitrate", "7757-79-1", "KNO3", "Oxidizer", "Oxidizer Cabinet", 101.10, "May intensify fire; oxidizer.", "Keep away from heat.", s1],
      ["Ammonium Nitrate", "6484-52-2", "NH4NO3", "Oxidizer", "Oxidizer Cabinet", 80.04, "May intensify fire; oxidizer. Causes serious eye irritation.", "Keep away from heat.", s2],
      ["Sodium Nitrate", "7631-99-4", "NaNO3", "Oxidizer", "Oxidizer Cabinet", 84.99, "May intensify fire; oxidizer. Harmful if swallowed.", "Keep away from heat.", s1],
      ["Magnesium Chloride", "7786-30-3", "MgCl2", "None", "General Shelf", 95.21, "Not a hazardous substance.", "Store in a cool, dry place.", s2],
      ["Aluminum Chloride", "7446-70-0", "AlCl3", "Corrosive", "Acid Cabinet", 133.34, "Causes severe skin burns and eye damage.", "Store in a dry place.", s1],
      ["Ferrous Sulfate", "7720-78-7", "FeSO4", "Toxic", "General Shelf", 151.91, "Harmful if swallowed. Causes skin irritation.", "Keep container tightly closed.", s2],
      ["Zinc Chloride", "7646-85-7", "ZnCl2", "Corrosive/Toxic", "Acid Cabinet", 136.30, "Harmful if swallowed. Causes severe skin burns. Very toxic to aquatic life.", "Store locked up.", s1],
      ["Potassium Iodide", "7681-11-0", "KI", "None", "General Shelf", 166.00, "Not a hazardous substance.", "Store in a cool, dry place.", s2],
      ["Sodium Iodide", "7681-82-5", "NaI", "None", "General Shelf", 149.89, "Not a hazardous substance.", "Store in a cool, dry place.", s1],
      ["Lithium Chloride", "7447-41-8", "LiCl", "Toxic", "General Shelf", 42.39, "Harmful if swallowed. Causes skin irritation.", "Keep container tightly closed.", s2],
      ["Cesium Chloride", "7647-17-8", "CsCl", "None", "General Shelf", 168.36, "Not a hazardous substance.", "Store in a cool, dry place.", s1],
      ["Rubidium Chloride", "7791-11-9", "RbCl", "None", "General Shelf", 120.92, "Not a hazardous substance.", "Store in a cool, dry place.", s2],
      ["Strontium Chloride", "10476-85-4", "SrCl2", "None", "General Shelf", 158.53, "Not a hazardous substance.", "Store in a cool, dry place.", s1],
      ["Beryllium Sulfate", "13510-49-1", "BeSO4", "Toxic/Carcinogen", "Toxic Cabinet", 105.08, "Fatal if swallowed. May cause cancer.", "Store locked up.", s2],
      ["Cadmium Chloride", "10108-64-2", "CdCl2", "Toxic/Carcinogen", "Toxic Cabinet", 183.32, "Toxic if swallowed. May cause cancer.", "Store locked up.", s1],
      ["Antimony Trichloride", "10025-91-9", "SbCl3", "Corrosive/Toxic", "Acid Cabinet", 228.11, "Causes severe skin burns. Toxic to aquatic life.", "Store locked up.", s2],
      ["Bismuth Nitrate", "10361-44-1", "Bi(NO3)3", "Oxidizer/Corrosive", "Oxidizer Cabinet", 394.99, "May intensify fire; oxidizer. Causes skin irritation.", "Keep away from heat.", s1],
      ["Tin(II) Chloride", "7772-99-8", "SnCl2", "Corrosive/Toxic", "Acid Cabinet", 189.60, "Harmful if swallowed. Causes severe skin burns.", "Store locked up.", s2],
      ["Titanium Tetrachloride", "7550-45-0", "TiCl4", "Corrosive/Toxic", "Acid Cabinet", 189.68, "Causes severe skin burns. Fatal if inhaled.", "Store locked up.", s1],
      ["Vanadium(V) Oxide", "1314-62-1", "V2O5", "Toxic", "Toxic Cabinet", 181.88, "Fatal if swallowed. Suspected of causing genetic defects.", "Store locked up.", s2],
      ["Chromium(III) Oxide", "1308-38-9", "Cr2O3", "None", "General Shelf", 151.99, "Not a hazardous substance.", "Store in a cool, dry place.", s1],
      ["Molybdenum Trioxide", "1313-27-5", "MoO3", "Toxic/Carcinogen", "Toxic Cabinet", 143.94, "Causes serious eye irritation. Suspected of causing cancer.", "Store locked up.", s2],
      ["Tungsten Hexachloride", "13283-01-7", "WCl6", "Corrosive", "Acid Cabinet", 396.57, "Causes severe skin burns and eye damage.", "Store in a dry place.", s1],
      ["Uranyl Nitrate", "10102-06-4", "UO2(NO3)2", "Radioactive/Toxic", "Radioactive Cabinet", 394.04, "Radioactive. Toxic if swallowed.", "Store in lead-shielded container.", s2],
      ["Thorium Nitrate", "13823-29-5", "Th(NO3)4", "Radioactive/Toxic", "Radioactive Cabinet", 480.06, "Radioactive. Toxic if swallowed.", "Store in lead-shielded container.", s1],
      ["Palladium(II) Chloride", "7647-10-1", "PdCl2", "Toxic", "General Shelf", 177.33, "May be corrosive to metals. Harmful if swallowed.", "Keep container tightly closed.", s2],
      ["Platinum(IV) Chloride", "13454-96-1", "PtCl4", "Toxic/Corrosive", "Toxic Cabinet", 336.89, "Toxic if swallowed. Causes severe skin burns.", "Store locked up.", s1],
      ["Gold(III) Chloride", "13453-07-1", "AuCl3", "Corrosive", "General Shelf", 303.33, "Causes severe skin burns and eye damage.", "Keep container tightly closed.", s2],
      ["Silver Chloride", "7783-90-6", "AgCl", "None", "General Shelf", 143.32, "Not a hazardous substance.", "Store in a cool, dry place.", s1],
      ["Copper(I) Chloride", "7758-89-6", "CuCl", "Toxic", "General Shelf", 98.99, "Harmful if swallowed. Very toxic to aquatic life.", "Keep container tightly closed.", s2],
      ["Mercury(I) Nitrate", "10415-75-5", "Hg2(NO3)2", "Toxic", "Toxic Cabinet", 525.19, "Fatal if swallowed. May cause damage to organs.", "Store locked up.", s1],
      ["Lead(II) Acetate", "301-04-2", "Pb(C2H3O2)2", "Toxic/Carcinogen", "Toxic Cabinet", 325.29, "May damage fertility. May cause cancer.", "Store locked up.", s2],
      ["Thallium(I) Sulfate", "7446-18-6", "Tl2SO4", "Toxic", "Toxic Cabinet", 504.83, "Fatal if swallowed. Toxic to aquatic life.", "Store locked up.", s1],
      ["Indium(III) Chloride", "10025-82-8", "InCl3", "Corrosive", "General Shelf", 221.18, "Causes severe skin burns and eye damage.", "Keep container tightly closed.", s2],
      ["Gallium(III) Chloride", "13450-90-3", "GaCl3", "Corrosive", "General Shelf", 176.08, "Causes severe skin burns and eye damage.", "Keep container tightly closed.", s1],
      ["Germanium Tetrachloride", "10038-98-9", "GeCl4", "Corrosive", "Acid Cabinet", 214.40, "Causes severe skin burns and eye damage.", "Store in a dry place.", s2],
      ["Arsenic Trioxide", "1327-53-3", "As2O3", "Toxic/Carcinogen", "Toxic Cabinet", 197.84, "Fatal if swallowed. May cause cancer.", "Store locked up.", s1],
      ["Selenium Dioxide", "7446-08-4", "SeO2", "Toxic", "Toxic Cabinet", 110.96, "Toxic if swallowed. Toxic if inhaled.", "Store locked up.", s2],
      ["Tellurium Dioxide", "7446-07-3", "TeO2", "Toxic", "Toxic Cabinet", 159.60, "Harmful if swallowed. Suspected of damaging fertility.", "Store locked up.", s1],
      ["Water", "7732-18-5", "H2O", "None", "General Shelf", 18.02, "Not a hazardous substance.", "Store in a cool, dry place.", s1]
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

  // Backfill disposal transactions if none exist
  const { rows: transCount } = await query("SELECT COUNT(*)::INTEGER as count FROM transactions WHERE type = 'disposal'");
  if (transCount.length > 0 && transCount[0].count === 0) {
    const { rows: invItems } = await query('SELECT id, quantity FROM inventory LIMIT 15');
    const users = ['admin', 'tech'];
    const reasons = ["Expired", "Contaminated", "Spilled", "Project Terminated", "Regulatory Requirement", "Quality Control Failure"];
    for (const item of invItems) {
      const dispQty = Math.floor(Math.random() * 5) + 1;
      const user = users[Math.floor(Math.random() * users.length)];
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      await query(
        `INSERT INTO transactions (inventory_id, type, quantity, "user", date, notes) VALUES ($1, 'disposal', $2, $3, $4, $5)`,
        [item.id, dispQty, user, date.toISOString(), reason]
      );
      await query(`UPDATE inventory SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`, [dispQty, item.id]);
    }
  }

  initialized = true;
}
