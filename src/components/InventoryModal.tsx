import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Chemical } from "../types";
import { api } from "../services/api";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chemicals: Chemical[];
  onSuccess: () => void;
}

export default function InventoryModal({ isOpen, onClose, chemicals, onSuccess }: InventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    chemical_id: "",
    quantity: "",
    unit: "mL",
    location: "",
    container_size: "",
    batch_number: "",
    expiry_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Expiry date must be in the future
    const selectedDate = new Date(formData.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      setError("Expiry date must be in the future.");
      return;
    }

    setLoading(true);
    try {
      await api.addInventory({
        ...formData,
        chemical_id: parseInt(formData.chemical_id),
        quantity: parseFloat(formData.quantity),
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to add inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Add New Inventory</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Chemical</label>
                <select 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.chemical_id}
                  onChange={(e) => setFormData({ ...formData, chemical_id: e.target.value })}
                >
                  <option value="">Select a chemical...</option>
                  {chemicals.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.cas_number})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Quantity</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Unit</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="mL">mL</option>
                    <option value="L">L</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="mg">mg</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Storage Location</label>
                <input 
                  required
                  placeholder="e.g., Cabinet A-1, Shelf 2"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Container Size</label>
                  <input 
                    placeholder="e.g., 500mL Bottle"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.container_size}
                    onChange={(e) => setFormData({ ...formData, container_size: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Expiry Date</label>
                  <input 
                    required
                    type="date"
                    className={`w-full px-4 py-2 bg-slate-50 border ${error ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500 transition-all`}
                    value={formData.expiry_date}
                    onChange={(e) => {
                      setFormData({ ...formData, expiry_date: e.target.value });
                      if (error) setError(null);
                    }}
                  />
                  {error && <p className="text-[10px] text-red-500 font-medium ml-1 mt-1 animate-in fade-in slide-in-from-top-1">{error}</p>}
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add to Inventory"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
