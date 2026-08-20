"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import { CheckSquare, Check, X, Clock, User, Cpu, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function ApprovalsPage() {
  const { token, wsMessage } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");

  const fetchPending = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/requests/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data);
      }
    } catch (e) {
      console.error("Error fetching pending requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [token]);

  useEffect(() => {
    if (wsMessage) {
      fetchPending();
    }
  }, [wsMessage]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActionMessage("Request approved successfully!");
        fetchPending();
        setTimeout(() => setActionMessage(""), 3000);
      }
    } catch (e) {
      console.error("Error approving request:", e);
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActionMessage("Request rejected.");
        fetchPending();
        setTimeout(() => setActionMessage(""), 3000);
      }
    } catch (e) {
      console.error("Error rejecting request:", e);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-white transition-colors">
      <Sidebar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar
          title="Pending Request Approval Queue"
          subtitle="Review student GPU allocation applications across your managed department labs"
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {actionMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-2">
              <Check size={18} />
              <span>{actionMessage}</span>
            </div>
          )}

          {pendingRequests.length === 0 ? (
            <div className="bg-white dark:bg-[#161D2E] rounded-card p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CheckSquare className="mx-auto text-emerald-500 mb-3" size={48} />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Pending Queue is Clear!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                There are currently no pending student GPU access applications requiring approval.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-[#161D2E] rounded-card p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                        <User size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {req.student_name} <span className="text-xs text-slate-400 font-mono">({req.student_roll || "Student"})</span>
                        </h4>
                        <p className="text-xs font-semibold text-[#F97316]">
                          Requesting: {req.gpu_name} • {req.lab_name}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-xs">
                      <p className="text-slate-600 dark:text-slate-300 font-medium">
                        <span className="font-bold text-slate-900 dark:text-white">Stated Academic Reason:</span> {req.reason}
                      </p>
                    </div>

                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                      <Clock size={13} />
                      Requested Window: {new Date(req.start_time).toLocaleString()} — {new Date(req.end_time).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs border border-rose-500/30 flex items-center justify-center gap-2 transition-colors"
                    >
                      <X size={16} />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check size={16} />
                      <span>Approve Access</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
