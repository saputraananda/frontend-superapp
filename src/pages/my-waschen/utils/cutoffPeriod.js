/** Standar cutoff perusahaan: periode bulan X = 26 (X-1) s/d 25 X */

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: i + 1, label }));

export function monthLabel(m) {
  return MONTH_NAMES[Number(m) - 1] || String(m);
}

export function toDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Periode cutoff aktif berdasarkan tanggal hari ini */
export function currentCutoffPeriod(now = new Date()) {
  const day = now.getDate();
  if (day >= 26) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { year: next.getFullYear(), month: next.getMonth() + 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Rentang tanggal untuk periode cutoff (year, month) */
export function cutoffRange(year, month) {
  if (!year || !month) return { dateFrom: "", dateTo: "" };
  const y = Number(year);
  const m = Number(month);
  const fromDate = new Date(y, m - 2, 26);
  const toDate = new Date(y, m - 1, 25);
  return { dateFrom: toDateInput(fromDate), dateTo: toDateInput(toDate) };
}

export function getDefaultCutoffDates() {
  const { year, month } = currentCutoffPeriod();
  return cutoffRange(year, month);
}

/**
 * Bulan cutoff (format "YYYY-MM") yang periodenya beririsan dengan rentang tanggal.
 * Rentang cutoff penuh 26 Okt – 25 Nov → ["2026-11"].
 */
export function cutoffMonthsBetween(dateFrom, dateTo, max = 60) {
  if (!dateFrom || !dateTo) return [];
  const a = new Date(`${dateFrom}T12:00:00`);
  const b = new Date(`${dateTo}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || a > b) return [];
  const start = currentCutoffPeriod(a);
  const end = currentCutoffPeriod(b);
  const out = [];
  let y = start.year;
  let m = start.month;
  while ((y < end.year || (y === end.year && m <= end.month)) && out.length < max) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** Opsi tahun: ±2 dari tahun cutoff aktif */
export function cutoffYearOptions(now = new Date()) {
  const { year } = currentCutoffPeriod(now);
  return Array.from({ length: 5 }, (_, i) => year - 2 + i);
}

/** Auto-fill tanggal akhir ke 25 bulan berikutnya jika tanggal awal = 26 */
export function autoFillCutoffEnd(startValue) {
  if (!startValue) return "";
  const d = new Date(`${startValue}T12:00:00`);
  if (Number.isNaN(d.getTime()) || d.getDate() !== 26) return "";
  const next = new Date(d);
  next.setMonth(d.getMonth() + 1);
  next.setDate(25);
  return toDateInput(next);
}
