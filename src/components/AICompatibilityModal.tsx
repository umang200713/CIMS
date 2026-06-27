import React, { useState } from "react";
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { geminiService, CompatibilityResult } from "../services/geminiService";
import { Chemical } from "../types";

interface AICompatibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  chemicals: Chemical[];
}

export default function AICompatibilityModal({ isOpen, onClose, chemicals }: AICompatibilityModalProps) {
  const [chem1, setChem1] = useState("");
  const [chem2, setChem2] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  const handleCheck = async () => {
    if (!chem1 || !chem2) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await geminiService.checkCompatibility(chem1, chem2);
      setResult(res);
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">AI Compatibility Checker</h2>
              <p className="text-sm text-slate-500">Prevent dangerous lab reactions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Chemical A</label>
              <select 
                value={chem1}
                onChange={(e) => setChem1(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              >
                <option value="">Select...</option>
                {chemicals.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Chemical B</label>
              <select 
                value={chem2}
                onChange={(e) => setChem2(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              >
                <option value="">Select...</option>
                {chemicals.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            disabled={!chem1 || !chem2 || loading}
            onClick={handleCheck}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Assess Compatibility
          </button>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border ${result.is_compatible ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    {result.is_compatible ? (
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                    )}
                    <div className="font-bold text-lg text-slate-800">
                      {result.is_compatible ? 'Likely Compatible' : 'DANGER: Incompatible'}
                    </div>
                  </div>
                  <div className="flex-shrink-0 self-start sm:self-center">
                    {result.assessment_source === "ai" ? (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[9px] font-black uppercase rounded-lg tracking-wider">
                        Gemini AI Verified
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded-lg tracking-wider" title="AI Service is currently offline. Verified by local chemical reactivity database.">
                        Local Safety Engine
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">AI Safety Warning</p>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{result.warnings}</p>
                  </div>
                  {!result.is_compatible && (
                    <div className="p-3 bg-white/60 rounded-xl border border-red-100/50">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">Reaction Risk</p>
                      <p className="text-sm font-bold text-red-700">{result.reaction_risk}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
