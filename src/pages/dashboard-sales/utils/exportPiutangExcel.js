import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  headerBg:    "6D28D9", // violet-700
  titleBg:     "4C1D95", // violet-900
  metaBg:      "EDE9FE", // violet-100
  metaText:    "4C1D95",
  altRowBg:    "F5F3FF", // violet-50
  whiteBg:     "FFFFFF",
  textDark:    "1E1B4B",
  textGray:    "64748B",
  borderColor: "DDD6FE", // violet-200

  // Status colours
  bjt_bg:  "E0F2FE", bjt_text:  "0369A1",  // sky
  jt_bg:   "FEF3C7", jt_text:   "92400E",  // amber
  ter_bg:  "FFE4E6", ter_text:  "9F1239",  // rose
};

// ─── Style factories ─────────────────────────────────────────────────────────
const border = () => ({
  top:    { style: "thin", color: { rgb: C.borderColor } },
  bottom: { style: "thin", color: { rgb: C.borderColor } },
  left:   { style: "thin", color: { rgb: C.borderColor } },
  right:  { style: "thin", color: { rgb: C.borderColor } },
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
  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: border(),
};

const makeCellStyle = (isAlt, align = "left") => ({
  fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
  font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center", wrapText: false },
  border: border(),
});

const makeStatusStyle = (status, isAlt) => {
  let bg   = isAlt ? C.altRowBg : C.whiteBg;
  let text = C.textDark;
  if (status === "Belum Jatuh Tempo") { bg = C.bjt_bg; text = C.bjt_text; }
  else if (status === "Jatuh Tempo")  { bg = C.jt_bg;  text = C.jt_text;  }
  else if (status === "Terlambat")    { bg = C.ter_bg;  text = C.ter_text;  }
  return {
    fill: { fgColor: { rgb: bg } },
    font: { bold: true, sz: 10, color: { rgb: text }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  };
};

const makeCurrencyStyle = (isAlt) => ({
  fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
  font: { bold: true, sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '#,##0',
  border: border(),
});

// ─── Summary footer style ────────────────────────────────────────────────────
const summaryLabelStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "right", vertical: "center" },
  border: border(),
};
const summaryCurrencyStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '#,##0',
  border: border(),
};
const summaryEmptyStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  border: border(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

function fmtDate(d) {
  if (!d) return "-";
  return String(d).split("T")[0];
}

function buildFilterLabel(filters) {
  if (!filters) return "Semua data";
  const { filterType, outlet, month, year, startDate, endDate } = filters;
  const outletLabel = outlet && outlet !== "all" ? outlet : "Semua Outlet";
  let periodLabel = "";
  if (filterType === "month" && month) periodLabel = `Bulan: ${month}`;
  else if (filterType === "year"  && year)  periodLabel = `Tahun: ${year}`;
  else if (filterType === "range" && startDate && endDate) periodLabel = `${startDate} s.d ${endDate}`;
  else periodLabel = "Semua Periode";
  return `${outletLabel}  |  ${periodLabel}`;
}

// ─── Main export function ─────────────────────────────────────────────────────
export function exportPiutangExcel({ rows, meta, filters, summary, searchKeyword, statusFilter }) {
  const TOTAL_COLS = 9;

  const periodStr = meta?.dateStart
    ? `${fmtDate(meta.dateStart)} s.d. ${fmtDate(meta.dateEnd)}`
    : "–";

  const filterLabel = buildFilterLabel(filters);
  const searchLabel = searchKeyword?.trim() ? `Pencarian: "${searchKeyword.trim()}"` : "";
  const statusLabel = statusFilter && statusFilter !== "all" ? `Status: ${statusFilter}` : "Semua Status";
  const exportedAt  = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

  // ── Collect rows ──────────────────────────────────────────────────────────
  const wsData = [];

  // Row 0: Title (merged across all cols)
  wsData.push([
    cell("Daftar Customer Piutang", titleStyle),
    ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle)),
  ]);

  // Row 1: Period
  wsData.push([
    cell(`Periode: ${periodStr}`, metaStyle),
    ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle)),
  ]);

  // Row 2: Filter info
  wsData.push([
    cell(`Filter: ${filterLabel}  |  ${statusLabel}${searchLabel ? "  |  " + searchLabel : ""}`, metaStyle),
    ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle)),
  ]);

  // Row 3: Exported at
  wsData.push([
    cell(exportedAt, metaStyle),
    ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle)),
  ]);

  // Row 4: Blank spacer
  wsData.push(Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  // Row 5: Column headers
  const HEADERS = ["#", "Customer", "No. Telepon", "Outlet", "No Nota", "Tgl Terima", "Jatuh Tempo", "Jumlah Piutang", "Status"];
  wsData.push(HEADERS.map(h => cell(h, headerStyle)));

  // Row 6+: Data rows
  rows.forEach((row, idx) => {
    const isAlt = idx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");
    wsData.push([
      cell(idx + 1,              { ...cs, alignment: { horizontal: "center", vertical: "center" }, border: border() }),
      cell(row.customer_nama ?? "-", cs),
      cell(row.customer_telepon ?? "-", { ...makeCellStyle(isAlt, "center"), font: { ...cs.font, name: "Courier New", sz: 9 } }),
      cell(row.outlet       ?? "-", csCenter),
      cell(row.no_nota      ?? "-", { ...csCenter, font: { ...cs.font, name: "Courier New", sz: 9 } }),
      cell(fmtDate(row.tgl_terima),  csCenter),
      cell(fmtDate(row.tgl_selesai), csCenter),
      cell(Number(row.piutang) || 0, makeCurrencyStyle(isAlt)),
      cell(row.status ?? "-",       makeStatusStyle(row.status, isAlt)),
    ]);
  });

  // Summary footer
  const total     = rows.reduce((a, r) => a + Number(r.piutang), 0);
  const jt        = rows.filter(r => r.status === "Jatuh Tempo").reduce((a, r) => a + Number(r.piutang), 0);
  const terlambat = rows.filter(r => r.status === "Terlambat").reduce((a, r) => a + Number(r.piutang), 0);
  const belum     = total - jt - terlambat;

  const sf = summaryCurrencyStyle;
  const sl = summaryLabelStyle;
  const se = summaryEmptyStyle;

  wsData.push([ empty(se), empty(se), empty(se), empty(se), empty(se), empty(se),
    cell("Total Piutang", sl), cell(total, sf), empty(se) ]);
  wsData.push([ empty(se), empty(se), empty(se), empty(se), empty(se), empty(se),
    cell("Belum Jatuh Tempo", sl), cell(belum, sf), empty(se) ]);
  wsData.push([ empty(se), empty(se), empty(se), empty(se), empty(se), empty(se),
    cell("Jatuh Tempo", sl), cell(jt, sf), empty(se) ]);
  wsData.push([ empty(se), empty(se), empty(se), empty(se), empty(se), empty(se),
    cell("Terlambat", sl), cell(terlambat, sf), empty(se) ]);

  // ── Build worksheet ───────────────────────────────────────────────────────
  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

  // Merge title / meta rows across all columns
  const HEADER_ROW_IDX = 5; // 0-indexed: rows 0-4 are title/meta/spacer
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } }, // Periode
    { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } }, // Filter
    { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } }, // Exported at
    { s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } }, // Spacer
  ];

  // Column widths (wch = characters)
  ws["!cols"] = [
    { wch: 5  }, // #
    { wch: 28 }, // Customer
    { wch: 16 }, // No. Telepon
    { wch: 20 }, // Outlet
    { wch: 18 }, // No Nota
    { wch: 14 }, // Tgl Terima
    { wch: 14 }, // Jatuh Tempo
    { wch: 18 }, // Jumlah
    { wch: 20 }, // Status
  ];

  // Row heights
  ws["!rows"] = [
    { hpt: 32 }, // Title
    { hpt: 18 }, // Periode
    { hpt: 18 }, // Filter
    { hpt: 18 }, // Exported at
    { hpt: 6  }, // Spacer
    { hpt: 24 }, // Header
  ];

  // ── Build workbook ────────────────────────────────────────────────────────
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Piutang");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });

  const fileDate = (meta?.dateStart ?? new Date().toISOString().split("T")[0]);
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `piutang_${fileDate.replaceAll("-", "")}.xlsx`
  );
}
