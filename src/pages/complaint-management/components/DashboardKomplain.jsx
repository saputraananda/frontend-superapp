import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import {
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineArrowPath,
  HiOutlineUserGroup,
  HiOutlineChartBarSquare,
} from "react-icons/hi2";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

// ── Default cutoff period ───────────────────────────────────────────────────
function getDefaultCutoff() {
  const now = new Date();
  const day = now.getDate();
  let endYear = now.getFullYear();
  let endMonth = now.getMonth();
  if (day > 25) {
    endMonth += 1;
    if (endMonth > 11) { endMonth = 0; endYear++; }
  }
  let startYear = endYear;
  let startMonth = endMonth - 1;
  if (startMonth < 0) { startMonth = 11; startYear--; }
  return {
    start: `${startYear}-${String(startMonth + 1).padStart(2, "0")}-26`,
    end:   `${endYear}-${String(endMonth + 1).padStart(2, "0")}-25`,
  };
}

const DEFAULT_CUTOFF = getDefaultCutoff();

function StatCard({ label, value, icon: Icon, colorClass, loading }) {
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]", colorClass)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/60">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-extrabold leading-none">
          {loading ? (
            <span className="inline-block h-7 w-10 animate-pulse rounded-lg bg-current opacity-20" />
          ) : (
            value
          )}
        </p>
        <p className="mt-1 text-xs font-medium opacity-70">{label}</p>
      </div>
    </div>
  );
}

function SimpleBarChart({ data, labelKey, valueKey, color = "bg-rose-500" }) {
  if (!data?.length)
    return <p className="py-8 text-center text-sm text-slate-400">Tidak ada data</p>;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item[labelKey]} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-slate-600" title={item[labelKey]}>
            {item[labelKey]}
          </span>
          <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-5 rounded-full transition-all duration-500", color)}
              style={{ width: `${(item[valueKey] / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-bold text-slate-700">{item[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data }) {
  if (!data?.length)
    return <p className="py-8 text-center text-sm text-slate-400">Tidak ada data</p>;
  const max = Math.max(...data.map((d) => d.total), 1);
  const H = 80;
  return (
    <div className="flex items-end gap-1" style={{ height: H + 24 }}>
      {data.map((d) => {
        const barH = Math.max((d.total / max) * H, 4);
        return (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-600">{d.total}</span>
            <div
              className="w-full rounded-t-lg bg-fuchsia-600 transition-all duration-500"
              style={{ height: barH }}
              title={`${d.month}: ${d.total}`}
            />
            <span className="text-[9px] text-slate-400">{d.month.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardKomplain() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateStart, setDateStart] = useState(DEFAULT_CUTOFF.start);
  const [dateEnd,   setDateEnd]   = useState(DEFAULT_CUTOFF.end);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateStart) params.set("start_date", dateStart);
      if (dateEnd)   params.set("end_date",   dateEnd);
      const data = await api(`/complaints/summary?${params}`);
      setSummary(data);
    } catch (_) {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd]);

  useEffect(() => {
    document.title = "Dashboard Komplain | Alora App";
    fetchSummary();
  }, [fetchSummary]);

  const t = summary?.totals;

  const statCards = [
    { label: "Total Komplain",    value: t?.total             ?? 0, icon: HiOutlineExclamationCircle, colorClass: "bg-fuchsia-100/80 text-fuchsia-800 border-fuchsia-200" },
    { label: "Open",              value: t?.open_count        ?? 0, icon: HiOutlineClock,             colorClass: "bg-amber-50 text-amber-600 border-amber-100" },
    { label: "On Progress",       value: t?.on_progress_count ?? 0, icon: HiOutlineArrowPath,         colorClass: "bg-sky-50 text-sky-600 border-sky-100" },
    { label: "Waiting Customer",  value: t?.waiting_count     ?? 0, icon: HiOutlineUserGroup,         colorClass: "bg-violet-50 text-violet-600 border-violet-100" },
    { label: "Resolved",          value: t?.resolved_count    ?? 0, icon: HiOutlineCheckCircle,       colorClass: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { label: "Closed",            value: t?.closed_count      ?? 0, icon: HiOutlineXCircle,           colorClass: "bg-slate-50 text-slate-500 border-slate-100" },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Dashboard Komplain</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Ringkasan dan statistik pengelolaan komplain pelanggan
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20"
            />
          </div>
          <button
            type="button"
            onClick={fetchSummary}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
          <div className="mb-4 flex items-center gap-2">
            <HiOutlineChartBarSquare className="h-5 w-5 text-fuchsia-500" />
            <h3 className="text-sm font-bold text-slate-800">Tren 6 Bulan Terakhir</h3>
          </div>
          {loading ? (
            <div className="flex h-24 items-end gap-1">
              {[60, 80, 45, 90, 70, 55].map((h, i) => (
                <div key={i} className="flex-1 animate-pulse rounded-t-lg bg-slate-100" style={{ height: h }} />
              ))}
            </div>
          ) : (
            <TrendChart data={summary?.recentTrend || []} />
          )}
        </div>

        {/* By Topic */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
          <h3 className="mb-4 text-sm font-bold text-slate-800">Komplain per Topik</h3>
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-5 flex-1 animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <SimpleBarChart
              data={summary?.byTopic || []}
              labelKey="topic_name"
              valueKey="total"
              color="bg-fuchsia-600"
            />
          )}
        </div>

        {/* By Type */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
          <h3 className="mb-4 text-sm font-bold text-slate-800">Komplain per Tipe</h3>
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-5 flex-1 animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <SimpleBarChart
              data={summary?.byType || []}
              labelKey="type_name"
              valueKey="total"
              color="bg-violet-400"
            />
          )}
        </div>
      </div>

      {/* By Outlet table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
        <h3 className="mb-4 text-sm font-bold text-slate-800">Komplain per Outlet (Top 10)</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        ) : !summary?.byOutlet?.length ? (
          <p className="py-6 text-center text-sm text-slate-400">Tidak ada data outlet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="pb-2 text-xs font-bold text-slate-500">Outlet</th>
                  <th className="pb-2 text-right text-xs font-bold text-slate-500">Total</th>
                  <th className="pb-2 text-right text-xs font-bold text-slate-500">Belum Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.byOutlet.map((row) => (
                  <tr key={row.outlet_id} className="hover:bg-slate-50/50">
                    <td className="py-2 font-medium text-slate-700">
                      {row.outlet_name || `Outlet #${row.outlet_id}`}
                    </td>
                    <td className="py-2 text-right font-bold text-slate-800">{row.total}</td>
                    <td className="py-2 text-right">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          row.open_total > 0
                            ? "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-600",
                        )}
                      >
                        {row.open_total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
