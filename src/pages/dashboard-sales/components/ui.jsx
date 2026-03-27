import React from "react";
import { cn } from "../utils/utils";

export const Card = ({ className, children }) => (
  <div
    className={cn(
      "rounded-2xl bg-white/85 backdrop-blur-xl border border-white/60 shadow-[0_20px_60px_rgba(17,24,39,0.08)]",
      className
    )}
  >
    {children}
  </div>
);

export const PillSelect = ({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-2.5 pr-10 text-sm text-slate-700 shadow-sm outline-none ring-0 transition focus:border-fuchsia-200 focus:ring-4 focus:ring-fuchsia-200/40"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5.25 7.5 10 12.25 14.75 7.5 16 8.75 10 14.75 4 8.75z" />
      </svg>
    </div>
  </div>
);

export const IconBadge = ({ children, tone = "pink" }) => {
  const toneMap = {
    pink:   "bg-fuchsia-100 text-fuchsia-600",
    purple: "bg-violet-100 text-violet-600",
    blue:   "bg-sky-100 text-sky-600",
    orange: "bg-amber-100 text-amber-700",
  };
  return (
    <div className={cn("h-12 w-12 rounded-2xl grid place-items-center shadow-sm", toneMap[tone])}>
      <span className="text-xl">{children}</span>
    </div>
  );
};

export const TinyLegendDot = ({ colorClass }) => (
  <span className={cn("inline-block h-2.5 w-2.5 rounded-full", colorClass)} />
);

export const StatRow = ({ icon, tone, label, value }) => (
  <div className="flex items-center gap-3">
    <IconBadge tone={tone}>{icon}</IconBadge>
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="truncate text-base font-semibold text-slate-800">{value}</p>
    </div>
  </div>
);

export const SoftButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(236,72,153,0.25)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_40px_rgba(236,72,153,0.28)] active:translate-y-[0px]"
  >
    {children}
  </button>
);

export const Tab = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "text-xs font-semibold tracking-wide transition",
      active ? "text-fuchsia-600" : "text-slate-400 hover:text-slate-600"
    )}
  >
    <span className="relative pb-2">
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500" />
      )}
    </span>
  </button>
);

export const TooltipCard = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-xl backdrop-blur">
      <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};