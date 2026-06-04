import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineMagnifyingGlass,
  HiOutlineMapPin,
  HiOutlineUserCircle,
  HiOutlineXMark,
  HiOutlineArrowTrendingUp,
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

// Compute cutoff range from a selected year+month (cutoff: 26 prev → 25 selected)
function cutoffFromYearMonth(year, month) {
  // month is 1-indexed
  let startYear = year;
  let startMonth = month - 1; // previous month
  if (startMonth < 1) { startMonth = 12; startYear -= 1; }
  return {
    start: `${startYear}-${String(startMonth).padStart(2, "0")}-26`,
    end:   `${year}-${String(month).padStart(2, "0")}-25`,
  };
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function fmtDateTime(v) {
  if (!v) return { date: "-", time: null };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { date: v, time: null };
  return {
    date: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d),
    time: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d),
  };
}

function periodLabel(start, end) {
  if (!start && !end) return "Semua periode";
  if (start && end) return `${fmtDate(start)} s/d ${fmtDate(end)}`;
  if (start) return `Mulai ${fmtDate(start)}`;
  return `Sampai ${fmtDate(end)}`;
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, value);
  });
  return qs.toString();
}

function StatCard({ label, value, icon: Icon, colorClass, loading, onClick }) {
  const interactive = typeof onClick === "function" && !loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.07)] transition",
        interactive && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30",
        !interactive && "cursor-default",
        colorClass,
      )}
    >
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
    </button>
  );
}

function SimpleBarChart({ data, labelKey, valueKey, color = "bg-rose-500", onItemClick }) {
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
          <button
            type="button"
            key={item[labelKey]}
            className={cn(
              "group block w-full rounded-xl p-1.5 text-left transition",
              onItemClick ? "cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20" : "cursor-default",
            )}
            onClick={() => onItemClick?.(item)}
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
          </button>
        );
      })}
    </div>
  );
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];

function TrendChart({ data, onItemClick }) {
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
          <button
            type="button"
            key={d.month}
            onClick={() => onItemClick?.(d)}
            className={cn(
              "group flex flex-1 flex-col items-center gap-1 rounded-xl p-1 transition",
              onItemClick ? "cursor-pointer hover:bg-fuchsia-50/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20" : "cursor-default",
            )}
          >
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
          </button>
        );
      })}
    </div>
  );
}

const PROGRESS_META = {
  Open: { cls: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  "On Progress": { cls: "border-sky-200 bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  "Waiting Customer": { cls: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  Resolved: { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Closed: { cls: "border-slate-200 bg-slate-50 text-slate-600", dot: "bg-slate-400" },
};

function DetailModal({ open, config, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !config) return;
    const controller = new AbortController();

    async function loadDetails() {
      setLoading(true);
      setError("");
      setSearch("");
      try {
        const query = buildQuery({ ...config.params, limit: "all" });
        const data = await api(`/complaints?${query}`, { signal: controller.signal });
        setRows(data?.complaints || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Gagal mengambil detail komplain.");
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
    return () => controller.abort();
  }, [open, config]);

  // Lock body scroll saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !config) return null;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter((row) => [
      row.complaint_name,
      row.nota_number,
      row.outlet_name,
      row.topic_name,
      row.category_name,
      row.type_name,
      row.pic_name,
      row.description,
      row.progress,
    ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)))
    : rows;

  const openCount = rows.filter((row) => !["Resolved", "Closed"].includes(row.progress)).length;
  const resolvedCount = rows.length - openCount;

  // Render via portal agar keluar dari overflow-y-auto container
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm", config.iconClass || "bg-gradient-to-br from-fuchsia-700 to-fuchsia-400")}>
              <HiOutlineClipboardDocumentList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold text-slate-800">{config.title}</h2>
              <p className="truncate text-xs text-slate-500">{config.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup detail"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-5 p-6 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ringkasan</p>
                <p className="mt-3 text-4xl font-extrabold text-slate-800">{rows.length}</p>
                <p className="text-xs text-slate-500">komplain pada filter ini</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <p className="text-lg font-extrabold text-amber-700">{openCount}</p>
                    <p className="text-[11px] font-semibold text-amber-600">Belum selesai</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-lg font-extrabold text-emerald-700">{resolvedCount}</p>
                    <p className="text-[11px] font-semibold text-emerald-600">Selesai</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <HiOutlineCalendarDays className="h-4 w-4 text-fuchsia-500" />
                  Periode
                </div>
                <p className="mt-2 text-sm text-slate-600">{config.period}</p>
              </div>
            </aside>

            <section className="min-w-0 space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Daftar Detail Komplain</p>
                  <p className="text-xs text-slate-400">{filteredRows.length} dari {rows.length} data tampil</p>
                </div>
                <div className="relative w-full sm:w-80">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari pelapor, nota, outlet, topik..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="h-28 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
                  ))
                ) : filteredRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
                    Tidak ada komplain yang cocok.
                  </div>
                ) : (
                  filteredRows.map((row) => {
                    const progressMeta = PROGRESS_META[row.progress] || PROGRESS_META.Open;
                    const submitted = fmtDateTime(row.submitted_at || row.created_at);
                    return (
                      <article key={row.complaint_id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-fuchsia-100 hover:shadow-md">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold", progressMeta.cls)}>
                                <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", progressMeta.dot)} />
                                {row.progress}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                                Nota {row.nota_number}
                              </span>
                            </div>
                            <h3 className="mt-2 text-base font-extrabold text-slate-800">{row.complaint_name}</h3>
                            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{row.description}</p>
                          </div>
                          <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-right">
                            <p className="text-xs font-semibold text-slate-500">{submitted.date}</p>
                            {submitted.time && <p className="text-[11px] text-slate-400">{submitted.time}</p>}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                            <HiOutlineMapPin className="h-4 w-4 shrink-0 text-sky-500" />
                            <span className="truncate">{row.outlet_name || `Outlet #${row.outlet_id}`}</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                            <HiOutlineTag className="h-4 w-4 shrink-0 text-amber-500" />
                            <span className="truncate">{row.category_name || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                            <HiOutlineListBullet className="h-4 w-4 shrink-0 text-fuchsia-500" />
                            <span className="truncate">{row.topic_name || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                            <HiOutlineUserCircle className="h-4 w-4 shrink-0 text-violet-500" />
                            <span className="truncate">{row.pic_name || "PIC belum diisi"}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-600">{row.type_name}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">Qty {row.qty}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">Potongan: {row.deduction}</span>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function DashboardKomplain() {
  const [summary, setSummary] = useState(null);
  const [sameDayData, setSameDayData] = useState(null);
  const [sameDayLoading, setSameDayLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null);
  const [dateStart, setDateStart] = useState(DEFAULT_CUTOFF.start);
  const [dateEnd,   setDateEnd]   = useState(DEFAULT_CUTOFF.end);

  // Periods from DB (for month/year picker)
  const [periods, setPeriods] = useState([]); // [{ year, month }]
  const [periodMode, setPeriodMode] = useState("month"); // "month" | "range" | "all"
  const [selectedYear, setSelectedYear]   = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Load available periods from DB (bucketed by submitted_at cutoff)
  useEffect(() => {
    api("/complaints/periods").then((rows) => {
      setPeriods(rows || []);
      if (rows && rows.length > 0) {
        const defEnd = new Date(DEFAULT_CUTOFF.end);
        const defYear = defEnd.getFullYear();
        const defMonth = defEnd.getMonth() + 1;
        const match = rows.find((r) => Number(r.year) === defYear && Number(r.month) === defMonth);
        if (match) {
          setSelectedYear(Number(match.year));
          setSelectedMonth(Number(match.month));
        } else {
          setSelectedYear(Number(rows[0].year));
          setSelectedMonth(Number(rows[0].month));
          const cutoff = cutoffFromYearMonth(Number(rows[0].year), Number(rows[0].month));
          setDateStart(cutoff.start);
          setDateEnd(cutoff.end);
        }
      }
    }).catch(() => {});
  }, []);

  // ── Period mode switching ───────────────────────────────────────────
  const switchToMonth = () => {
    setPeriodMode("month");
    if (selectedYear && selectedMonth) {
      const cutoff = cutoffFromYearMonth(selectedYear, selectedMonth);
      setDateStart(cutoff.start);
      setDateEnd(cutoff.end);
    }
  };

  const switchToRange = () => {
    setPeriodMode("range");
    if (!dateStart || !dateEnd) {
      setDateStart(DEFAULT_CUTOFF.start);
      setDateEnd(DEFAULT_CUTOFF.end);
    }
  };

  const switchToAll = () => {
    setPeriodMode("all");
    setDateStart("");
    setDateEnd("");
  };

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

  const fetchSameDay = useCallback(async () => {
    setSameDayLoading(true);
    try {
      const data = await api(`/complaints/same-day-comparison`);
      setSameDayData(data);
    } catch (error) {
      console.error("Error fetching same-day comparison:", error);
      setSameDayData(null);
    } finally {
      setSameDayLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Dashboard Komplain | Alora App";
    fetchSummary();
    fetchSameDay();
  }, [fetchSummary, fetchSameDay]);

  const t = summary?.totals;
  const activeDateParams = periodMode === "all" ? {} : { start_date: dateStart, end_date: dateEnd };
  const activePeriodLabel = periodLabel(dateStart, dateEnd);

  const openDetail = useCallback((config) => {
    setDetailModal({
      period: config.period || activePeriodLabel,
      iconClass: config.iconClass,
      params: { ...activeDateParams, ...(config.params || {}) },
      title: config.title,
      subtitle: config.subtitle || activePeriodLabel,
    });
  }, [activeDateParams, activePeriodLabel]);

  const openTrendDetail = (item) => {
    const [year, month] = item.month.split("-").map(Number);
    const cutoff = cutoffFromYearMonth(year, month);
    const label = `${MONTH_NAMES[month - 1]} '${String(year).slice(2)}`;
    openDetail({
      title: `Trend Komplain: ${label}`,
      subtitle: `${fmtDate(cutoff.start)} s/d ${fmtDate(cutoff.end)}`,
      period: `${fmtDate(cutoff.start)} s/d ${fmtDate(cutoff.end)}`,
      params: { start_date: cutoff.start, end_date: cutoff.end },
      iconClass: "bg-gradient-to-br from-fuchsia-700 to-fuchsia-400",
    });
  };

  const statCards = [
    { label: "Total Komplain",    value: t?.total             ?? 0, icon: HiOutlineExclamationCircle, colorClass: "bg-fuchsia-100/80 text-fuchsia-800 border-fuchsia-200", detail: { title: "Semua Komplain", params: {}, iconClass: "bg-gradient-to-br from-fuchsia-700 to-fuchsia-400" } },
    { label: "Open",              value: t?.open_count        ?? 0, icon: HiOutlineClock,             colorClass: "bg-amber-50 text-amber-600 border-amber-100", detail: { title: "Komplain Open", params: { progress: "Open" }, iconClass: "bg-gradient-to-br from-amber-500 to-orange-400" } },
    { label: "On Progress",       value: t?.on_progress_count ?? 0, icon: HiOutlineArrowPath,         colorClass: "bg-sky-50 text-sky-600 border-sky-100", detail: { title: "Komplain On Progress", params: { progress: "On Progress" }, iconClass: "bg-gradient-to-br from-sky-600 to-cyan-400" } },
    { label: "Waiting Customer",  value: t?.waiting_count     ?? 0, icon: HiOutlineUserGroup,         colorClass: "bg-violet-50 text-violet-600 border-violet-100", detail: { title: "Komplain Waiting Customer", params: { progress: "Waiting Customer" }, iconClass: "bg-gradient-to-br from-violet-600 to-fuchsia-400" } },
    { label: "Resolved",          value: t?.resolved_count    ?? 0, icon: HiOutlineCheckCircle,       colorClass: "bg-emerald-50 text-emerald-600 border-emerald-100", detail: { title: "Komplain Resolved", params: { progress: "Resolved" }, iconClass: "bg-gradient-to-br from-emerald-600 to-teal-400" } },
    { label: "Closed",            value: t?.closed_count      ?? 0, icon: HiOutlineXCircle,           colorClass: "bg-slate-50 text-slate-500 border-slate-100", detail: { title: "Komplain Closed", params: { progress: "Closed" }, iconClass: "bg-gradient-to-br from-slate-600 to-slate-400" } },
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period mode toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={switchToMonth}
              className={cn("px-3 py-2 transition", periodMode === "month" ? "bg-fuchsia-700 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              Per Bulan
            </button>
            <button
              type="button"
              onClick={switchToRange}
              className={cn("px-3 py-2 transition", periodMode === "range" ? "bg-fuchsia-700 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              Range
            </button>
            <button
              type="button"
              onClick={switchToAll}
              className={cn("px-3 py-2 transition", periodMode === "all" ? "bg-fuchsia-700 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              Semua
            </button>
          </div>

          {periodMode === "month" ? (
            /* Month/Year picker from DB periods */
            <div className="flex items-center gap-2">
              {/* Year selector */}
              {(() => {
                const years = [...new Set(periods.map((p) => Number(p.year)))].sort((a, b) => b - a);
                return (
                  <select
                    value={selectedYear ?? ""}
                    onChange={(e) => {
                      const yr = Number(e.target.value);
                      setSelectedYear(yr);
                      const firstMonth = periods.find((p) => Number(p.year) === yr);
                      if (firstMonth) {
                        const mo = Number(firstMonth.month);
                        setSelectedMonth(mo);
                        const cutoff = cutoffFromYearMonth(yr, mo);
                        setDateStart(cutoff.start);
                        setDateEnd(cutoff.end);
                      }
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500"
                  >
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                );
              })()}
              {/* Month selector — only months available for selected year */}
              {(() => {
                const months = periods
                  .filter((p) => Number(p.year) === selectedYear)
                  .map((p) => Number(p.month))
                  .sort((a, b) => b - a);
                return (
                  <select
                    value={selectedMonth ?? ""}
                    onChange={(e) => {
                      const mo = Number(e.target.value);
                      setSelectedMonth(mo);
                      const cutoff = cutoffFromYearMonth(selectedYear, mo);
                      setDateStart(cutoff.start);
                      setDateEnd(cutoff.end);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500"
                  >
                    {months.map((m) => <option key={m} value={m}>{MONTH_NAMES[m - 1]}</option>)}
                  </select>
                );
              })()}
              {/* Cutoff label */}
              {dateStart && dateEnd && (
                <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-3 py-1.5 hidden sm:inline">
                  {dateStart} s/d {dateEnd}
                </span>
              )}
            </div>
          ) : periodMode === "range" ? (
            /* Manual date range */
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
          ) : (
            /* All periods — no date filter */
            <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-3 py-1.5">
              Menampilkan semua periode
            </span>
          )}

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
          <StatCard
            key={card.label}
            {...card}
            loading={loading}
            onClick={() => openDetail({ ...card.detail, subtitle: activePeriodLabel })}
          />
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
              onItemClick={(item) => openDetail({
                title: `Topik: ${item.topic_name}`,
                subtitle: activePeriodLabel,
                params: { topic_id: item.topic_id },
                iconClass: "bg-gradient-to-br from-fuchsia-700 to-fuchsia-400",
              })}
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
              onItemClick={(item) => openDetail({
                title: `Bahan: ${item.category_name}`,
                subtitle: activePeriodLabel,
                params: { category_id: item.category_id },
                iconClass: "bg-gradient-to-br from-amber-500 to-yellow-400",
              })}
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
              onItemClick={(item) => openDetail({
                title: `Tipe: ${item.type_name}`,
                subtitle: activePeriodLabel,
                params: { type_id: item.type_id },
                iconClass: "bg-gradient-to-br from-violet-600 to-indigo-400",
              })}
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
          <TrendChart data={summary?.recentTrend || []} onItemClick={openTrendDetail} />
        )}
      </div>

      {/* ── Cumulative period comparison (26th → today) ────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50">
            <HiOutlineArrowTrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Perbandingan Periode yg Sama
            </h3>
            <p className="text-[11px] text-slate-400">
              Akumulasi komplain tanggal 26 sampai hari ini (Periode Cutoff)
            </p>
          </div>
        </div>
        {sameDayLoading ? (
          <div className="flex items-end gap-3 px-2" style={{ height: 160 }}>
            {[80, 100, 60, 120, 90, 110, 70].map((h, i) => (
              <div key={i} className="flex-1 animate-pulse rounded-t-xl bg-indigo-100" style={{ height: h }} />
            ))}
          </div>
        ) : !sameDayData?.data?.length ? (
          <p className="py-12 text-center text-sm text-slate-400">Tidak ada data perbandingan</p>
        ) : (
          <div>
            <div className="flex items-end gap-3 px-2" style={{ height: 160 }}>
              {sameDayData.data.map((d) => {
                const max = Math.max(...sameDayData.data.map((x) => x.total), 1);
                const barH = Math.max((d.total / max) * 140, 10);
                const isLast = d.label === sameDayData.data[sameDayData.data.length - 1]?.label;
                const [yr, mo] = d.label.split("-");
                return (
                  <div
                    key={d.label}
                    className="group flex flex-1 flex-col items-center gap-1 rounded-xl p-1 transition hover:bg-indigo-50/60"
                  >
                    <span className="text-xs font-bold text-indigo-700 opacity-0 transition-opacity group-hover:opacity-100">
                      {d.total}
                    </span>
                    <div className="relative w-full overflow-hidden rounded-t-xl" style={{ height: barH }}>
                      <div
                        className={cn(
                          "absolute inset-0 transition-all",
                          isLast
                            ? "bg-gradient-to-t from-indigo-700 to-indigo-400"
                            : "bg-gradient-to-t from-slate-400 to-slate-300"
                        )}
                      />
                      <div className="absolute inset-0 flex items-end justify-center pb-1">
                        <span className="text-[10px] font-extrabold text-white drop-shadow">{d.total}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                      {MONTH_NAMES[Number(mo) - 1]} '{String(yr).slice(2)}
                    </span>
                  </div>
                );
              })}
            </div>
            {sameDayData.data[0] && (
              <p className="mt-4 text-center text-[11px] text-slate-400">
                Periode {fmtDate(sameDayData.data[0].start)} s/d {fmtDate(sameDayData.data[0].end)} — dst
              </p>
            )}
          </div>
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
                    <tr
                      key={row.outlet_id}
                      onClick={() => openDetail({
                        title: `Outlet: ${row.outlet_name || `Outlet #${row.outlet_id}`}`,
                        subtitle: activePeriodLabel,
                        params: { outlet_id: row.outlet_id },
                        iconClass: "bg-gradient-to-br from-sky-600 to-blue-400",
                      })}
                      className="group cursor-pointer transition hover:bg-slate-50/70"
                    >
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

      <DetailModal
        open={Boolean(detailModal)}
        config={detailModal}
        onClose={() => setDetailModal(null)}
      />
    </div>
  );
}
