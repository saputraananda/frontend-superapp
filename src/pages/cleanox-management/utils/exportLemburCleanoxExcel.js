import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

const C = {
  headerBg: "1b3459",
  titleBg: "12233c",
  metaBg: "E8EEF5",
  metaText: "1b3459",
  altRowBg: "F1F5F9",
  whiteBg: "FFFFFF",
  textDark: "1E293B",
  textGray: "64748B",
  borderColor: "CBD5E1",
  aktif_bg: "FEF3C7",
  aktif_text: "92400E",
  selesai_bg: "D1FAE5",
  selesai_text: "065F46",
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
  alignment: { horizontal: align, vertical: "center", wrapText: true },
  border: border(),
});

const makeStatusStyle = (status, isAlt) => {
  const map = {
    aktif: { bg: C.aktif_bg, text: C.aktif_text },
    selesai: { bg: C.selesai_bg, text: C.selesai_text },
  };
  const colors = map[String(status || "").toLowerCase()] || {
    bg: isAlt ? C.altRowBg : C.whiteBg,
    text: C.textDark,
  };
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

function fmtDuration(mins) {
  if (mins == null || Number.isNaN(Number(mins))) return "-";
  const m = Math.max(0, Math.round(Number(mins)));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem}m`;
  return `${h}j ${rem}m`;
}

function fileStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

const TYPE_LABEL = { checkout: "Checkout", pengajuan: "Pengajuan" };

export function exportLemburCleanoxExcel({ records, periodLabel, activePeriod, typeFilter, statusFilter }) {
  const periodStr = activePeriod
    ? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
    : "–";
  const typeLabel = typeFilter ? `Tipe: ${TYPE_LABEL[typeFilter] || typeFilter}` : "Semua tipe";
  const statusLabel = statusFilter ? `Status: ${statusFilter}` : "Semua status";
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

  const TOTAL_COLS = 9;
  const wsData = [];
  const emptyTitle = Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle));
  const emptyMeta = Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle));
  const emptySpacer = Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } }));

  wsData.push([cell("Monitoring Lembur Cleanox", titleStyle), ...emptyTitle]);
  wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
  wsData.push([cell(`Filter: ${typeLabel} | ${statusLabel}`, metaStyle), ...emptyMeta]);
  wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
  wsData.push(emptySpacer);

  const headers = [
    "No",
    "Nama",
    "Tanggal",
    "Tipe",
    "Jam Mulai",
    "Jam Selesai",
    "Durasi",
    "Deskripsi",
    "Status",
  ];
  wsData.push(headers.map((h) => cell(h, headerStyle)));

  (records || []).forEach((r, idx) => {
    const isAlt = idx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");
    const mins = r.duration_minutes;
    const durLabel = mins != null ? `${fmtDuration(mins)} (${mins} mnt)` : "-";
    wsData.push([
      cell(idx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(r.full_name || r.employee_name || "-", cs),
      cell(fmtDate(r.overtime_date), csCenter),
      cell(TYPE_LABEL[r.type] || r.type || "-", csCenter),
      cell(fmtDateTime(r.start_at), csCenter),
      cell(fmtDateTime(r.end_at), csCenter),
      cell(durLabel, csCenter),
      cell(r.description || "-", cs),
      cell(r.status || "-", makeStatusStyle(r.status, isAlt)),
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
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 40 },
    { wch: 12 },
  ];
  ws["!rows"] = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 }];

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Lembur Cleanox");
  const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    `monitoring_lembur_cleanox_${fileStamp()}.xlsx`,
  );
}
