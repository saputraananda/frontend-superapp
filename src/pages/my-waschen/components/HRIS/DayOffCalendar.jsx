import { useMemo } from "react";
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCalendarDays,
} from "react-icons/hi2";
import { cn, fmtDateShort, fmtEmployeeName } from "../../utils/hrisUtils";
import { toDateInput } from "../../utils/cutoffPeriod";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MAX_VISIBLE = 3;

function mondayFirstPad(date) {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}

/** Grid tanggal periode cutoff: 26 bulan lalu s/d 25 bulan cutoff */
export function buildCutoffCells(rangeFrom, rangeTo) {
  if (!rangeFrom || !rangeTo) return [];

  const start = new Date(`${rangeFrom}T12:00:00`);
  const end = new Date(`${rangeTo}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const cells = [];
  for (let i = 0; i < mondayFirstPad(start); i += 1) {
    cells.push({ kind: "pad" });
  }

  const cur = new Date(start);
  while (cur <= end) {
    cells.push({
      kind: "day",
      date: toDateInput(cur),
      day: cur.getDate(),
      month: cur.getMonth() + 1,
      year: cur.getFullYear(),
    });
    cur.setDate(cur.getDate() + 1);
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: "pad" });
  }
  return cells;
}

function eventTone(status) {
  if (status === "disetujui") return "bg-violet-600 text-white shadow-sm";
  if (status === "ditolak") return "bg-rose-500 text-white line-through opacity-80";
  return "bg-amber-500 text-white shadow-sm";
}

export default function DayOffCalendar({
  rows,
  rangeFrom,
  rangeTo,
  cutoffMonth,
  cutoffYear,
  periodLabel,
  onPeriodChange,
  canNavigate = true,
  onDayClick,
  loading,
}) {
  const today = toDateInput(new Date());
  const cells = useMemo(() => buildCutoffCells(rangeFrom, rangeTo), [rangeFrom, rangeTo]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.off_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  }, [rows]);

  const rangeSubtitle = rangeFrom && rangeTo
    ? `${fmtDateShort(rangeFrom)} – ${fmtDateShort(rangeTo)}`
    : "";

  return (
    <div className="flex flex-col min-h-[520px] bg-slate-100/40">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5f1340]/15 text-[#5f1340]">
            <HiOutlineCalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Kalender Jadwal Libur</h2>
            <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Klik tanggal untuk kelola karyawan libur · periode cutoff 26–25</p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            disabled={!canNavigate}
            onClick={() => onPeriodChange?.(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Periode sebelumnya"
          >
            <HiOutlineChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[160px] text-center">
            <p className="text-sm font-bold text-slate-800">{periodLabel || "—"}</p>
            {rangeSubtitle && (
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{rangeSubtitle}</p>
            )}
          </div>
          <button
            type="button"
            disabled={!canNavigate}
            onClick={() => onPeriodChange?.(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Periode berikutnya"
          >
            <HiOutlineChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-200/70">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-1 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 sm:text-xs">
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid flex-1 grid-cols-7 auto-rows-fr min-h-[420px] animate-pulse gap-px bg-slate-200 p-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-slate-100 min-h-[88px] sm:min-h-[110px]" />
          ))}
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-7 auto-rows-fr min-h-[420px] gap-px bg-slate-200 p-px">
          {cells.map((cell, idx) => {
            if (cell.kind === "pad") {
              return (
                <div
                  key={`pad-${idx}`}
                  className="bg-slate-200/60 min-h-[88px] sm:min-h-[110px]"
                />
              );
            }

            const events = byDate.get(cell.date) || [];
            const isToday = cell.date === today;
            const isCutoffMonth = cell.month === cutoffMonth && cell.year === cutoffYear;
            const showMonthTag = cell.day === 1 || (cell.date === rangeFrom);

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => onDayClick?.(cell.date)}
                className={cn(
                  "group relative flex flex-col p-1.5 sm:p-2 text-left transition min-h-[88px] sm:min-h-[110px]",
                  isCutoffMonth ? "bg-white hover:bg-violet-50/40" : "bg-slate-100 hover:bg-slate-50",
                  isToday && "ring-2 ring-inset ring-[#5f1340] z-[1]",
                )}
              >
                <div className="mb-1 flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold sm:text-xs",
                      isToday
                        ? "bg-[#5f1340] text-white"
                        : isCutoffMonth
                          ? "text-slate-800 group-hover:text-[#5f1340]"
                          : "text-slate-500",
                    )}
                  >
                    {cell.day}
                  </span>
                  {showMonthTag && (
                    <span className="text-[9px] font-bold uppercase text-slate-400">{MONTH_SHORT[cell.month - 1]}</span>
                  )}
                </div>
                <div className="flex-1 space-y-0.5 overflow-hidden w-full">
                  {events.slice(0, MAX_VISIBLE).map((ev) => (
                    <div
                      key={ev.day_off_id}
                      className={cn("truncate rounded px-1 py-0.5 text-[9px] font-semibold sm:text-[10px]", eventTone(ev.status))}
                      title={`${fmtEmployeeName(ev.employee_name)} · ${ev.status}`}
                    >
                      {fmtEmployeeName(ev.employee_name)}
                    </div>
                  ))}
                  {events.length > MAX_VISIBLE && (
                    <p className="text-[9px] font-bold text-slate-600 sm:text-[10px]">
                      +{events.length - MAX_VISIBLE} lainnya
                    </p>
                  )}
                </div>
                {events.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-300 px-1 text-[9px] font-bold text-slate-700">
                    {events.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-slate-200 bg-white px-4 py-3 text-[10px] sm:text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-600" /> Disetujui</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Pengajuan</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Ditolak</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded bg-white ring-2 ring-[#5f1340]" /> Hari ini</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded bg-slate-100 border border-slate-300" /> Bulan sebelumnya (26–)</span>
      </div>
    </div>
  );
}
