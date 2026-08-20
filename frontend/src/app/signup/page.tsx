"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CameraCapture } from "@/components/CameraCapture";
import { Cpu, ArrowRight, CheckCircle, ShieldCheck } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [password, setPassword] = useState("");
  const [idBlob, setIdBlob] = useState<Blob | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!idBlob) {
      setError("A live photo capture of your student ID card is mandatory.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("rollNumber", rollNumber);
      formData.append("department", department);
      formData.append("password", password);
      formData.append("idCardImage", idBlob, "student_id.jpg");

      const res = await fetch(`${API_BASE}/accounts`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Signup failed");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during account creation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#0B1220] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 py-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F97316] to-amber-500 text-white shadow-xl shadow-orange-500/20 mb-3">
            <Cpu size={32} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Student Onboarding & Verification
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Department GPU Management Portal (PRD v2.0 Identity Flow)
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#161D2E] rounded-card p-6 sm:p-8 border border-slate-800 shadow-2xl">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle size={36} />
              </div>
              <h2 className="text-xl font-bold text-white">Account Created Successfully!</h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Your account is currently <span className="text-amber-400 font-bold">Pending Review</span>. Your Lab Incharge will inspect your details and ID verification photo shortly.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#F97316] text-white font-bold text-xs shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all mt-4"
              >
                <span>Return to Login</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name (Printed on ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0B1220] border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Roll / Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="CS2026-88"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0B1220] border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#F97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Department Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@dept.edu"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0B1220] border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0B1220] border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#F97316]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>In-App Live ID Card Capture</span>
                  <span className="text-[10px] text-amber-400 font-bold">Gallery Upload Disabled</span>
                </label>
                <CameraCapture onCapture={(blob) => setIdBlob(blob)} />
              </div>

              <button
                type="submit"
                disabled={loading || !idBlob}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Submit Account for Verification</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link href="/login" className="text-xs text-slate-400 hover:text-white">
              Already have an account? <span className="text-[#F97316] font-bold">Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
