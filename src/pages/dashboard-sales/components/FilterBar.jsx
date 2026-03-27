import React from "react";
import { cn } from "../utils/utils";
import { OUTLETS } from "../utils/constants";

const FILTER_TYPES = [
  { value: "month", label: "Bulan" },
  { value: "range", label: "Rentang" },
  { value: "year",  label: "Tahun" },
];

const inputCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-100 transition";

export default function FilterBar({
  outlet, setOutlet,
  filterType, setFilterType,
  month, setMonth,
  year, setYear,
  startDate, setStartDate,
  endDate, setEndDate,
}) {
  return (
    <div className="bg-white border-b border-slate-100 px-3 sm:px-6 py-2 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">

        {/* Row 1 on mobile: Outlet + filter type toggle */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Outlet */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Outlet</label>
            <select value={outlet} onChange={(e) => setOutlet(e.target.value)} className={cn(inputCls, "max-w-[150px] sm:max-w-none")}>
              {OUTLETS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200" />

          {/* Filter type toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            {FILTER_TYPES.map((ft) => (
              <button
                key={ft.value}
                onClick={() => setFilterType(ft.value)}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                  filterType === ft.value
                    ? "bg-white text-fuchsia-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2 on mobile: date input */}
        {filterType === "month" && (
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls} />
        )}

        {filterType === "year" && (
          <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
            {["2024", "2025", "2026"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}

        {filterType === "range" && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            <span className="text-xs text-slate-400 font-semibold">s/d</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
        )}

      </div>
    </div>
  );
}