"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import { Cpu, Server, Clock, CheckCircle2, AlertOctagon, Plus, X, Send } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function GpuDirectoryPage() {
  const { token, wsMessage } = useAuth();
  const [gpus, setGpus] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [selectedLab, setSelectedLab] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedGpu, setSelectedGpu] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(2);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchData = async () => {
    if (!token) return;
    try {
      const [gpuRes, labRes] = await Promise.all([
        fetch(`${API_BASE}/gpus${selectedLab !== "all" ? `?lab_id=${selectedLab}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/labs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (gpuRes.ok) {
        const gpuData = await gpuRes.json();
        setGpus(gpuData);
      }
      if (labRes.ok) {
        const labData = await labRes.json();
        setLabs(labData);
      }
    } catch (e) {
      console.error("Error fetching GPUs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, selectedLab]);

  useEffect(() => {
    if (wsMessage) {
      fetchData();
    }
  }, [wsMessage]);

  const handleOpenRequestModal = (gpu: any) => {
    setSelectedGpu(gpu);
    setReason("");
    setHours(2);
    setSubmitSuccess(null);
    setSubmitError("");
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGpu) return;

    setSubmitting(true);
    setSubmitError("");

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + hours * 3600 * 1000);

    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gpu_id: selectedGpu.id,
          reason,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to submit request");
      }

      const data = await res.json();
      setSubmitSuccess(data);
      fetchData();
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-slate-900 dark:text-white transition-colors">
      <Sidebar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar
          title="GPU Hardware Directory"
          subtitle="Browse available department GPU machines across labs and request allocation"
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white dark:bg-[#161D2E] p-4 rounded-card border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <Server className="text-[#F97316]" size={20} />
              <span className="text-sm font-bold">Filter by Department Lab:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setSelectedLab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedLab === "all"
                    ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All Labs
              </button>
              {labs.map((lab) => (
                <button
                  key={lab.id}
                  onClick={() => setSelectedLab(lab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedLab === lab.id
                      ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {lab.name}
                </button>
              ))}
            </div>
          </div>

          {/* GPU Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gpus.map((gpu) => (
              <div
                key={gpu.id}
                className="bg-white dark:bg-[#161D2E] rounded-card p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:shadow-lg"
              >
                <div>
                  {/* Status Badge */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {gpu.lab_name}
                    </span>

                    {gpu.status === "idle" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Available / Idle
                      </span>
                    )}

                    {gpu.status === "allocated" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Allocated (In Use)
                      </span>
                    )}

                    {gpu.status === "blocked" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold">
                        <AlertOctagon size={13} />
                        Access Blocked
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
                    {gpu.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                    Model: <span className="font-bold text-slate-700 dark:text-slate-200">{gpu.model}</span>
                  </p>

                  {/* Active session info if busy */}
                  {gpu.current_session && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-xs mb-4">
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        Active User: {gpu.current_session.student_name}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 truncate">
                        Reason: {gpu.current_session.reason}
                      </p>
                    </div>
                  )}

                  {/* Queue Indicator */}
                  {gpu.queued_requests_count > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 mb-4">
                      <Clock size={14} />
                      <span>{gpu.queued_requests_count} student(s) currently in queue</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleOpenRequestModal(gpu)}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                    gpu.status === "idle"
                      ? "bg-[#F97316] hover:bg-orange-600 text-white shadow-orange-500/20"
                      : "bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <Plus size={16} />
                  <span>{gpu.status === "idle" ? "Request Immediate Allocation" : "Join Request Queue"}</span>
                </button>
              </div>
            ))}
          </div>
        </main>

        {/* Modal Request Form */}
        {selectedGpu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#161D2E] rounded-card p-6 sm:p-8 max-w-lg w-full border border-slate-800 shadow-2xl relative">
              <button
                onClick={() => setSelectedGpu(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#F97316] flex items-center justify-center border border-orange-500/30">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Request GPU: {selectedGpu.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedGpu.lab_name} • {selectedGpu.model}
                  </p>
                </div>
              </div>

              {submitSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={40} />
                  <h4 className="text-base font-bold text-emerald-400 mb-1">
                    {submitSuccess.status === "queued" ? "Queued Successfully!" : "Request Submitted!"}
                  </h4>
                  <p className="text-xs text-slate-300 mb-6">{submitSuccess.message}</p>
                  <button
                    onClick={() => setSelectedGpu(null)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                      {submitError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Academic Reason & Purpose
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Fine-tuning LLaMA 3 8B model for Computer Vision course project..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B1220] border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#F97316]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Requested Duration (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={hours}
                      onChange={(e) => setHours(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B1220] border border-slate-700 text-white text-sm focus:outline-none focus:border-[#F97316]"
                    />
                  </div>

                  {selectedGpu.status !== "idle" && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                      <Clock size={16} />
                      <span>Note: This GPU is currently occupied. You will be placed in position #{selectedGpu.queued_requests_count + 1} in the queue.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Submit Request</span>
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
