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
  menunggu_bg: "FEF3C7",
  menunggu_text: "92400E",
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

function fileStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

const TYPE_LABEL = { half_day: "Half Day", full_day: "Full Day" };
const STATUS_LABEL = { menunggu_tf: "Menunggu TF", selesai: "Selesai" };

function makeStatusStyle(status, isAlt) {
  const map = {
    menunggu_tf: { bg: C.menunggu_bg, text: C.menunggu_text },
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
}

function writeWorkbook(wsData, merges, cols, sheetName, filePrefix) {
  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
  ws["!merges"] = merges;
  ws["!cols"] = cols;
  ws["!rows"] = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 }];
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    `${filePrefix}_${fileStamp()}.xlsx`,
  );
}

export function exportMakanSiangPengajuanExcel({ records, periodLabel, activePeriod, typeFilter, statusFilter }) {
  const periodStr = activePeriod
    ? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
    : "–";
  const typeLabel = typeFilter ? `Tipe: ${TYPE_LABEL[typeFilter] || typeFilter}` : "Semua tipe";
  const statusLabel = statusFilter ? `Status: ${STATUS_LABEL[statusFilter] || statusFilter}` : "Semua status";
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

  const TOTAL_COLS = 8;
  const wsData = [];
  const emptyTitle = Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle));
  const emptyMeta = Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle));
  const emptySpacer = Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } }));

  wsData.push([cell("Pengajuan Makan Siang Cleanox", titleStyle), ...emptyTitle]);
  wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
  wsData.push([cell(`Filter: ${typeLabel} | ${statusLabel}`, metaStyle), ...emptyMeta]);
  wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
  wsData.push(emptySpacer);

  const headers = ["No", "Nama", "Tanggal", "Tipe", "Amount", "Status", "Notes", "Processed at"];
  wsData.push(headers.map((h) => cell(h, headerStyle)));

  (records || []).forEach((r, idx) => {
    const isAlt = idx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");
    wsData.push([
      cell(idx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(r.full_name || r.employee_name || "-", cs),
      cell(fmtDate(r.meal_date), csCenter),
      cell(TYPE_LABEL[r.type] || r.type || "-", csCenter),
      cell(Number(r.amount) || 0, csCenter),
      cell(STATUS_LABEL[r.status] || r.status || "-", makeStatusStyle(r.status, isAlt)),
      cell(r.notes || "-", cs),
      cell(fmtDateTime(r.processed_at), csCenter),
    ]);
  });

  writeWorkbook(
    wsData,
    [
      { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } },
    ],
    [
      { wch: 5 },
      { wch: 24 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 30 },
      { wch: 18 },
    ],
    "Pengajuan",
    "pengajuan_makan_siang_cleanox",
  );
}

export function exportMakanSiangRekapExcel({ rows, periodLabel, activePeriod, grandTotal }) {
  const periodStr = activePeriod
    ? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
    : "–";
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

  const TOTAL_COLS = 8;
  const wsData = [];
  const emptyTitle = Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle));
  const emptyMeta = Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle));
  const emptySpacer = Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } }));

  wsData.push([cell("Rekap Makan Siang Cleanox", titleStyle), ...emptyTitle]);
  wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
  wsData.push([
    cell(`Grand total: ${Number(grandTotal) || 0}`, metaStyle),
    ...emptyMeta,
  ]);
  wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
  wsData.push(emptySpacer);

  const headers = ["No", "Nama", "Kode", "Hari", "Kantor (10k)", "Half", "Full", "Total"];
  wsData.push(headers.map((h) => cell(h, headerStyle)));

  (rows || []).forEach((r, idx) => {
    const isAlt = idx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");
    wsData.push([
      cell(idx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(r.full_name || "-", cs),
      cell(r.employee_code || "-", csCenter),
      cell(Number(r.days) || 0, csCenter),
      cell(Number(r.office_days) || 0, csCenter),
      cell(Number(r.half_days) || 0, csCenter),
      cell(Number(r.full_days) || 0, csCenter),
      cell(Number(r.total_amount) || 0, csCenter),
    ]);
  });

  writeWorkbook(
    wsData,
    [
      { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } },
    ],
    [
      { wch: 5 },
      { wch: 24 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 14 },
    ],
    "Rekap",
    "rekap_makan_siang_cleanox",
  );
}
