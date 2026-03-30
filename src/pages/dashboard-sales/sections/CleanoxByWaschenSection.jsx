import React, { useReducer, useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Card } from "../components/ui";
import { fmtIDR } from "../utils/utils";
import { api } from "../../../lib/api";

// ─── helpers ──────────────────────────────────────────────────────────────────
function buildParams({ outlet, filterType, month, year, startDate, endDate }) {
  const p = new URLSearchParams();
  if (outlet && outlet !== "all") p.set("outlet", outlet);
  if (filterType === "month" && month)                        p.set("asOfDate",  `${month}-25`);
  else if (filterType === "year" && year) {
    const today   = new Date().toISOString().split("T")[0];
    const yearEnd = `${year}-12-25`;
    p.set("startDate", `${parseInt(year) - 1}-12-26`);
    p.set("endDate",   today < yearEnd ? today : yearEnd);
  } else if (filterType === "range" && startDate && endDate) {
    p.set("startDate", startDate);
    p.set("endDate",   endDate);
  }
  return p.toString();
}

// ─── reducer ─────────────────────────────────────────────────────────────────
function fetchReducer(state, action) {
  switch (action.type) {
    case "loading": return { ...state, loading: true, error: null };
    case "success": return { data: action.payload, loading: false, error: null };
    case "error":   return { data: null,            loading: false, error: action.payload };
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
          {p.name}: {typeof p.value === "number" ? `Rp ${fmtIDR(p.value)}` : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5 h-60 rounded-2xl bg-slate-200" />
        <div className="col-span-12 lg:col-span-7 h-60 rounded-2xl bg-slate-200" />
      </div>
      <div className="h-72 rounded-2xl bg-slate-200" />
    </div>
  );
}

// ─── badge ────────────────────────────────────────────────────────────────────
const SPLIT_BADGE = (
  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2.5 py-1 font-medium">
    🧮 Bagi hasil: <span className="font-bold">30% Waschen</span> · <span className="font-bold">70% Cleanox</span>
  </span>
);

// ─── main ─────────────────────────────────────────────────────────────────────
export default function CleanoxByWaschenSection({ filters }) {
  const [{ data, loading, error }, dispatch] = useReducer(
    fetchReducer,
    { data: null, loading: true, error: null }
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, "all"];

  // Reset page when filters change — derived state during render (avoids setState-in-effect ESLint warning)
  const [prevFilterSig, setPrevFilterSig] = useState(() =>
    [filters?.outlet, filters?.filterType, filters?.month, filters?.year, filters?.startDate, filters?.endDate].join("|")
  );
  const currentFilterSig = [filters?.outlet, filters?.filterType, filters?.month, filters?.year, filters?.startDate, filters?.endDate].join("|");
  if (currentFilterSig !== prevFilterSig) {
    setPrevFilterSig(currentFilterSig);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "loading" });
    const qs = filters ? buildParams(filters) : "";
    const effectivePageSize = pageSize === "all" ? 99999 : pageSize;
    const qsFull = qs ? `${qs}&pageSize=${effectivePageSize}&page=${pageSize === "all" ? 1 : page}` : `pageSize=${effectivePageSize}&page=${pageSize === "all" ? 1 : page}`;
    api(`/sales/cleanox-by-waschen?${qsFull}`)
      .then(res => { if (!cancelled) dispatch({ type: "success", payload: res }); })
      .catch(err => { if (!cancelled) dispatch({ type: "error",   payload: err.message }); });
    return () => { cancelled = true; };
  }, [
    filters?.outlet, filters?.filterType, filters?.month,
    filters?.year, filters?.startDate, filters?.endDate, page, pageSize,
  ]);

  if (loading) return <Skeleton />;
  if (error)   return (
    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-600 text-sm">
      Gagal memuat data Cleanox: {error}
    </div>
  );

  const kpi        = data?.kpi        ?? {};
  const perOutlet  = data?.per_outlet ?? [];
  const perPembuat = data?.per_pembuat ?? [];
  const trend      = data?.trend      ?? [];
  const detail     = data?.detail     ?? [];
  const pagination = data?.pagination ?? {};
  const meta       = data?.meta       ?? {};

  const outletChartData = perOutlet.map(d => ({
    name:          (d.outlet || "").split(" ").pop(),
    "Total":       Number(d.total_omzet) || 0,
    "Jatah 70%":   Math.round((Number(d.total_omzet) || 0) * 0.70),
    "Jatah 30%":   Math.round((Number(d.total_omzet) || 0) * 0.30),
  }));

  const totalPages = pagination.totalPages || 1;

  return (
    <div className="space-y-5">

      {/* Header badge */}
      <div className="flex items-center justify-end">{SPLIT_BADGE}</div>

      {/* ─── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          {
            label: "Jatah Cleanox (70%)",
            value: `Rp ${fmtIDR(kpi.jatah_70 || 0)}`,
            icon: "🧺", tone: "from-amber-400 to-orange-500",
          },
          {
            label: "Total Tagihan Bruto",
            value: `Rp ${fmtIDR(kpi.total_omzet || 0)}`,
            icon: "📄", tone: "from-slate-400 to-slate-500",
          },
          {
            label: "Jatah Waschen (30%)",
            value: `Rp ${fmtIDR(kpi.jatah_30 || 0)}`,
            icon: "💜", tone: "from-violet-400 to-purple-600",
          },
          {
            label: "Total Nota",
            value: (kpi.total_nota || 0).toLocaleString("id-ID"),
            icon: "📋", tone: "from-sky-400 to-blue-500",
          },
          {
            label: "Rata-rata / Nota",
            value: `Rp ${fmtIDR(Math.round(kpi.avg_per_nota || 0))}`,
            icon: "📊", tone: "from-emerald-400 to-teal-500",
          },
        ].map(k => (
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

      {/* ─── Trend + Per Outlet ────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Trend Harian */}
        <Card className="col-span-12 lg:col-span-5 p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-1">Tren Harian Cleanox</p>
          <p className="text-xs text-slate-400 mb-4">
            {meta.dateStart && `${meta.dateStart} s.d ${meta.asOfDate}`}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="cleanoxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                  label={{ value: "Tanggal", position: "insideBottom", offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48}
                  tickFormatter={v => `${(v / 1_000_000).toFixed(1)}jt`} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [`Rp ${fmtIDR(v)}`, "Omzet"]} />
                <Area type="monotone" dataKey="total" name="Omzet" stroke="#F59E0B" strokeWidth={2.5}
                  fill="url(#cleanoxGrad)" dot={trend.length <= 31 ? { r: 3, fill: "#F59E0B" } : false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Per Outlet Bar */}
        <Card className="col-span-12 lg:col-span-7 p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Omzet Cleanox per Outlet</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outletChartData} barSize={18}>
                <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48}
                  tickFormatter={v => `${(v / 1_000_000).toFixed(1)}jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Jatah 70%" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Jatah 30%" stackId="a" fill="#8B5CF6" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ─── Per-Outlet Summary Table ───────────────────────────────────────── */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Ringkasan per Outlet</p>

        {/* Mobile */}
        <div className="flex flex-col gap-3 md:hidden">
          {perOutlet.map(row => (
            <div key={row.outlet} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
              <p className="font-semibold text-slate-800 text-sm">{row.outlet}</p>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <div><span className="text-slate-400">Total Nota: </span><span className="font-bold text-slate-700">{Number(row.total_nota)}</span></div>
                <div><span className="text-slate-400">Total Omzet: </span><span className="font-bold text-slate-700">Rp {fmtIDR(Number(row.total_omzet))}</span></div>
                <div><span className="text-slate-400">Jatah 70%: </span><span className="font-bold text-amber-600">Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.70))}</span></div>
                <div><span className="text-slate-400">Jatah 30%: </span><span className="font-bold text-violet-600">Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.30))}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                {["Outlet", "Total Nota", "Total Omzet", "Jatah Cleanox (70%)", "Jatah Waschen (30%)"].map(h => (
                  <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perOutlet.map(row => (
                <tr key={row.outlet} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                  <td className="py-3 pr-4 font-semibold text-slate-800">{row.outlet}</td>
                  <td className="py-3 pr-4 text-slate-600">{Number(row.total_nota).toLocaleString("id-ID")}</td>
                  <td className="py-3 pr-4 font-bold text-slate-800">Rp {fmtIDR(Number(row.total_omzet))}</td>
                  <td className="py-3 pr-4 font-semibold text-amber-600">Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.70))}</td>
                  <td className="py-3 pr-4 font-semibold text-violet-600">Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.30))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Klasifikasi per Pembuat Nota ──────────────────────────────────── */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-1">Klasifikasi per Pembuat Nota</p>
        <p className="text-xs text-slate-400 mb-4">Pantau siapa saja yang menawarkan layanan Cleanox / Karpet ke konsumen</p>

        {/* Mobile */}
        <div className="flex flex-col gap-3 md:hidden">
          {perPembuat.map((row, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="font-semibold text-slate-800 text-sm">{row.pembuat_nota}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <div><span className="text-slate-400">Total Nota: </span><span className="font-bold text-sky-600">{Number(row.total_nota)}</span></div>
                <div><span className="text-slate-400">Total Tagihan: </span><span className="font-bold text-slate-700">Rp {fmtIDR(Number(row.total_omzet))}</span></div>
                <div className="col-span-2"><span className="text-slate-400">Jatah Waschen (30%): </span><span className="font-bold text-violet-600">Rp {fmtIDR(Math.round(Number(row.jatah_waschen)))}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                {["#", "Pembuat Nota", "Total Nota", "Total Tagihan Bruto", "Jatah Cleanox (70%)", "Jatah Waschen (30%)"].map(h => (
                  <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perPembuat.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                  <td className="py-3 pr-3">
                    <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold inline-flex items-center justify-center">{i + 1}</span>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-800">{row.pembuat_nota}</td>
                  <td className="py-3 pr-4 font-bold text-sky-600 text-center">{Number(row.total_nota).toLocaleString("id-ID")}</td>
                  <td className="py-3 pr-4 text-slate-600">Rp {fmtIDR(Number(row.total_omzet))}</td>
                  <td className="py-3 pr-4 font-semibold text-amber-600">Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.70))}</td>
                  <td className="py-3 pr-4 font-semibold text-violet-600">Rp {fmtIDR(Math.round(Number(row.jatah_waschen)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Detail Transaksi ───────────────────────────────────────────────── */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-bold text-slate-700">Detail Transaksi Cleanox</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {pagination.total || 0} nota &nbsp;·&nbsp; {pageSize === "all" ? "Semua ditampilkan" : `Hal. ${page} dari ${totalPages}`}
            </p>
          </div>
          {/* Page size + Pagination */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={pageSize}
              onChange={e => { setPageSize(e.target.value === "all" ? "all" : Number(e.target.value)); setPage(1); }}
              className="h-7 rounded-lg border border-slate-200 text-xs text-slate-600 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {PAGE_SIZE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt === "all" ? "Semua" : `${opt} / hal`}</option>
              ))}
            </select>
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setPage(1)} disabled={page === 1 || pageSize === "all"}
              className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition text-xs font-bold flex items-center justify-center">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || pageSize === "all"}
              className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition text-xs font-bold flex items-center justify-center">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="text-slate-400 text-xs px-1">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    className={`h-7 min-w-[28px] rounded-lg border text-xs font-bold transition ${
                      page === p
                        ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>{p}</button>
                )
              )
            }
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || pageSize === "all"}
              className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition text-xs font-bold flex items-center justify-center">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages || pageSize === "all"}
              className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition text-xs font-bold flex items-center justify-center">»</button>
          </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {detail.map((d, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm truncate">{d.customer_nama || "-"}</span>
                <span className="font-bold text-amber-600 text-sm shrink-0 ml-2">Rp {fmtIDR(Number(d.nominal_bayar))}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-xs">
                <div><span className="text-slate-400">No. Nota: </span><span className="text-slate-600 font-mono">{d.no_nota}</span></div>
                <div><span className="text-slate-400">Outlet: </span><span className="text-slate-700">{d.outlet}</span></div>
                <div><span className="text-slate-400">Pembuat: </span><span className="text-slate-700">{d.pembuat_nota || "-"}</span></div>
                <div><span className="text-slate-400">Tgl Terima: </span><span className="text-slate-600">{d.tgl_terima ? new Date(d.tgl_terima).toLocaleDateString("id-ID") : "-"}</span></div>
                <div className="col-span-2"><span className="text-slate-400">Item: </span><span className="text-slate-600">{d.daftar_item || "-"}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                {["#", "Outlet", "No. Nota", "Customer", "Pembuat Nota", "Tgl Terima", "Tgl Selesai", "Waktu Bayar", "Nominal", "Item"].map(h => (
                  <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.map((d, i) => {
                const globalIdx = pageSize === "all" ? i + 1 : (page - 1) * pageSize + i + 1;
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                    <td className="py-3 pr-3 text-slate-400 text-xs">{globalIdx}</td>
                    <td className="py-3 pr-4 text-slate-700">{d.outlet}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500">{d.no_nota}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800 max-w-[140px] truncate">{d.customer_nama || "-"}</td>
                    <td className="py-3 pr-4 text-slate-600 text-xs">{d.pembuat_nota || "-"}</td>
                    <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">{d.tgl_terima ? new Date(d.tgl_terima).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">{d.tgl_selesai ? new Date(d.tgl_selesai).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">
                      {d.waktu_pembayaran ? new Date(d.waktu_pembayaran).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-"}
                    </td>
                    <td className="py-3 pr-4 font-bold text-amber-600 whitespace-nowrap">Rp {fmtIDR(Number(d.nominal_bayar))}</td>
                    <td className="py-3 pr-4 text-slate-500 text-xs max-w-[180px] truncate" title={d.daftar_item || ""}>{d.daftar_item || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom info */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>
            {pageSize === "all" ? `1–${pagination.total || 0}` : `${Math.min((page - 1) * pageSize + 1, pagination.total || 0)}–${Math.min(page * pageSize, pagination.total || 0)}`} dari {pagination.total || 0}
          </span>
          <span>{pageSize === "all" ? "Semua" : `${pageSize} per halaman`}</span>
        </div>
      </Card>
    </div>
  );
}
