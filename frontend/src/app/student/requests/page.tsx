"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import {
  Clock,
  CheckCircle2,
  AlertOctagon,
  KeyRound,
  X,
  Send,
  ShieldAlert,
  Cpu,
  PlusCircle,
  MessageSquare
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function MyRequestsPage() {
  const { token, wsMessage } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Student Unblock Modal State
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Appeal Modal State
  const [appealSessionId, setAppealSessionId] = useState<number | null>(null);
  const [explanation, setExplanation] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/requests/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error("Error fetching requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  useEffect(() => {
    if (wsMessage) {
      fetchRequests();
    }
  }, [wsMessage]);

  const handleOpenUnblockModal = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setOtpCode("");
    setError("");
    setSuccess("");
  };

  const handleExtendSession = async (requestId: number) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${requestId}/extend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ hours: 2 })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Failed to extend session");
      } else {
        alert("Session successfully extended by +2 hours!");
        fetchRequests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTerminateSession = async (sessionId: number) => {
    if (!confirm("Are you sure you want to terminate your GPU session early? This will return the GPU machine to the idle pool.")) return;
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/terminate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Failed to terminate session");
      } else {
        alert("Your GPU session has been terminated early. Your Lab Incharge has been notified.");
        fetchRequests();
      }
    } catch (e) {
      console.error("Error terminating session:", e);
    }
  };

  const handleTriggerTestMining = async (sessionId: number) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/test-mining`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert("⛏️ Test mining workload launched inside your active container! The live scanner will detect it and pause your session within 5 seconds.");
        fetchRequests();
      }
    } catch (e) {
      console.error("Error triggering test mining:", e);
    }
  };



  const handleStudentUnblockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE}/requests/unblock-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: selectedSessionId,
          code: otpCode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to verify Security OTP");
      }

      const data = await res.json();
      setSuccess("Security OTP verified! GPU access and session restored successfully.");
      fetchRequests();
      setTimeout(() => {
        setSelectedSessionId(null);
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Invalid OTP verification code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealSessionId) return;
    setAppealSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/requests/appeal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: appealSessionId,
          explanation: explanation
        })
      });
      if (res.ok) {
        alert("False Positive Appeal submitted to your Lab Incharge.");
        setAppealSessionId(null);
        fetchRequests();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAppealSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, position: number, sessionStatus?: string) => {
    if (sessionStatus === "flagged" || sessionStatus === "blocked") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-extrabold animate-pulse">
          <AlertOctagon size={13} />
          SESSION PAUSED (MISUSE FLAGGED)
        </span>
      );
    }

    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Active Session
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
            <Clock size={13} />
            Queued — Position #{position}
          </span>
        );
      case "pending_approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold">
            <Clock size={13} />
            Pending Approval
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 text-xs font-bold">
            <CheckCircle2 size={13} />
            Completed
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold">
            <AlertOctagon size={13} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-white transition-colors">
      <Sidebar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar
          title="My GPU Requests & Queue Status"
          subtitle="Track your pending approvals, active allocation status, and queue positions in real-time"
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {requests.length === 0 ? (
            <div className="bg-white dark:bg-[#161D2E] rounded-card p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <Cpu className="mx-auto text-slate-400 mb-3" size={48} />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                No GPU Requests Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You haven't submitted any GPU allocation requests yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((r) => {
                const isBlocked = r.session?.status === "flagged" || r.session?.status === "blocked";
                const isActive = r.status === "active" && !isBlocked;

                return (
                  <div
                    key={r.id}
                    className={`rounded-card p-6 border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all ${
                      isBlocked
                        ? "bg-rose-500/10 border-rose-500/30"
                        : "bg-white dark:bg-[#161D2E] border-slate-200/80 dark:border-slate-800"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                          {r.gpu_name} ({r.gpu_model})
                        </h3>
                        {getStatusBadge(r.status, r.queue_position, r.session?.status)}
                      </div>

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Lab: <span className="font-bold text-slate-700 dark:text-slate-200">{r.lab_name}</span>
                      </p>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <p className="text-slate-600 dark:text-slate-300 font-medium">
                          <span className="font-bold text-slate-900 dark:text-white">Stated Purpose:</span> {r.reason}
                        </p>
                        {r.whitelisted_binary_hash && (
                          <p className="text-emerald-400 text-[11px] font-mono">
                            🛡️ Whitelisted Binary: {r.whitelisted_binary_hash}
                          </p>
                        )}
                      </div>

                      {isBlocked && (
                        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-medium">
                          ⚠️ <strong>Session Blocked:</strong> Misuse detected on this machine. Obtain the 6-digit Security OTP from your Lab Incharge (Teacher) and enter it below to resume execution.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-start lg:items-end justify-between gap-4">
                      <div className="text-left lg:text-right space-y-1">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                          Request Window
                        </p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {new Date(r.start_time).toLocaleString()} — {new Date(r.end_time).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isActive && (
                          <>
                            <button
                              onClick={() => handleExtendSession(r.id)}
                              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5"
                            >
                              <PlusCircle size={15} />
                              <span>Extend (+2h)</span>
                            </button>
                            {r.session?.id && (
                              <>
                                <button
                                  onClick={() => handleTriggerTestMining(r.session.id)}
                                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                                >
                                  <AlertOctagon size={15} />
                                  <span>Test Mining Misuse</span>
                                </button>
                                <button
                                  onClick={() => handleTerminateSession(r.session.id)}
                                  className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5"
                                >
                                  <X size={15} />
                                  <span>Terminate Early</span>
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {isBlocked && r.session?.id && (
                          <>
                            <button
                              onClick={() => setAppealSessionId(r.session.id)}
                              className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5"
                            >
                              <MessageSquare size={15} />
                              <span>Appeal False Positive</span>
                            </button>
                            <button
                              onClick={() => handleOpenUnblockModal(r.session.id)}
                              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                            >
                              <KeyRound size={16} />
                              <span>Enter Teacher OTP</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Appeal False Positive Modal */}
        {appealSessionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#161D2E] rounded-card p-6 sm:p-8 max-w-md w-full border border-slate-800 shadow-2xl relative">
              <button
                onClick={() => setAppealSessionId(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={18} />
              </button>
              <h3 className="text-lg font-extrabold text-white mb-2">Submit False Positive Appeal</h3>
              <p className="text-xs text-slate-400 mb-4">
                Explain your workload (e.g. custom CUDA binary, non-Python ML framework) to your Lab Incharge.
              </p>
              <form onSubmit={handleAppealSubmit} className="space-y-4">
                <textarea
                  required
                  rows={4}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why this workload is legitimate academic research..."
                  className="w-full p-3 rounded-xl bg-[#0B1220] border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={appealSubmitting}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  {appealSubmitting ? "Submitting..." : "Submit Appeal"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Student OTP Entry Modal */}
        {selectedSessionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#161D2E] rounded-card p-6 sm:p-8 max-w-md w-full border border-slate-800 shadow-2xl relative">
              <button
                onClick={() => setSelectedSessionId(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Enter Teacher Security OTP
                  </h3>
                  <p className="text-xs text-slate-400">
                    Input the 6-digit passcode provided by your Lab Incharge
                  </p>
                </div>
              </div>

              {success ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={36} />
                  <p className="text-sm font-bold text-emerald-400">{success}</p>
                </div>
              ) : (
                <form onSubmit={handleStudentUnblockSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 rounded-xl bg-[#0B1220] border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    💡 Meet your Lab Incharge in person or contact them to obtain the authorization code.
                  </p>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Verify & Resume GPU Session</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
