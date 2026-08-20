"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Moon, Sun } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const { darkMode, toggleDarkMode } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#161D2E]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme mode"
          >
            {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};
