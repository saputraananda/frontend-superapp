import React from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

export default function MiniStatsCards({ pageViewData, oxennData }) {
  return (
    <div className="col-span-12 grid grid-cols-12 gap-5">
      {/* Sales Performance */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-400 p-6 text-white shadow-[0_20px_50px_rgba(236,72,153,0.28)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Sales Performance</p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Monthly</span>
        </div>
        <div className="mt-4 flex h-14 items-end gap-2">
          {[28, 48, 36, 58, 30, 52, 44].map((h, i) => (
            <div key={i} className="w-full rounded-md bg-white/25" style={{ height: `${h}px` }} />
          ))}
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-rose-100">↓ 12%</span>
            <span className="text-emerald-100">↑ 12%</span>
          </div>
          <p className="text-2xl font-extrabold">$300,000</p>
        </div>
      </div>

      {/* Page View */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 p-6 text-white shadow-[0_20px_50px_rgba(168,85,247,0.28)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Page View</p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Trend</span>
        </div>
        <div className="mt-3 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pageViewData}>
              <defs>
                <linearGradient id="gPV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#ffffff" strokeWidth={2} fill="url(#gPV)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-right text-2xl font-extrabold">$432</p>
      </div>

      {/* Oxenn Rate */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-400 p-6 text-white shadow-[0_20px_50px_rgba(14,165,233,0.26)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Oxenn Rate</p>
          <select className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold outline-none">
            <option>Monthly</option>
            <option>Weekly</option>
            <option>Daily</option>
          </select>
        </div>
        <div className="mt-3 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={oxennData}>
              <defs>
                <linearGradient id="gOx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#ffffff" strokeWidth={2} fill="url(#gOx)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-right text-2xl font-extrabold">$432</p>
      </div>

      {/* Complain System mini */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 p-6 text-white shadow-[0_20px_50px_rgba(245,158,11,0.26)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Complain System</p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Status</span>
        </div>
        <div className="mt-4 flex h-14 items-end gap-2">
          {[34, 50, 40, 56, 44, 62, 52].map((h, i) => (
            <div key={i} className="w-full rounded-md bg-white/25" style={{ height: `${h}px` }} />
          ))}
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-emerald-100">↑ 11.4%</span>
            <span className="text-emerald-100">↑ 12%</span>
          </div>
          <p className="text-2xl font-extrabold">IDR 94,000</p>
        </div>
      </div>
    </div>
  );
}