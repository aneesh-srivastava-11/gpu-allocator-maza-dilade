"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Clock, User, FileText, Activity } from "lucide-react";

interface AuditLog {
  id: number;
  actor_name: string;
  action_type: string;
  session_id: number | null;
  justification_note: string | null;
  created_at: string;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8010/audit/logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "APPROVE":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">APPROVE</span>;
      case "REJECT":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">REJECT</span>;
      case "UNBLOCK":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">UNBLOCK</span>;
      case "TERMINATE":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-600/20 text-red-400 border border-red-600/30">TERMINATE</span>;
      case "EXTEND":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">EXTEND</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">{action}</span>;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <ShieldCheck className="text-[#F97316]" size={32} />
            Governance Audit Log
          </h1>
          <p className="text-slate-400 mt-1">
            Immutable audit record of all approvals, rejections, OTP unblocks, extensions, and terminations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400">Loading audit records...</div>
      ) : logs.length === 0 ? (
        <div className="bg-[#1E293B] p-8 rounded-xl text-center border border-slate-800 text-slate-400">
          No audit entries recorded yet.
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#0F172A] text-slate-400 uppercase text-xs border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Actor</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Session ID</th>
                <th className="px-6 py-4 font-semibold">Justification / Details</th>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-2">
                    <User size={16} className="text-[#F97316]" />
                    {log.actor_name}
                  </td>
                  <td className="px-6 py-4">{getActionBadge(log.action_type)}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono">
                    {log.session_id ? `#${log.session_id}` : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-slate-300 max-w-md truncate">
                    {log.justification_note || "No note attached"}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs flex items-center gap-1.5">
                    <Clock size={14} />
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
