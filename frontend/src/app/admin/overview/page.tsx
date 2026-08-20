"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import { Cpu, Activity, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

interface AdminStats {
  total_gpus: number;
  allocated_gpus: number;
  blocked_gpus: number;
  active_sessions: number;
  flagged_sessions: number;
  total_requests: number;
  utilization_pct: number;
}

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const authToken = token || localStorage.getItem("gpu_portal_token");
      const res = await fetch(`${API_BASE}/admin/overview-stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("[FETCH ADMIN STATS ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1524] text-slate-900 dark:text-white flex">
      <Sidebar />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <TopBar title="Department Governance Overview" subtitle="Real-Time Analytics & Hardware Governance" />

        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex-1">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                <Activity className="text-[#F97316]" size={32} />
                Department Admin Governance Overview
              </h1>
              <p className="text-slate-400 mt-1">
                Real-time cross-lab hardware metrics, utilization, and misuse flags.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-[#161D2E] border border-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-sm font-medium">Total Department GPUs</span>
                  <Cpu className="text-[#F97316]" size={24} />
                </div>
                <div className="text-3xl font-extrabold text-slate-100">{stats.total_gpus}</div>
                <div className="text-xs text-slate-400 mt-2">Active across all department labs</div>
              </div>

              <div className="bg-[#161D2E] border border-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-sm font-medium">Allocated GPUs</span>
                  <CheckCircle2 className="text-emerald-400" size={24} />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400">{stats.allocated_gpus}</div>
                <div className="text-xs text-emerald-500/80 mt-2">{stats.utilization_pct}% Overall Utilization</div>
              </div>

              <div className="bg-[#161D2E] border border-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-sm font-medium">Blocked / Flagged</span>
                  <AlertTriangle className="text-rose-400" size={24} />
                </div>
                <div className="text-3xl font-extrabold text-rose-400">{stats.blocked_gpus}</div>
                <div className="text-xs text-rose-400/80 mt-2">{stats.flagged_sessions} Flagged Misuse Sessions</div>
              </div>

              <div className="bg-[#161D2E] border border-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-sm font-medium">Total Requests Handled</span>
                  <ShieldCheck className="text-cyan-400" size={24} />
                </div>
                <div className="text-3xl font-extrabold text-slate-100">{stats.total_requests}</div>
                <div className="text-xs text-slate-400 mt-2">System-wide reservation applications</div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
