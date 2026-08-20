"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { HeroBanner } from "@/components/HeroBanner";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { Cpu, Clock, CheckCircle2, AlertOctagon, ArrowRight, ShieldCheck, Zap, KeyRound } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function StudentDashboard() {
  const { user, token, wsMessage } = useAuth();
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [reqRes, labRes] = await Promise.all([
        fetch(`${API_BASE}/requests/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/labs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setMyRequests(reqData);
      }
      if (labRes.ok) {
        const labData = await labRes.json();
        setLabs(labData);
      }
    } catch (e) {
      console.error("Error fetching student dashboard data:", e);
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

  const activeReq = myRequests.find((r) => r.status === "active" || r.status === "approved");
  const blockedReq = myRequests.find((r) => r.session?.status === "flagged" || r.session?.status === "blocked");
  const queuedReqs = myRequests.filter((r) => r.status === "queued");
  const completedReqs = myRequests.filter((r) => r.status === "completed");
  const totalAvailableGpus = labs.reduce((acc, l) => acc + l.idle_gpus, 0);

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-white transition-colors">
      <Sidebar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar
          title="Student Overview"
          subtitle="Department GPU Access & Reservation Portal"
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {/* Hero Banner */}
          <HeroBanner
            title={`Welcome back, ${user?.name || "Student"}!`}
            subtitle="Reserve department GPU compute machines for machine learning, deep learning research, and coursework."
            actionText="Browse Available GPUs"
            actionHref="/student/gpus"
          />

          {/* Critical Blocked Alert Card (if student session is flagged) */}
          {blockedReq && (
            <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-card p-6 mb-8 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                    <AlertOctagon size={26} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-rose-500">
                      SESSION PAUSED — MISUSE DETECTED ON {blockedReq.gpu_name}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-1">
                      Unusual process or network activity was detected. Contact your Lab Incharge (Teacher) to receive your 6-digit Security OTP.
                    </p>
                  </div>
                </div>

                <Link
                  href="/student/requests"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 whitespace-nowrap flex items-center gap-2"
                >
                  <KeyRound size={16} />
                  <span>Enter OTP to Resume</span>
                </Link>
              </div>
            </div>
          )}

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Active Session"
              value={blockedReq ? "Blocked" : activeReq ? "1 GPU Active" : "None"}
              subtext={blockedReq ? `Paused on ${blockedReq.gpu_name}` : activeReq ? `Running on ${activeReq.gpu_name}` : "No active session"}
              icon={Zap}
              variant={blockedReq ? "danger" : activeReq ? "success" : "default"}
            />
            <StatCard
              title="Queued Requests"
              value={queuedReqs.length}
              subtext={queuedReqs.length > 0 ? `Next position: #${queuedReqs[0].queue_position}` : "No queued requests"}
              icon={Clock}
              variant={queuedReqs.length > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Completed Sessions"
              value={completedReqs.length}
              subtext="Successfully finished allocations"
              icon={CheckCircle2}
            />
            <StatCard
              title="Available GPUs"
              value={totalAvailableGpus}
              subtext={`Across ${labs.length} department labs`}
              icon={Cpu}
            />
          </div>

          {/* Current Status Section */}
          <div className="bg-white dark:bg-[#161D2E] rounded-card p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-8">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="text-[#F97316]" size={20} />
              <span>Current Allocation Status</span>
            </h3>

            {activeReq && !blockedReq ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      Active GPU Session — {activeReq.gpu_name} ({activeReq.gpu_model})
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                    Lab: <span className="font-bold text-slate-900 dark:text-white">{activeReq.lab_name}</span> | Reason: {activeReq.reason}
                  </p>
                </div>
                <Link
                  href="/student/requests"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
                >
                  View Details
                </Link>
              </div>
            ) : queuedReqs.length > 0 ? (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Clock size={18} />
                    <span>Queued for {queuedReqs[0].gpu_name} — Position #{queuedReqs[0].queue_position}</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                    Your request will be submitted for Lab Incharge approval as soon as the current session ends.
                  </p>
                </div>
                <Link
                  href="/student/requests"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  Track Queue Position
                </Link>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Cpu className="mx-auto text-slate-400 mb-3" size={36} />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  You currently have no active GPU allocations or queued requests.
                </p>
                <Link
                  href="/student/gpus"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F97316] text-white font-bold text-xs shadow-md shadow-orange-500/20 mt-4 hover:bg-orange-600 transition-colors"
                >
                  <span>Request a GPU Machine</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
