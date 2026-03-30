import React, { useReducer, useEffect } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { Card } from "../components/ui";
import { fmtIDR } from "../utils/utils";
import { api } from "../../../lib/api";

function buildParams({ outlet, filterType, month, year, startDate, endDate }) {
  const p = new URLSearchParams();
  if (outlet && outlet !== "all") p.set("outlet", outlet);

  if (filterType === "month" && month) {
    // month = "2026-03" → billing cycle ends 25th of that month
    p.set("asOfDate", `${month}-25`);
  } else if (filterType === "year" && year) {
    const yearStart = `${parseInt(year) - 1}-12-26`; // misal 2025-12-26
    const yearEnd   = `${year}-12-25`;               // misal 2026-12-25
    const today     = new Date().toISOString().split("T")[0];
    p.set("startDate", yearStart);
    p.set("endDate", today < yearEnd ? today : yearEnd);
  } else if (filterType === "range" && startDate && endDate) {
    p.set("startDate", startDate);
    p.set("endDate", endDate);
  }
  return p.toString();  
}

function fetchReducer(state, action) {
  switch (action.type) {
    case "success": return { data: action.payload, loading: false, error: null };
    case "error":   return { data: null,           loading: false, error: action.payload };
    default:        return state;
  }
}

export default function PenjualanSection({ filters }) {
  const [{ data, loading, error }, dispatch] = useReducer(
    fetchReducer,
    { data: null, loading: true, error: null }
  );


  useEffect(() => {
    let cancelled = false;
    const qs = filters ? buildParams(filters) : "";
    api(`/sales/penjualan${qs ? `?${qs}` : ""}`)
      .then((res) => { if (!cancelled) dispatch({ type: "success", payload: res }); })
      .catch((err) => { if (!cancelled) dispatch({ type: "error",   payload: err.message }); });
    return () => { cancelled = true; };
  }, [
    filters?.outlet, filters?.filterType, filters?.month,
    filters?.year, filters?.startDate, filters?.endDate,
  ]);

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="h-72 rounded-2xl bg-slate-200" />
      <div className="h-64 rounded-2xl bg-slate-200" />
    </div>
  );

  if (error) return (
    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-600 text-sm">
      Gagal memuat data penjualan: {error}
    </div>
  );

  const outlets      = data?.outlets      ?? [];
  const trend        = data?.trend        ?? [];
  const trendWaschen = data?.trendWaschen ?? [];
  const meta         = data?.meta         ?? {};

  // Tampilan: Full Waschen + 30% bagi hasil Cleanox
  const getAdjustedSales = (o) => {
    const actual  = Number(o.actual_sales);
    const cleanox = Number(o.cleanox_sales || 0);
    return (actual - cleanox) + 0.30 * cleanox;
  };

  const waschenMap = Object.fromEntries(trendWaschen.map(d => [d.date, d.sales]));
  const chartTrend = trend.map(d => ({
    ...d,
    sales: Math.round((waschenMap[d.date] || 0) + 0.30 * (d.sales - (waschenMap[d.date] || 0))),
  }));

  const totalCapaian        = outlets.reduce((a, o) => a + getAdjustedSales(o), 0);
  const totalTarget         = outlets.reduce((a, o) => a + Number(o.target_bulanan), 0);
  const totalTargetKumulatif = outlets.reduce((a, o) => a + Number(o.target_kumulatif_sales), 0);
  const totalGap            = totalCapaian - totalTargetKumulatif;
  const achievement         = totalTarget > 0 ? ((totalCapaian / totalTarget) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5">
      {/* Mode info */}
      <div className="flex items-center justify-end">
        <span className="text-[11px] text-slate-400 bg-slate-100 rounded-lg px-3 py-1.5 font-medium">
          💡 Sudah mencakup <span className="text-violet-600 font-semibold">30% Cleanox</span> (bagi hasil)
        </span>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Penjualan",      value: `Rp ${fmtIDR(totalCapaian)}`,  icon: "💰", tone: "from-fuchsia-500 to-pink-500" },
          { label: "Total Target Bulanan", value: `Rp ${fmtIDR(totalTarget)}`,   icon: "🎯", tone: "from-violet-500 to-purple-500" },
          { label: "Achievement",          value: `${achievement}%`,             icon: "📈", tone: "from-sky-500 to-blue-500" },
          {
            label: "Gap s.d Hari Ini",
            value: `${totalGap >= 0 ? "+" : ""}Rp ${fmtIDR(Math.round(totalGap))}`,
            icon:  totalGap >= 0 ? "✅" : "⚠️",
            tone:  totalGap >= 0 ? "from-emerald-400 to-teal-500" : "from-rose-400 to-red-500",
          },
        ].map((k) => (
          <Card key={k.label} className="p-4 sm:p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${k.tone} flex items-center justify-center shadow text-xl shrink-0`}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 leading-tight">{k.label}</p>
              <p className="text-base font-extrabold text-slate-800">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Sales Trend Chart */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">
          Tren Penjualan Harian
          {meta.dateStart && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({meta.dateStart} s.d {meta.asOfDate})
            </span>
          )}
        </p>
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartTrend}>
              <defs>
                <linearGradient id="gSales2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                label={{ value: "Tanggal", position: "insideBottom", offset: -2, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={45}
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
              <Tooltip formatter={(v) => [`Rp ${fmtIDR(v)}`, "Penjualan"]} />
              <Area type="monotone" dataKey="sales" stroke="#EC4899" strokeWidth={2.5} fill="url(#gSales2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Per-Outlet — Table on md+, Card list on mobile */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Performa Per Outlet</p>

        {/* Mobile */}
        <div className="flex flex-col gap-3 md:hidden">
          {outlets.map((row) => {
            const adjustedActual = getAdjustedSales(row);
            const gap    = adjustedActual - Number(row.target_kumulatif_sales);
            const isOver = gap >= 0;
            return (
              <div key={row.outlet} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm">{row.outlet}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                    isOver ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
                  }`}>
                    {isOver ? "🟢 Over Target" : "🔴 Tertinggal"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Target Bulanan</p>
                    <p className="text-slate-700 font-semibold">Rp {fmtIDR(Number(row.target_bulanan))}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Target s.d H-1 ({Number(row.persen_target_kumulatif).toFixed(1)}%)</p>
                    <p className="text-slate-700 font-semibold">Rp {fmtIDR(Math.round(Number(row.target_kumulatif_sales)))}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Capaian s.d H-1</p>
                    <p className="text-slate-800 font-bold">Rp {fmtIDR(adjustedActual)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Gap</p>
                    <p className={`font-bold ${isOver ? "text-emerald-600" : "text-rose-500"}`}>
                      {isOver ? "+" : ""}Rp {fmtIDR(Math.round(gap))}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                <th className="pb-3 pr-4">Outlet</th>
                <th className="pb-3 pr-4">Target Bulanan</th>
                <th className="pb-3 pr-4">Target s.d H-1</th>
                <th className="pb-3 pr-4">Capaian s.d H-1</th>
                <th className="pb-3 pr-4">Gap</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {outlets.map((row) => {
                const adjustedActual = getAdjustedSales(row);
                const gap    = adjustedActual - Number(row.target_kumulatif_sales);
                const isOver = gap >= 0;
                return (
                  <tr key={row.outlet} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                    <td className="py-3 pr-4 font-semibold text-slate-800">{row.outlet}</td>
                    <td className="py-3 pr-4 text-slate-600">Rp {fmtIDR(Number(row.target_bulanan))}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      Rp {fmtIDR(Math.round(Number(row.target_kumulatif_sales)))}
                      <span className="ml-1 text-xs text-slate-400">({Number(row.persen_target_kumulatif).toFixed(1)}%)</span>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-800">Rp {fmtIDR(adjustedActual)}</td>
                    <td className={`py-3 pr-4 font-semibold ${isOver ? "text-emerald-600" : "text-rose-500"}`}>
                      {isOver ? "+" : ""}Rp {fmtIDR(Math.round(gap))}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                        isOver ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
                      }`}>
                        {isOver ? "🟢 Over Target" : "🔴 Tertinggal"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}