import React, { useState, useEffect } from "react";
import { X, ShieldCheck, AlertCircle, LifeBuoy, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { geminiService, HazardPrediction } from "../services/geminiService";
import { InventoryItem } from "../types";

interface AISafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
}

export default function AISafetyModal({ isOpen, onClose, item }: AISafetyModalProps) {
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<HazardPrediction | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      fetchPrediction();
    }
  }, [isOpen, item]);

  const fetchPrediction = async () => {
    setLoading(true);
    try {
      const res = await geminiService.predictHazards(
        item.chemical_name,
        item.formula,
        item.molecular_weight,
        item.hazard_class,
        item.safety_info,
        item.storage_requirements
      );
      setPrediction(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-gradient-to-br from-blue-50/50 to-emerald-50/50">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">AI Safety Insights</h2>
                {!loading && (prediction?.assessment_source === "ai" ? (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-black uppercase rounded-lg tracking-wider">
                    Gemini AI Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded-lg tracking-wider" title="AI Service is currently offline. Verified by local chemical safety database.">
                    Local Safety Engine
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-widest">{item.chemical_name}</span>
                <span className="text-slate-400 text-xs font-mono">{item.cas_number}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Gemini is analyzing chemical properties...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Potential Hazards</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prediction?.potential_risks.map((risk, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 font-medium">{risk}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Recommended Precautions</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {prediction?.safety_precautions.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0 text-xs font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm text-emerald-800 font-medium">{step}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <LifeBuoy className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Emergency Response</h3>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                  {prediction?.emergency_measures.map((measure, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800 leading-relaxed font-medium">{measure}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="pt-6 border-t border-slate-100 italic text-[10px] text-slate-400 text-center">
                Disclaimer: AI-generated safety advice. Always verify with official Safety Data Sheets (SDS) and follow institutional safety policies.
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
