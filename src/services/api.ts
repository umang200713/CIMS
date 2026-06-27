import { Chemical, InventoryItem, Stats, User, AppNotification, Supplier, Transaction } from "../types";

const getHeaders = () => {
  const user = localStorage.getItem("chemtrace_user");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (user) {
    const parsedUser = JSON.parse(user) as User;
    headers["x-user-role"] = parsedUser.role;
  }
  return headers;
};

export const api = {
  async login(username: string, password: string): Promise<User> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid username or password");
      if (res.status === 404) throw new Error("API not found. Make sure the backend server is running.");
      throw new Error(`Server error: ${res.status}`);
    }
    const user = await res.json();
    localStorage.setItem("chemtrace_user", JSON.stringify(user));
    return user;
  },

  async logout() {
    localStorage.removeItem("chemtrace_user");
  },

  async getChemicals(): Promise<Chemical[]> {
    const res = await fetch("/api/chemicals", { headers: getHeaders() });
    return res.json();
  },

  async getInventory(): Promise<InventoryItem[]> {
    const res = await fetch("/api/inventory", { headers: getHeaders() });
    return res.json();
  },

  async getStats(): Promise<Stats> {
    const res = await fetch("/api/stats", { headers: getHeaders() });
    return res.json();
  },

  async addInventory(item: Partial<InventoryItem>): Promise<{ id: number }> {
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    return res.json();
  },

  async openContainer(id: number): Promise<any> {
    const res = await fetch(`/api/inventory/${id}/open`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    return res.json();
  },

  async recordUsage(id: number, quantity: number, user: string, date?: string): Promise<any> {
    const res = await fetch(`/api/inventory/${id}/usage`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ quantity, user, date }),
    });
    return res.json();
  },

  async recordDisposal(id: number, quantity: number, user: string, date?: string, notes?: string): Promise<any> {
    const res = await fetch(`/api/inventory/${id}/dispose`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ quantity, user, date, notes }),
    });
    return res.json();
  },

  async getTransactions(): Promise<Transaction[]> {
    const res = await fetch("/api/transactions", { headers: getHeaders() });
    return res.json();
  },

  async getNotifications(): Promise<AppNotification[]> {
    const res = await fetch("/api/notifications", { headers: getHeaders() });
    return res.json();
  },

  async markNotificationRead(id: number): Promise<any> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    return res.json();
  },
  
  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetch("/api/suppliers", { headers: getHeaders() });
    return res.json();
  },

  async addSupplier(supplier: Partial<Supplier>): Promise<{ id: number }> {
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(supplier),
    });
    return res.json();
  },

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<any> {
    const res = await fetch(`/api/suppliers/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(supplier),
    });
    return res.json();
  },
};
