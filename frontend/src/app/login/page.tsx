"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Cpu, Lock, Mail, ArrowRight, UserCheck, ShieldCheck, ShieldAlert } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [roleTab, setRoleTab] = useState<"student" | "incharge" | "superuser">("student");
  const [email, setEmail] = useState("student@dept.edu");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleTabChange = (role: "student" | "incharge" | "superuser") => {
    setRoleTab(role);
    setError("");
    if (role === "student") {
      setEmail("student@dept.edu");
      setPassword("password123");
    } else if (role === "incharge") {
      setEmail("incharge@dept.edu");
      setPassword("password123");
    } else {
      setEmail("superuser@dept.edu");
      setPassword("password123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Login failed");
      }

      const data = await res.json();
      login(data.access_token, data.user);

      if (data.user.role === "student") {
        router.push("/student/dashboard");
      } else if (data.user.role === "superuser" || data.user.role === "admin") {
        router.push("/admin/overview");
      } else {
        router.push("/incharge/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#0B1220] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F97316] to-amber-500 text-white shadow-xl shadow-orange-500/20 mb-4">
            <Cpu size={36} className="stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            GPU Allocator Portal
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-2">
            Department GPU Access & Governance System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#161D2E] rounded-card p-8 border border-slate-800 shadow-2xl">
          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B1220] rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => handleRoleTabChange("student")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                roleTab === "student"
                  ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserCheck size={13} />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleTabChange("incharge")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                roleTab === "incharge"
                  ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck size={13} />
              <span>Incharge</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleTabChange("superuser")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                roleTab === "superuser"
                  ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldAlert size={13} />
              <span>Superuser</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Department Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@dept.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B1220] border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#F97316] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B1220] border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#F97316] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Student Signup Link */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-400">
              New Student?{" "}
              <Link href="/signup" className="text-[#F97316] font-bold hover:underline">
                Create an Account with ID Verification
              </Link>
            </p>
          </div>

          {/* Quick Demo Preset Login Helpers */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Quick Demo Presets
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  handleRoleTabChange("student");
                  setEmail("student@dept.edu");
                  setPassword("password123");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700"
              >
                Alex (Student)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRoleTabChange("incharge");
                  setEmail("incharge@dept.edu");
                  setPassword("password123");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700"
              >
                Dr. Vance (Incharge)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRoleTabChange("superuser");
                  setEmail("superuser@dept.edu");
                  setPassword("password123");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700"
              >
                Dr. Connor (Superuser)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
