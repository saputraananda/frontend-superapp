import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Export tabel sederhana ke Excel (gaya Waschen: judul maroon + baris keterangan filter).
 *
 * columns: [{ header, key | value(row), width, type: 'text' | 'money' | 'number' | 'datetime' | 'date', align }]
 * filters: [["Periode", "1 Nov – 25 Nov 2026"], ["Outlet", "Semua"]] → ditulis di bawah judul
 * totals:  { [key]: number } → baris TOTAL di bawah (untuk kolom money/number)
 */
const MAROON = "FF5F1340";
const CREAM = "FFF8F4F7";
const ZEBRA = "FFFBF7F9";
const LINE = "FFE7D5DE";
const TEXT = "FF1E293B";
const MUTED = "FF64748B";

const border = {
  top: { style: "thin", color: { argb: LINE } },
  left: { style: "thin", color: { argb: LINE } },
  bottom: { style: "thin", color: { argb: LINE } },
  right: { style: "thin", color: { argb: LINE } },
};

/** Teks "YYYY-MM-DD HH:mm:ss" (WIB dari DB) → Date lokal tanpa geser zona waktu. */
function toExcelDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    // Excel menyimpan tanggal tanpa zona: pakai UTC supaya jam tidak bergeser di file
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeName(s) {
  return String(s || "export").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").slice(0, 120);
}

export async function exportTableExcel({ title, sheetName = "Data", fileName, filters = [], columns, rows, totals = null }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Waschen Alora";
  const ws = wb.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 3 + filters.length + 1, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  const cols = [{ header: "No", width: 6, type: "number", value: (_, i) => i + 1 }, ...columns];
  const lastCol = cols.length;

  // Judul
  ws.mergeCells(1, 1, 1, lastCol);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MAROON } };
  t.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, lastCol);
  const stamp = ws.getCell(2, 1);
  stamp.value = `Diunduh ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date())} WIB · ${rows.length} baris`;
  stamp.font = { italic: true, size: 9, color: { argb: MUTED } };
  stamp.alignment = { indent: 1 };

  // Keterangan filter
  filters.forEach(([label, value], i) => {
    const r = 3 + i;
    ws.mergeCells(r, 1, r, lastCol);
    const c = ws.getCell(r, 1);
    c.value = { richText: [{ text: `${label}: `, font: { bold: true, size: 10, color: { argb: TEXT } } }, { text: String(value ?? "—"), font: { size: 10, color: { argb: TEXT } } }] };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
    c.alignment = { indent: 1 };
  });

  // Header
  const headerRow = 3 + filters.length + 1;
  cols.forEach((col, i) => {
    const c = ws.getCell(headerRow, i + 1);
    c.value = col.header;
    c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MAROON } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = border;
    ws.getColumn(i + 1).width = col.width || 16;
  });
  ws.getRow(headerRow).height = 22;

  // Data
  rows.forEach((row, ri) => {
    const r = headerRow + 1 + ri;
    cols.forEach((col, ci) => {
      const c = ws.getCell(r, ci + 1);
      let v = col.value ? col.value(row, ri) : row[col.key];
      if (col.type === "money" || col.type === "number") {
        v = v === null || v === undefined || v === "" ? null : Number(v) || 0;
        c.numFmt = col.type === "money" ? '"Rp" #,##0' : "#,##0";
      } else if (col.type === "datetime" || col.type === "date") {
        v = toExcelDate(v);
        c.numFmt = col.type === "date" ? "dd mmm yyyy" : "dd mmm yyyy hh:mm";
      } else if (v === null || v === undefined) {
        v = "";
      }
      c.value = v;
      c.font = { size: 10, color: { argb: TEXT } };
      c.border = border;
      c.alignment = {
        vertical: "middle",
        horizontal: col.align || (["money", "number"].includes(col.type) ? "right" : ["datetime", "date"].includes(col.type) ? "center" : "left"),
        wrapText: Boolean(col.wrap),
      };
      if (ri % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    });
  });

  // Total
  if (totals && rows.length) {
    const r = headerRow + 1 + rows.length;
    cols.forEach((col, ci) => {
      const c = ws.getCell(r, ci + 1);
      if (ci === 0) c.value = "TOTAL";
      else if (col.key && totals[col.key] != null) {
        c.value = Number(totals[col.key]) || 0;
        c.numFmt = col.type === "money" ? '"Rp" #,##0' : "#,##0";
        c.alignment = { horizontal: "right" };
      }
      c.font = { bold: true, size: 10, color: { argb: TEXT } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
      c.border = border;
    });
  }

  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: lastCol } };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safeName(fileName || title)}.xlsx`);
}

/** Label periode untuk baris filter. */
export function periodLabel(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return "Semua periode";
  const f = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  if (dateFrom === dateTo) return f(dateFrom);
  return `${dateFrom ? f(dateFrom) : "…"} – ${dateTo ? f(dateTo) : "…"}`;
}
