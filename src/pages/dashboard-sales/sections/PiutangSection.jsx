import React, { useReducer, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "../components/ui";
import { fmtIDR } from "../utils/utils";
import { api } from "../../../lib/api";

function buildParams({ outlet, filterType, month, year, startDate, endDate }) {
  const p = new URLSearchParams();
  if (outlet && outlet !== "all") p.set("outlet", outlet);
  if (filterType === "month" && month) {
    p.set("asOfDate", `${month}-25`);
  } else if (filterType === "year" && year) {
    const yearStart = `${parseInt(year) - 1}-12-26`;
    const yearEnd   = `${year}-12-25`;
    const today     = new Date().toISOString().split("T")[0];
    p.set("startDate", yearStart);
    p.set("endDate", today < yearEnd ? today : yearEnd);
  } else if (filterType === "range" && startDate && endDate) {
    p.set("startDate", startDate);
    p.set("endDate", endDate);
  }
  return p.toString();
}

function reducer(state, action) {
  switch (action.type) {
    case "loading":    return { ...state, data: null, loading: true, error: null, page: 1, search: "", statusFilter: "all" };
    case "success":    return { ...state, data: action.payload, loading: false, error: null };
    case "error":      return { ...state, data: null, loading: false, error: action.payload };
    case "set_page":   return { ...state, page: action.payload };
    case "set_search": return { ...state, search: action.payload, page: 1 };
    case "set_status": return { ...state, statusFilter: action.payload, page: 1 };
    default:           return state;
  }
}

const STATUS_COLOR = {
  "Belum Jatuh Tempo": "bg-sky-100 text-sky-700",
  "Jatuh Tempo":       "bg-amber-100 text-amber-700",
  "Terlambat":         "bg-rose-100 text-rose-600",
};

export default function PiutangSection({ filters }) {
  const [state, dispatch] = useReducer(reducer, {
    data: null, loading: true, error: null,
    page: 1, search: "", statusFilter: "all",
  });
  const { data, loading, error, page, search, statusFilter } = state;
  const PAGE_SIZE = 10;

  const filteredPiutang = useMemo(() => {
    const raw = data?.piutang ?? [];
    const q = search.trim().toLowerCase();
    return raw.filter(r => {
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchSearch = !q || r.customer_nama?.toLowerCase().includes(q)
                              || r.no_nota?.toLowerCase().includes(q)
                              || r.outlet?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [data, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPiutang.length / PAGE_SIZE));
  const pagedRows  = filteredPiutang.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "loading" });
    const qs = filters ? buildParams(filters) : "";
    api(`/sales/piutang${qs ? `?${qs}` : ""}`)
      .then(res => { if (!cancelled) dispatch({ type: "success", payload: res }); })
      .catch(err => { if (!cancelled) dispatch({ type: "error",   payload: err.message }); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.outlet, filters?.filterType, filters?.month,
    filters?.year, filters?.startDate, filters?.endDate,
  ]);

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="h-56 rounded-2xl bg-slate-200" />
      <div className="h-48 rounded-2xl bg-slate-200" />
      <div className="h-96 rounded-2xl bg-slate-200" />
    </div>
  );

  if (error) return (
    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-600 text-sm">
      Gagal memuat data piutang: {error}
    </div>
  );

  const summary   = data?.summary    ?? { total: 0, jatuh_tempo: 0, terlambat: 0 };
  const perOutlet = data?.per_outlet ?? [];
  const meta      = data?.meta       ?? {};

  const chartData = perOutlet.map(o => ({
    name: o.outlet.replace(/^Waschen\s+(Laundry\s+)?/i, ""),
    jumlah: o.total,
  }));

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Piutang",       value: `Rp ${fmtIDR(summary.total)}`,                                   icon: "💳", tone: "from-fuchsia-500 to-pink-500"   },
          { label: "Belum Jatuh Tempo",   value: `Rp ${fmtIDR(summary.total - summary.jatuh_tempo - summary.terlambat)}`, icon: "🕐", tone: "from-sky-400 to-blue-500"      },
          { label: "Jatuh Tempo",         value: `Rp ${fmtIDR(summary.jatuh_tempo)}`,                             icon: "⏰", tone: "from-amber-400 to-orange-500"  },
          { label: "Terlambat",           value: `Rp ${fmtIDR(summary.terlambat)}`,                               icon: "🔴", tone: "from-rose-400 to-red-500"      },
        ].map(k => (
          <Card key={k.label} className="p-4 sm:p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${k.tone} flex items-center justify-center shadow text-xl shrink-0`}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-base font-extrabold text-slate-800">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">
          Piutang per Outlet
          {meta.dateStart && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({meta.dateStart} s.d {meta.dateEnd})
            </span>
          )}
        </p>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000000).toFixed(1)}jt`} width={38} />
              <Tooltip formatter={v => [`Rp ${fmtIDR(v)}`, "Piutang"]} />
              <Bar dataKey="jumlah" fill="#A855F7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detail Piutang per Outlet */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Detail Piutang per Outlet</p>

        {/* Mobile */}
        <div className="flex flex-col gap-3 md:hidden">
          {perOutlet.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Tidak ada data</p>
          ) : perOutlet.map((row, i) => (
            <div key={row.outlet} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                <span className="font-semibold text-slate-800 text-sm">{row.outlet}</span>
              </div>
              <p className="text-xs text-slate-400">Total Piutang</p>
              <p className="font-bold text-slate-800 text-sm">Rp {fmtIDR(row.total)}</p>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Outlet</th>
                <th className="pb-3">Total Piutang</th>
              </tr>
            </thead>
            <tbody>
              {perOutlet.length === 0 ? (
                <tr><td colSpan={3} className="py-8 text-center text-slate-400">Tidak ada data</td></tr>
              ) : perOutlet.map((row, i) => (
                <tr key={row.outlet} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                  <td className="py-3 pr-4 text-slate-400 font-semibold">{i + 1}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-800">{row.outlet}</td>
                  <td className="py-3 font-semibold text-slate-800">Rp {fmtIDR(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Daftar Customer Piutang */}
      <Card className="p-4 sm:p-6">
        {/* Header + controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="text-sm font-bold text-slate-700 shrink-0">
            Daftar Customer Piutang
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({filteredPiutang.length} data)
            </span>
          </p>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari customer / nota / outlet…"
              value={search}
              onChange={e => dispatch({ type: "set_search", payload: e.target.value })}
              className="w-full sm:w-52 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <select
              value={statusFilter}
              onChange={e => dispatch({ type: "set_status", payload: e.target.value })}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="all">Semua Status</option>
              <option value="Belum Jatuh Tempo">Belum Jatuh Tempo</option>
              <option value="Jatuh Tempo">Jatuh Tempo</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex flex-col gap-3 md:hidden">
          {pagedRows.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Tidak ada data</p>
          ) : pagedRows.map((row, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800 text-sm truncate">{row.customer_nama}</span>
                <span className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLOR[row.status] ?? ""}`}>
                  {row.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">{row.outlet} · <span className="font-mono">{row.no_nota}</span></p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>
                  <p className="text-slate-400">Jumlah Utang</p>
                  <p className="font-bold text-slate-800">Rp {fmtIDR(Number(row.piutang))}</p>
                </div>
                <div>
                  <p className="text-slate-400">Jatuh Tempo</p>
                  <p className="font-semibold text-slate-700">{row.tgl_selesai}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Outlet</th>
                <th className="pb-3 pr-4">No Nota</th>
                <th className="pb-3 pr-4">Jatuh Tempo</th>
                <th className="pb-3 pr-4 text-right">Jumlah</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Tidak ada data</td></tr>
              ) : pagedRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                  <td className="py-3 pr-4 text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-800 max-w-[160px] truncate">{row.customer_nama}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">{row.outlet}</td>
                  <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{row.no_nota}</td>
                  <td className="py-3 pr-4 text-slate-600 text-xs whitespace-nowrap">{row.tgl_selesai}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-800 text-right whitespace-nowrap">
                    Rp {fmtIDR(Number(row.piutang))}
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLOR[row.status] ?? ""}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Halaman {page} dari {totalPages} &nbsp;·&nbsp; {filteredPiutang.length} data
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => dispatch({ type: "set_page", payload: 1 })}
                disabled={page === 1}
                className="px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >«</button>
              <button
                onClick={() => dispatch({ type: "set_page", payload: Math.max(1, page - 1) })}
                disabled={page === 1}
                className="px-2.5 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, idx, arr) => {
                  if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, idx) =>
                  n === "…" ? (
                    <span key={`e${idx}`} className="px-1 text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => dispatch({ type: "set_page", payload: n })}
                      className={`min-w-[28px] px-2 py-1 rounded text-xs font-medium transition ${
                        n === page
                          ? "bg-violet-500 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >{n}</button>
                  )
                )}
              <button
                onClick={() => dispatch({ type: "set_page", payload: Math.min(totalPages, page + 1) })}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >›</button>
              <button
                onClick={() => dispatch({ type: "set_page", payload: totalPages })}
                disabled={page === totalPages}
                className="px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >»</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}