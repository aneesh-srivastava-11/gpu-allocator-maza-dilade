"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { HeroBanner } from "@/components/HeroBanner";
import { useAuth } from "@/context/AuthContext";
import { Terminal, KeyRound, Play, CheckCircle2, AlertCircle, Cpu } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function StudentWorkspacePage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [otpCode, setOtpCode] = useState("");
  const [verifyingSessionId, setVerifyingSessionId] = useState<number | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const [launchResult, setLaunchResult] = useState<any | null>(null);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/requests/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("[FETCH REQUESTS ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMyRequests();
  }, [token]);

  const handleVerifyAndLaunch = async (sessionId: number) => {
    setVerificationError("");
    setVerifyingSessionId(sessionId);
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: otpCode }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "One-time code verification failed");
      }

      const data = await res.json();
      setLaunchResult(data);
      fetchMyRequests();
    } catch (err: any) {
      setVerificationError(err.message || "Invalid or expired launch code.");
    } finally {
      setVerifyingSessionId(null);
    }
  };

  const activeOrApprovedRequests = requests.filter(
    (r) => r.status === "approved" || r.status === "active"
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1524] text-slate-900 dark:text-white flex">
      <Sidebar />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <TopBar title="Launch GPU Workspace" subtitle="PRD v2.0 Launch-Time Access Control" />

        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          <HeroBanner
            title="Session One-Time Code Verification"
            subtitle="Once your GPU request is approved, enter the in-app code delivered below to launch your JupyterLab environment."
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]" />
            </div>
          ) : activeOrApprovedRequests.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#161D2E] rounded-card border border-slate-200 dark:border-slate-800 shadow-sm">
              <Cpu size={48} className="mx-auto text-slate-500 mb-3 opacity-60" />
              <h4 className="text-base font-bold">No Active or Approved Sessions</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                You currently do not have an approved GPU session awaiting workspace launch. Submit a request from the GPU Directory first.
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto">
              {activeOrApprovedRequests.map((req) => {
                const session = req.session;
                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-[#161D2E] rounded-card p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                          {req.lab_name}
                        </span>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                          <Terminal size={22} className="text-[#F97316]" />
                          <span>{req.gpu_name}</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{req.reason}</p>
                      </div>

                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {req.status === "approved" ? "Awaiting Code Entry" : "Workspace Active"}
                      </span>
                    </div>

                    {launchResult && session && launchResult.session_id === session.id ? (
                      <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3 text-center">
                        <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
                        <h4 className="text-lg font-bold text-white">Workspace Authorization Successful!</h4>
                        <p className="text-xs text-slate-300">
                          Your GPU workspace instance is live and allocated to your session.
                        </p>
                        <a
                          href={launchResult.jupyter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20"
                        >
                          <Play size={16} />
                          <span>Open JupyterLab Workspace</span>
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-[#0B1220] border border-slate-800 space-y-2">
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>One-Time Session Launch Passcode</span>
                            <span className="text-[10px] text-orange-400 font-bold">In-App Delivered</span>
                          </label>
                          <div className="relative">
                            <KeyRound className="absolute left-3.5 top-3 text-slate-500" size={18} />
                            <input
                              type="text"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="Enter 6-Digit Launch Code (e.g. 849201)"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-[#F97316]"
                            />
                          </div>
                        </div>

                        {verificationError && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>{verificationError}</span>
                          </div>
                        )}

                        <button
                          onClick={() => session && handleVerifyAndLaunch(session.id)}
                          disabled={!session || !otpCode || verifyingSessionId === session?.id}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F97316] to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                          {verifyingSessionId === session?.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          ) : (
                            <>
                              <Play size={16} />
                              <span>Verify Code & Launch JupyterLab Workspace</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
