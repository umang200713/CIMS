import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Chemical, Supplier } from "../types";
import { api } from "../services/api";

interface ChemicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chemical?: Chemical | null;
  suppliers: Supplier[];
}

export default function ChemicalModal({ isOpen, onClose, onSuccess, chemical, suppliers }: ChemicalModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cas_number: "",
    formula: "",
    hazard_class: "None",
    storage_type: "General Shelf",
    molecular_weight: "",
    safety_info: "",
    storage_requirements: "",
    supplier_id: "",
    physical_state: "",
    sds_url: "",
  });

  useEffect(() => {
    if (chemical) {
      setFormData({
        name: chemical.name,
        cas_number: chemical.cas_number,
        formula: chemical.formula || "",
        hazard_class: chemical.hazard_class || "None",
        storage_type: chemical.storage_type || "General Shelf",
        molecular_weight: chemical.molecular_weight ? String(chemical.molecular_weight) : "",
        safety_info: chemical.safety_info || "",
        storage_requirements: chemical.storage_requirements || "",
        supplier_id: chemical.supplier_id ? String(chemical.supplier_id) : "",
        physical_state: chemical.physical_state || "",
        sds_url: chemical.sds_url || "",
      });
    } else {
      setFormData({
        name: "",
        cas_number: "",
        formula: "",
        hazard_class: "None",
        storage_type: "General Shelf",
        molecular_weight: "",
        safety_info: "",
        storage_requirements: "",
        supplier_id: "",
        physical_state: "",
        sds_url: "",
      });
    }
    setError(null);
  }, [chemical]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.physical_state) {
      setError("Please select a physical state.");
      return;
    }
    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      molecular_weight: formData.molecular_weight ? parseFloat(formData.molecular_weight) : undefined,
      supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : undefined,
    };

    try {
      if (chemical) {
        await api.updateChemical(chemical.id, payload);
      } else {
        await api.addChemical(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to save chemical:", err);
      setError(err.message || "Failed to save chemical.");
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
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">
                {chemical ? "Edit Chemical" : "Add Master Chemical"}
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Chemical Name *</label>
                  <input 
                    required
                    placeholder="e.g., Ethanol"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">CAS Number *</label>
                  <input 
                    required
                    placeholder="e.g., 64-17-5"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.cas_number}
                    onChange={(e) => setFormData({ ...formData, cas_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Formula</label>
                  <input 
                    placeholder="e.g., C2H5OH"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.formula}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Mol. Weight (g/mol)</label>
                  <input 
                    type="number"
                    step="0.001"
                    placeholder="e.g., 46.07"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.molecular_weight}
                    onChange={(e) => setFormData({ ...formData, molecular_weight: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Physical State *</label>
                  <select 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.physical_state}
                    onChange={(e) => setFormData({ ...formData, physical_state: e.target.value })}
                  >
                    <option value="">Select physical state...</option>
                    <option value="Solid">Solid</option>
                    <option value="Liquid">Liquid</option>
                    <option value="Gas">Gas</option>
                    <option value="Powder">Powder</option>
                    <option value="Crystal">Crystal</option>
                    <option value="Gel">Gel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Hazard Class</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.hazard_class}
                    onChange={(e) => setFormData({ ...formData, hazard_class: e.target.value })}
                  >
                    <option value="None">None</option>
                    <option value="Flammable">Flammable</option>
                    <option value="Corrosive">Corrosive</option>
                    <option value="Toxic">Toxic</option>
                    <option value="Oxidizer">Oxidizer</option>
                    <option value="Oxidizer/Corrosive">Oxidizer/Corrosive</option>
                    <option value="Flammable/Toxic">Flammable/Toxic</option>
                    <option value="Flammable/Corrosive">Flammable/Corrosive</option>
                    <option value="Toxic/Corrosive">Toxic/Corrosive</option>
                    <option value="Toxic/Carcinogen">Toxic/Carcinogen</option>
                    <option value="Flammable/Reactive">Flammable/Reactive</option>
                    <option value="Radioactive/Toxic">Radioactive/Toxic</option>
                    <option value="Irritant">Irritant</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Storage Cabinet Type</label>
                  <input 
                    placeholder="e.g., Flammable Cabinet"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.storage_type}
                    onChange={(e) => setFormData({ ...formData, storage_type: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Supplier *</label>
                  <select 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">SDS URL</label>
                  <input 
                    type="url"
                    placeholder="e.g., https://example.com/sds.pdf"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={formData.sds_url}
                    onChange={(e) => setFormData({ ...formData, sds_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Storage Requirements</label>
                <textarea 
                  placeholder="e.g., Keep away from heat. Store in a well-ventilated place."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none"
                  value={formData.storage_requirements}
                  onChange={(e) => setFormData({ ...formData, storage_requirements: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Safety Information / Hazard Statements</label>
                <textarea 
                  placeholder="e.g., Highly flammable liquid and vapor. Causes serious eye irritation."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none"
                  value={formData.safety_info}
                  onChange={(e) => setFormData({ ...formData, safety_info: e.target.value })}
                />
              </div>

              <div className="pt-4 sticky bottom-0 bg-white pb-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (chemical ? "Update Chemical" : "Add Chemical")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
