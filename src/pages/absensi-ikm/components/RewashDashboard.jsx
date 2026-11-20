import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineChartBar, HiOutlineFunnel, HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { api } from "../../../lib/api";
import {
  fmtDate, toDateInput, PERIOD_MONTHS, getCutoffRange, getDefaultCutoffSelection,
} from "../utils/rewashPeriod";
import {
  cn, COLOR_PRIMARY, COLOR_SECONDARY, COLOR_TERTIARY, COLOR_GRID, COLOR_AXIS,
  fmtNum, fmtPct, shortDate,
} from "../utils/dashboardHelpers";
import { Card, EmptyChart, Delta, KpiCard, ChartTooltip, HBarChart } from "./DashboardParts";

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RewashDashboard({ tabBar, active = true }) {
  const todayStr = useMemo(() => toDateInput(new Date()), []);
  const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date()), []);

  const [periodMode, setPeriodMode] = useState("cutoff");
  const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
  const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
  const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);
  const [filterRS, setFilterRS] = useState("");

  const [hospitals, setHospitals] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
  }, []);

  const activePeriod = useMemo(() => {
    if (periodMode === "today") return { startDate: todayStr, endDate: todayStr };
    if (periodMode === "custom") {
      return { startDate: customStartDate || todayStr, endDate: customEndDate || customStartDate || todayStr };
    }
    return getCutoffRange(cutoffMonth, cutoffYear);
  }, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear]);

  useEffect(() => {
    api("/ikm/rewash-linen/meta")
      .then((r) => { if (r.hospitals?.length) setHospitals(r.hospitals); })
      .catch(() => { });
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        startDate: activePeriod.startDate,
        endDate: activePeriod.endDate,
      });
      if (filterRS) qs.set("hospital_id", filterRS);
      const res = await api(`/ikm/rewash-linen/dashboard?${qs.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, [activePeriod.startDate, activePeriod.endDate, filterRS]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    if (active) document.title = "Dashboard Rewash IKM | Alora Group Indonesia";
  }, [active]);

  const summary = data?.summary;
  const previous = data?.previous;
  const cleanPct = summary?.totalQty ? (summary.totalClear / summary.totalQty) * 100 : 0;
  const prevCleanPct = previous?.totalQty ? (previous.totalClear / previous.totalQty) * 100 : null;

  const trend = useMemo(() => data?.trend || [], [data]);
  const ownership = useMemo(() => {
    const rows = data?.byOwnership || [];
    const find = (t) => rows.find((r) => r.ownership_type === t)?.qty || 0;
    return [
      { name: "Rumah Sakit", value: find("RS"), color: COLOR_PRIMARY },
      { name: "Sewa", value: find("SEWA"), color: COLOR_SECONDARY },
    ].filter((r) => r.value > 0);
  }, [data]);
  const ownershipTotal = ownership.reduce((s, r) => s + r.value, 0);
  const byHospital = data?.byHospital || [];
  const byLinen = data?.byLinen || [];
  const attention = data?.attention || [];

  const selectClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

  return (
    <main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Page Header */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 p-5 shadow-sm sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-blue-300/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
              <HiOutlineChartBar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Linen Rewash</h1>
              <p className="text-sm text-white/70">Dashboard ringkasan data rewash linen</p>
            </div>
          </div>
        </section>

        {tabBar}

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
            Filter
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
              <select value={periodMode} onChange={(e) => setPeriodMode(e.target.value)} className={selectClass}>
                <option value="cutoff">Periode Cutoff</option>
                <option value="today">Hari Ini</option>
                <option value="custom">Custom Tanggal</option>
              </select>
            </label>

            {periodMode === "cutoff" && (
              <>
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
                  <select value={cutoffMonth} onChange={(e) => setCutoffMonth(Number(e.target.value))} className={selectClass}>
                    {PERIOD_MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
                  <select value={cutoffYear} onChange={(e) => setCutoffYear(Number(e.target.value))} className={selectClass}>
                    {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              </>
            )}
            {periodMode === "custom" && (
              <>
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className={selectClass} />
                </label>
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className={selectClass} />
                </label>
              </>
            )}

            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Rumah Sakit</span>
              <select value={filterRS} onChange={(e) => setFilterRS(e.target.value)} className={selectClass}>
                <option value="">Semua RS</option>
                {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
            <span className="font-semibold">Periode aktif:</span>
            <span>{fmtDate(activePeriod.startDate)} — {fmtDate(activePeriod.endDate)}</span>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* KPI */}
        <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 transition-opacity", loading && "opacity-60")}>
          <KpiCard label="Total Qty Rewash" value={`${fmtNum(summary?.totalQty)}`}>
            {summary && <Delta current={summary.totalQty} previous={previous?.totalQty} higherIsBetter={false} />}
          </KpiCard>
          <KpiCard label="Jumlah Laporan" value={fmtNum(summary?.reports)}>
            {summary && <Delta current={summary.reports} previous={previous?.reports} higherIsBetter={false} />}
          </KpiCard>
          <KpiCard
            label="Bersih / Kotor"
            value={
              <span>
                <span className="text-slate-900">{fmtNum(summary?.totalClear)}</span>
                <span className="mx-1 text-xl text-slate-300">/</span>
                <span className="text-2xl text-slate-500">{fmtNum(summary?.totalDirty)}</span>
              </span>
            }
          >
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-slate-100">
              {summary?.totalQty > 0 && (
                <>
                  <div style={{ width: `${cleanPct}%`, background: COLOR_PRIMARY }} />
                  <div style={{ width: `${100 - cleanPct}%`, background: COLOR_SECONDARY }} />
                </>
              )}
            </div>
          </KpiCard>
          <KpiCard label="Persentase Bersih" value={fmtPct(cleanPct)}>
            {summary && prevCleanPct !== null && (
              <Delta current={cleanPct} previous={prevCleanPct} higherIsBetter points />
            )}
          </KpiCard>
        </div>

        {/* Tren + Kepemilikan */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Tren Harian Qty Rewash" subtitle="Total qty per tanggal laporan" className="lg:col-span-2">
            {trend.length === 0 ? <EmptyChart loading={loading} /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: COLOR_AXIS }} axisLine={{ stroke: COLOR_GRID }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: COLOR_AXIS }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtDate(l)} />} />
                    <Area type="monotone" dataKey="qty" name="Qty" stroke={COLOR_PRIMARY} strokeWidth={2} fill={COLOR_PRIMARY} fillOpacity={0.12} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Komposisi Kepemilikan" subtitle="Sewa vs Rumah Sakit (berdasarkan qty)">
            {ownership.length === 0 ? <EmptyChart loading={loading} /> : (
              <>
                <div className="relative mx-auto h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ownership} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                        {ownership.map((r) => <Cell key={r.name} fill={r.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-900 tabular-nums">{fmtNum(ownershipTotal)}</span>
                    <span className="text-xs text-slate-400">pcs</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  {ownership.map((r) => (
                    <span key={r.name} className="inline-flex items-center gap-1.5">
                      <i className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                      {r.name}
                      <b className="text-slate-900">{fmtPct((r.value / ownershipTotal) * 100)}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Top RS + Top Linen */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Top Rumah Sakit" subtitle="Qty rewash terbanyak">
            <HBarChart data={byHospital} nameKey="hospital_name" color={COLOR_PRIMARY} loading={loading} />
          </Card>
          <Card title="Top Jenis Linen" subtitle="Linen yang paling sering di-rewash">
            <HBarChart data={byLinen} nameKey="linen_name" color={COLOR_TERTIARY} loading={loading} />
          </Card>
        </div>

        {/* Bersih vs Kotor per RS */}
        <Card title="Bersih vs Kotor per Rumah Sakit" subtitle="Melihat RS mana yang rewash-nya belum tuntas">
          {byHospital.length === 0 ? <EmptyChart loading={loading} /> : (
            <>
              <div className="mb-2 flex gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_PRIMARY }} />Bersih</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_SECONDARY }} />Kotor</span>
              </div>
              <div style={{ height: Math.max(200, byHospital.length * 40 + 16) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byHospital} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
                    <CartesianGrid stroke={COLOR_GRID} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: COLOR_AXIS }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category" dataKey="hospital_name" width={170} axisLine={false} tickLine={false}
                      tick={{ fontSize: 12, fill: "#475569" }}
                      tickFormatter={(v) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)}
                    />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} content={<ChartTooltip />} />
                    <Bar dataKey="clear" name="Bersih" stackId="s" fill={COLOR_PRIMARY} stroke="#fff" strokeWidth={1} maxBarSize={22} />
                    <Bar dataKey="dirty" name="Kotor" stackId="s" fill={COLOR_SECONDARY} stroke="#fff" strokeWidth={1} radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>

        {/* Perlu perhatian */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">Perlu Perhatian</h3>
            <p className="text-xs text-slate-500">Item dengan sisa kotor terbanyak (maks. 10)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Tanggal", "Rumah Sakit", "Linen", "Kepemilikan"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-emerald-600">Bersih</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-rose-500">Kotor</th>
                </tr>
              </thead>
              <tbody>
                {attention.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      {loading ? "Memuat data..." : "Tidak ada item dengan sisa kotor 🎉"}
                    </td>
                  </tr>
                ) : attention.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-700">{fmtDate(r.report_date)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.hospital_name}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{r.linen_name}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        r.ownership_type === "SEWA" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700",
                      )}>
                        {r.ownership_type === "SEWA" ? "Sewa" : "RS"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-bold text-blue-700 tabular-nums">{fmtNum(r.qty)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-50 px-2 text-xs font-bold text-emerald-700 tabular-nums">{fmtNum(r.clear)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-50 px-2 text-xs font-bold text-rose-500 tabular-nums">{fmtNum(r.dirty)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
