import React from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../utils/utils";

const NAV_ITEMS = [
  { key: "penjualan",  label: "Penjualan",  icon: "📊", desc: "Overview & target" },
  { key: "piutang",    label: "Piutang",    icon: "💳", desc: "Receivables" },
  { key: "komplain",   label: "Komplain",   icon: "⚠️", desc: "Customer complaints" },
  { key: "membership", label: "Membership", icon: "⭐", desc: "Member analytics" },
  { key: "customer",   label: "Customer",   icon: "👥", desc: "Segmentation" },
];

export default function Sidebar({ active, onSelect, open, isMobile, onClose }) {
  const navigate = useNavigate();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-slate-200 shadow-sm transition-all duration-300 z-30 flex flex-col overflow-hidden",
        isMobile
          ? cn("w-60", open ? "translate-x-0 shadow-2xl" : "-translate-x-full")
          : open ? "w-60" : "w-16"
      )}
    >
      {/* Logo area */}
      <div className={cn(
        "flex items-center border-b border-slate-100 min-h-[64px]",
        open ? "gap-2 px-3 py-4" : "justify-center py-4"
      )}>
        {open && (
          <button
            onClick={() => navigate(-1)}
            title="Kembali"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition shrink-0 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow shrink-0">
          <span className="text-white font-extrabold text-sm">W</span>
        </div>

        {open && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-800 truncate">Waschen</p>
            <p className="text-[10px] text-slate-400 truncate">Sales Analytics</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {open && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">
            Menu
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { onSelect(item.key); if (isMobile && onClose) onClose(); }}
              title={!open ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                isActive
                  ? "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-[0_8px_20px_rgba(236,72,153,0.25)]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <span className="text-base shrink-0 leading-none">{item.icon}</span>
              {open && (
                <div className="text-left overflow-hidden">
                  <p className="truncate leading-tight">{item.label}</p>
                  {!isActive && (
                    <p className="text-[10px] font-normal opacity-60 truncate">{item.desc}</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {open && (
        <div className="px-4 py-4 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">© {new Date().getFullYear()} Alora Group</p>
        </div>
      )}
    </aside>
  );
}