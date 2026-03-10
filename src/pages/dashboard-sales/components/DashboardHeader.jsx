import React from "react";
import { useNavigate } from "react-router-dom";
import { PillSelect } from "./ui";

export default function DashboardHeader({
  period, setPeriod,
  outlet, setOutlet,
  channel, setChannel,
  shift, setShift,
}) {
  const navigate = useNavigate();
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition shrink-0"
              title="Kembali"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <a href="/portal" className="hover:text-blue-600 transition">Portal</a>
                <span>/</span>
                <span className="text-slate-600 font-medium">Sales Dashboard</span>
              </div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">Dashboard Analytics</h1>
              <p className="text-xs text-slate-400 mt-0.5">Alora Group Indonesia</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PillSelect value={period} onChange={setPeriod} options={["May 2024", "Apr 2024", "Mar 2024"]} />
            <PillSelect value={outlet} onChange={setOutlet} options={["All Outlets", "Outlet A", "Outlet B"]} />
            <PillSelect value={channel} onChange={setChannel} options={["All Channels", "Online", "Offline"]} />
            <PillSelect value={shift} onChange={setShift} options={["All Shifts", "Morning", "Evening"]} />
          </div>
        </div>
      </div>
    </div>
  );
}