"use client";

import React, { useEffect, useState, use } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  Clock,
  KeyRound,
  XCircle,
  Activity,
  RefreshCw,
  User,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;

  const { token, wsMessage } = useAuth();
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    if (!token || !sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      }
    } catch (e) {
      console.error("Error fetching session detail:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [token, sessionId]);

  useEffect(() => {
    if (wsMessage) {
      fetchSession();
    }
  }, [wsMessage]);

  const handleTerminate = async () => {
    if (!confirm("Are you sure you want to terminate this allocation session?")) return;
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/terminate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchSession();
      }
    } catch (e) {
      console.error("Error terminating session:", e);
    }
  };

  if (loading || !sessionData) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-white transition-colors">
        <Sidebar />
        <div className="md:pl-64 flex flex-col min-h-screen">
          <TopBar title="Session Inspector" />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F97316]" />
          </div>
        </div>
      </div>
    );
  }

  const isBlocked = sessionData.status === "flagged" || sessionData.status === "blocked";

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-white transition-colors">
      <Sidebar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar
          title={`Session Inspector — #${sessionData.id}`}
          subtitle={`Monitoring machine ${sessionData.gpu_name} allocated to ${sessionData.student_name}`}
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Status Header Banner */}
          <div
            className={`rounded-card p-6 sm:p-8 border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              isBlocked
                ? "bg-rose-500/10 border-rose-500/30 text-white"
                : "bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800"
            }`}
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-extrabold">
                  {sessionData.gpu_name} ({sessionData.lab_name})
                </h2>

                {isBlocked ? (
                  <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <AlertOctagon size={14} />
                    SESSION PAUSED (MISUSE FLAGGED)
                  </span>
                ) : sessionData.status === "active" ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Active Normal Monitoring
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-bold">
                    Completed
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 font-medium">
                Student: <span className="font-bold text-white">{sessionData.student_name}</span> ({sessionData.student_email})
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Stated Purpose: <span className="text-slate-200">{sessionData.reason}</span>
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {sessionData.status !== "completed" && (
                <button
                  onClick={handleTerminate}
                  className="px-5 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/40 flex items-center gap-2 transition-all"
                >
                  <XCircle size={16} />
                  <span>Terminate Session</span>
                </button>
              )}
            </div>
          </div>

          {/* TEACHER SECURITY PASSCODE BOX (If Blocked) */}
          {isBlocked && (
            <div className="bg-[#161D2E] rounded-card p-6 sm:p-8 border-2 border-emerald-500/40 shadow-xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-emerald-500">
                <KeyRound size={120} />
              </div>

              <div className="relative z-10 max-w-xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                  <KeyRound size={14} />
                  <span>Teacher Security Authorization Passcode</span>
                </div>

                <h3 className="text-xl font-extrabold text-white">
                  Give This OTP Code To Student
                </h3>

                <div className="p-4 rounded-2xl bg-[#0B1220] border border-emerald-500/30 inline-block px-10">
                  <span className="text-4xl sm:text-5xl font-mono font-black tracking-[0.3em] text-emerald-400">
                    {sessionData.active_otp_code || "GENERATING..."}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 text-left space-y-1">
                  <p className="font-bold text-emerald-400">📋 Recovery Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Review the misuse evidence below with student <strong className="text-white">{sessionData.student_name}</strong> in person.</li>
                    <li>If satisfied with their explanation, provide the 6-digit Security Passcode above to the student.</li>
                    <li>The student must enter this code on their Student Portal to unblock and resume GPU access.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Misuse Evidence Breakdown Card (if flagged) */}
          {sessionData.flags && sessionData.flags.length > 0 && (
            <div className="bg-[#161D2E] rounded-card p-6 border border-rose-500/40 shadow-xl">
              <h3 className="text-lg font-extrabold text-rose-400 mb-4 flex items-center gap-2">
                <ShieldAlert size={22} />
                <span>Misuse Detection Evidence Breakdown</span>
              </h3>

              <div className="space-y-4">
                {sessionData.flags.map((flag: any) => (
                  <div key={flag.id} className="p-4 rounded-xl bg-[#0B1220] border border-rose-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider">
                        {flag.type} Misuse Detected
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(flag.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-200">
                      Reason: {flag.evidence?.reason || "Heuristic trigger"}
                    </p>

                    <pre className="p-3 rounded-lg bg-black/40 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
                      {JSON.stringify(flag.evidence, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Telemetry Stream Feed */}
          <div className="bg-white dark:bg-[#161D2E] rounded-card p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="text-[#F97316]" size={20} />
                <span>Live Hardware Telemetry Feed (Worker Agent Reports)</span>
              </h3>
              <button
                onClick={fetchSession}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {sessionData.telemetry.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Waiting for initial telemetry report from mock worker agent...
                </p>
              ) : (
                sessionData.telemetry.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Util: <span className={t.gpu_util_pct > 80 ? "text-amber-400 font-extrabold" : "text-emerald-400 font-bold"}>{t.gpu_util_pct}%</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(t.reported_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Process Signatures
                        </p>
                        <ul className="space-y-1 font-mono text-[11px]">
                          {t.process_signature?.map((p: any, idx: number) => (
                            <li key={idx} className="text-slate-300">
                              PID {p.pid}: <span className="font-bold text-amber-300">{p.name}</span> ({p.cmd})
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Outbound Network Connections
                        </p>
                        <ul className="space-y-1 font-mono text-[11px]">
                          {t.network_connections?.map((c: any, idx: number) => (
                            <li key={idx} className="text-slate-300">
                              {c.dest}:{c.port} ({c.proto})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
