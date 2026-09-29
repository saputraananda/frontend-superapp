import { HiOutlineCalendarDays } from "react-icons/hi2";
import { cn, fmtDateShort } from "../utils/hrisUtils";

const INPUT_DEFAULT =
  "mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10";
const INPUT_HERO =
  "mt-1 block w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-semibold text-white outline-none backdrop-blur-sm [color-scheme:dark] focus:ring-2 focus:ring-white/30";
const INPUT_COMPACT =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40";
const LABEL_DEFAULT = "text-[10px] font-bold uppercase tracking-wider text-slate-400 block";
const LABEL_HERO = "text-[10px] font-bold uppercase tracking-wider text-white/70 block";

export default function CutoffPeriodFilter({
  cutoff,
  variant = "default",
  showPeriodBadge = true,
  className = "",
  /** Opsi "Tampilkan Semua" (tanpa filter tanggal). Dipakai Master Customer. */
  allowAll = false,
  showAll = false,
  onShowAllChange,
  allLabel = "Tampilkan Semua",
  periodBadgePrefix = "Periode",
  /** Override opsi tahun (mis. dari DB). Fallback ke cutoff.years */
  years: yearsProp,
}) {
  const {
    isCustomDate,
    toggleCustom,
    selectedYear,
    selectedMonth,
    setSelectedMonth,
    handleYearChange,
    dateFrom,
    dateTo,
    setDateTo,
    handleCustomStartChange,
    years: cutoffYears,
    monthOptions,
  } = cutoff;

  const years = (Array.isArray(yearsProp) && yearsProp.length) ? yearsProp : cutoffYears;

  const pickYear = (value) => {
    if (allowAll && value === "all") {
      onShowAllChange?.(true);
      if (isCustomDate) toggleCustom();
      return;
    }
    onShowAllChange?.(false);
    handleYearChange(value);
  };

  const isHero = variant === "hero";
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <div className={cn("flex flex-col gap-2 min-w-0", className)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-w-0">
          {allowAll ? (
            <select
              value={showAll ? "all" : selectedYear}
              onChange={(e) => pickYear(e.target.value)}
              className={cn(INPUT_COMPACT, "col-span-2 sm:col-span-1")}
            >
              <option value="all">{allLabel}</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          ) : (
            <select
              value={isCustomDate ? "custom" : "cutoff"}
              onChange={(e) => {
                const nextCustom = e.target.value === "custom";
                if (nextCustom !== isCustomDate) toggleCustom();
              }}
              className={cn(INPUT_COMPACT, "col-span-2 sm:col-span-1")}
            >
              <option value="cutoff">Cutoff</option>
              <option value="custom">Custom tanggal</option>
            </select>
          )}
          {!showAll && (isCustomDate ? (
            <>
              <input
                type="date"
                value={dateFrom || ""}
                onChange={(e) => handleCustomStartChange(e.target.value)}
                className={INPUT_COMPACT}
              />
              <input
                type="date"
                value={dateTo || ""}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className={INPUT_COMPACT}
              />
            </>
          ) : (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className={INPUT_COMPACT}
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {!allowAll && (
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className={INPUT_COMPACT}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
              {allowAll && (
                <select
                  value={isCustomDate ? "custom" : "cutoff"}
                  onChange={(e) => {
                    const nextCustom = e.target.value === "custom";
                    if (nextCustom !== isCustomDate) toggleCustom();
                  }}
                  className={INPUT_COMPACT}
                >
                  <option value="cutoff">Cutoff</option>
                  <option value="custom">Custom tanggal</option>
                </select>
              )}
            </>
          ))}
        </div>
        {showPeriodBadge && (showAll ? (
          <p className="text-[10px] font-semibold text-slate-400 px-0.5">{allLabel}</p>
        ) : dateFrom && dateTo ? (
          <p className="text-[10px] font-semibold text-slate-400 px-0.5">
            {periodBadgePrefix} {fmtDateShort(dateFrom)} – {fmtDateShort(dateTo)}
          </p>
        ) : null)}
      </div>
    );
  }

  const inputCls = isHero ? INPUT_HERO : INPUT_DEFAULT;
  const labelCls = isHero ? LABEL_HERO : LABEL_DEFAULT;
  const toggleCls = isHero
    ? "inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
    : "inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition";
  const badgeCls = isHero
    ? "text-[11px] sm:text-xs font-semibold text-white/80 bg-white/10 px-3 py-2 rounded-xl border border-white/20 w-full sm:w-auto"
    : "text-[11px] sm:text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full sm:w-auto";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {showAll ? (
          <label className={labelCls}>
            Tahun
            <select value="all" onChange={(e) => pickYear(e.target.value)} className={inputCls}>
              <option value="all" className="text-slate-800">{allLabel}</option>
              {years.map((y) => (
                <option key={y} value={y} className="text-slate-800">{y}</option>
              ))}
            </select>
          </label>
        ) : !isCustomDate ? (
          <>
            <label className={labelCls}>
              Tahun
              <select value={selectedYear} onChange={(e) => pickYear(e.target.value)} className={inputCls}>
                {allowAll && <option value="all" className="text-slate-800">{allLabel}</option>}
                {years.map((y) => (
                  <option key={y} value={y} className="text-slate-800">{y}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Bulan (Cutoff)
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className={inputCls}>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value} className="text-slate-800">{m.label}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            {allowAll && (
              <label className={labelCls}>
                Tahun
                <select value={selectedYear} onChange={(e) => pickYear(e.target.value)} className={inputCls}>
                  <option value="all" className="text-slate-800">{allLabel}</option>
                  {years.map((y) => (
                    <option key={y} value={y} className="text-slate-800">{y}</option>
                  ))}
                </select>
              </label>
            )}
            <label className={labelCls}>
              Tanggal Awal
              <input type="date" value={dateFrom || ""} onChange={(e) => handleCustomStartChange(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Tanggal Akhir
              <input type="date" value={dateTo || ""} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
            </label>
          </>
        )}

        {!showAll && (
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button type="button" onClick={toggleCustom} className={toggleCls}>
              <HiOutlineCalendarDays className={cn("h-4 w-4 shrink-0", isHero ? "text-white/70" : "text-slate-400")} />
              <span className="truncate">{isCustomDate ? "Cutoff Bulanan" : "Custom Tanggal"}</span>
            </button>
          </div>
        )}
      </div>

      {showPeriodBadge && (showAll ? (
        <div className={badgeCls}>{allLabel} — tanpa filter tanggal terdaftar</div>
      ) : dateFrom && dateTo ? (
        <div className={badgeCls}>
          {periodBadgePrefix}: {fmtDateShort(dateFrom)} – {fmtDateShort(dateTo)}
        </div>
      ) : null)}
    </div>
  );
}
