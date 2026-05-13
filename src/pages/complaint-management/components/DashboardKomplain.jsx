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
  HiOutlineTag,
  HiOutlineSquares2X2,
  HiOutlineListBullet,
  HiOutlineBuildingStorefront,
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
  const [tooltip, setTooltip] = useState(null); // { x, y, label, value, pct }

  if (!data?.length)
    return <p className="py-10 text-center text-sm text-slate-400">Tidak ada data</p>;
  const total = data.reduce((s, d) => s + d[valueKey], 0);
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="relative space-y-3">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="text-xs font-bold text-slate-800">{tooltip.label}</p>
          <p className="text-xs text-slate-500">
            {tooltip.value} komplain &mdash; <span className="font-semibold text-fuchsia-600">{tooltip.pct}%</span>
          </p>
        </div>
      )}

      {data.map((item) => {
        const pct = total > 0 ? Math.round((item[valueKey] / total) * 100) : 0;
        return (
          <div
            key={item[labelKey]}
            className="group cursor-default"
            onMouseMove={(e) =>
              setTooltip({ x: e.clientX, y: e.clientY, label: item[labelKey], value: item[valueKey], pct })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-slate-600">
                {item[labelKey]}
              </span>
              <span className="shrink-0 text-xs font-bold text-slate-700">
                {item[valueKey]}
                <span className="ml-1 font-normal text-slate-400">({pct}%)</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full transition-all duration-500 group-hover:brightness-110", color)}
                style={{ width: `${(item[valueKey] / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];

function TrendChart({ data }) {
  if (!data?.length)
    return <p className="py-12 text-center text-sm text-slate-400">Tidak ada data tren</p>;
  const max = Math.max(...data.map((d) => d.total), 1);
  const H = 160;
  return (
    <div className="flex items-end gap-3 px-2" style={{ height: H + 40 }}>
      {data.map((d) => {
        const barH = Math.max((d.total / max) * H, 6);
        const [yr, mo] = d.month.split("-");
        const label = `${MONTH_NAMES[Number(mo) - 1]} '${yr.slice(2)}`;
        return (
          <div key={d.month} className="group flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-bold text-fuchsia-700 opacity-0 transition-opacity group-hover:opacity-100">
              {d.total}
            </span>
            <div className="relative w-full overflow-hidden rounded-t-xl" style={{ height: barH }}>
              <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-700 to-fuchsia-400" />
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <span className="text-[10px] font-extrabold text-white drop-shadow">{d.total}</span>
              </div>
            </div>
            <span className="text-[10px] font-medium text-slate-500">{label}</span>
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
    } catch (error) {
      console.error("Error fetching summary:", error);
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

      {/* Charts row — 3 col */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* By Topic */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-50">
              <HiOutlineListBullet className="h-4 w-4 text-fuchsia-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Komplain per Topik</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="mb-1 h-3 w-28 animate-pulse rounded bg-slate-100" />
                  <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <SimpleBarChart
              data={summary?.byTopic || []}
              labelKey="topic_name"
              valueKey="total"
              color="bg-fuchsia-500"
            />
          )}
        </div>

        {/* By Category (Bahan) */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
              <HiOutlineTag className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Komplain per Bahan</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="mb-1 h-3 w-28 animate-pulse rounded bg-slate-100" />
                  <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <SimpleBarChart
              data={summary?.byCategory || []}
              labelKey="category_name"
              valueKey="total"
              color="bg-amber-400"
            />
          )}
        </div>

        {/* By Type */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
              <HiOutlineSquares2X2 className="h-4 w-4 text-violet-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Komplain per Tipe</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i}>
                  <div className="mb-1 h-3 w-28 animate-pulse rounded bg-slate-100" />
                  <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <SimpleBarChart
              data={summary?.byType || []}
              labelKey="type_name"
              valueKey="total"
              color="bg-violet-500"
            />
          )}
        </div>
      </div>

      {/* Trend — full width */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-50">
            <HiOutlineChartBarSquare className="h-4 w-4 text-fuchsia-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tren 6 Bulan Terakhir</h3>
            <p className="text-[11px] text-slate-400">Jumlah komplain masuk per bulan</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-end gap-3 px-2" style={{ height: 200 }}>
            {[80, 120, 60, 150, 100, 90].map((h, i) => (
              <div key={i} className="flex-1 animate-pulse rounded-t-xl bg-slate-100" style={{ height: h }} />
            ))}
          </div>
        ) : (
          <TrendChart data={summary?.recentTrend || []} />
        )}
      </div>

      {/* By Outlet table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50">
            <HiOutlineBuildingStorefront className="h-4 w-4 text-sky-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Komplain per Outlet (Top 10)</h3>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        ) : !summary?.byOutlet?.length ? (
          <p className="py-6 text-center text-sm text-slate-400">Tidak ada data outlet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Outlet</th>
                  <th className="pb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400">Progress</th>
                  <th className="pb-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400">Total</th>
                  <th className="pb-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400">Belum Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.byOutlet.map((row) => {
                  const resolvedPct = row.total > 0 ? Math.round(((row.total - row.open_total) / row.total) * 100) : 0;
                  return (
                    <tr key={row.outlet_id} className="group transition hover:bg-slate-50/70">
                      <td className="py-3 font-medium text-slate-700">
                        {row.outlet_name || `Outlet #${row.outlet_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                              style={{ width: `${resolvedPct}%` }}
                            />
                          </div>
                          <span className="w-9 text-right text-[11px] text-slate-400">{resolvedPct}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-bold text-slate-800">{row.total}</td>
                      <td className="py-3 text-right">
                        <span
                          className={cn(
                            "inline-block min-w-[28px] rounded-full border px-2 py-0.5 text-center text-[11px] font-bold",
                            row.open_total > 0
                              ? "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-600",
                          )}
                        >
                          {row.open_total}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
