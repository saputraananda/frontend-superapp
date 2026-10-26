// =============================================================================
// Export Master Dokumen (Document Alora) ke file Excel (.xlsx) dengan ExcelJS.
//
// Baris sudah disiapkan oleh pemanggil (MasterDocument.jsx) supaya label status,
// entitas, dan aging sama persis dengan yang tampil di layar.
// =============================================================================

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const COLUMNS = [
  { header: "No",                 key: "no",             width: 5  },
  { header: "Nama Dokumen",       key: "document_name",  width: 38 },
  { header: "Nomor Dokumen",      key: "numbers",        width: 34 },
  { header: "Entitas",            key: "entity",         width: 30 },
  { header: "Outlet",             key: "outlet",         width: 16 },
  { header: "Status",             key: "status",         width: 18 },
  { header: "Tanggal Efektif",    key: "effective_date", width: 15 },
  { header: "Tanggal Kadaluarsa", key: "expiry_date",    width: 15 },
  { header: "Masa Berlaku",       key: "validity",       width: 13 },
  { header: "Aging",              key: "aging",          width: 24 },
  { header: "PIC",                key: "pic",            width: 24 },
  { header: "Departemen",         key: "department",     width: 20 },
  { header: "Lokasi Arsip",       key: "archive",        width: 26 },
  { header: "Lampiran",           key: "attachments",    width: 10 },
  { header: "Catatan",            key: "notes",          width: 36 },
];

const HEADER_ROW = 5; // baris 1–3 judul & info filter, baris 4 kosong

const BORDER_COLOR = { argb: "FFE2E8F0" };
const thinBorder = {
  top: { style: "thin", color: BORDER_COLOR },
  bottom: { style: "thin", color: BORDER_COLOR },
  left: { style: "thin", color: BORDER_COLOR },
  right: { style: "thin", color: BORDER_COLOR },
};

// "YYYY-MM-DD" → Date UTC (supaya tanggal tidak bergeser karena zona waktu)
function toExcelDate(v) {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

// Warna aging selaras dengan badge di layar
function agingColors(days) {
  if (days == null) return null;
  if (days < 0)   return { font: "FF94A3B8", fill: "FFF8FAFC" };
  if (days <= 30) return { font: "FFE11D48", fill: "FFFFF1F2" };
  if (days <= 60) return { font: "FFEA580C", fill: "FFFFF7ED" };
  return null;
}

/**
 * @param {Object}   opts
 * @param {Object[]} opts.rows        baris siap tulis (lihat key di COLUMNS + aging_days)
 * @param {string[]} [opts.filters]   ringkasan filter aktif, mis. ["Entitas: Waschen Laundry"]
 * @param {string}   [opts.fileName]
 */
export async function exportDocumentsToExcel({ rows, filters = [], fileName }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alora Super App";
  wb.created = new Date();

  const ws = wb.addWorksheet("Master Dokumen", {
    views: [{ state: "frozen", xSplit: 2, ySplit: HEADER_ROW }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  ws.columns = COLUMNS.map(({ key, width }) => ({ key, width }));

  // ── Judul & info ──
  const lastCol = COLUMNS.length;
  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = "Master Dokumen — Document Alora";
  title.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };

  ws.mergeCells(2, 1, 2, lastCol);
  ws.getCell(2, 1).value = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })} · ${rows.length} dokumen`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: "FF64748B" } };

  ws.mergeCells(3, 1, 3, lastCol);
  ws.getCell(3, 1).value = `Filter: ${filters.length ? filters.join(" · ") : "Semua dokumen"}`;
  ws.getCell(3, 1).font = { size: 10, color: { argb: "FF64748B" } };

  // ── Header tabel ──
  const header = ws.getRow(HEADER_ROW);
  header.values = COLUMNS.map(c => c.header);
  header.height = 26;
  header.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
  });

  // ── Data ──
  rows.forEach((r, i) => {
    const row = ws.addRow({
      ...r,
      no: i + 1,
      effective_date: toExcelDate(r.effective_date),
      expiry_date: toExcelDate(r.expiry_date),
    });
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell({ includeEmpty: true }, cell => {
      cell.border = thinBorder;
      cell.font = { size: 10, color: { argb: "FF1E293B" } };
    });
    if (i % 2 === 1) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      });
    }

    ["no", "attachments"].forEach(k => { row.getCell(k).alignment = { vertical: "top", horizontal: "center" }; });
    ["effective_date", "expiry_date"].forEach(k => {
      row.getCell(k).numFmt = "dd mmm yyyy";
      row.getCell(k).alignment = { vertical: "top", horizontal: "center" };
    });
    row.getCell("document_name").font = { size: 10, bold: true, color: { argb: "FF0F172A" } };

    const colors = agingColors(r.aging_days);
    if (colors) {
      const aging = row.getCell("aging");
      aging.font = { size: 10, bold: true, color: { argb: colors.font } };
      aging.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.fill } };
    }
  });

  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW + rows.length, column: lastCol },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  saveAs(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    fileName || `Master_Dokumen_${stamp}.xlsx`
  );
}
