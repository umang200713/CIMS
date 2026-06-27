import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("inventory.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL -- 'admin', 'technician'
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_info TEXT
  );

  CREATE TABLE IF NOT EXISTS chemicals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cas_number TEXT UNIQUE,
    formula TEXT,
    hazard_class TEXT,
    storage_type TEXT,
    molecular_weight REAL,
    safety_info TEXT,
    storage_requirements TEXT,
    supplier_id INTEGER,
    sds_url TEXT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chemical_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    initial_quantity REAL,
    unit TEXT NOT NULL,
    location TEXT NOT NULL,
    container_size TEXT,
    batch_number TEXT,
    expiry_date TEXT,
    opened_at TEXT,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (chemical_id) REFERENCES chemicals(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- purchase, usage, disposal
    quantity REAL NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    user TEXT,
    notes TEXT,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    item_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Simple migration to add missing columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(chemicals)").all() as any[];
const columns = tableInfo.map(c => c.name);

if (!columns.includes("molecular_weight")) {
  db.exec("ALTER TABLE chemicals ADD COLUMN molecular_weight REAL");
}
if (!columns.includes("safety_info")) {
  db.exec("ALTER TABLE chemicals ADD COLUMN safety_info TEXT");
}
if (!columns.includes("storage_requirements")) {
  db.exec("ALTER TABLE chemicals ADD COLUMN storage_requirements TEXT");
}

const inventoryTableInfo = db.prepare("PRAGMA table_info(inventory)").all() as any[];
const inventoryColumns = inventoryTableInfo.map(c => c.name);
if (!inventoryColumns.includes("initial_quantity")) {
  db.exec("ALTER TABLE inventory ADD COLUMN initial_quantity REAL");
  db.exec("UPDATE inventory SET initial_quantity = quantity WHERE initial_quantity IS NULL");
}
if (!inventoryColumns.includes("opened_at")) {
  db.exec("ALTER TABLE inventory ADD COLUMN opened_at TEXT");
}

const transactionTableInfo = db.prepare("PRAGMA table_info(transactions)").all() as any[];
const transactionColumns = transactionTableInfo.map(c => c.name);
if (!transactionColumns.includes("notes")) {
  db.exec("ALTER TABLE transactions ADD COLUMN notes TEXT");
}

// Update existing chemicals with new data if they exist but have null values
const updateData = [
  ["Ethanol", 46.07, "Highly flammable liquid and vapor. Causes serious eye irritation.", "Keep container tightly closed. Store in a well-ventilated place."],
  ["Hydrochloric Acid", 36.46, "May be corrosive to metals. Causes severe skin burns and eye damage.", "Store in corrosive resistant container with a resistant inner liner."],
  ["Sodium Hydroxide", 40.00, "May be corrosive to metals. Causes severe skin burns and eye damage.", "Store only in original container. Keep container tightly closed."],
  ["Acetone", 58.08, "Highly flammable liquid and vapor. Causes serious eye irritation.", "Keep away from heat, sparks, open flames, hot surfaces."],
  ["Acetic Acid", 60.05, "Flammable liquid and vapor. Causes severe skin burns and eye damage.", "Keep away from heat, sparks, open flames. Store in a well-ventilated place."],
  ["Nitric Acid", 63.01, "May intensify fire; oxidizer. May be corrosive to metals. Causes severe skin burns.", "Keep away from clothing and other combustible materials."],
  ["Sulfuric Acid", 98.08, "May be corrosive to metals. Causes severe skin burns and eye damage.", "Store in corrosive resistant container with a resistant inner liner."]
];

const updateStmt = db.prepare("UPDATE chemicals SET molecular_weight = ?, safety_info = ?, storage_requirements = ? WHERE name = ? AND molecular_weight IS NULL");
for (const [name, mw, safety, storage] of updateData) {
  updateStmt.run(mw, safety, storage, name);
}

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
  insertUser.run("admin", "admin123", "admin");
  insertUser.run("tech", "tech123", "technician");
}

const chemicalCount = db.prepare("SELECT COUNT(*) as count FROM chemicals").get() as { count: number };
if (chemicalCount.count < 100) {
  const suppliers = db.prepare("SELECT id FROM suppliers").all() as { id: number }[];
  let s1, s2;
  if (suppliers.length < 2) {
    const insertSupplier = db.prepare("INSERT INTO suppliers (name, contact_info) VALUES (?, ?)");
    s1 = insertSupplier.run("Sigma-Aldrich", "support@sigma.com").lastInsertRowid;
    s2 = insertSupplier.run("Fisher Scientific", "info@fisher.com").lastInsertRowid;
  } else {
    s1 = suppliers[0].id;
    s2 = suppliers[1].id;
  }

  const insertChemical = db.prepare("INSERT OR IGNORE INTO chemicals (name, cas_number, formula, hazard_class, storage_type, molecular_weight, safety_info, storage_requirements, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertInventory = db.prepare("INSERT INTO inventory (chemical_id, quantity, initial_quantity, unit, location, container_size, expiry_date, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

  const chemicalsToSeed = [
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

  for (const chem of chemicalsToSeed) {
    const info = insertChemical.run(...chem);
    if (info.changes > 0) {
      const chemId = info.lastInsertRowid;
      
      // Add some random inventory for each
      const qty = Math.floor(Math.random() * 1000) + 50;
      const unit = chem[2].includes("H") && chem[2].length < 10 ? "mL" : "g";
      
      // 15% chance of being expired
      const isExpired = Math.random() < 0.15;
      const expiry = new Date();
      if (isExpired) {
        expiry.setMonth(expiry.getMonth() - Math.floor(Math.random() * 6) - 1);
      } else {
        expiry.setFullYear(expiry.getFullYear() + Math.floor(Math.random() * 3) + 1);
      }
      
      // 10% chance of being opened already
      const isOpened = Math.random() < 0.1;
      const openedAt = isOpened ? new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 60)).toISOString() : null;

      insertInventory.run(
        chemId, 
        qty, 
        qty,
        unit, 
        `Shelf ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(Math.random() * 10)}`, 
        `${qty}${unit} Container`, 
        expiry.toISOString().split('T')[0],
        openedAt
      );
    }
  }
}

// Ensure at least some items are expired for demonstration
const expiredCount = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE expiry_date < DATE('now')").get() as { count: number };
if (expiredCount.count < 5) {
  // Expire 8 random items
  db.exec(`
    UPDATE inventory 
    SET expiry_date = DATE('now', '-1 month') 
    WHERE id IN (SELECT id FROM inventory ORDER BY RANDOM() LIMIT 8)
  `);
}

// Add some items expiring in the next 30 days for the forecast report
const nearExpiryCount = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE expiry_date BETWEEN DATE('now') AND DATE('now', '+30 days')").get() as { count: number };
if (nearExpiryCount.count < 10) {
  db.exec(`
    UPDATE inventory 
    SET expiry_date = DATE('now', '+' || (ABS(RANDOM() % 30) + 1) || ' days') 
    WHERE id IN (SELECT id FROM inventory WHERE expiry_date > DATE('now', '+30 days') ORDER BY RANDOM() LIMIT 15)
  `);
}

// Seed some usage and disposal data for the dashboard
const transactionSeedCount = db.prepare("SELECT COUNT(*) as count FROM transactions").get() as { count: number };
if (transactionSeedCount.count < 50) {
  // Use more items for seeding (top 40 inventory items)
  const inventoryItems = db.prepare("SELECT id, quantity FROM inventory LIMIT 40").all() as { id: number, quantity: number }[];
  const insertUsage = db.prepare("INSERT INTO transactions (inventory_id, type, quantity, user, date, notes) VALUES (?, 'usage', ?, ?, ?, ?)");
  const insertDisposal = db.prepare("INSERT INTO transactions (inventory_id, type, quantity, user, date, notes) VALUES (?, 'disposal', ?, ?, ?, ?)");
  const updateQty = db.prepare("UPDATE inventory SET quantity = quantity - ? WHERE id = ?");
  
  const users = ["admin", "tech", "scientist1", "scientist2", "lab_asst_1", "research_dr_k"];
  const reasons = ["Expired", "Contaminated", "Spilled", "Project Terminated", "Regulatory Requirement", "Quality Control Failure"];
  
  inventoryItems.forEach((item, index) => {
    // Generate multiple transactions for each item to show trends
    const numTransactions = Math.floor(Math.random() * 8) + 3; // 3-10 transactions per item
    
    for (let i = 0; i < numTransactions; i++) {
        // Alternate between usage and disposal, but favor usage (80% usage)
        const isUsage = Math.random() < 0.8;
        
        if (isUsage) {
          // Usage transaction: spanning various days in the last 45 days
          const useQty = Math.floor(Math.random() * 15) + 2;
          const user = users[Math.floor(Math.random() * users.length)];
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 45));
          
          insertUsage.run(item.id, useQty, user, date.toISOString(), `Chemical consumption for experiment #${1000 + index + i}`);
          updateQty.run(useQty, item.id);
        } else {
          // Disposal transaction
          const dispQty = Math.floor(Math.random() * 8) + 1;
          const user = users[Math.floor(Math.random() * users.length)];
          const reason = reasons[Math.floor(Math.random() * reasons.length)];
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 30));
          
          insertDisposal.run(item.id, dispQty, user, date.toISOString(), reason);
          updateQty.run(dispQty, item.id);
        }
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/chemicals", (req, res) => {
    const role = req.headers["x-user-role"];
    // Both roles can view, but maybe only admin can manage (handled in UI and specific POST/DELETE routes)
    const chemicals = db.prepare(`
      SELECT c.*, s.name as supplier_name 
      FROM chemicals c 
      LEFT JOIN suppliers s ON c.supplier_id = s.id
    `).all();
    res.json(chemicals);
  });

  app.get("/api/inventory", (req, res) => {
    const inventory = db.prepare(`
      SELECT i.*, c.name as chemical_name, c.cas_number, c.formula, c.hazard_class, c.storage_type, c.molecular_weight, c.safety_info, c.storage_requirements
      FROM inventory i
      JOIN chemicals c ON i.chemical_id = c.id
      WHERE i.status = 'active'
    `).all();
    res.json(inventory);
  });

  app.post("/api/inventory", (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "admin" && role !== "technician") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const { chemical_id, quantity, unit, location, container_size, batch_number, expiry_date } = req.body;
    const info = db.prepare(`
      INSERT INTO inventory (chemical_id, quantity, initial_quantity, unit, location, container_size, batch_number, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(chemical_id, quantity, quantity, unit, location, container_size, batch_number, expiry_date);
    
    db.prepare(`
      INSERT INTO transactions (inventory_id, type, quantity, user)
      VALUES (?, 'purchase', ?, 'System Admin')
    `).run(info.lastInsertRowid, quantity);

    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/inventory/:id/open", (req, res) => {
    const { id } = req.params;
    const opened_at = new Date().toISOString();
    db.prepare("UPDATE inventory SET opened_at = ? WHERE id = ? AND opened_at IS NULL").run(opened_at, id);
    res.json({ success: true, opened_at });
  });

  app.patch("/api/inventory/:id/usage", (req, res) => {
    const { id } = req.params;
    const { quantity, user, date } = req.body;
    
    const current = db.prepare("SELECT quantity FROM inventory WHERE id = ?").get() as { quantity: number };
    if (!current) return res.status(404).json({ error: "Not found" });
    
    const newQuantity = current.quantity - quantity;
    if (newQuantity < 0) return res.status(400).json({ error: "Insufficient stock" });

    db.prepare("UPDATE inventory SET quantity = ? WHERE id = ?").run(newQuantity, id);
    
    if (date) {
      db.prepare("INSERT INTO transactions (inventory_id, type, quantity, user, date) VALUES (?, 'usage', ?, ?, ?)").run(id, quantity, user, date);
    } else {
      db.prepare("INSERT INTO transactions (inventory_id, type, quantity, user) VALUES (?, 'usage', ?, ?)").run(id, quantity, user);
    }

    res.json({ success: true, newQuantity });
  });

  app.patch("/api/inventory/:id/dispose", (req, res) => {
    const { id } = req.params;
    const { quantity, user, date, notes } = req.body;
    
    const current = db.prepare("SELECT quantity FROM inventory WHERE id = ?").get(id) as { quantity: number };
    if (!current) return res.status(404).json({ error: "Not found" });
    
    const newQuantity = current.quantity - quantity;
    if (newQuantity < 0) return res.status(400).json({ error: "Insufficient stock" });

    db.prepare("UPDATE inventory SET quantity = ? WHERE id = ?").run(newQuantity, id);
    
    const transactionDate = date || new Date().toISOString();
    const transactionUser = user || 'System Admin';

    db.prepare("INSERT INTO transactions (inventory_id, type, quantity, user, date, notes) VALUES (?, 'disposal', ?, ?, ?, ?)").run(id, quantity, transactionUser, transactionDate, notes);

    res.json({ success: true, newQuantity });
  });

  app.get("/api/stats", (req, res) => {
    // Check for new expiry notifications (expiring in 30 days)
    const expiringSoon = db.prepare(`
      SELECT i.id, c.name, i.expiry_date 
      FROM inventory i 
      JOIN chemicals c ON i.chemical_id = c.id 
      WHERE i.expiry_date <= date('now', '+30 days') 
      AND i.expiry_date >= date('now')
      AND i.status = 'active'
    `).all() as any[];

    for (const item of expiringSoon) {
      const exists = db.prepare("SELECT id FROM notifications WHERE item_id = ? AND type = 'expiry'").get(item.id);
      if (!exists) {
        db.prepare("INSERT INTO notifications (type, message, item_id) VALUES ('expiry', ?, ?)").run(
          `Chemical ${item.name} is expiring on ${item.expiry_date}`,
          item.id
        );
      }
    }

    const totalChemicals = db.prepare("SELECT COUNT(*) as count FROM chemicals").get();
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE quantity < 100").get();
    const expired = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE expiry_date < date('now')").get();
    const hazardDistribution = db.prepare(`
      SELECT c.hazard_class as name, COUNT(*) as value 
      FROM inventory i 
      JOIN chemicals c ON i.chemical_id = c.id 
      GROUP BY c.hazard_class
    `).all();

    res.json({
      totalChemicals,
      lowStock,
      expired,
      hazardDistribution
    });
  });

  app.get("/api/notifications", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20").all();
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/suppliers", (req, res) => {
    const suppliers = db.prepare("SELECT * FROM suppliers").all();
    res.json(suppliers);
  });

  app.post("/api/suppliers", (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    const { name, contact_info } = req.body;
    const info = db.prepare("INSERT INTO suppliers (name, contact_info) VALUES (?, ?)").run(name, contact_info);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/suppliers/:id", (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { name, contact_info } = req.body;
    db.prepare("UPDATE suppliers SET name = ?, contact_info = ? WHERE id = ?").run(name, contact_info, id);
    res.json({ success: true });
  });

  app.get("/api/suppliers/:id", (req, res) => {
    const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id);
    res.json(supplier);
  });

  app.get("/api/transactions", (req, res) => {
    const transactions = db.prepare(`
      SELECT t.*, c.name as chemical_name, i.unit
      FROM transactions t
      JOIN inventory i ON t.inventory_id = i.id
      JOIN chemicals c ON i.chemical_id = c.id
      ORDER BY t.date DESC
    `).all();
    res.json(transactions);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
