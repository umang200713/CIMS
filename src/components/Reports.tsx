import React, { useMemo, useState } from "react";
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
  Cell,
  AreaChart,
  Area,
  Legend
} from "recharts";
import { format, isPast, isBefore, addDays, startOfMonth, endOfMonth, eachDayOfInterval, subDays, isWithinInterval, startOfDay, endOfDay, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Calendar, 
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Filter,
  BarChart3,
  Download
} from "lucide-react";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { InventoryItem, Transaction, Stats } from "../types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ReportsProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  stats: Stats | null;
  activeTheme?: string;
  customPrimary?: string;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Reports({ inventory, transactions, stats, activeTheme = "theme-copper-blue", customPrimary }: ReportsProps) {
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
      default:
        return "#3b82f6";
    }
  }, [activeTheme, customPrimary]);

  const [range, setRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });
  const [viewType, setViewType] = useState<"daily" | "weekly">("daily");

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      csvRows.push(Object.values(row).map(val => `"${val}"`).join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportConsumption = () => {
    const headers = ["Period", "Total Usage"];
    const exportData = consumptionData.map(d => ({
      name: d.name,
      usage: d.usage.toFixed(2)
    }));
    exportToCSV(exportData, `consumption_report_${range.start}_to_${range.end}.csv`, headers);
  };

  const handleExportExpiry = () => {
    const headers = ["Chemical Name", "Location", "CAS Number", "Expiry Date", "Days Remaining"];
    const filtered = inventory
      .filter(i => i.expiry_date && isBefore(new Date(i.expiry_date), addDays(new Date(), 90)))
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    
    const exportData = filtered.map(item => {
      const diff = Math.ceil((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return {
        name: item.chemical_name,
        location: item.location,
        cas: item.cas_number,
        expiry: item.expiry_date,
        remaining: diff < 0 ? 'EXPIRED' : diff
      };
    });
    exportToCSV(exportData, `expiry_forecast_${format(new Date(), 'yyyy-MM-dd')}.csv`, headers);
  };

  // 1. Consumption Trends (Usage over selected range)
  const consumptionData = useMemo(() => {
    const startDate = startOfDay(new Date(range.start));
    const endDate = endOfDay(new Date(range.end));

    if (viewType === "daily") {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(day => {
        const dayStr = format(day, "MMM dd");
        const total = transactions
          .filter(t => t.type === "usage" && t.date && isWithinInterval(new Date(t.date), { start: startOfDay(day), end: endOfDay(day) }))
          .reduce((sum, t) => sum + t.quantity, 0);
        return { name: dayStr, usage: total };
      });
    } else {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
      return weeks.map(week => {
        const weekStr = `Week of ${format(week, "MMM dd")}`;
        const total = transactions
          .filter(t => t.type === "usage" && t.date && isWithinInterval(new Date(t.date), { start: startOfWeek(week), end: endOfWeek(week) }))
          .reduce((sum, t) => sum + t.quantity, 0);
        return { name: weekStr, usage: total };
      });
    }
  }, [transactions, range, viewType]);

  // Existing usageData for the AreaChart (keeping last 30 days fixed for summary)
  const usageDataArea = useMemo(() => {
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });

    return last30Days.map(day => {
      const dayStr = format(day, 'MMM dd');
      const totalUsage = transactions
        .filter(t => {
          if (!t.date || t.type !== "usage") return false;
          try {
            return format(new Date(t.date), 'MMM dd') === dayStr;
          } catch (e) {
            return false;
          }
        })
        .reduce((sum, t) => sum + t.quantity, 0);
      
      return { name: dayStr, usage: totalUsage };
    });
  }, [transactions]);

  // 2. Stock Health Breakdown
  const stockHealth = useMemo(() => {
    const expired = inventory.filter(i => i.expiry_date && isPast(new Date(i.expiry_date))).length;
    const low = inventory.filter(i => {
      if (!i.expiry_date) return i.quantity < 100;
      return !isPast(new Date(i.expiry_date)) && i.quantity < 100;
    }).length;
    const good = inventory.length - expired - low;

    return [
      { name: "Expired", value: expired, color: "#ef4444" },
      { name: "Low Stock", value: low, color: "#f59e0b" },
      { name: "Normal", value: good, color: "#10b981" }
    ].filter(d => d.value > 0);
  }, [inventory]);

  // 3. Hazard Class Report
  const hazardData = useMemo(() => {
    return stats?.hazardDistribution || [];
  }, [stats]);

  // 4. Monthly Statistics
  const monthlyStats = useMemo(() => {
    const currentMonth = transactions.filter(t => 
      t.type === "usage" && 
      new Date(t.date) >= startOfMonth(new Date()) && 
      new Date(t.date) <= endOfMonth(new Date())
    );
    
    const prevMonth = transactions.filter(t => 
      t.type === "usage" && 
      new Date(t.date) >= startOfMonth(subDays(startOfMonth(new Date()), 1)) && 
      new Date(t.date) <= endOfMonth(subDays(startOfMonth(new Date()), 1))
    );

    const currentTotal = currentMonth.reduce((sum, t) => sum + t.quantity, 0);
    const prevTotal = prevMonth.reduce((sum, t) => sum + t.quantity, 0);
    const diff = currentTotal - prevTotal;
    const percentChange = prevTotal === 0 ? 100 : (diff / prevTotal) * 100;

    return { total: currentTotal, diff, percent: percentChange };
  }, [transactions]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportSummaryCard 
          title="Current Month Usage" 
          value={`${monthlyStats.total.toFixed(0)} units`}
          trend={monthlyStats.diff > 0 ? "up" : "down"}
          percent={`${Math.abs(monthlyStats.percent).toFixed(1)}%`}
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <ReportSummaryCard 
          title="Inventory Value" 
          value={`${inventory.length} Containers`}
          trend="up"
          percent="2.4%"
          icon={<Package className="w-5 h-5" />}
          color="emerald"
        />
        <ReportSummaryCard 
          title="Expiry Risk" 
          value={inventory.filter(i => i.expiry_date && isBefore(new Date(i.expiry_date), addDays(new Date(), 30))).length}
          trend={inventory.filter(i => i.expiry_date && isPast(new Date(i.expiry_date))).length > 0 ? "up" : "down"}
          percent="Critical"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="orange"
        />
        <ReportSummaryCard 
          title="Hazard Compliance" 
          value="100%"
          trend="stable"
          percent="Target Met"
          icon={<ShieldAlert className="w-5 h-5" />}
          color="indigo"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Trend Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Consumption Analytics</h3>
              <p className="text-slate-500 text-sm">Quantified chemical usage trends (Last 30 Days)</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <span className="px-3 py-1 bg-white shadow-sm rounded-lg text-xs font-bold text-blue-600">Daily</span>
              <span className="px-3 py-1 text-xs font-bold text-slate-400">Weekly</span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageDataArea}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={themeColor} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={Math.floor(usageDataArea.length / 5)}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="usage" 
                  stroke={themeColor} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorUsage)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Health Pie */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-2">Inventory Health</h3>
          <p className="text-slate-500 text-sm mb-8">Current stock status overview</p>
          <div className="h-64 relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockHealth}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {stockHealth.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900">{inventory.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Total<br/>Units</span>
              </div>
          </div>
          <div className="mt-8 space-y-3">
            {stockHealth.map(item => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-bold text-slate-700">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Consumption Tracker (New Section) */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100/50">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Detailed Consumption Trend</h3>
              <p className="text-slate-500 text-sm">Granular analysis of usage transactions</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 p-2 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 px-2 border-r border-slate-200">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={range.start}
                onChange={(e) => setRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
              />
              <span className="text-slate-300">to</span>
              <input 
                type="date" 
                value={range.end}
                onChange={(e) => setRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setViewType("daily")}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                  viewType === "daily" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Daily
              </button>
              <button 
                onClick={() => setViewType("weekly")}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                  viewType === "weekly" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Weekly
              </button>
            </div>
            <button 
              onClick={handleExportConsumption}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumptionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc', radius: 8 }}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar 
                name="Total Consumption" 
                dataKey="usage" 
                fill={themeColor} 
                radius={[6, 6, 0, 0]} 
                barSize={viewType === "daily" ? 20 : 40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-50">
           <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peak Consumption</p>
             <p className="text-xl font-black text-slate-900">
               {Math.max(...consumptionData.map(d => d.usage), 0).toFixed(1)} units
             </p>
           </div>
           <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Average {viewType === "daily" ? "Daily" : "Weekly"}</p>
             <p className="text-xl font-black text-slate-900">
               {(consumptionData.length > 0 ? consumptionData.reduce((a, b) => a + b.usage, 0) / consumptionData.length : 0).toFixed(1)} units
             </p>
           </div>
           <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total in Period</p>
             <p className="text-xl font-black text-slate-900">
               {consumptionData.reduce((a, b) => a + b.usage, 0).toFixed(1)} units
             </p>
           </div>
        </div>
      </div>

      {/* Hazard & Expiry Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hazard Distribution */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Hazard Profile Report</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hazardData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  width={120}
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="value" fill={themeColor} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-50">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Risk Mitigation Action Items</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Flammables audit complete
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Corrosives storage update
                </div>
             </div>
          </div>
        </div>

        {/* Expiry Tracking Report */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Expiry Forecast</h3>
          </div>
          <button 
            onClick={handleExportExpiry}
            className="mb-6 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Download className="w-3 h-3" />
            Export Forecast as CSV
          </button>
          <div className="flex-1 space-y-4">
             {inventory
               .filter(i => i.expiry_date && isBefore(new Date(i.expiry_date), addDays(new Date(), 90)))
               .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
               .slice(0, 5)
               .map(item => {
                 const diff = Math.ceil((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                 return (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-orange-200 transition-all">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-sm border",
                        diff < 0 ? "bg-red-50 text-red-600 border-red-100" : 
                        diff < 30 ? "bg-orange-50 text-orange-600 border-orange-100" : 
                        "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        <span className="text-[10px] font-black uppercase">{item.expiry_date ? format(new Date(item.expiry_date), 'MMM') : 'N/A'}</span>
                        <span className="text-lg font-black leading-none">{item.expiry_date ? format(new Date(item.expiry_date), 'dd') : '--'}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-sm">{item.chemical_name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.location}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          diff < 0 ? "bg-red-500 text-white" : 
                          diff < 30 ? "bg-orange-100 text-orange-700" : 
                          "bg-blue-100 text-blue-700"
                        )}>
                          {diff < 0 ? 'Expired' : `${diff} Days`}
                        </span>
                      </div>
                    </div>
                 );
               })
             }
             {inventory.filter(i => i.expiry_date && isBefore(new Date(i.expiry_date), addDays(new Date(), 90))).length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50">
                  <Activity className="w-12 h-12" />
                  <p className="font-bold uppercase tracking-widest text-xs">No immediate expiry risks</p>
               </div>
             )}
          </div>
          <button className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
            Generate Detailed Full Report
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ReportSummaryCard({ title, value, trend, percent, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100"
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", colors[color])}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
          trend === "up" ? "text-emerald-600 bg-emerald-50" : 
          trend === "down" ? "text-red-600 bg-red-50" : 
          "text-slate-600 bg-slate-50"
        )}>
          {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          {percent}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
