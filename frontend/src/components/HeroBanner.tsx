"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface HeroBannerProps {
  title: string;
  subtitle: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  title,
  subtitle,
  actionText,
  actionHref,
  onActionClick,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#F97316] via-orange-600 to-amber-600 p-8 sm:p-10 text-white shadow-xl shadow-orange-500/15 mb-8">
      {/* Background Decorative Graphic */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-20 top-0 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-4 text-orange-100 border border-white/20">
          <Sparkles size={13} />
          <span>Department GPU Access Platform</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
          {title}
        </h1>

        <p className="text-base sm:text-lg text-orange-100 font-medium leading-relaxed mb-6">
          {subtitle}
        </p>

        {actionText && (
          <div>
            {actionHref ? (
              <Link
                href={actionHref}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-orange-600 font-bold text-sm shadow-lg shadow-black/10 hover:bg-orange-50 transition-all hover:gap-3"
              >
                <span>{actionText}</span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                onClick={onActionClick}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-orange-600 font-bold text-sm shadow-lg shadow-black/10 hover:bg-orange-50 transition-all hover:gap-3"
              >
                <span>{actionText}</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
