import { useCallback, useEffect, useState } from "react";
import {
  HiOutlineFaceSmile,
  HiOutlineUserGroup,
  HiOutlineCalendarDays,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineChartBarSquare,
  HiOutlineSun,
  HiOutlineCloud,
  HiOutlineSparkles,
  HiOutlineFaceFrown,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function cn(...c) {
  return c.filter(Boolean).join(" ");
}

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCurrentMonthYear() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// ─────────────────────────────────────────────
// Mood metadata
// ─────────────────────────────────────────────
const MOOD_META = {
  lagi_bersinar: {
    label: "Lagi Bersinar ✨",
    short: "Bersinar",
    emoji: "✨",
    icon: HiOutlineSparkles,
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
    gradient: "from-amber-400 to-yellow-300",
    desc: "Semangat penuh, siap menaklukkan hari!",
  },
  santai_positif: {
    label: "Santai Positif 😊",
    short: "Positif",
    emoji: "😊",
    icon: HiOutlineSun,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
    bar: "bg-emerald-400",
    gradient: "from-emerald-400 to-teal-300",
    desc: "Mood baik, produktif dan tenang.",
  },
  mode_standar: {
    label: "Mode Standar 🙂",
    short: "Standar",
    emoji: "🙂",
    icon: HiOutlineFaceSmile,
    cls: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    gradient: "from-sky-400 to-blue-300",
    desc: "Biasa saja, tapi tetap jalan.",
  },
  agak_mendung: {
    label: "Agak Mendung 😐",
    short: "Mendung",
    emoji: "😐",
    icon: HiOutlineCloud,
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    bar: "bg-slate-400",
    gradient: "from-slate-400 to-slate-300",
    desc: "Sedikit lesu, butuh suntikan semangat.",
  },
  cuaca_hati_kurang_baik: {
    label: "Cuaca Hati Kurang Baik 😟",
    short: "Kurang Baik",
    emoji: "😟",
    icon: HiOutlineFaceFrown,
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-400",
    bar: "bg-rose-400",
    gradient: "from-rose-400 to-pink-300",
    desc: "Perlu perhatian dan dukungan ekstra.",
  },
};

const MOOD_KEYS = Object.keys(MOOD_META);

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
        toast.type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {toast.type === "error" ? (
        <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
      ) : (
        <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-2 w-36 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function MoodBadge({ moodLevel }) {
  const meta = MOOD_META[moodLevel];
  if (!meta) return <span className="text-slate-400 text-xs">-</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        meta.cls
      )}
    >
      <span className="text-sm leading-none">{meta.emoji}</span>
      {meta.short}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            color ?? "bg-violet-100 text-violet-600"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-800">{value ?? 0}</p>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Mood Detail Modal — shows employees who picked a mood
// ─────────────────────────────────────────────
function MoodDetailModal({ moodKey, employees, onClose }) {
  const meta = MOOD_META[moodKey];
  if (!meta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl border bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta.emoji}</span>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{meta.label}</h3>
              <p className="text-sm text-slate-500">{employees.length} karyawan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
                {emp.full_name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{emp.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {emp.position_name || emp.department_name || emp.employee_code}
                </p>
              </div>
            </div>
          ))}
          {employees.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Tidak ada data</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function EmployeeMood() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterMood, setFilterMood] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const { year, month } = getCurrentMonthYear();

  // Today's distribution detail
  const [todayMood, setTodayMood] = useState([]);
  const [selectedMoodKey, setSelectedMoodKey] = useState(null);
  const todayMoodLoading = todayMood.length === 0 && !summaryLoading;

  // Toast helper
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch list
  const fetchMoods = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
        });
        if (search) qs.set("search", search);
        if (filterMood) qs.set("mood_level", filterMood);
        if (dateFrom) qs.set("date_from", dateFrom);
        if (dateTo) qs.set("date_to", dateTo);

        const res = await api(`/know-your-employee/mood?${qs}`);
        setData(res.data || []);
        setPagination((p) => ({
          ...p,
          page,
          total: res.pagination?.total || 0,
          totalPages: res.pagination?.totalPages || 0,
        }));
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [search, filterMood, dateFrom, dateTo, pagination.limit, showToast]
  );

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api(`/know-your-employee/mood/summary?year=${year}&month=${month}`);
      setSummary(res.data || null);
    } catch {
      // silent
    } finally {
      setSummaryLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMoods(1);
  }, [search, filterMood, dateFrom, dateTo]);

  useEffect(() => {
    fetchSummary();
  }, []);

  // Fetch today's mood detail
  const fetchTodayMood = useCallback(async () => {
    try {
      const res = await api("/know-your-employee/mood/today");
      setTodayMood(res.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (summary?.today_stats?.filled > 0) fetchTodayMood();
  }, [summary]);

  const handleClearFilters = () => {
    setSearch("");
    setFilterMood("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilter = search || filterMood || dateFrom || dateTo;

  // Hitung dominan mood hari ini
  const todayStats = summary?.today_stats;
  const byMood = summary?.by_mood || [];
  const topMood = byMood[0];

  // Group today's mood detail by mood_level
  const todayMoodByKey = {};
  MOOD_KEYS.forEach((k) => { todayMoodByKey[k] = []; });
  todayMood.forEach((r) => {
    if (todayMoodByKey[r.mood_level]) todayMoodByKey[r.mood_level].push(r);
  });

  return (
    <>
      <Toast toast={toast} />
      <main className="min-h-screen bg-violet-50 py-6 sm:py-8">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── Page Header ── */}
          <section className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-slate-950 via-violet-700 to-purple-500 p-5 shadow-sm sm:p-6">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-purple-300/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                  <HiOutlineFaceSmile className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">Employee Mood</h1>
                  <p className="text-sm text-white/70">Pantau suasana hati tim Alora hari ini</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5 text-center">
                  <p className="text-xs text-white/70">Isi Hari Ini</p>
                  <p className="text-lg font-bold text-white">
                    {summaryLoading ? "..." : `${todayStats?.filled ?? 0} / ${todayStats?.total_active ?? 0}`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Stat Cards ── */}
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={HiOutlineUserGroup}
              label="Total Karyawan Aktif"
              value={summaryLoading ? "..." : todayStats?.total_active ?? 0}
              sub="Karyawan aktif saat ini"
              color="bg-violet-100 text-violet-600"
            />
            <StatCard
              icon={HiOutlineCheckCircle}
              label="Sudah Mengisi"
              value={summaryLoading ? "..." : todayStats?.filled ?? 0}
              sub="Mood hari ini"
              color="bg-emerald-100 text-emerald-600"
            />
            <StatCard
              icon={HiOutlineExclamationTriangle}
              label="Belum Mengisi"
              value={summaryLoading ? "..." : todayStats?.not_filled ?? 0}
              sub="Perlu diingatkan"
              color="bg-amber-100 text-amber-600"
            />
            <StatCard
              icon={HiOutlineChartBarSquare}
              label="Mood Terdominasi"
              value={summaryLoading ? "..." : topMood ? MOOD_META[topMood.mood_level]?.emoji ?? "—" : "—"}
              sub={summaryLoading ? "" : topMood ? MOOD_META[topMood.mood_level]?.short ?? "-" : "Belum ada data"}
              color="bg-purple-100 text-purple-600"
            />
          </section>

          {/* ── Distribusi Mood — Hari Ini ── */}
          {!summaryLoading && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <HiOutlineChartBarSquare className="h-5 w-5 text-violet-500" />
                <h2 className="text-sm font-bold text-slate-800">
                  Distribusi Mood — Hari Ini
                </h2>
                {todayMood.length > 0 && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-600 ml-auto">
                    {todayMood.length} data
                  </span>
                )}
              </div>

              {/* 5 mood cards side-by-side */}
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {MOOD_KEYS.map((key) => {
                  const meta = MOOD_META[key];
                  const employees = todayMoodByKey[key] || [];
                  const count = employees.length;
                  const totalToday = todayMood.length;
                  const pct = totalToday > 0 ? Math.round((count / totalToday) * 100) : 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMoodKey(key)}
                      className={cn(
                        "group flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95",
                        meta.cls,
                        selectedMoodKey === key ? "ring-2 ring-offset-1 ring-violet-400" : ""
                      )}
                    >
                      <span className="text-3xl sm:text-4xl leading-none">{meta.emoji}</span>
                      <span className="text-lg sm:text-xl font-bold text-slate-800">{count}</span>
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500">{pct}%</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Mood Distribution Bar (bulanan) ── */}
          {!summaryLoading && byMood.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <HiOutlineChartBarSquare className="h-5 w-5 text-violet-500" />
                <h2 className="text-sm font-bold text-slate-800">
                  Distribusi Mood — {new Date(year, month - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                </h2>
              </div>
              <div className="space-y-3">
                {MOOD_KEYS.map((key) => {
                  const found = byMood.find((b) => b.mood_level === key);
                  const count = found ? Number(found.total) : 0;
                  const totalAll = byMood.reduce((s, b) => s + Number(b.total), 0);
                  const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
                  const meta = MOOD_META[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-6 text-center text-base">{meta.emoji}</span>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">{meta.short}</span>
                          <span className="text-xs text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn("h-2 rounded-full transition-all duration-700", meta.bar)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Filters ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, kode, atau jabatan..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition"
                />
              </div>

              {/* Filter mood */}
              <select
                value={filterMood}
                onChange={(e) => setFilterMood(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition"
              >
                <option value="">Semua Mood</option>
                {MOOD_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {MOOD_META[k].emoji} {MOOD_META[k].short}
                  </option>
                ))}
              </select>

              {/* Date from */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition"
              />

              {/* Date to */}
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition"
              />

              {/* Clear */}
              {hasActiveFilter && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
                >
                  <HiOutlineXMark className="h-4 w-4" />
                  Reset
                </button>
              )}
            </div>
          </section>

          {/* ── Table ── */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <HiOutlineCalendarDays className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-bold text-slate-800">
                  Data Mood Karyawan
                </span>
                {!loading && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">
                    {pagination.total}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Karyawan</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Posisi</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Mood</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Deskripsi</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-5 py-3"><div className="h-3 w-4 rounded bg-slate-100" /></td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-slate-100" />
                              <div className="space-y-1">
                                <div className="h-3 w-28 rounded bg-slate-100" />
                                <div className="h-2 w-16 rounded bg-slate-100" />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3"><div className="h-3 w-24 rounded bg-slate-100" /></td>
                          <td className="px-5 py-3"><div className="h-5 w-20 rounded-full bg-slate-100" /></td>
                          <td className="px-5 py-3"><div className="h-3 w-36 rounded bg-slate-100" /></td>
                          <td className="px-5 py-3"><div className="h-3 w-20 rounded bg-slate-100" /></td>
                        </tr>
                      ))
                    : data.length === 0
                    ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <HiOutlineFaceSmile className="h-10 w-10 text-slate-300" />
                              <p className="text-sm text-slate-400">Belum ada data mood</p>
                            </div>
                          </td>
                        </tr>
                      )
                    : data.map((row, idx) => {
                        const meta = MOOD_META[row.mood_level];
                        const offset = (pagination.page - 1) * pagination.limit;
                        return (
                          <tr key={row.id} className="hover:bg-violet-50/40 transition-colors">
                            <td className="px-5 py-3 text-xs text-slate-400">{offset + idx + 1}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
                                  {row.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{row.full_name}</p>
                                  <p className="text-[11px] text-slate-400">{row.employee_code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-slate-700">{row.position_name || "-"}</p>
                              {row.department_name && (
                                <p className="text-[11px] text-slate-400">{row.department_name}</p>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <MoodBadge moodLevel={row.mood_level} />
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500">
                              {meta?.desc ?? "-"}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(row.mood_date)}</td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4">
                      <SkeletonCard />
                    </div>
                  ))
                : data.length === 0
                ? (
                    <div className="py-16 text-center">
                      <HiOutlineFaceSmile className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-400">Belum ada data mood</p>
                    </div>
                  )
                : data.map((row) => {
                    const meta = MOOD_META[row.mood_level];
                    return (
                      <div key={row.id} className="p-4 hover:bg-violet-50/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
                              {row.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{row.full_name}</p>
                              <p className="text-[11px] text-slate-400">{row.employee_code} · {row.position_name}</p>
                            </div>
                          </div>
                          <MoodBadge moodLevel={row.mood_level} />
                        </div>
                        {meta && (
                          <p className="mt-2 ml-11 text-xs text-slate-500">{meta.desc}</p>
                        )}
                        <p className="mt-1 ml-11 text-[11px] text-slate-400">{fmtDate(row.mood_date)}</p>
                      </div>
                    );
                  })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} data
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchMoods(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    onClick={() => fetchMoods(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Mood Legend ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-800">Keterangan Mood</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {MOOD_KEYS.map((key) => {
                const meta = MOOD_META[key];
                const MoodIcon = meta.icon;
                return (
                  <div key={key} className={cn("rounded-xl border p-3", meta.cls)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{meta.emoji}</span>
                      <span className="text-xs font-bold">{meta.short}</span>
                    </div>
                    <p className="text-[11px] opacity-80">{meta.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      {/* ── Mood Detail Modal ── */}
      {selectedMoodKey && (
        <MoodDetailModal
          moodKey={selectedMoodKey}
          employees={todayMoodByKey[selectedMoodKey] || []}
          onClose={() => setSelectedMoodKey(null)}
        />
      )}
    </>
  );
}
