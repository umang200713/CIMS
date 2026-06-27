export type Role = "admin" | "technician";

export interface User {
  id: number;
  username: string;
  role: Role;
}

export interface Chemical {
  id: number;
  name: string;
  cas_number: string;
  formula: string;
  hazard_class: string;
  storage_type: string;
  molecular_weight: number;
  safety_info: string;
  storage_requirements: string;
  supplier_id: number;
  supplier_name?: string;
  sds_url?: string;
}

export interface InventoryItem {
  id: number;
  chemical_id: number;
  chemical_name: string;
  formula: string;
  cas_number: string;
  hazard_class: string;
  storage_type: string;
  molecular_weight: number;
  safety_info: string;
  storage_requirements: string;
  quantity: number;
  initial_quantity: number;
  unit: string;
  location: string;
  container_size: string;
  batch_number?: string;
  expiry_date: string;
  opened_at?: string;
  status: string;
}

export interface Transaction {
  id: number;
  inventory_id: number;
  chemical_name: string;
  type: "purchase" | "usage" | "disposal";
  quantity: number;
  unit: string;
  date: string;
  user: string;
  notes?: string;
}

export interface Stats {
  totalChemicals: { count: number };
  lowStock: { count: number };
  expired: { count: number };
  hazardDistribution: { name: string; value: number }[];
}

export interface Supplier {
  id: number;
  name: string;
  contact_info: string;
}

export interface AppNotification {
  id: number;
  type: string;
  message: string;
  item_id?: number;
  is_read: number;
  created_at: string;
}
