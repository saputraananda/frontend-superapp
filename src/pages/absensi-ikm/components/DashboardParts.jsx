// Bagian dashboard yang dipakai bersama (Rewash & Linen Report): kartu, KPI, delta, tooltip, bar horizontal.
import {
  HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown,
} from "react-icons/hi2";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList,
} from "recharts";

import { cn, COLOR_GRID, COLOR_AXIS, fmtNum } from "../utils/dashboardHelpers";

// ─── Kartu & judul ────────────────────────────────────────────────────────────
export function Card({ title, subtitle, children, className = "" }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-slate-500">{subtitle}</p>}
      {children}
    </section>
  );
}

export function EmptyChart({ loading }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-slate-400">
      {loading ? "Memuat data..." : "Tidak ada data pada periode ini"}
    </div>
  );
}

// Perubahan vs periode sebelumnya. `higherIsBetter`: true → naik = hijau, false → naik = merah.
export function Delta({ current, previous, higherIsBetter = false, unit = "%", points = false }) {
  if (previous === undefined || previous === null) return null;
  let diff;
  if (points) {
    diff = current - previous;
  } else {
    if (!previous) return <span className="text-xs text-slate-400">Belum ada pembanding</span>;
    diff = ((current - previous) / previous) * 100;
  }
  if (Math.abs(diff) < 0.05) return <span className="text-xs text-slate-400">Tetap vs periode lalu</span>;
  const up = diff > 0;
  const good = up === higherIsBetter;
  const Icon = up ? HiOutlineArrowTrendingUp : HiOutlineArrowTrendingDown;
  const text = `${up ? "+" : "−"}${Math.abs(diff).toFixed(1).replace(".", ",")}${points ? " poin" : unit}`;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", good ? "text-emerald-700" : "text-rose-600")}>
      <Icon className="h-3.5 w-3.5" />
      {text}
      <span className="font-medium text-slate-400">vs periode lalu</span>
    </span>
  );
}

export function KpiCard({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      <div className="mt-1 min-h-[1.25rem]">{children}</div>
    </div>
  );
}

// ─── Tooltip kustom ───────────────────────────────────────────────────────────
export function ChartTooltip({ active, payload, label, labelFormatter, unit = "pcs" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
      {label !== undefined && (
        <p className="mb-1 font-semibold">{labelFormatter ? labelFormatter(label, payload) : label}</p>
      )}
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-semibold tabular-nums">{fmtNum(p.value)} {unit}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Bar horizontal (top N) ───────────────────────────────────────────────────
export function HBarChart({ data, nameKey, color, loading, valueKey = "qty", valueLabel = "Qty", unit = "pcs" }) {
  if (!data.length) return <EmptyChart loading={loading} />;
  const height = Math.max(180, data.length * 36 + 16);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis
            type="category" dataKey={nameKey} width={150} axisLine={false} tickLine={false}
            tick={{ fontSize: 12, fill: "#475569" }}
            tickFormatter={(v) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
          />
          <Tooltip cursor={{ fill: "#f1f5f9" }} content={<ChartTooltip unit={unit} />} />
          <Bar dataKey={valueKey} name={valueLabel} fill={color} radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList dataKey={valueKey} position="right" formatter={fmtNum} style={{ fontSize: 12, fontWeight: 600, fill: "#0f172a" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


// ─── Tab bar (Detail | Dashboard) ─────────────────────────────────────────────
export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
            active === key
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
