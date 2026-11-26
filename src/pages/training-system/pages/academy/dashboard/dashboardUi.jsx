import { cardCls, cn, inputCls } from "../helpers";
import { MONTH_LABELS, PAL, monthsOf, periodOf, yearsOf } from "./dashboardCompute";

export const ACTIVE_GRADIENT = "linear-gradient(135deg, #E8823A, #D4A12A)";

export function InfoNote({ children }) {
  return <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500">{children}</p>;
}

/** Kapsul pilihan (tab dan bulan): yang aktif memakai gradasi yang sama dengan menu aktif sidebar. */
export function Capsules({ items, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {items.map(([key, text]) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={cn(
              "rounded-lg px-4 py-2 text-xs transition",
              active ? "font-bold text-white shadow-md" : "font-semibold text-slate-500 hover:bg-white hover:text-slate-800",
            )}
            style={active ? { background: ACTIVE_GRADIENT } : undefined}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Pilihan bulan dan tahun dari rentang tanggal mulai batch (periods dari /academy/dashboard/periods). */
export function MonthChips({ periods, filters }) {
  const p = periodOf(periods);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SelectField
        label="Tahun"
        value={String(filters.st.year)}
        onChange={(y) => filters.setYear(Number(y))}
        options={yearsOf(p).map((y) => ({ value: String(y), label: String(y) }))}
      />
      <div className="flex flex-wrap items-center gap-3 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bulan</span>
        <Capsules
          label="Pilih bulan"
          items={monthsOf(p, filters.st.year).map((m) => [m, MONTH_LABELS[m - 1]])}
          value={filters.st.month}
          onChange={filters.setMonth}
        />
      </div>
    </div>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-[10rem] flex-col gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ children }) {
  return <div className={cn(cardCls, "flex flex-wrap items-end gap-4")}>{children}</div>;
}

export function KpiGrid({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function KpiCard({ title, hint, value, sub, valueColor, legend }) {
  return (
    <div className={cn(cardCls, "flex flex-col gap-1")}>
      <p className="text-xs font-bold text-slate-800">{title}</p>
      {hint && <p className="text-[11px] leading-snug text-slate-400">{hint}</p>}
      <p className="mt-1 text-3xl font-extrabold tabular-nums" style={{ color: valueColor ?? PAL.ink }}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      {legend && (
        <ul className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
          {legend.map(([range, text]) => (
            <li key={range} className="flex gap-2 text-[11px] text-slate-500">
              <span className="w-10 shrink-0 font-bold text-slate-700">{range}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Pill({ bg, fg, children }) {
  return (
    <span
      className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export function Chip({ children }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{children}</span>;
}

export function Stars({ on, off, color }) {
  return (
    <span aria-hidden="true" className="whitespace-nowrap tracking-tight" style={{ color }}>
      <span className="text-amber-400">{on}</span>
      <span className="text-slate-300">{off}</span>
    </span>
  );
}

export function BarTrack({ percent, color }) {
  return (
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: percent, background: color }} />
    </div>
  );
}

/** Kartu tabel berbasis grid: lebar kolom mengikuti desain, bisa digeser ke samping di layar sempit. */
export function TableCard({ title, info, template, headers, minWidth = 900, footer, children }) {
  return (
    <section className={cardCls}>
      <div className="mb-3">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {info && <p className="text-xs text-slate-400">{info}</p>}
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          {headers && (
            <GridRow template={template} head>
              {headers.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </GridRow>
          )}
          {children}
        </div>
      </div>
      {footer && <p className="pt-3 text-xs text-slate-400">{footer}</p>}
    </section>
  );
}

export function GridRow({ template, head, onClick, background, children }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "grid items-center gap-x-4 border-b border-slate-100 py-3 text-xs text-slate-700",
        head && "border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400",
        onClick && "cursor-pointer transition hover:bg-slate-50/70",
      )}
      style={{ gridTemplateColumns: template, background }}
    >
      {children}
    </div>
  );
}

export function EmptyRow({ children = "Tidak ada data untuk pilihan ini." }) {
  return <div className="py-6 text-xs text-slate-400">{children}</div>;
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
      {items.map(([color, text]) => (
        <span key={text} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {text}
        </span>
      ))}
    </div>
  );
}
