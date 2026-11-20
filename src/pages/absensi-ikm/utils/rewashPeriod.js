// Helper periode & format tanggal yang dipakai bersama oleh tab Detail dan Dashboard Rewash Linen.

export function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function toDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const PERIOD_MONTHS = [
  { value: 1, label: "Januari" }, { value: 2, label: "Februari" },
  { value: 3, label: "Maret" }, { value: 4, label: "April" },
  { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
  { value: 7, label: "Juli" }, { value: 8, label: "Agustus" },
  { value: 9, label: "September" }, { value: 10, label: "Oktober" },
  { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

// Rewash: periode cutoff = 1 bulan kalender penuh (tgl 1 s.d. akhir bulan)
export function getCutoffRange(month, year) {
  return {
    startDate: toDateInput(new Date(year, month - 1, 1)),
    endDate: toDateInput(new Date(year, month, 0)),
  };
}

export function getDefaultCutoffSelection(now = new Date()) {
  const cutoffMonth = now.getMonth() + 1;
  const cutoffYear = now.getFullYear();
  return { cutoffMonth, cutoffYear, ...getCutoffRange(cutoffMonth, cutoffYear) };
}
