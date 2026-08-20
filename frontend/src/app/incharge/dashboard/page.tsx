"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { HeroBanner } from "@/components/HeroBanner";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import {
  CheckSquare,
  AlertOctagon,
  Cpu,
  Zap,
  ArrowRight,
  ShieldAlert,
  Activity,
  UserCheck,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function InchargeDashboard() {
  const { user, token, wsMessage } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [gpus, setGpus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [pendingRes, gpuRes] = await Promise.all([
        fetch(`${API_BASE}/requests/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/gpus`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingRequests(pendingData);
      }
      if (gpuRes.ok) {
        const gpuData = await gpuRes.json();
        setGpus(gpuData);
      }
    } catch (e) {
      console.error("Error fetching incharge dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (wsMessage) {
      fetchData();
    }
  }, [wsMessage]);

  const allocatedGpus = gpus.filter((g) => g.status === "allocated");
  const blockedGpus = gpus.filter((g) => g.status === "blocked");

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-white transition-colors">
      <Sidebar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar
          title="Lab Incharge Dashboard"
          subtitle="Department GPU Governance, Access Approvals & Misuse Monitoring"
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {/* Hero Banner */}
          <HeroBanner
            title={`Welcome, ${user?.name || "Lab Incharge"}`}
            subtitle="Monitor active GPU telemetry streams, approve pending student reservation requests, and resolve security misuse flags."
            actionText="Review Pending Approvals"
            actionHref="/incharge/approvals"
          />

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Pending Approvals"
              value={pendingRequests.length}
              subtext={pendingRequests.length > 0 ? "Requests awaiting review" : "Queue is clear"}
              icon={CheckSquare}
              variant={pendingRequests.length > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Active GPU Sessions"
              value={allocatedGpus.length}
              subtext="Machines currently running workloads"
              icon={Zap}
              variant="success"
            />
            <StatCard
              title="Flagged / Misuse Blocks"
              value={blockedGpus.length}
              subtext={blockedGpus.length > 0 ? "Requires OTP unblock verification" : "Zero active flags"}
              icon={AlertOctagon}
              variant={blockedGpus.length > 0 ? "danger" : "default"}
            />
            <StatCard
              title="Managed GPUs"
              value={gpus.length}
              subtext="Across all assigned department labs"
              icon={Cpu}
            />
          </div>

          {/* Critical Misuse Alert Box (if any GPU is blocked) */}
          {blockedGpus.length > 0 && (
            <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-card p-6 mb-8 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                    <ShieldAlert size={26} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-rose-500">
                      SECURITY MISUSE ALERT — {blockedGpus.length} GPU(s) BLOCKED
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-1">
                      Misuse heuristic detected unauthorized crypto-mining or high-utilization gaming process. OTP verification is required to restore access.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {blockedGpus.map((gpu) => (
                    <Link
                      key={gpu.id}
                      href={`/incharge/sessions/${gpu.current_session?.id}`}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 whitespace-nowrap flex items-center gap-2"
                    >
                      <span>Resolve {gpu.name}</span>
                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active GPU Sessions Overview Table */}
          <div className="bg-white dark:bg-[#161D2E] rounded-card p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="text-[#F97316]" size={20} />
              <span>Department GPUs & Session Status</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">GPU Machine</th>
                    <th className="py-3 px-4">Lab</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Current User</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {gpus.map((gpu) => (
                    <tr key={gpu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {gpu.name} ({gpu.model})
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {gpu.lab_name}
                      </td>
                      <td className="py-3.5 px-4">
                        {gpu.status === "idle" && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[11px]">
                            Idle / Available
                          </span>
                        )}
                        {gpu.status === "allocated" && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 font-bold text-[11px]">
                            Allocated
                          </span>
                        )}
                        {gpu.status === "blocked" && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 font-bold text-[11px] flex items-center gap-1 w-fit">
                            <AlertOctagon size={12} />
                            Blocked (Misuse)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {gpu.current_session ? gpu.current_session.student_name : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {gpu.current_session ? (
                          <Link
                            href={`/incharge/sessions/${gpu.current_session.id}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                          >
                            Inspect Telemetry
                          </Link>
                        ) : (
                          <span className="text-slate-500 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
