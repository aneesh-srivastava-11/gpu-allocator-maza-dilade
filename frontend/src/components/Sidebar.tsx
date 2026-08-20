"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Cpu,
  LayoutDashboard,
  Clock,
  CheckSquare,
  UserCheck,
  Server,
  Terminal,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  FileText,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStudent = user?.role === "student";
  const isIncharge = user?.role === "incharge" || user?.role === "lab_incharge";
  const isSuperuser = user?.role === "superuser" || user?.role === "admin";

  const studentNav = [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "GPU Directory", href: "/student/gpus", icon: Cpu },
    { label: "My Requests & Queue", href: "/student/requests", icon: Clock },
    { label: "Launch Workspace", href: "/student/workspace", icon: Terminal },
  ];

  const inchargeNav = [
    { label: "Overview", href: "/incharge/dashboard", icon: LayoutDashboard },
    { label: "Approval Queue", href: "/incharge/approvals", icon: CheckSquare },
    { label: "Account Review", href: "/incharge/account-review", icon: UserCheck },
    { label: "GPU Directory", href: "/student/gpus", icon: Cpu },
  ];

  const superuserNav = [
    { label: "Admin Overview", href: "/admin/overview", icon: LayoutDashboard },
    { label: "Machine Registry", href: "/admin/machines", icon: Server },
    { label: "Audit Log", href: "/admin/audit-log", icon: FileText },
    { label: "Approval Queue", href: "/incharge/approvals", icon: CheckSquare },
    { label: "Account Review", href: "/incharge/account-review", icon: UserCheck },
    { label: "GPU Directory", href: "/student/gpus", icon: Cpu },
  ];

  const navItems = isStudent
    ? studentNav
    : isSuperuser
    ? superuserNav
    : inchargeNav;

  return (
    <>
      {/* Mobile Hamburger Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 bg-[#0B1220] text-white rounded-lg shadow-lg border border-slate-700"
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0B1220] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F97316] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Cpu size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">
                GPU Allocator
              </h1>
              <p className="text-xs text-slate-400 font-medium">Department Portal</p>
            </div>
          </div>

          {/* User Badge */}
          {user && (
            <div className="px-6 py-4 mx-3 my-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Logged in as
              </p>
              <p className="text-sm font-bold text-slate-100 truncate mt-0.5">{user.name}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    user.role === "student"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : isSuperuser
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  }`}
                >
                  {user.role === "student"
                    ? "Student"
                    : isSuperuser
                    ? "Superuser"
                    : "Lab Incharge"}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="mt-2 px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? "bg-[#F97316] text-white shadow-md shadow-orange-500/30 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={isActive ? "stroke-[2.5]" : "stroke-[2] text-slate-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
