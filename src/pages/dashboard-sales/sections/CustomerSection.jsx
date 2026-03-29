import React, { useReducer, useEffect } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  AreaChart, Area,
} from "recharts";
import { Card } from "../components/ui";
import { fmtIDR } from "../utils/utils";
import { api } from "../../../lib/api";

// ─── palette ─────────────────────────────────────────────────────────────────
const SEG = [
  { key: "loyal",    label: "Loyal (>4x)",      icon: "⭐", fill: "#EC4899", tone: "from-pink-400 to-rose-500"    },
  { key: "regular",  label: "Regular (2–4x)",    icon: "🔁", fill: "#60A5FA", tone: "from-sky-400 to-blue-500"    },
  { key: "one_time", label: "One Time (1x)",     icon: "1️⃣", fill: "#F59E0B", tone: "from-amber-400 to-orange-500" },
  { key: "inactive", label: "Belum Transaksi",   icon: "💤", fill: "#94A3B8", tone: "from-slate-400 to-slate-500"  },
];

const GENDER_PALETTE = ["#818CF8", "#FB7185", "#94A3B8", "#34D399"];

// ─── reducer ─────────────────────────────────────────────────────────────────
function fetchReducer(state, action) {
  switch (action.type) {
    case "loading": return { data: null, loading: true,  error: null, topPage: 1 };
    case "success": return { ...state, data: action.payload, loading: false, error: null };
    case "error":   return { ...state, loading: false, error: action.payload };
    case "set_page": return { ...state, topPage: action.payload };
    default:        return state;
  }
}

// ─── custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("id-ID") : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-4 h-72 rounded-2xl bg-slate-200" />
        <div className="col-span-12 lg:col-span-8 h-72 rounded-2xl bg-slate-200" />
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 h-60 rounded-2xl bg-slate-200" />
        <div className="col-span-12 sm:col-span-6 lg:col-span-5 h-60 rounded-2xl bg-slate-200" />
        <div className="col-span-12 lg:col-span-3 h-60 rounded-2xl bg-slate-200" />
      </div>
      <div className="h-64 rounded-2xl bg-slate-200" />
      <div className="h-80 rounded-2xl bg-slate-200" />
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function CustomerSection({ filters }) {
  const [{ data, loading, error, topPage }, dispatch] = useReducer(
    fetchReducer,
    { data: null, loading: true, error: null, topPage: 1 }
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "loading" });

    const p = new URLSearchParams();
    if (filters?.outlet && filters.outlet !== "all") p.set("outlet", filters.outlet);
    if (filters?.filterType)                         p.set("filterType", filters.filterType);
    if (filters?.filterType === "month"  && filters.month)      p.set("month",     filters.month);
    if (filters?.filterType === "year"   && filters.year)       p.set("year",      filters.year);
    if (filters?.filterType === "range"  && filters.startDate)  p.set("startDate", filters.startDate);
    if (filters?.filterType === "range"  && filters.endDate)    p.set("endDate",   filters.endDate);

    api(`/sales/customer${p.toString() ? `?${p}` : ""}`)
      .then(res => { if (!cancelled) dispatch({ type: "success", payload: res }); })
      .catch(err => { if (!cancelled) dispatch({ type: "error",   payload: err.message }); });

    return () => { cancelled = true; };
  }, [filters?.outlet, filters?.filterType, filters?.month, filters?.year, filters?.startDate, filters?.endDate]);

  if (loading) return <Skeleton />;

  if (error) return (
    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-600 text-sm">
      Gagal memuat data customer: {error}
    </div>
  );

  const kpi          = data?.kpi               ?? {};
  const perOutlet    = data?.per_outlet        ?? [];
  const gender       = data?.gender            ?? [];
  const dailyTrend   = data?.daily_trend       ?? [];
  const trend        = data?.registration_trend ?? [];
  const topCustomers = data?.top_customers     ?? [];
  const activity     = data?.activity          ?? {};

  const TOP_PAGE_SIZE = 10;
  const topTotalPages = Math.ceil(topCustomers.length / TOP_PAGE_SIZE);
  const topPaged = topCustomers.slice((topPage - 1) * TOP_PAGE_SIZE, topPage * TOP_PAGE_SIZE);

  // Derived chart datasets
  const segData = SEG.map(s => ({
    name: s.label, value: kpi[s.key] || 0, fill: s.fill,
  }));

  const outletChartData = perOutlet.map(d => ({
    name:       (d.outlet_name || "").split(" ").pop(),
    "Loyal":    Number(d.loyal)    || 0,
    "Regular":  Number(d.regular)  || 0,
    "One Time": Number(d.one_time) || 0,
    "Inactive": Number(d.inactive) || 0,
  }));

  const trendData = trend.map(d => ({
    month: d.month,
    "Registrasi": Number(d.count) || 0,
  }));

  const dailyTrendData = dailyTrend.map(d => ({
    day: String(d.day),
    "Registrasi": Number(d.count) || 0,
  }));

  const actTotal = (activity.active_30d || 0) + (activity.active_90d || 0) + (activity.churned || 0);
  const pct = (n) => actTotal > 0 ? Math.round((n / actTotal) * 100) : 0;

  return (
    <div className="space-y-5">

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Total Customer", value: kpi.total || 0, icon: "👥", tone: "from-fuchsia-500 to-violet-600" },
          ...SEG.map(s => ({ label: s.label, value: kpi[s.key] || 0, icon: s.icon, tone: s.tone })),
        ].map(k => (
          <Card key={k.label} className="p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${k.tone} flex items-center justify-center shadow text-base sm:text-xl shrink-0`}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">{k.label}</p>
              <p className="text-lg sm:text-2xl font-extrabold text-slate-800">{(k.value).toLocaleString("id-ID")}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── Summary Stats Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            icon: "💳", tone: "from-emerald-400 to-teal-500",
            label: "Total Saldo E-Payment",
            value: `Rp ${fmtIDR(kpi.total_saldo_epayment || 0)}`,
            sub: null,
          },
          {
            icon: "📊", tone: "from-violet-400 to-purple-600",
            label: "Rata-rata Transaksi",
            value: `${kpi.avg_transaksi || 0}x`,
            sub: "per customer",
          },
          {
            icon: "🟢", tone: "from-lime-400 to-green-500",
            label: "Aktif (30 Hari Terakhir)",
            value: (activity.active_30d || 0).toLocaleString("id-ID"),
            sub: actTotal > 0 ? `${pct(activity.active_30d)}% dari total` : null,
          },
          {
            icon: "😴", tone: "from-rose-400 to-red-500",
            label: "Tidak Aktif (>90 Hari)",
            value: (activity.churned || 0).toLocaleString("id-ID"),
            sub: actTotal > 0 ? `${pct(activity.churned)}% dari total` : null,
          },
        ].map(k => (
          <Card key={k.label} className="p-4 sm:p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${k.tone} flex items-center justify-center shadow text-xl shrink-0`}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-lg font-extrabold text-slate-800">{k.value}</p>
              {k.sub && <p className="text-[11px] text-slate-400">{k.sub}</p>}
            </div>
          </Card>
        ))}
      </div>

      {/* ─── Segmentation Donut + Per Outlet Bar ────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-4 p-4 sm:p-6 flex flex-row lg:flex-col items-center gap-6 lg:gap-0">
          <div className="shrink-0">
            <p className="text-sm font-bold text-slate-700 mb-3">Segmentasi Customer</p>
            <div className="relative">
              <PieChart width={160} height={160}>
                <Pie data={segData} cx={80} cy={80} innerRadius={46} outerRadius={70} paddingAngle={2} dataKey="value">
                  {segData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900">{(kpi.total || 0).toLocaleString("id-ID")}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:mt-4 w-full">
            {segData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                  <span className="text-slate-600 text-xs">{d.name}</span>
                </div>
                <span className="font-bold text-slate-800">{d.value.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-8 p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Segmentasi per Outlet</p>
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outletChartData} barSize={22}>
                <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Loyal"    stackId="a" fill="#EC4899" />
                <Bar dataKey="Regular"  stackId="a" fill="#60A5FA" />
                <Bar dataKey="One Time" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Inactive" stackId="a" fill="#94A3B8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ─── Gender + Daily Registration Trend ──────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Gender */}
        <Card className="col-span-12 sm:col-span-5 lg:col-span-4 p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Distribusi Gender</p>
          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4">
            <PieChart width={140} height={140}>
              <Pie
                data={gender.map((g, i) => ({ name: g.jenis_kelamin, value: Number(g.count), fill: GENDER_PALETTE[i % GENDER_PALETTE.length] }))}
                cx={70} cy={70} innerRadius={36} outerRadius={58} paddingAngle={2} dataKey="value"
              >
                {gender.map((_, i) => <Cell key={i} fill={GENDER_PALETTE[i % GENDER_PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
            <div className="flex flex-col gap-2 w-full">
              {gender.map((g, i) => (
                <div key={g.jenis_kelamin} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: GENDER_PALETTE[i % GENDER_PALETTE.length] }} />
                    <span className="text-slate-600">{g.jenis_kelamin}</span>
                  </div>
                  <span className="font-bold text-slate-800">{Number(g.count).toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Daily Registration Trend */}
        <Card className="col-span-12 sm:col-span-7 lg:col-span-8 p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-1">Trend Harian Penambahan Customer</p>
          <p className="text-xs text-slate-400 mb-4">
            {filters?.filterType === "year" ? "Per bulan — tahun dipilih" : "Per hari — periode terpilih (default: 30 hari terakhir)"}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Registrasi"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fill="url(#dailyGrad)"
                  dot={dailyTrendData.length <= 31 ? { r: 3, fill: "#6366F1" } : false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ─── Registration Trend ─────────────────────────────────────────────── */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Tren Registrasi Customer (12 Bulan Terakhir)</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#A855F7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Registrasi" stroke="#A855F7" strokeWidth={2.5}
                fill="url(#trendGrad)" dot={{ r: 3, fill: "#A855F7" }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ─── Detail per Outlet Table ─────────────────────────────────────────── */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Detail Segmentasi per Outlet</p>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {perOutlet.map(row => {
            const rowTotal = Number(row.loyal) + Number(row.regular) + Number(row.one_time) + Number(row.inactive);
            return (
              <div key={row.outlet_name} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm">{row.outlet_name}</span>
                  <span className="font-extrabold text-slate-800 text-sm">Total: {rowTotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                  <div><p className="text-slate-400">⭐ Loyal</p>          <p className="text-pink-600 font-bold">{Number(row.loyal)}</p></div>
                  <div><p className="text-slate-400">🔁 Regular</p>        <p className="text-blue-600 font-bold">{Number(row.regular)}</p></div>
                  <div><p className="text-slate-400">1️⃣ One Time</p>       <p className="text-amber-600 font-bold">{Number(row.one_time)}</p></div>
                  <div><p className="text-slate-400">💤 Belum Transaksi</p> <p className="text-slate-500 font-bold">{Number(row.inactive)}</p></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                {["Outlet", "⭐ Loyal", "🔁 Regular", "1️⃣ One Time", "💤 Belum Transaksi", "Total"].map(h => (
                  <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perOutlet.map(row => {
                const rowTotal = Number(row.loyal) + Number(row.regular) + Number(row.one_time) + Number(row.inactive);
                return (
                  <tr key={row.outlet_name} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                    <td className="py-3 pr-4 font-semibold text-slate-800">{row.outlet_name}</td>
                    <td className="py-3 pr-4 text-pink-600 font-semibold">{Number(row.loyal)}</td>
                    <td className="py-3 pr-4 text-blue-600 font-semibold">{Number(row.regular)}</td>
                    <td className="py-3 pr-4 text-amber-600 font-semibold">{Number(row.one_time)}</td>
                    <td className="py-3 pr-4 text-slate-500">{Number(row.inactive)}</td>
                    <td className="py-3 pr-4 font-extrabold text-slate-800">{rowTotal.toLocaleString("id-ID")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Top Customers ──────────────────────────────────────────────────── */}
      {topCustomers.length > 0 && (
        <Card className="p-4 sm:p-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-slate-700">Top Customer Berdasarkan Omzet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {topCustomers.length} customer ditemukan &nbsp;·&nbsp;
                Halaman {topPage} dari {topTotalPages}
              </p>
            </div>
            {/* Pagination controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => dispatch({ type: "set_page", payload: 1 })}
                disabled={topPage === 1}
                className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition text-xs font-bold flex items-center justify-center"
              >«</button>
              <button
                onClick={() => dispatch({ type: "set_page", payload: Math.max(1, topPage - 1) })}
                disabled={topPage === 1}
                className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition text-xs font-bold flex items-center justify-center"
              >‹</button>
              {Array.from({ length: topTotalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === topTotalPages || Math.abs(p - topPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="text-slate-400 text-xs px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => dispatch({ type: "set_page", payload: p })}
                      className={`h-7 min-w-[28px] rounded-lg border text-xs font-bold transition ${
                        topPage === p
                          ? "bg-fuchsia-600 border-fuchsia-600 text-white shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >{p}</button>
                  )
                )
              }
              <button
                onClick={() => dispatch({ type: "set_page", payload: Math.min(topTotalPages, topPage + 1) })}
                disabled={topPage === topTotalPages}
                className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition text-xs font-bold flex items-center justify-center"
              >›</button>
              <button
                onClick={() => dispatch({ type: "set_page", payload: topTotalPages })}
                disabled={topPage === topTotalPages}
                className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition text-xs font-bold flex items-center justify-center"
              >»</button>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {topPaged.map((c, i) => {
              const globalIdx = (topPage - 1) * TOP_PAGE_SIZE + i + 1;
              return (
                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-bold flex items-center justify-center shrink-0">{globalIdx}</span>
                    <span className="font-semibold text-slate-800 text-sm truncate">{c.nama || "-"}</span>
                    {c.member && c.member !== "-" && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-medium shrink-0">{c.member}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <div><span className="text-slate-400">Outlet: </span><span className="text-slate-700 font-medium">{c.outlet}</span></div>
                    <div><span className="text-slate-400">No. Telpon: </span><span className="text-slate-700">{c.nomor_telpon || "-"}</span></div>
                    <div><span className="text-slate-400">Transaksi: </span><span className="text-slate-700 font-bold">{Number(c.total_jumlah_transaksi)}x</span></div>
                    <div><span className="text-slate-400">Instansi: </span><span className="text-slate-700">{c.instansi || "-"}</span></div>
                    <div><span className="text-slate-400">Omzet: </span><span className="text-emerald-700 font-bold">Rp {fmtIDR(Number(c.total_nominal_transaksi))}</span></div>
                    <div><span className="text-slate-400">Saldo E-Pay: </span><span className="text-blue-600 font-semibold">Rp {fmtIDR(Number(c.saldo_epayment))}</span></div>
                    <div><span className="text-slate-400">Sisa Nominal: </span><span className="text-violet-600">Rp {fmtIDR(Number(c.sisa_nominal))}</span></div>
                    <div><span className="text-slate-400">Masa Aktif: </span><span className="text-slate-600">{c.masa_aktif ? new Date(c.masa_aktif).toLocaleDateString("id-ID") : "-"}</span></div>
                    <div><span className="text-slate-400">Terdaftar: </span><span className="text-slate-600">{c.terdaftar_sejak ? new Date(c.terdaftar_sejak).toLocaleDateString("id-ID") : "-"}</span></div>
                    <div><span className="text-slate-400">Trs. Terakhir: </span><span className="text-slate-600">{c.transaksi_terakhir ? new Date(c.transaksi_terakhir).toLocaleDateString("id-ID") : "-"}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                  {["#", "Nama", "No. Telpon", "Outlet", "Instansi", "Member", "Transaksi", "Total Omzet", "Saldo E-Pay", "Sisa Nominal", "Masa Aktif", "Terdaftar", "Trs. Terakhir"].map(h => (
                    <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPaged.map((c, i) => {
                  const globalIdx = (topPage - 1) * TOP_PAGE_SIZE + i + 1;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                      <td className="py-3 pr-3">
                        <span className="h-6 w-6 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-bold inline-flex items-center justify-center">{globalIdx}</span>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-800 max-w-[140px] truncate">{c.nama || "-"}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{c.nomor_telpon || "-"}</td>
                      <td className="py-3 pr-4 text-slate-600">{c.outlet}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs max-w-[120px] truncate">{c.instansi !== "-" ? c.instansi : <span className="text-slate-300">-</span>}</td>
                      <td className="py-3 pr-4">
                        {c.member && c.member !== "-"
                          ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md whitespace-nowrap">{c.member}</span>
                          : <span className="text-slate-400 text-xs">-</span>}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-700 text-center">{Number(c.total_jumlah_transaksi)}x</td>
                      <td className="py-3 pr-4 font-bold text-emerald-700 whitespace-nowrap">Rp {fmtIDR(Number(c.total_nominal_transaksi))}</td>
                      <td className="py-3 pr-4 text-blue-600 whitespace-nowrap">Rp {fmtIDR(Number(c.saldo_epayment))}</td>
                      <td className="py-3 pr-4 text-violet-600 whitespace-nowrap">Rp {fmtIDR(Number(c.sisa_nominal))}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">
                        {c.masa_aktif ? new Date(c.masa_aktif).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">
                        {c.terdaftar_sejak ? new Date(c.terdaftar_sejak).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">
                        {c.transaksi_terakhir ? new Date(c.transaksi_terakhir).toLocaleDateString("id-ID") : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom pagination info */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>
              Menampilkan {Math.min((topPage - 1) * TOP_PAGE_SIZE + 1, topCustomers.length)}–{Math.min(topPage * TOP_PAGE_SIZE, topCustomers.length)} dari {topCustomers.length} customer
            </span>
            <span>10 per halaman</span>
          </div>
        </Card>
      )}
    </div>
  );
}