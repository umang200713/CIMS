import React, { useState, useEffect, useMemo } from "react";
import { 
  Palette,
  Sun,
  Moon,
  Atom,
  Paintbrush,
  Mic,
  Sparkles,
  LayoutDashboard, 
  Database, 
  AlertTriangle, 
  Plus, 
  Search, 
  Trash2, 
  ChevronRight, 
  ShieldAlert, 
  Info, 
  Package, 
  MapPin, 
  Calendar, 
  User, 
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Beaker,
  History,
  BarChart3,
  Clock,
  ClipboardList,
  FileBarChart,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { format, isPast, isBefore, addDays } from "date-fns";
import ReactMarkdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { api } from "./services/api";
import { geminiService } from "./services/geminiService";
import { Chemical, InventoryItem, Stats, User as UserType, AppNotification, Supplier, Transaction } from "./types";
import InventoryModal from "./components/InventoryModal";
import BarcodeScanner from "./components/BarcodeScanner";
import UsageModal from "./components/UsageModal";
import DisposalModal from "./components/DisposalModal";
import SupplierModal from "./components/SupplierModal";
import AICompatibilityModal from "./components/AICompatibilityModal";
import AISafetyModal from "./components/AISafetyModal";
import Reports from "./components/Reports";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const getChemicalCardStyle = (name: string, activeTheme: string) => {
  const n = name.toLowerCase();
  const isDark = activeTheme === "theme-lab-dark";

  // Blue chemicals
  if (
    n.includes("copper") || 
    n.includes("ammonia") || 
    n.includes("silver nitrate") ||
    n.includes("blue")
  ) {
    return {
      bg: isDark 
        ? "bg-gradient-to-br from-blue-950/45 via-slate-900/90 to-slate-900/90" 
        : "bg-gradient-to-br from-blue-50/50 via-white to-white",
      border: isDark ? "border-blue-900/50" : "border-blue-100",
      glow: isDark ? "shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "shadow-[0_4px_15px_rgba(59,130,246,0.05)]",
      accent: "#3b82f6",
      label: "Blue State"
    };
  }
  
  // Purple chemicals
  if (
    n.includes("permanganate") || 
    n.includes("cobalt") || 
    n.includes("purple") || 
    n.includes("phenolphthalein")
  ) {
    return {
      bg: isDark 
        ? "bg-gradient-to-br from-purple-950/45 via-slate-900/90 to-slate-900/90" 
        : "bg-gradient-to-br from-purple-50/50 via-white to-white",
      border: isDark ? "border-purple-900/50" : "border-purple-100",
      glow: isDark ? "shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "shadow-[0_4px_15px_rgba(168,85,247,0.05)]",
      accent: "#a855f7",
      label: "Purple State"
    };
  }

  // Yellow/Orange chemicals
  if (
    n.includes("sulfur") || 
    n.includes("dichromate") || 
    n.includes("orange") || 
    n.includes("yellow") ||
    n.includes("nitrate") || 
    n.includes("peroxide") || 
    n.includes("picric")
  ) {
    return {
      bg: isDark 
        ? "bg-gradient-to-br from-amber-950/45 via-slate-900/90 to-slate-900/90" 
        : "bg-gradient-to-br from-amber-50/40 via-white to-white",
      border: isDark ? "border-amber-900/50" : "border-amber-100",
      glow: isDark ? "shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "shadow-[0_4px_15px_rgba(245,158,11,0.05)]",
      accent: "#f59e0b",
      label: "Yellow/Orange State"
    };
  }

  // Green chemicals
  if (
    n.includes("nickel") || 
    n.includes("green") || 
    n.includes("ferrous") || 
    n.includes("chlorophyll")
  ) {
    return {
      bg: isDark 
        ? "bg-gradient-to-br from-emerald-950/45 via-slate-900/90 to-slate-900/90" 
        : "bg-gradient-to-br from-emerald-50/45 via-white to-white",
      border: isDark ? "border-emerald-900/50" : "border-emerald-100",
      glow: isDark ? "shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "shadow-[0_4px_15px_rgba(16,185,129,0.05)]",
      accent: "#10b981",
      label: "Green State"
    };
  }

  // Default style
  return {
    bg: isDark ? "bg-slate-900/90" : "bg-white",
    border: isDark ? "border-slate-800" : "border-slate-100",
    glow: "",
    accent: "",
    label: ""
  };
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem("chemtrace_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "chemicals" | "safety" | "usage" | "disposal" | "reports" | "settings">("dashboard");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [selectedUsageItem, setSelectedUsageItem] = useState<InventoryItem | null>(null);
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [selectedDisposalItem, setSelectedDisposalItem] = useState<InventoryItem | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isCompatibilityModalOpen, setIsCompatibilityModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISafetyModalOpen, setIsAISafetyModalOpen] = useState(false);
  const [selectedSafetyItem, setSelectedSafetyItem] = useState<InventoryItem | null>(null);

  // Chemical-inspired Laboratory Themes state
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    return localStorage.getItem("chemtrace_theme") || "theme-copper-blue";
  });
  
  const [isAutoTheme, setIsAutoTheme] = useState<boolean>(() => {
    return localStorage.getItem("chemtrace_auto_theme") === "true";
  });
  
  const [customPrimary, setCustomPrimary] = useState<string>(() => {
    return localStorage.getItem("chemtrace_custom_primary") || "#14b8a6"; // default teal
  });
  
  const [customSecondary, setCustomSecondary] = useState<string>(() => {
    return localStorage.getItem("chemtrace_custom_secondary") || "#f0fdfa"; // default light teal
  });

  const [atomicRadius, setAtomicRadius] = useState<number>(() => {
    return parseInt(localStorage.getItem("cims_atomic_radius") || "16");
  });

  const [molecularSpacing, setMolecularSpacing] = useState<"compact" | "standard" | "spacious">(() => {
    return (localStorage.getItem("cims_molecular_spacing") as any) || "standard";
  });

  const [luminescence, setLuminescence] = useState<number>(() => {
    return parseFloat(localStorage.getItem("cims_luminescence") || "1.0");
  });

  const updateAtomicRadius = (value: number) => {
    setAtomicRadius(value);
    localStorage.setItem("cims_atomic_radius", String(value));
  };

  const updateMolecularSpacing = (value: "compact" | "standard" | "spacious") => {
    setMolecularSpacing(value);
    localStorage.setItem("cims_molecular_spacing", value);
  };

  const updateLuminescence = (value: number) => {
    setLuminescence(value);
    localStorage.setItem("cims_luminescence", String(value));
  };

  // Track prefers-color-scheme if isAutoTheme is on
  useEffect(() => {
    if (!isAutoTheme) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const matchTheme = (matches: boolean) => {
      if (matches) {
        setActiveTheme("theme-lab-dark");
      } else {
        setActiveTheme("theme-copper-blue");
      }
    };
    matchTheme(media.matches);
    const listener = (e: MediaQueryListEvent) => matchTheme(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [isAutoTheme]);

  // Handle saving the state to local storage when changed
  const selectTheme = (themeClass: string) => {
    setActiveTheme(themeClass);
    localStorage.setItem("chemtrace_theme", themeClass);
    if (themeClass !== "theme-lab-dark") {
      setIsAutoTheme(false);
      localStorage.setItem("chemtrace_auto_theme", "false");
    }
  };

  const toggleAutoTheme = (enabled: boolean) => {
    setIsAutoTheme(enabled);
    localStorage.setItem("chemtrace_auto_theme", enabled ? "true" : "false");
    if (enabled) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      if (media.matches) {
        setActiveTheme("theme-lab-dark");
      } else {
        setActiveTheme("theme-copper-blue");
      }
    }
  };

  const updateCustomColors = (primary: string, secondary: string) => {
    setCustomPrimary(primary);
    setCustomSecondary(secondary);
    localStorage.setItem("chemtrace_custom_primary", primary);
    localStorage.setItem("chemtrace_custom_secondary", secondary);
  };

  // Harmonized dynamic lab theme colors for dashboard charts and widgets
  const themeColor = useMemo(() => {
    if (activeTheme === "theme-custom" && customPrimary) return customPrimary;
    switch (activeTheme) {
      case "theme-acid-green":
        return "#16a34a"; // green-600
      case "theme-copper-blue":
        return "#2563eb"; // blue-600
      case "theme-potassium-purple":
        return "#8b5cf6"; // purple-600
      case "theme-sulfur-yellow":
        return "#d97706"; // sulfur yellow / amber-600
      case "theme-safety-orange":
        return "#ea580c"; // safety orange-600
      case "theme-lab-dark":
        return "#10b981"; // laboratory dark neon green
      case "theme-bismuth":
        return "#d946ef"; // fuchsia-500
      case "theme-cryo":
        return "#06b6d4"; // cyan-500
      default:
        return "#3b82f6";
    }
  }, [activeTheme, customPrimary]);

  const themeColors = useMemo(() => {
    if (activeTheme === "theme-custom" && customPrimary) {
      return [
        customPrimary,
        customPrimary + "cc",
        "#3b82f6",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6"
      ];
    }
    switch (activeTheme) {
      case "theme-acid-green":
        return ["#10b981", "#22c55e", "#84cc16", "#16a34a", "#f59e0b", "#ef4444"];
      case "theme-copper-blue":
        return ["#2563eb", "#0284c7", "#06b6d4", "#3b82f6", "#8b5cf6", "#f59e0b"];
      case "theme-potassium-purple":
        return ["#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#3b82f6", "#ef4444"];
      case "theme-sulfur-yellow":
        return ["#d97706", "#eab308", "#f59e0b", "#ca8a04", "#10b981", "#ef4444"];
      case "theme-safety-orange":
        return ["#ea580c", "#f97316", "#ef4444", "#f59e0b", "#b91c1c", "#4f46e5"];
      case "theme-lab-dark":
        return ["#10b981", "#0ea5e9", "#ec4899", "#8b5cf6", "#f59e0b", "#f43f5e"];
      case "theme-bismuth":
        return ["#d946ef", "#06b6d4", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981"];
      case "theme-cryo":
        return ["#06b6d4", "#0ea5e9", "#3b82f6", "#0891b2", "#0284c7", "#2563eb"];
      default:
        return ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899"];
    }
  }, [activeTheme, customPrimary]);

  // Safety Assistant State
  const [safetyQuery, setSafetyQuery] = useState("");
  const [safetyResponse, setSafetyResponse] = useState("");
  const [isSafetyLoading, setIsSafetyLoading] = useState(false);

  // Login State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const user = await api.login(loginUsername, loginPassword);
      setCurrentUser(user);
    } catch (error: any) {
      setLoginError(error.message || "Invalid username or password");
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inv, chem, st, notifs, sups, trans] = await Promise.all([
        api.getInventory(),
        api.getChemicals(),
        api.getStats(),
        api.getNotifications(),
        api.getSuppliers(),
        api.getTransactions()
      ]);
      setInventory(inv);
      setChemicals(chem);
      setStats(st);
      setNotifications(notifs);
      setSuppliers(sups);
      setTransactions(trans);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSafetyAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!safetyQuery.trim()) return;
    setIsSafetyLoading(true);
    setSafetyResponse("");
    try {
      const advice = await geminiService.getSafetyAdvice(safetyQuery);
      setSafetyResponse(advice || "No advice found.");
    } catch (error) {
      setSafetyResponse("Error getting safety advice.");
    } finally {
      setIsSafetyLoading(false);
    }
  };

  const startVoiceSearch = () => {
    // @ts-ignore - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const filteredInventory = inventory.filter(item => 
    item.chemical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.cas_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenContainer = async (id: number) => {
    try {
      await api.openContainer(id);
      fetchData();
    } catch (error) {
      console.error("Failed to open container:", error);
    }
  };

  const getStatusColor = (item: InventoryItem) => {
    if (isPast(new Date(item.expiry_date))) return "text-red-500 bg-red-50 border-red-100";
    if (isBefore(new Date(item.expiry_date), addDays(new Date(), 30))) return "text-amber-500 bg-amber-50 border-amber-100";
    if (item.quantity < 100) return "text-orange-500 bg-orange-50 border-orange-100";
    return "text-emerald-500 bg-emerald-50 border-emerald-100";
  };

  const renderUsageLog = () => {
    const usageTrans = transactions.filter(t => t.type === "usage");
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/10">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              Usage Log
            </h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
              {usageTrans.length} Entries
            </span>
          </div>
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Chemical</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usageTrans.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {format(new Date(t.date), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{t.chemical_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-blue-600">
                        -{t.quantity} {t.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold border border-slate-200">
                          {t.user?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-600">{t.user}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {usageTrans.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm italic">No usage records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDisposalDashboard = () => {
    const disposalTrans = transactions.filter(t => t.type === "disposal");
    
    const reasonStats = disposalTrans.reduce((acc, t) => {
      const reason = t.notes || "Standard Procedure";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reasonData = Object.entries(reasonStats).map(([name, value]) => ({ name, value }));

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Disposal Distribution by Reason
            </h3>
            <div className="h-64 flex items-center justify-center">
              {reasonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      {reasonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={themeColors[index % themeColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400 italic">
                  <BarChart3 className="w-12 h-12 opacity-20" />
                  <p>No disposal data to visualize</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {reasonData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 border border-red-100 p-8 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-red-600 mb-6 shadow-xl shadow-red-200/50 relative z-10">
              <Trash2 className="w-10 h-10" />
            </div>
            <div className="relative z-10">
              <h4 className="text-5xl font-black text-red-700 mb-1">{disposalTrans.length}</h4>
              <p className="text-red-600/70 font-bold uppercase tracking-widest text-xs">Total Items Disposed</p>
              <div className="mt-6 p-3 bg-white/50 rounded-xl backdrop-blur-sm">
                <p className="text-[10px] text-red-800 font-medium leading-relaxed">
                  Hazardous waste disposal must follow EHS guidelines. Report all spills immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/10">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-500" />
              Disposal Records
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chronological</span>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Chemical</th>
                  <th className="px-6 py-3">Qty</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Disposed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disposalTrans.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {format(new Date(t.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{t.chemical_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-red-600">
                        {t.quantity} {t.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 italic bg-white px-2 py-1 rounded border border-slate-100">
                        {t.notes || "Standard"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{t.user}</td>
                  </tr>
                ))}
                {disposalTrans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Trash2 className="w-8 h-8 opacity-20" />
                        <p className="text-sm italic">No disposal history found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <Reports 
      inventory={inventory} 
      transactions={transactions} 
      stats={stats} 
      activeTheme={activeTheme}
      customPrimary={customPrimary}
    />
  );

  const renderThemeSettings = () => {
    const predefinedThemes = [
      {
        id: "theme-acid-green",
        name: "Acid Green",
        inspiration: "Hydrochloric indicator dyes",
        desc: "A radiant green chemistry-themed layout reminiscent of fluorescent indicator dyes and reactive acid solutions.",
        primaryColor: "#16a34a",
        secondaryColor: "#f0fdf4",
        symbol: "Ac",
        atomicNumber: 17,
        mass: 35.45,
      },
      {
        id: "theme-copper-blue",
        name: "Copper Sulfate",
        inspiration: "Cupric mineral crystals",
        desc: "A rich azulene cobalt blue theme inspired by the deep cobalt crystals of CuSO₄. Ideal for clean laboratory layouts.",
        primaryColor: "#2563eb",
        secondaryColor: "#f0f7ff",
        symbol: "Cu",
        atomicNumber: 29,
        mass: 63.55,
      },
      {
        id: "theme-potassium-purple",
        name: "Permanganate",
        inspiration: "Permanganate KMnO₄ solutions",
        desc: "A deep violet-magenta tone representing intense electron transfer, manganese oxidation states, and indicator drops.",
        primaryColor: "#8b5cf6",
        secondaryColor: "#faf5ff",
        symbol: "Mn",
        atomicNumber: 25,
        mass: 54.94,
      },
      {
        id: "theme-sulfur-yellow",
        name: "Sulfur Yellow",
        inspiration: "Elemental sulfur precipitate",
        desc: "A high-visibility scientific yellow-amber tone modeled after sulfur mineral elements and powder precipitates.",
        primaryColor: "#d97706",
        secondaryColor: "#fffbeb",
        symbol: "S",
        atomicNumber: 16,
        mass: 32.06,
      },
      {
        id: "theme-safety-orange",
        name: "Safety Orange",
        inspiration: "Biohazard sign containment",
        desc: "A bright alert warning orange designed to prompt compliance awareness in laboratories and hazard prevention units.",
        primaryColor: "#ea580c",
        secondaryColor: "#fff7ed",
        symbol: "Sf",
        atomicNumber: 92,
        mass: 238.03,
      },
      {
        id: "theme-lab-dark",
        name: "Midnight Laser",
        inspiration: "Low-light research labs",
        desc: "A premium, eye-protective dark canvas designed with radioactive-neon green indicators and blue laser spectrum lines.",
        primaryColor: "#10b981",
        secondaryColor: "#0a0e17",
        symbol: "Db",
        atomicNumber: 105,
        mass: 268.0,
      },
      {
        id: "theme-bismuth",
        name: "Bismuth Iridescent",
        inspiration: "Quantum metallic shift",
        desc: "A beautiful multi-gradient iridescent metallic theme shifting through pink, cyan, and violet with glassmorphic cards.",
        primaryColor: "#d946ef",
        secondaryColor: "#fdf4ff",
        symbol: "Bi",
        atomicNumber: 83,
        mass: 208.98,
      },
      {
        id: "theme-cryo",
        name: "Cryo Frost",
        inspiration: "Cryogenic ice white",
        desc: "An ultra-clean frosty white theme with frozen cyan indicators and high-contrast clinical typography.",
        primaryColor: "#06b6d4",
        secondaryColor: "#f0fdfa",
        symbol: "Cr",
        atomicNumber: 24,
        mass: 52.00,
      },
      {
        id: "theme-custom",
        name: "Custom Spectrum",
        inspiration: "Synthesize element color sets",
        desc: "Mix your own custom color presets in the color selector below. Set core primary and solution highlights.",
        primaryColor: customPrimary,
        secondaryColor: customSecondary,
        symbol: "El",
        atomicNumber: 99,
        mass: 252.07,
      }
    ];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <style>{`
          @keyframes bubble-rise {
            0% { transform: translateY(30px) scale(0.6); opacity: 0; }
            50% { opacity: 0.8; }
            100% { transform: translateY(-70px) scale(1); opacity: 0; }
          }
          .flask-bubble-1 { animation: bubble-rise 2.8s infinite ease-in; }
          .flask-bubble-2 { animation: bubble-rise 2.0s infinite ease-in 0.5s; }
          .flask-bubble-3 { animation: bubble-rise 3.2s infinite ease-in 1.1s; }
          .flask-bubble-4 { animation: bubble-rise 2.4s infinite ease-in 1.7s; }
        `}</style>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Palette className="w-5.5 h-5.5 text-blue-600 animate-pulse" />
                Laboratory Theme Settings
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize your CIMS chemical management terminal's visual spectrum and structural styling.
              </p>
            </div>

            {/* Auto Switch */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 rounded-2xl shadow-inner">
              <div className="p-1.5 bg-white border border-slate-200/50 rounded-xl shadow-sm">
                <Sun className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Auto System Preferences</p>
                <p className="text-xs font-semibold text-slate-400">Match light / dark automatically</p>
              </div>
              <button
                onClick={() => toggleAutoTheme(!isAutoTheme)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isAutoTheme ? "bg-blue-600" : "bg-slate-200"
                }`}
                role="switch"
                aria-checked={isAutoTheme}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAutoTheme ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Periodic Elements Theme Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-8">
            {predefinedThemes.map((theme) => {
              const isActive = activeTheme === theme.id;
              
              // Define gradient style for Bismuth iridescent or other dynamic colors
              let bgCardGradient = "";
              if (theme.id === "theme-bismuth") {
                bgCardGradient = "linear-gradient(135deg, rgba(217, 70, 239, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)";
              } else if (theme.id === "theme-cryo") {
                bgCardGradient = "linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(255, 255, 255, 1) 100%)";
              }

              return (
                <div
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  className={`relative rounded-2xl p-4 border-2 text-left cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 group select-none ${
                    isActive 
                      ? "border-blue-600 shadow-lg scale-[1.03]" 
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                  }`}
                  style={{
                    borderColor: isActive ? theme.primaryColor : undefined,
                    boxShadow: isActive ? `0 10px 25px -5px ${theme.primaryColor}33` : undefined,
                    background: bgCardGradient || undefined
                  }}
                >
                  {/* Periodic Table Layout */}
                  <div className="flex justify-between items-start w-full">
                    <span className="text-[10px] font-black text-slate-400 font-mono">{theme.atomicNumber}</span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono">{theme.mass}</span>
                  </div>

                  {/* Big Atomic Symbol */}
                  <div className="text-center my-1">
                    <span 
                      className="text-4xl font-extrabold tracking-tighter"
                      style={{
                        color: theme.primaryColor,
                        textShadow: isActive ? `0 0 12px ${theme.primaryColor}55` : undefined
                      }}
                    >
                      {theme.symbol}
                    </span>
                  </div>

                  {/* Element Name and description */}
                  <div>
                    <h4 className="text-[11px] font-black text-slate-800 truncate leading-none uppercase tracking-wide">
                      {theme.name}
                    </h4>
                    <span className="text-[8px] text-slate-400 font-extrabold truncate uppercase block mt-1">
                      {theme.inspiration}
                    </span>
                  </div>

                  {/* Dynamic Glowing Indicator Tag */}
                  {isActive && (
                    <div 
                      className="absolute top-2 right-2 w-2 h-2 rounded-full animate-ping"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Palette Builder Drawer/Panel */}
          {activeTheme === "theme-custom" && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Paintbrush className="w-5 h-5 text-indigo-500" />
                <h4 className="font-extrabold text-slate-800 text-sm">Synthesize Isotope Colors</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Primary Picker */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Isotopes Core Color</label>
                    <span className="text-[10px] text-slate-400 font-semibold">{customPrimary} (Buttons, Titles, Highlights)</span>
                  </div>
                  <input 
                    type="color" 
                    value={customPrimary}
                    onChange={(e) => updateCustomColors(e.target.value, customSecondary)}
                    className="w-12 h-12 bg-transparent cursor-pointer border-none"
                  />
                </div>

                {/* Secondary Picker */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Solution Highlight</label>
                    <span className="text-[10px] text-slate-400 font-semibold">{customSecondary} (Muted inputs, light highlights)</span>
                  </div>
                  <input 
                    type="color" 
                    value={customSecondary}
                    onChange={(e) => updateCustomColors(customPrimary, e.target.value)}
                    className="w-12 h-12 bg-transparent cursor-pointer border-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Advanced Layout and Spacing controls */}
          <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Customizer Panel */}
            <div className="lg:col-span-2 space-y-6">
              <h4 className="text-md font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Paintbrush className="w-4.5 h-4.5 text-blue-600" />
                Atomic Customization parameters
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Border Radius rounded settings */}
                <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Atomic Radius (Rounding)</label>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded">{atomicRadius}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="32" 
                    value={atomicRadius}
                    onChange={(e) => updateAtomicRadius(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase">
                    <span>Sharp (0px)</span>
                    <span>Precision</span>
                    <span>Organic (32px)</span>
                  </div>
                </div>

                {/* Spacing density buttons */}
                <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl space-y-3">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Molecular spacing (Padding)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["compact", "standard", "spacious"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => updateMolecularSpacing(mode)}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border ${
                          molecularSpacing === mode 
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                            : "bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Luminescence Glow slider */}
                <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl space-y-3 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Luminescence Intensity (Shadows)</label>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded">{(luminescence * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1.5" 
                    step="0.1"
                    value={luminescence}
                    onChange={(e) => updateLuminescence(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase">
                    <span>Flat (0%)</span>
                    <span>Balanced</span>
                    <span>Glow Neon (150%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Chemistry Flask fluid visualizer */}
            <div 
              className="bg-slate-50 border border-slate-200/60 p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group select-none"
              style={{
                borderColor: themeColor + "33"
              }}
            >
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Solution Preview</h4>
              
              {/* Animated Beaker SVG */}
              <div className="relative cursor-pointer transition-transform duration-500 group-hover:scale-105 my-2">
                <svg className="w-24 h-28 overflow-visible" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Flask Beaker glass */}
                  <path d="M35 15H65M40 15V40L25 95C23 102 28 108 35 108H65C72 108 77 102 75 95L60 40V15" stroke={themeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                  
                  {/* Scale lines */}
                  <line x1="43" y1="52" x2="50" y2="52" stroke={themeColor} strokeWidth="2" opacity="0.5" />
                  <line x1="41" y1="67" x2="50" y2="67" stroke={themeColor} strokeWidth="2" opacity="0.5" />
                  <line x1="39" y1="82" x2="50" y2="82" stroke={themeColor} strokeWidth="2" opacity="0.5" />
                  
                  {/* Fluid Area */}
                  <path d="M28 85C40 82 45 88 57 85C69 82 71 85 71 85L74 95C76 102 71 106 65 106H35C29 106 24 102 26 95L28 85Z" fill={themeColor} fillOpacity="0.4" />
                  
                  {/* Dynamic rising bubbles */}
                  <circle cx="38" cy="98" r="2.5" fill={themeColor} className="flask-bubble-1" />
                  <circle cx="50" cy="92" r="3.5" fill={themeColor} className="flask-bubble-2" />
                  <circle cx="62" cy="96" r="2" fill={themeColor} className="flask-bubble-3" />
                  <circle cx="45" cy="80" r="1.5" fill={themeColor} className="flask-bubble-4" />
                </svg>
              </div>

              {/* Theme status indicator text */}
              <div className="mt-4 space-y-1">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Fluid status: <span style={{ color: themeColor }}>Synthesized</span>
                </p>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-[200px]">
                  Hover over the beaker to simulate isotope thermal convection.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total Chemicals" 
          value={stats?.totalChemicals.count || 0} 
          icon={<Database className="w-5 h-5" />} 
          color="blue" 
        />
        <StatCard 
          title="Low Stock" 
          value={stats?.lowStock.count || 0} 
          icon={<AlertTriangle className="w-5 h-5" />} 
          color="orange" 
        />
        <StatCard 
          title="Expired Items" 
          value={stats?.expired.count || 0} 
          icon={<XCircle className="w-5 h-5" />} 
          color="red" 
        />
        <StatCard 
          title="Active Inventory" 
          value={inventory.length} 
          icon={<Package className="w-5 h-5" />} 
          color="emerald" 
        />
        <StatCard 
          title="Disposed" 
          value={transactions.filter(t => t.type === "disposal").length} 
          icon={<Trash2 className="w-5 h-5" />} 
          color="red" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Hazard Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.hazardDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats?.hazardDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={themeColors[index % themeColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {stats?.hazardDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeColors[index % themeColors.length] }} />
                <span className="text-xs text-slate-500">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Stock Levels by Location</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventory.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="chemical_name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="quantity" fill={themeColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dashboard Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Expired Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/30">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Expired Items
            </h3>
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">
              {inventory.filter(i => isPast(new Date(i.expiry_date))).length}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Chemical</th>
                  <th className="px-6 py-3">Expiry</th>
                  <th className="px-6 py-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.filter(i => isPast(new Date(i.expiry_date))).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.chemical_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.cas_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-red-600">
                        {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{item.location}</td>
                  </tr>
                ))}
                {inventory.filter(i => isPast(new Date(i.expiry_date))).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm italic">No expired items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50/30">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Low Stock Chemicals
            </h3>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg">
              {inventory.filter(i => !isPast(new Date(i.expiry_date)) && i.quantity < 100).length}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Chemical</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.filter(i => !isPast(new Date(i.expiry_date)) && i.quantity < 100).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.chemical_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.cas_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-orange-600">
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{item.location}</td>
                  </tr>
                ))}
                {inventory.filter(i => !isPast(new Date(i.expiry_date)) && i.quantity < 100).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm italic">No low stock items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Active Inventory */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            Active Inventory
          </h3>
          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
            {inventory.filter(i => !isPast(new Date(i.expiry_date)) && i.quantity >= 100).length}
          </span>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3">Chemical</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Expiry</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Hazard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.filter(i => !isPast(new Date(i.expiry_date)) && i.quantity >= 100).map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{item.chemical_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.cas_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-emerald-600">
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">{item.location}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {item.hazard_class}
                    </span>
                  </td>
                </tr>
              ))}
              {inventory.filter(i => !isPast(new Date(i.expiry_date)) && i.quantity >= 100).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm italic">No active inventory found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            Recent Activity
          </h3>
          <button 
            onClick={() => setActiveTab("usage")}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
          >
            View Full Log
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Chemical</th>
                <th className="px-6 py-3">Activity</th>
                <th className="px-6 py-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 10).map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {format(new Date(t.date), 'MMM dd, HH:mm')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{t.chemical_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      t.type === "usage" ? "bg-blue-100 text-blue-700" : 
                      t.type === "disposal" ? "bg-red-100 text-red-700" :
                      "bg-emerald-100 text-emerald-700"
                    )}>
                      {t.type} {t.type !== "purchase" && `(-${t.quantity} ${t.unit})`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">{t.user}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm italic">No recent activity</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, CAS, or location..." 
            className="w-full pl-10 pr-12 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={startVoiceSearch}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
              isListening ? "bg-red-50 text-red-500 animate-pulse" : "text-slate-400 hover:text-blue-500 hover:bg-slate-100"
            )}
            title="Search by voice"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCompatibilityModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">Compare Compatibility</span>
          </button>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <Search className="w-4 h-4" />
            Scan Barcode
          </button>
          {currentUser?.role === "admin" && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              Add Inventory
            </button>
          )}
        </div>
      </div>

      <InventoryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        chemicals={chemicals}
        onSuccess={fetchData}
      />

      <AICompatibilityModal 
        isOpen={isCompatibilityModalOpen}
        onClose={() => setIsCompatibilityModalOpen(false)}
        chemicals={chemicals}
      />

      {selectedSafetyItem && (
        <AISafetyModal 
          isOpen={isAISafetyModalOpen}
          onClose={() => setIsAISafetyModalOpen(false)}
          item={selectedSafetyItem}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredInventory.map(item => {
          const cardStyle = getChemicalCardStyle(item.chemical_name, activeTheme);
          return (
            <motion.div 
              layout
              key={item.id} 
              className={cn(
                "p-5 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
                cardStyle.bg,
                cardStyle.border,
                cardStyle.glow
              )}
            >
              {cardStyle.accent && (
                <div 
                  className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none transition-all duration-300"
                  style={{ backgroundColor: cardStyle.accent }}
                />
              )}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.chemical_name}</h4>
                    {cardStyle.accent && (
                      <span 
                        className="w-3 h-3 rounded-full border border-white/80 shadow-sm flex-shrink-0 animate-pulse"
                        style={{ 
                          backgroundColor: cardStyle.accent,
                          boxShadow: `0 0 8px ${cardStyle.accent}`
                        }}
                        title={cardStyle.label}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{item.cas_number}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <button 
                    onClick={() => {
                      setSelectedSafetyItem(item);
                      setIsAISafetyModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-black uppercase hover:bg-indigo-100 transition-colors"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    AI Safety
                  </button>
                  {item.initial_quantity > 0 && (item.quantity / item.initial_quantity) < 0.2 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md text-[9px] font-black uppercase">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Low Stock
                    </span>
                  )}
                  {item.opened_at && isBefore(new Date(item.opened_at), addDays(new Date(), -180)) && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-md text-[9px] font-black uppercase">
                      <Clock className="w-2.5 h-2.5" />
                      Extended Open
                    </span>
                  )}
                  {item.opened_at ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold uppercase">
                      Opened: {format(new Date(item.opened_at), 'MMM dd, yyyy')}
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleOpenContainer(item.id)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md text-[9px] font-bold uppercase transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Mark Opened
                    </button>
                  )}
                </div>
              </div>
              <div className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border", getStatusColor(item))}>
                {item.quantity} {item.unit}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{item.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Expires: {format(new Date(item.expiry_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                <span>{item.hazard_class}</span>
              </div>
              <div className="pt-2 border-t border-slate-50 space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Molecular Weight</span>
                  <span className="text-slate-600">{item.molecular_weight} g/mol</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Requirements</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.storage_requirements}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Safety Information</p>
                  <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-2" title={item.safety_info}>"{item.safety_info}"</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedUsageItem(item);
                    setIsUsageModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  <Beaker className="w-3.5 h-3.5" />
                  Record Usage
                </button>
                <button 
                  onClick={() => {
                    setSelectedDisposalItem(item);
                    setIsDisposalModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 transition-colors bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Dispose
                </button>
              </div>
            </div>
          </motion.div>
        );})}
      </div>

      <UsageModal 
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        item={selectedUsageItem}
        onSuccess={fetchData}
        currentUser={currentUser?.username || "Unknown"}
      />

      <DisposalModal 
        isOpen={isDisposalModalOpen}
        onClose={() => setIsDisposalModalOpen(false)}
        item={selectedDisposalItem}
        onSuccess={fetchData}
        currentUser={currentUser?.username || "Unknown"}
      />
    </div>
  );

  const renderSafety = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex p-3 bg-blue-50 rounded-2xl text-blue-600 mb-2">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">AI Safety Assistant</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Ask about chemical hazards, storage compatibility, or emergency procedures. 
          Powered by Gemini AI for laboratory safety.
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <form onSubmit={handleSafetyAsk} className="relative">
          <input 
            type="text" 
            placeholder="e.g., Is it safe to store Nitric Acid with Ethanol?" 
            className="w-full pl-6 pr-16 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
            value={safetyQuery}
            onChange={(e) => setSafetyQuery(e.target.value)}
          />
          <button 
            type="submit"
            disabled={isSafetyLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {isSafetyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {safetyResponse && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 prose prose-slate max-w-none"
            >
              <div className="flex items-center gap-2 mb-4 text-blue-600 font-semibold">
                <Info className="w-5 h-5" />
                <span>Safety Guidance</span>
              </div>
              <div className="text-slate-700 leading-relaxed">
                <ReactMarkdown>
                  {safetyResponse}
                </ReactMarkdown>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Disclaimer: AI generated advice. Always verify with official SDS.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SafetyQuickCard 
          title="Storage Rules" 
          desc="Learn about chemical compatibility groups." 
          onClick={() => setSafetyQuery("Explain chemical compatibility groups for storage.")}
        />
        <SafetyQuickCard 
          title="PPE Guide" 
          desc="What protection do I need for Corrosives?" 
          onClick={() => setSafetyQuery("What PPE is required when handling concentrated acids?")}
        />
        <SafetyQuickCard 
          title="Spill Response" 
          desc="Emergency procedures for organic solvents." 
          onClick={() => setSafetyQuery("What are the emergency procedures for a large ethanol spill?")}
        />
      </div>
    </div>
  );

  const renderChemicals = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search chemicals..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {currentUser?.role === "admin" && (
          <button 
            onClick={() => {
              setSelectedSupplier(null);
              setIsSupplierModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Master Chemical List
          </h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                <tr>
                  <th className="px-6 py-4">Chemical</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Hazard</th>
                  <th className="px-6 py-4">Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {chemicals.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.cas_number.includes(searchQuery)).map(chem => (
                  <tr key={chem.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{chem.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{chem.cas_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{chem.supplier_name || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                        {chem.hazard_class}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-slate-500">{chem.formula}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Suppliers
          </h3>
          <div className="space-y-3">
            {suppliers.map(sup => (
              <div key={sup.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900">{sup.name}</h4>
                  {currentUser?.role === "admin" && (
                    <button 
                      onClick={() => {
                        setSelectedSupplier(sup);
                        setIsSupplierModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{sup.contact_info}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-8"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-4">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">CIMS Login</h1>
            <p className="text-slate-500">Enter your credentials to access the system</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin or tech"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="admin123 or tech123"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {loginError && (
              <p className="text-sm text-red-500 font-medium">{loginError}</p>
            )}
            <button 
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-4">
              Demo Credentials:
            </p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => { setLoginUsername("admin"); setLoginPassword("admin123"); }}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
              >
                Admin
              </button>
              <button 
                onClick={() => { setLoginUsername("tech"); setLoginPassword("tech123"); }}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
              >
                Technician
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 ${activeTheme} theme-transition`}>
      <style>{`
        :root {
          --cims-radius: ${atomicRadius}px;
          --cims-glow-opacity: ${luminescence};
          --cims-spacing: ${
            molecularSpacing === "compact" 
              ? "0.5rem" 
              : molecularSpacing === "spacious" 
              ? "1.5rem" 
              : "1rem"
          };
          --cims-padding: ${
            molecularSpacing === "compact" 
              ? "0.75rem" 
              : molecularSpacing === "spacious" 
              ? "2rem" 
              : "1.25rem"
          };
          --cims-gap: ${
            molecularSpacing === "compact" 
              ? "0.5rem" 
              : molecularSpacing === "spacious" 
              ? "2rem" 
              : "1rem"
          };
        }

        /* Dynamic rounded borders */
        .rounded-3xl, .rounded-\\[2rem\\], .rounded-2xl {
          border-radius: var(--cims-radius) !important;
        }
        .rounded-xl, .rounded-lg {
          border-radius: calc(var(--cims-radius) * 0.7) !important;
        }
        .rounded-md {
          border-radius: calc(var(--cims-radius) * 0.4) !important;
        }

        /* Dynamic shadow glow based on luminescence */
        .shadow-sm {
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, calc(0.05 * var(--cims-glow-opacity))) !important;
        }
        .shadow-md {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, calc(0.1 * var(--cims-glow-opacity))), 
                      0 2px 4px -2px rgba(0, 0, 0, calc(0.1 * var(--cims-glow-opacity))) !important;
        }
        .shadow-lg {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, calc(0.1 * var(--cims-glow-opacity))), 
                      0 4px 6px -4px rgba(0, 0, 0, calc(0.1 * var(--cims-glow-opacity))) !important;
        }
        .shadow-2xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, calc(0.25 * var(--cims-glow-opacity))) !important;
        }
        .shadow-blue-200 {
          box-shadow: 0 10px 15px -3px rgba(37, 99, 235, calc(0.2 * var(--cims-glow-opacity))) !important;
        }
        .shadow-indigo-200 {
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, calc(0.2 * var(--cims-glow-opacity))) !important;
        }

        /* Spacing overrides */
        .p-6, .p-8, .p-10 {
          padding: var(--cims-padding) !important;
        }
        .gap-6, .gap-8, .gap-4 {
          gap: var(--cims-gap) !important;
        }
        .space-y-6 > :not([hidden]) ~ :not([hidden]) {
          margin-top: var(--cims-spacing) !important;
        }
      `}</style>
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">CIMS</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
          />
          <NavItem 
            active={activeTab === "inventory"} 
            onClick={() => setActiveTab("inventory")}
            icon={<Package className="w-5 h-5" />}
            label="Inventory"
          />
          {currentUser.role === "admin" && (
            <NavItem 
              active={activeTab === "chemicals"} 
              onClick={() => setActiveTab("chemicals")}
              icon={<Database className="w-5 h-5" />}
              label="Chemicals"
            />
          )}
          <NavItem 
            active={activeTab === "safety"} 
            onClick={() => setActiveTab("safety")}
            icon={<ShieldAlert className="w-5 h-5" />}
            label="Safety AI"
          />
          <NavItem 
            active={activeTab === "usage"} 
            onClick={() => setActiveTab("usage")}
            icon={<History className="w-5 h-5" />}
            label="Usage Log"
          />
          <NavItem 
            active={activeTab === "disposal"} 
            onClick={() => setActiveTab("disposal")}
            icon={<BarChart3 className="w-5 h-5" />}
            label="Disposals"
          />
          <NavItem 
            active={activeTab === "reports"} 
            onClick={() => setActiveTab("reports")}
            icon={<FileBarChart className="w-5 h-5" />}
            label="Reports"
          />
          <NavItem 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")}
            icon={<Palette className="w-5 h-5" />}
            label="Lab Themes"
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{currentUser.username}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{currentUser.role}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-medium"
                title="Switch Account"
              >
                <User className="w-4 h-4" />
                <span>Switch</span>
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="font-bold">CIMS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-slate-600 relative"
            >
              <AlertTriangle className={cn("w-5 h-5", notifications.some(n => !n.is_read) ? "text-orange-500" : "text-slate-400")} />
              {notifications.some(n => !n.is_read) && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="font-bold text-slate-900">Notifications</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            className={cn(
                              "p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer",
                              !notif.is_read && "bg-blue-50/30"
                            )}
                            onClick={async () => {
                              await api.markNotificationRead(notif.id);
                              fetchData();
                            }}
                          >
                            <div className="flex gap-3">
                              <div className="mt-1 flex-shrink-0">
                                {notif.type === 'expiry' ? <Calendar className="w-4 h-4 text-orange-500" /> : <Info className="w-4 h-4 text-blue-500" />}
                              </div>
                              <div className="text-left">
                                <p className="text-sm text-slate-700 leading-snug">{notif.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{format(new Date(notif.created_at), 'MMM dd, HH:mm')}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-40 bg-white p-6 md:hidden overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="font-bold">CIMS</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                <X />
              </button>
            </div>
            <nav className="space-y-4">
              <MobileNavItem label="Dashboard" active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }} />
              <MobileNavItem label="Inventory" active={activeTab === "inventory"} onClick={() => { setActiveTab("inventory"); setIsMobileMenuOpen(false); }} />
              {currentUser.role === "admin" && (
                <MobileNavItem label="Chemicals" active={activeTab === "chemicals"} onClick={() => { setActiveTab("chemicals"); setIsMobileMenuOpen(false); }} />
              )}
              <MobileNavItem label="Safety AI" active={activeTab === "safety"} onClick={() => { setActiveTab("safety"); setIsMobileMenuOpen(false); }} />
              <MobileNavItem label="Usage Log" active={activeTab === "usage"} onClick={() => { setActiveTab("usage"); setIsMobileMenuOpen(false); }} />
              <MobileNavItem label="Disposals" active={activeTab === "disposal"} onClick={() => { setActiveTab("disposal"); setIsMobileMenuOpen(false); }} />
              <MobileNavItem label="Reports" active={activeTab === "reports"} onClick={() => { setActiveTab("reports"); setIsMobileMenuOpen(false); }} />
              <MobileNavItem label="Lab Themes" active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }} />
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-xl text-lg font-semibold text-blue-600 flex items-center gap-2"
              >
                <User className="w-5 h-5" />
                Switch Account
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-xl text-lg font-semibold text-red-600"
              >
                Logout
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">{activeTab}</h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Manage your laboratory chemical inventory and safety compliance.</p>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all relative"
              >
                <AlertTriangle className={cn("w-5 h-5", notifications.some(n => !n.is_read) ? "text-orange-500" : "text-slate-400")} />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
              </button>
              
              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h4 className="font-bold text-slate-900">Notifications</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id} 
                              className={cn(
                                "p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer",
                                !notif.is_read && "bg-blue-50/30"
                              )}
                              onClick={async () => {
                                await api.markNotificationRead(notif.id);
                                fetchData();
                              }}
                            >
                              <div className="flex gap-3">
                                <div className="mt-1">
                                  {notif.type === 'expiry' ? <Calendar className="w-4 h-4 text-orange-500" /> : <Info className="w-4 h-4 text-blue-500" />}
                                </div>
                                <div>
                                  <p className="text-sm text-slate-700 leading-snug">{notif.message}</p>
                                  <p className="text-[10px] text-slate-400 mt-1">{format(new Date(notif.created_at), 'MMM dd, HH:mm')}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <BarcodeScanner 
          isOpen={isScannerOpen} 
          onClose={() => setIsScannerOpen(false)} 
          onScan={(code) => {
            setSearchQuery(code);
            setIsScannerOpen(false);
            setActiveTab("inventory");
          }}
          inventory={inventory}
          currentUser={currentUser?.username || "admin"}
          onSuccess={fetchData}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-medium">Loading inventory data...</p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "inventory" && renderInventory()}
            {activeTab === "safety" && renderSafety()}
            {activeTab === "chemicals" && renderChemicals()}
            {activeTab === "usage" && renderUsageLog()}
            {activeTab === "disposal" && renderDisposalDashboard()}
            {activeTab === "reports" && renderReports()}
            {activeTab === "settings" && renderThemeSettings()}
          </>
        )}
      </main>

      <SupplierModal 
        isOpen={isSupplierModalOpen}
        onClose={() => {
          setIsSupplierModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSuccess={fetchData}
        supplier={selectedSupplier}
      />
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
        active 
          ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-100/50" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}

function MobileNavItem({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 rounded-xl text-lg font-semibold",
        active ? "bg-blue-50 text-blue-600" : "text-slate-600"
      )}
    >
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: "blue" | "orange" | "red" | "emerald" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", colors[color])}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function SafetyQuickCard({ title, desc, onClick }: { title: string, desc: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left group"
    >
      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">{title}</h4>
      <p className="text-sm text-slate-500">{desc}</p>
    </button>
  );
}
