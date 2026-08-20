"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = "default",
}) => {
  const variantStyles = {
    default: "text-slate-900 dark:text-white",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="bg-white dark:bg-[#161D2E] rounded-card p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </p>

        {/* Dark Icon Chip */}
        <div className="w-10 h-10 rounded-xl bg-[#0B1220] flex items-center justify-center text-[#F97316] shadow-sm">
          <Icon size={20} className="stroke-[2.2]" />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className={`text-3xl font-extrabold tracking-tight ${variantStyles[variant]}`}>
          {value}
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {subtext}
        </p>
      </div>
    </div>
  );
};
