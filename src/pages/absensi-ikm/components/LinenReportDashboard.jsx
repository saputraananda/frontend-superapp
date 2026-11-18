import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineChartBar, HiOutlineFunnel, HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { api } from "../../../lib/api";
import { fmtDate, toDateInput, PERIOD_MONTHS } from "../utils/rewashPeriod";
import { getLinenCutoffRange, getDefaultLinenCutoffSelection } from "../utils/linenReportPeriod";
import {
  cn, COLOR_PRIMARY, COLOR_SECONDARY, COLOR_TERTIARY, COLOR_GRID, COLOR_AXIS,
  fmtNum, fmtPct, shortDate,
} from "../utils/dashboardHelpers";
import { Card, EmptyChart, Delta, KpiCard, ChartTooltip, HBarChart } from "./DashboardParts";

const COLOR_VIOLET = "#6250d6";

// Status = data ordinal (terkirim → proses → selesai): satu hue biru, makin pekat makin maju
const STATUS_STEPS = [
  { key: "sent", label: "Terkirim", color: "#86b6ef" },
  { key: "processing", label: "Diproses", color: "#2a78d6" },
  { key: "done", label: "Selesai", color: "#184f95" },
];

const STATUS_BADGE = {
  terkirim: "bg-slate-100 text-slate-600 border-slate-200",
  proses: "bg-amber-50 text-amber-700 border-amber-200",
};
const STATUS_LABEL = { terkirim: "Terkirim", proses: "Diproses" };

const METRICS = {
  reports: { label: "Laporan", unit: "laporan" },
  qty: { label: "Qty Temuan", unit: "pcs" },
};

function fmtDuration(min) {
  if (min === null || min === undefined) return "-";
  if (min < 60) return `${Math.round(min)} mnt`;
  const hours = min / 60;
  if (hours < 24) return `${hours.toFixed(1).replace(".", ",")} jam`;
  return `${(hours / 24).toFixed(1).replace(".", ",")} hari`;
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1 text-xs font-semibold transition",
            value === o.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DonutCard({ title, subtitle, rows, metric, loading }) {
  const total = rows.reduce((s, r) => s + r[metric], 0);
  const data = rows.filter((r) => r[metric] > 0);
  return (
    <Card title={title} subtitle={subtitle}>
      {data.length === 0 ? <EmptyChart loading={loading} /> : (
        <>
          <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey={metric} nameKey="name" innerRadius={50} outerRadius={74} paddingAngle={2} stroke="none">
                  {data.map((r) => <Cell key={r.name} fill={r.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip unit={METRICS[metric].unit} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-900 tabular-nums">{fmtNum(total)}</span>
              <span className="text-xs text-slate-400">{METRICS[metric].unit}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
            {data.map((r) => (
              <span key={r.name} className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                {r.name}
                <b className="text-slate-900">{fmtPct((r[metric] / total) * 100)}</b>
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LinenReportDashboard({ tabBar, active = true }) {
  const todayStr = useMemo(() => toDateInput(new Date()), []);
  const defaultCutoff = useMemo(() => getDefaultLinenCutoffSelection(new Date()), []);

  const [periodMode, setPeriodMode] = useState("cutoff");
  const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
  const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
  const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);
  const [filters, setFilters] = useState({ area_id: "", hospital_id: "", finding_location: "", floor: "" });

  const [meta, setMeta] = useState({ areas: [], hospitals: [], floors: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [metric, setMetric] = useState("reports");
  const [placeDim, setPlaceDim] = useState("hospital");

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
  }, []);

  const activePeriod = useMemo(() => {
    if (periodMode === "today") return { startDate: todayStr, endDate: todayStr };
    if (periodMode === "custom") {
      return { startDate: customStartDate || todayStr, endDate: customEndDate || customStartDate || todayStr };
    }
    return getLinenCutoffRange(cutoffMonth, cutoffYear);
  }, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear]);

  useEffect(() => {
    api("/ikm/linen-report/meta")
      .then((r) => setMeta({ areas: r.areas || [], hospitals: r.hospitals || [], floors: r.floors || [] }))
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
      Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const res = await api(`/ikm/linen-report/dashboard?${qs.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, [activePeriod.startDate, activePeriod.endDate, filters]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    if (active) document.title = "Dashboard Linen Report IKM | Alora Group Indonesia";
  }, [active]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const summary = data?.summary;
  const previous = data?.previous;
  const donePct = summary?.reports ? (summary.done / summary.reports) * 100 : 0;
  const unit = METRICS[metric].unit;

  const trend = data?.trend || [];
  const locationRows = useMemo(() => (data?.byLocation || []).map((r) => ({
    ...r, color: r.name === "Rumah Sakit" ? COLOR_TERTIARY : COLOR_VIOLET,
  })), [data]);
  const ownershipRows = useMemo(() => (data?.byOwnership || []).map((r) => ({
    name: r.key === "SEWA" ? "Sewa" : r.key === "RS" ? "Rumah Sakit" : "Belum diisi",
    reports: r.reports,
    qty: r.qty,
    color: r.key === "SEWA" ? COLOR_SECONDARY : r.key === "RS" ? COLOR_PRIMARY : COLOR_AXIS,
  })), [data]);
  const placeRows = (placeDim === "hospital" ? data?.byHospital : data?.byArea) || [];
  const attention = data?.attention || [];
  const totalOpen = (summary?.sent || 0) + (summary?.processing || 0);

  const sortByMetric = (rows) => [...rows].sort((a, b) => b[metric] - a[metric]);

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
              <h1 className="text-xl font-bold text-white sm:text-2xl">Linen Report</h1>
              <p className="text-sm text-white/70">Dashboard ringkasan temuan &amp; kondisi linen</p>
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
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Area</span>
              <select value={filters.area_id} onChange={setFilter("area_id")} className={selectClass}>
                <option value="">Semua Area</option>
                {meta.areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Rumah Sakit</span>
              <select value={filters.hospital_id} onChange={setFilter("hospital_id")} className={selectClass}>
                <option value="">Semua RS</option>
                {meta.hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Lokasi Temuan</span>
              <select value={filters.finding_location} onChange={setFilter("finding_location")} className={selectClass}>
                <option value="">Semua Lokasi</option>
                <option value="Rumah Sakit">Rumah Sakit</option>
                <option value="IKM">IKM</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Lantai</span>
              <select value={filters.floor} onChange={setFilter("floor")} className={selectClass}>
                <option value="">Semua Lantai</option>
                {meta.floors.map((f) => <option key={f.floor} value={f.floor}>{f.floor}</option>)}
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
          <KpiCard label="Total Laporan" value={fmtNum(summary?.reports)}>
            {summary && <Delta current={summary.reports} previous={previous?.reports} higherIsBetter={false} />}
          </KpiCard>
          <KpiCard label="Total Qty Temuan" value={fmtNum(summary?.totalQty)}>
            {summary && <Delta current={summary.totalQty} previous={previous?.totalQty} higherIsBetter={false} />}
          </KpiCard>
          <KpiCard label="Laporan Selesai" value={`${fmtNum(summary?.done)}`}>
            <span className="text-xs text-slate-500">
              <b className="text-slate-700">{fmtPct(donePct)}</b> dari {fmtNum(summary?.reports)} laporan
              {totalOpen > 0 && <> · <b className="text-rose-600">{fmtNum(totalOpen)}</b> belum selesai</>}
            </span>
          </KpiCard>
          <KpiCard label="Rata-rata Waktu Penanganan" value={fmtDuration(summary?.avgMinutes)}>
            {summary && summary.avgMinutes !== null && previous?.avgMinutes != null ? (
              <Delta current={summary.avgMinutes} previous={previous.avgMinutes} higherIsBetter={false} />
            ) : (
              <span className="text-xs text-slate-400">Dari laporan masuk sampai selesai</span>
            )}
          </KpiCard>
        </div>

        {/* Status */}
        <Card title="Status Penanganan" subtitle="Posisi laporan pada periode ini">
          {!summary || summary.reports === 0 ? <EmptyChart loading={loading} /> : (
            <>
              <div className="flex h-5 gap-0.5 overflow-hidden rounded-md">
                {STATUS_STEPS.map((s) => summary[s.key] > 0 && (
                  <div
                    key={s.key}
                    title={`${s.label}: ${fmtNum(summary[s.key])} laporan`}
                    style={{ width: `${(summary[s.key] / summary.reports) * 100}%`, background: s.color }}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {STATUS_STEPS.map((s) => (
                  <span key={s.key} className="inline-flex items-center gap-2 text-slate-600">
                    <i className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                    <b className="text-slate-900 tabular-nums">{fmtNum(summary[s.key])}</b>
                    <span className="text-xs text-slate-400">({fmtPct((summary[s.key] / summary.reports) * 100)})</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Ukuran chart */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          Ukuran grafik:
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[{ value: "reports", label: "Jumlah Laporan" }, { value: "qty", label: "Qty Temuan" }]}
          />
        </div>

        {/* Tren + komposisi */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Tren Harian" subtitle={`${METRICS[metric].label} per tanggal laporan`} className="lg:col-span-2">
            {trend.length === 0 ? <EmptyChart loading={loading} /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke={COLOR_GRID} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: COLOR_AXIS }} axisLine={{ stroke: COLOR_GRID }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: COLOR_AXIS }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip unit={unit} labelFormatter={(l) => fmtDate(l)} />} />
                    <Area type="monotone" dataKey={metric} name={METRICS[metric].label} stroke={COLOR_PRIMARY} strokeWidth={2} fill={COLOR_PRIMARY} fillOpacity={0.12} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <DonutCard title="Lokasi Temuan" subtitle="Rumah Sakit vs IKM" rows={locationRows} metric={metric} loading={loading} />
          </div>
        </div>

        {/* Jenis temuan + jenis linen */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Top Jenis Temuan" subtitle="Temuan yang paling sering dilaporkan">
            <HBarChart data={sortByMetric(data?.byFinding || [])} nameKey="name" valueKey={metric} valueLabel={METRICS[metric].label} unit={unit} color={COLOR_PRIMARY} loading={loading} />
          </Card>
          <Card title="Top Jenis Linen" subtitle="Linen yang paling sering bermasalah">
            <HBarChart data={sortByMetric(data?.byLinen || [])} nameKey="name" valueKey={metric} valueLabel={METRICS[metric].label} unit={unit} color={COLOR_TERTIARY} loading={loading} />
          </Card>
        </div>

        {/* RS/Area + lantai + kepemilikan */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title={placeDim === "hospital" ? "Temuan per Rumah Sakit" : "Temuan per Area"} subtitle="Top 8" className="lg:col-span-2">
            <div className="mb-3">
              <Segmented
                value={placeDim}
                onChange={setPlaceDim}
                options={[{ value: "hospital", label: "Rumah Sakit" }, { value: "area", label: "Area" }]}
              />
            </div>
            <HBarChart data={sortByMetric(placeRows)} nameKey="name" valueKey={metric} valueLabel={METRICS[metric].label} unit={unit} color={COLOR_PRIMARY} loading={loading} />
          </Card>
          <DonutCard title="Kepemilikan Linen" subtitle="Sewa vs Rumah Sakit" rows={ownershipRows} metric={metric} loading={loading} />
        </div>

        <Card title="Temuan per Lantai" subtitle="Berdasarkan lantai pelapor">
          <HBarChart data={sortByMetric(data?.byFloor || [])} nameKey="name" valueKey={metric} valueLabel={METRICS[metric].label} unit={unit} color={COLOR_SECONDARY} loading={loading} />
        </Card>

        {/* Perlu perhatian */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">Perlu Perhatian</h3>
            <p className="text-xs text-slate-500">Laporan yang belum selesai, dari yang paling lama menunggu (maks. 10)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Tanggal", "Rumah Sakit", "Area", "Linen", "Temuan"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Umur</th>
                </tr>
              </thead>
              <tbody>
                {attention.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                      {loading ? "Memuat data..." : "Semua laporan sudah selesai 🎉"}
                    </td>
                  </tr>
                ) : attention.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-700">{fmtDate(r.report_date)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.hospital_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.area_name}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{r.linen_type}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{r.finding_type}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-700 tabular-nums">{fmtNum(r.qty)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", STATUS_BADGE[r.status])}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("text-xs font-bold tabular-nums", r.age_days >= 7 ? "text-rose-600" : "text-slate-600")}>
                        {r.age_days} hari
                      </span>
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
