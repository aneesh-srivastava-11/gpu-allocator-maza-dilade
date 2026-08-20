"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { HeroBanner } from "@/components/HeroBanner";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, User, RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function AccountReviewPage() {
  const { token } = useAuth();
  const [pendingAccounts, setPendingAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPendingAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounts/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingAccounts(data);
      }
    } catch (err) {
      console.error("[FETCH PENDING ACCOUNTS ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPendingAccounts();
    }
  }, [token]);

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/accounts/${userId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPendingAccounts((prev) => prev.filter((a) => a.id !== userId));
      }
    } catch (err) {
      console.error("[APPROVE ERROR]", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: number) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/accounts/${userId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPendingAccounts((prev) => prev.filter((a) => a.id !== userId));
      }
    } catch (err) {
      console.error("[REJECT ERROR]", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1524] text-slate-900 dark:text-white flex">
      <Sidebar />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <TopBar title="Account Verification Queue" subtitle="PRD v2.0 Identity Onboarding Review" />

        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          <HeroBanner
            title="Student Account Verification"
            subtitle="Inspect captured ID cards and OCR name-match signals to approve or reject pending student registrations."
          />

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">
              Pending Reviews ({pendingAccounts.length})
            </h3>
            <button
              onClick={fetchPendingAccounts}
              className="p-2 rounded-xl bg-white dark:bg-[#161D2E] border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]" />
            </div>
          ) : pendingAccounts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#161D2E] rounded-card border border-slate-200 dark:border-slate-800 shadow-sm">
              <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-3 opacity-80" />
              <h4 className="text-base font-bold">All Account Reviews Clear!</h4>
              <p className="text-xs text-slate-400 mt-1">
                There are currently no student accounts waiting for identity verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingAccounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white dark:bg-[#161D2E] rounded-card p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <User size={18} className="text-[#F97316]" />
                        <span>{account.name}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{account.email}</p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        Roll: {account.roll_number || "N/A"} • {account.department || "CS"}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        account.id_name_match
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {account.id_name_match ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>OCR Match</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={12} />
                          <span>Name Mismatch</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* ID Card Image Inspection Box */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Live In-App Captured ID Card
                    </p>
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700 aspect-video flex items-center justify-center">
                      {account.id_card_image_url ? (
                        <img
                          src={account.id_card_image_url}
                          alt="Student ID Card"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <User size={32} className="mx-auto text-slate-600 mb-1" />
                          <p className="text-xs text-slate-500">No Image Uploaded</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                      <strong className="text-slate-300">OCR Extracted Text:</strong>{" "}
                      {account.id_ocr_extracted_name || "Unclear text match"}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleApprove(account.id)}
                      disabled={actionLoading === account.id}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      <span>Approve Account</span>
                    </button>
                    <button
                      onClick={() => handleReject(account.id)}
                      disabled={actionLoading === account.id}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs border border-rose-500/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
