import React, { useState, useRef, useEffect } from "react";
import { cn } from "../utils/utils";
import { OUTLETS } from "../utils/constants";

const FILTER_TYPES = [
  { value: "month", label: "Bulan" },
  { value: "range", label: "Rentang" },
  { value: "year",  label: "Tahun" },
];

const inputCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-100 transition";

// Checkbox untuk multi-select outlet
function OutletCheckbox({ selectedOutlets, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const allOutlets = OUTLETS.filter(o => o.value !== "all");
  const selectedCount = selectedOutlets.length;
  const displayLabel = selectedCount === 0
    ? "Semua Outlet"
    : selectedCount === allOutlets.length
    ? "Semua Outlet"
    : selectedCount === 1
    ? OUTLETS.find(o => o.value === selectedOutlets[0])?.label || selectedOutlets[0]
    : `${selectedCount} Outlet`;

  function toggleOutlet(value) {
    if (selectedOutlets.includes(value)) {
      onChange(selectedOutlets.filter(v => v !== value));
    } else {
      onChange([...selectedOutlets, value]);
    }
  }

  function selectAll() {
    onChange(allOutlets.map(o => o.value));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 transition",
          selectedCount > 0 && selectedCount < allOutlets.length && "border-fuchsia-300 bg-fuchsia-50"
        )}
      >
        <span className="text-slate-600">{displayLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-600">Pilih Outlet</span>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-xs text-fuchsia-600 hover:text-fuchsia-700 font-medium">Pilih Semua</button>
              <span className="text-slate-300">|</span>
              <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Bersihkan</button>
            </div>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {allOutlets.map((o) => {
              const isSelected = selectedOutlets.includes(o.value);
              return (
                <label
                  key={o.value}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                >
                  <div className={cn(
                    "h-4 w-4 rounded border-2 flex items-center justify-center transition",
                    isSelected ? "bg-fuchsia-500 border-fuchsia-500" : "border-slate-300"
                  )}>
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOutlet(o.value)}
                    className="sr-only"
                  />
                  <span className="text-sm text-slate-700">{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
          {/* Outlet Multi-Select */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Outlet</label>
            <OutletCheckbox selectedOutlets={outlet} onChange={setOutlet} />
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