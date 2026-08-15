import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

const C = {
  headerBg: "1E3A5F",
  titleBg: "0F172A",
  metaBg: "E0F2FE",
  metaText: "0C4A6E",
  altRowBg: "F0F9FF",
  whiteBg: "FFFFFF",
  textDark: "1E293B",
  textGray: "64748B",
  borderColor: "CBD5E1",
  status_lengkap_bg: "D1FAE5",
  status_lengkap_text: "065F46",
  status_belum_out_bg: "FEF3C7",
  status_belum_out_text: "92400E",
  status_belum_in_bg: "FFE4E6",
  status_belum_in_text: "9F1239",
  status_foto_bg: "FFEDD5",
  status_foto_text: "9A3412",
};

const border = () => ({
  top: { style: "thin", color: { rgb: C.borderColor } },
  bottom: { style: "thin", color: { rgb: C.borderColor } },
  left: { style: "thin", color: { rgb: C.borderColor } },
  right: { style: "thin", color: { rgb: C.borderColor } },
});

const titleStyle = {
  fill: { fgColor: { rgb: C.titleBg } },
  font: { bold: true, sz: 14, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
};

const metaStyle = {
  fill: { fgColor: { rgb: C.metaBg } },
  font: { sz: 10, color: { rgb: C.metaText }, italic: true, name: "Calibri" },
  alignment: { horizontal: "left", vertical: "center" },
};

const headerStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: border(),
};

const makeCellStyle = (isAlt, align = "left") => ({
  fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
  font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center", wrapText: false },
  border: border(),
});

const makeStatusStyle = (statusLabel, isAlt) => {
  const map = {
    Lengkap: { bg: C.status_lengkap_bg, text: C.status_lengkap_text },
    "Belum check-out": { bg: C.status_belum_out_bg, text: C.status_belum_out_text },
    "Belum check-in": { bg: C.status_belum_in_bg, text: C.status_belum_in_text },
    "Foto belum lengkap": { bg: C.status_foto_bg, text: C.status_foto_text },
    "Belum foto grooming": { bg: C.status_foto_bg, text: C.status_foto_text },
  };
  const colors = map[statusLabel] || { bg: isAlt ? C.altRowBg : C.whiteBg, text: C.textDark };
  return {
    fill: { fgColor: { rgb: colors.bg } },
    font: { bold: true, sz: 10, color: { rgb: colors.text }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  };
};

const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

function fmtDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function fmtDateTime(d) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function calcDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "-";
  const diff = new Date(checkOut) - new Date(checkIn);
  if (diff <= 0) return "-";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function fileStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function exportAbsensiCleanoxExcel({ records, periodLabel, activePeriod, statusFilter }) {
  const periodStr = activePeriod
    ? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
    : "–";
  const filterLabel = statusFilter ? `Status: ${statusFilter}` : "Semua data (tanpa filter status)";
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

  const TOTAL_COLS = 9;
  const wsData = [];
  const emptyTitle = Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle));
  const emptyMeta = Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle));
  const emptySpacer = Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } }));

  wsData.push([cell("Riwayat Absensi Karyawan Cleanox", titleStyle), ...emptyTitle]);
  wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
  wsData.push([cell(`Filter: ${filterLabel}`, metaStyle), ...emptyMeta]);
  wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
  wsData.push(emptySpacer);

  const headers = [
    "No",
    "Tanggal",
    "Karyawan",
    "Kode",
    "Jabatan",
    "Absen In",
    "Absen Out",
    "Durasi",
    "Status",
  ];
  wsData.push(headers.map((h) => cell(h, headerStyle)));

  (records || []).forEach((r, idx) => {
    const isAlt = idx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");
    wsData.push([
      cell(idx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(fmtDate(r.attendance_date), csCenter),
      cell(r.full_name || "-", cs),
      cell(r.employee_code || "-", csCenter),
      cell(r.cleanox_role || "-", cs),
      cell(fmtDateTime(r.check_in_at), csCenter),
      cell(fmtDateTime(r.check_out_at), csCenter),
      cell(calcDuration(r.check_in_at, r.check_out_at), csCenter),
      cell(r.status_label || "-", makeStatusStyle(r.status_label, isAlt)),
    ]);
  });

  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } },
  ];
  ws["!cols"] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 18 },
  ];
  ws["!rows"] = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 }];

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Absensi Cleanox");
  const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    `riwayat_absensi_cleanox_${fileStamp()}.xlsx`,
  );
}
