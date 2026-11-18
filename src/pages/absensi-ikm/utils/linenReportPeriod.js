import { toDateInput } from "./rewashPeriod";

// Linen Report: periode cutoff = tgl 26 bulan sebelumnya s.d. tgl 25 bulan terpilih
const CUTOFF_START_DAY = 26;

export function getLinenCutoffRange(month, year) {
  const endDay = CUTOFF_START_DAY - 1;
  return {
    startDate: toDateInput(new Date(year, month - 2, CUTOFF_START_DAY)),
    endDate: toDateInput(new Date(year, month - 1, endDay)),
  };
}

export function getDefaultLinenCutoffSelection(now = new Date()) {
  let cutoffMonth = now.getMonth() + 1;
  let cutoffYear = now.getFullYear();
  if (now.getDate() > CUTOFF_START_DAY - 1) {
    cutoffMonth += 1;
    if (cutoffMonth > 12) { cutoffMonth = 1; cutoffYear += 1; }
  }
  return { cutoffMonth, cutoffYear, ...getLinenCutoffRange(cutoffMonth, cutoffYear) };
}
