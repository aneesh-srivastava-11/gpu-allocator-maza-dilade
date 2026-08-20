"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { HeroBanner } from "@/components/HeroBanner";
import { useAuth } from "@/context/AuthContext";
import { Server, Download, Plus, Terminal, Monitor, RefreshCw, CheckCircle2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function SuperuserMachinesPage() {
  const { token } = useAuth();
  const [machines, setMachines] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [machineName, setMachineName] = useState("");
  const [selectedLabId, setSelectedLabId] = useState<number>(1);
  const [osType, setOsType] = useState<"windows" | "linux">("windows");
  const [generatedScript, setGeneratedScript] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, lRes] = await Promise.all([
        fetch(`${API_BASE}/machines`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/labs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (mRes.ok) setMachines(await mRes.json());
      if (lRes.ok) setLabs(await lRes.json());
    } catch (err) {
      console.error("[FETCH MACHINES ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/machines/generate-script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: machineName,
          lab_id: selectedLabId,
          os: osType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedScript(data);
        fetchData();
      }
    } catch (err) {
      console.error("[GENERATE SCRIPT ERROR]", err);
    } finally {
      setGenerating(false);
    }
  };

  const downloadScriptFile = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript.script_content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generatedScript.filename;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1524] text-slate-900 dark:text-white flex">
      <Sidebar />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <TopBar title="Machine Registry & Installer Generator" subtitle="PRD v2.0 Pilot Onboarding Tool" />

        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          <HeroBanner
            title="Department Fleet Registry"
            subtitle="Register new machines, monitor hardware-bound identities, and generate baseline install scripts for automated pilot rollout."
            actionText="Register New Machine"
            onActionClick={() => {
              setGeneratedScript(null);
              setModalOpen(true);
            }}
          />

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Registered Workstations ({machines.length})</h3>
            <button
              onClick={fetchData}
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {machines.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-[#161D2E] rounded-card p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base flex items-center gap-2">
                        <Server size={18} className="text-[#F97316]" />
                        <span>{m.name}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{m.lab_name}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        m.status === "idle"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : m.status === "allocated"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <p className="flex justify-between">
                      <span className="text-slate-400">GPU Hardware:</span>
                      <span className="font-semibold text-slate-200">{m.model}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Operating System:</span>
                      <span className="font-semibold uppercase text-slate-200">{m.os}</span>
                    </p>
                    <p className="flex justify-between truncate">
                      <span className="text-slate-400">Hardware ID:</span>
                      <span className="font-mono text-[11px] text-orange-400 truncate max-w-[160px]">
                        {m.hardware_id}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Registration Modal */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#161D2E] rounded-card p-6 sm:p-8 max-w-lg w-full border border-slate-800 shadow-2xl relative">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Terminal size={22} className="text-[#F97316]" />
                  <span>Register Machine & Generate Script</span>
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Generates a one-time registration token and a downloadable script that performs a baseline reset and installs the telemetry agent.
                </p>

                {generatedScript ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <CheckCircle2 size={18} />
                        <span>Registration Script Ready!</span>
                      </div>
                      <p className="text-slate-300">
                        Token: <code className="text-orange-400 font-mono">{generatedScript.registration_token}</code>
                      </p>
                    </div>

                    <button
                      onClick={downloadScriptFile}
                      className="w-full py-3 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      <span>Download {generatedScript.filename}</span>
                    </button>

                    <button
                      onClick={() => setModalOpen(false)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-bold text-xs"
                    >
                      Close Window
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleGenerateScript} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Machine Name / Hostname
                      </label>
                      <input
                        type="text"
                        required
                        value={machineName}
                        onChange={(e) => setMachineName(e.target.value)}
                        placeholder="GPU-WS-05"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#F97316]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                          Target Lab
                        </label>
                        <select
                          value={selectedLabId}
                          onChange={(e) => setSelectedLabId(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#F97316]"
                        >
                          {labs.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                          OS Type
                        </label>
                        <select
                          value={osType}
                          onChange={(e) => setOsType(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#F97316]"
                        >
                          <option value="windows">Windows (PowerShell)</option>
                          <option value="linux">Linux (Bash)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={generating}
                        className="flex-1 py-3 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {generating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <>
                            <Plus size={16} />
                            <span>Generate Install Script</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
