import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  HiOutlineArrowTrendingUp,
  HiOutlineClock,
  HiOutlineCpuChip,
  HiOutlineFunnel,
  HiOutlineSignal,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { ikmOperationalConfig } from "./companyRegistry";

// ─── helpers ─────────────────────────────────────────────────────────────────
function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

// ─── dummy data generators ────────────────────────────────────────────────────
function genTatData(outlet) {
  const base = outlet === "all" ? 0 : Math.random() * 2 - 1;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      tat: +(18 + Math.random() * 10 + base).toFixed(1),
      sla: 24,
    };
  });
}

function genCycleData(seed) {
  const variance = Number(seed?.month || 0) % 4;
  return [
    { step: "Penerimaan", menit: +(5 + variance + Math.random() * 5).toFixed(0) },
    { step: "Sortir", menit: +(8 + variance + Math.random() * 4).toFixed(0) },
    { step: "Cuci", menit: +(45 + variance + Math.random() * 15).toFixed(0) },
    { step: "Kering", menit: +(40 + variance + Math.random() * 20).toFixed(0) },
    { step: "Setrika", menit: +(30 + variance + Math.random() * 10).toFixed(0) },
    { step: "Lipat & Pack", menit: +(15 + variance + Math.random() * 8).toFixed(0) },
    { step: "Pengiriman", menit: +(20 + variance + Math.random() * 15).toFixed(0) },
  ];
}

function genQueueData(seed) {
  const variance = Number(seed?.year || 0) % 5;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      antrian: +(15 + variance + Math.random() * 20).toFixed(0),
      target: 20,
    };
  });
}

function genCapacityData(outlets, seed) {
  const variance = seed?.outlet === "all" ? 0 : 5;
  return outlets.map((o) => ({
    name: o.name,
    aktual: Math.floor(60 + variance + Math.random() * 80),
    kapasitas: 150,
  }));
}

function genLoadData(outlets, seed) {
  const variance = Number(seed?.month || 0) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const entry = { label: `${d.getDate()}/${d.getMonth() + 1}` };
    outlets.forEach((o) => {
      entry[o.name] = Math.floor(30 + variance + Math.random() * 70);
    });
    return entry;
  });
}

function genThresholdData(outlets, colors, seed) {
  const variance = Number(seed?.year || 0) % 4;
  return outlets.map((o, i) => ({
    name: o.name,
    beban: Math.floor(50 + variance + Math.random() * 45),
    fill: colors[i % colors.length],
  }));
}

// ─── sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
          color
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400 truncate">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── filter bar ───────────────────────────────────────────────────────────────
const FILTER_MODES = [
  { key: "date", label: "Tanggal" },
  { key: "month", label: "Bulan" },
  { key: "year", label: "Tahun" },
  { key: "range", label: "Range" },
];

function FilterBar({ filter, setFilter, outlets, companyConfig }) {
  return (
    <div className="flex flex-wrap gap-2 items-center rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <HiOutlineFunnel className="h-4 w-4 text-slate-400 shrink-0" />

      {/* Mode tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
        {FILTER_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setFilter((f) => ({ ...f, mode: m.key }))}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              filter.mode === m.key
                ? companyConfig.tabActiveClass
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Date / Month / Year / Range pickers */}
      {filter.mode === "date" && (
        <input
          type="date"
          value={filter.date}
          onChange={(e) => setFilter((f) => ({ ...f, date: e.target.value }))}
          className={cn("rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition", companyConfig.focusClass)}
        />
      )}
      {filter.mode === "month" && (
        <div className="flex gap-2">
          <select
            value={filter.month}
            onChange={(e) => setFilter((f) => ({ ...f, month: Number(e.target.value) }))}
            className={cn("rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition", companyConfig.focusClass)}
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={filter.year}
            onChange={(e) => setFilter((f) => ({ ...f, year: Number(e.target.value) }))}
            className={cn("rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition", companyConfig.focusClass)}
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}
      {filter.mode === "year" && (
        <select
          value={filter.year}
          onChange={(e) => setFilter((f) => ({ ...f, year: Number(e.target.value) }))}
          className={cn("rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition", companyConfig.focusClass)}
        >
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      )}
      {filter.mode === "range" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filter.rangeStart}
            onChange={(e) => setFilter((f) => ({ ...f, rangeStart: e.target.value }))}
            className={cn("rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition", companyConfig.focusClass)}
          />
          <span className="text-xs text-slate-400">s/d</span>
          <input
            type="date"
            value={filter.rangeEnd}
            onChange={(e) => setFilter((f) => ({ ...f, rangeEnd: e.target.value }))}
            className={cn("rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition", companyConfig.focusClass)}
          />
        </div>
      )}

      {/* Outlet filter */}
      <div className="ml-auto">
        <select
          value={filter.outlet}
          onChange={(e) => setFilter((f) => ({ ...f, outlet: e.target.value }))}
          className={cn("min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition", companyConfig.focusClass)}
        >
          <option value="all">Semua Outlet</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>{o.full_name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardOperasional() {
  const outletContext = useOutletContext() || {};
  const companyConfig = outletContext.companyConfig || ikmOperationalConfig;
  const selectedCompany = outletContext.selectedCompany || null;
  const [outlets, setOutlets] = useState([]);
  const [filter, setFilter] = useState({
    mode: "date",
    date: new Date().toISOString().split("T")[0],
    month: currentMonth,
    year: currentYear,
    rangeStart: (() => {
      const d = new Date(); d.setDate(d.getDate() - 6);
      return d.toISOString().split("T")[0];
    })(),
    rangeEnd: new Date().toISOString().split("T")[0],
    outlet: "all",
  });

  useEffect(() => {
    const companyName = selectedCompany?.company_name || "Operasional";
    document.title = `Dashboard ${companyName} | Alora App`;
  }, [selectedCompany]);

  useEffect(() => {
    api("/operational/outlets")
      .then((data) => setOutlets(data))
      .catch(() =>
        setOutlets([
          { id: 1, name: "BSD", full_name: "Waschen BSD" },
          { id: 2, name: "Legenda", full_name: "Waschen Legenda" },
          { id: 3, name: "Serpong", full_name: "Waschen Serpong" },
          { id: 4, name: "Alam Sutera", full_name: "Waschen Alam Sutera" },
          { id: 5, name: "Gading", full_name: "Waschen Gading" },
        ])
      )
  }, []);

  // Re-generate dummy data setiap filter berubah (simulates API refresh)
  const tatData = useMemo(() => genTatData(filter.outlet), [filter]);
  const cycleData = useMemo(() => genCycleData(filter), [filter]);
  const queueData = useMemo(() => genQueueData(filter), [filter]);
  const capacityData = useMemo(
    () => (outlets.length ? genCapacityData(outlets, filter) : []),
    [outlets, filter]
  );
  const loadData = useMemo(
    () => (outlets.length ? genLoadData(outlets, filter) : []),
    [outlets, filter]
  );
  const thresholdData = useMemo(
    () => (outlets.length ? genThresholdData(outlets, companyConfig.chart.outletColors, filter) : []),
    [companyConfig.chart.outletColors, outlets, filter]
  );

  const avgTat = useMemo(
    () => (tatData.length ? (tatData.reduce((s, d) => s + d.tat, 0) / tatData.length).toFixed(1) : "-"),
    [tatData]
  );
  const slaCompliance = useMemo(() => {
    if (!tatData.length) return "-";
    const ok = tatData.filter((d) => d.tat <= 24).length;
    return `${Math.round((ok / tatData.length) * 100)}%`;
  }, [tatData]);
  const avgQueue = useMemo(
    () => (queueData.length ? Math.round(queueData.reduce((s, d) => s + d.antrian, 0) / queueData.length) : 0),
    [queueData]
  );
  const avgBeban = useMemo(
    () => (thresholdData.length ? Math.round(thresholdData.reduce((s, d) => s + d.beban, 0) / thresholdData.length) : 0),
    [thresholdData]
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", companyConfig.brandShellClass)}>
          <HiOutlineCpuChip className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-800 leading-tight">
            Dashboard Operasional
          </h1>
          <p className="text-xs text-slate-400">
            Monitoring operasional laundry {selectedCompany?.company_name || "Alora Group"}
          </p>
        </div>
        <span className={cn("ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", companyConfig.liveBadgeClass)}>
          <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", companyConfig.liveDotClass)} />
          Live dummy data
        </span>
      </div>

      {/* Filter bar */}
      <FilterBar filter={filter} setFilter={setFilter} outlets={outlets} companyConfig={companyConfig} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={HiOutlineClock}
          label="Avg TAT"
          value={`${avgTat} jam`}
          sub="vs SLA 24 jam"
          color={companyConfig.primaryKpiClass}
        />
        <StatCard
          icon={HiOutlineArrowTrendingUp}
          label="SLA Compliance"
          value={slaCompliance}
          sub="orders dalam SLA"
          color="bg-gradient-to-br from-emerald-500 to-teal-400"
        />
        <StatCard
          icon={HiOutlineFunnel}
          label="Avg Queue"
          value={`${avgQueue} order`}
          sub="menunggu proses"
          color="bg-gradient-to-br from-amber-500 to-orange-400"
        />
        <StatCard
          icon={HiOutlineSignal}
          label="Avg Beban"
          value={`${avgBeban}%`}
          sub="kapasitas terpakai"
          color={`bg-gradient-to-br ${avgBeban > 85 ? "from-rose-600 to-rose-400" : avgBeban > 70 ? "from-amber-600 to-amber-400" : "from-sky-600 to-sky-400"}`}
        />
      </div>

      {/* Row 1: TAT vs SLA + Cycle Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* TAT vs SLA */}
        <ChartCard
          title="Productivity & Speed — TAT vs SLA"
          subtitle="Rata-rata Turnaround Time vs target SLA (jam)"
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={tatData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="j" domain={[0, 32]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="tat" name="TAT (jam)" fill={companyConfig.chart.primary} radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="sla"
                name="SLA Target"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cycle Time */}
        <ChartCard
          title="Cycle Time per Proses"
          subtitle="Rata-rata waktu per tahapan proses (menit)"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cycleData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="step" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="m" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="menit" name="Menit" radius={[4, 4, 0, 0]}>
                {cycleData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={companyConfig.chart.cycleColors[i % companyConfig.chart.cycleColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Queue Time + Capacity Mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Queue Time */}
        <ChartCard
          title="Queue Time"
          subtitle="Jumlah order dalam antrian per hari"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={queueData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="queueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={companyConfig.chart.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={companyConfig.chart.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: "Target Max", position: "right", fontSize: 10, fill: "#f59e0b" }} />
              <Area
                type="monotone"
                dataKey="antrian"
                name="Antrian"
                stroke={companyConfig.chart.primary}
                strokeWidth={2}
                fill="url(#queueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Capacity Mapping */}
        <ChartCard
          title="Capacity Mapping"
          subtitle="Penggunaan aktual vs kapasitas maksimum per outlet"
        >
          {capacityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={capacityData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 160]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="kapasitas" name="Kapasitas Maks" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                <Bar dataKey="aktual" name="Aktual" fill={companyConfig.chart.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-xs text-slate-400">
              Memuat data outlet…
            </div>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Load Balancing + Capacity Threshold */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-start">
        {/* Load Balancing */}
        <ChartCard
          title="Load Balancing"
          subtitle="Distribusi order per outlet per hari"
        >
          {loadData.length > 0 && outlets.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={loadData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {outlets.map((o, i) => (
                  <Bar
                    key={o.id}
                    dataKey={o.name}
                    stackId="a"
                    fill={companyConfig.chart.outletColors[i % companyConfig.chart.outletColors.length]}
                    radius={i === outlets.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-xs text-slate-400">
              Memuat data outlet…
            </div>
          )}
        </ChartCard>

        {/* Capacity Threshold */}
        <ChartCard
          title="Capacity Threshold"
          subtitle="Persentase beban kapasitas per outlet saat ini"
        >
          {thresholdData.length > 0 ? (
            <div className="space-y-2 mt-1">
              {thresholdData.map((d) => {
                const pct = d.beban;
                const color =
                  pct > 85
                    ? "bg-rose-500"
                    : pct > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500";
                const textColor =
                  pct > 85
                    ? "text-rose-600"
                    : pct > 70
                    ? "text-amber-600"
                    : "text-emerald-600";
                return (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium text-slate-600 truncate">
                      {d.name}
                    </span>
                    <div className="flex-1 rounded-full bg-slate-100 h-2.5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn("w-10 shrink-0 text-right text-xs font-bold", textColor)}>
                      {pct}%
                    </span>
                    {pct > 85 && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-600">
                        Over
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Normal (&lt;70%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Siaga (70–85%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> Kritis (&gt;85%)
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-slate-400">
              Memuat data outlet…
            </div>
          )}
        </ChartCard>
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] text-slate-400 pb-2">
        Data ditampilkan adalah dummy untuk keperluan pengembangan ·{" "}
        <span className="font-semibold text-slate-500">Operational Control — Alora Group</span>
      </p>
    </div>
  );
}
