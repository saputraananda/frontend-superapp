import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

function fmtDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function pickKg(row) {
  if (row.total_kg_admin != null && row.total_kg_admin !== "") {
    const n = Number(row.total_kg_admin);
    if (Number.isFinite(n)) return n;
  }
  if (row.total_kg_valet != null && row.total_kg_valet !== "") {
    const n = Number(row.total_kg_valet);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function resolveMonthContext(startDate, endDate) {
  const end = new Date(`${endDate}T00:00:00`);
  const start = new Date(`${startDate}T00:00:00`);
  const base = Number.isNaN(end.getTime()) ? start : end;
  const year = base.getFullYear();
  const month = base.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(base);
  return { year, month, daysInMonth, monthLabel };
}

const CYAN = "FF00FFFF";
const YELLOW = "FFFFFF00";
const BLACK = "FF000000";
const TEXT = "FF000000";
const GRAY = "FF64748B";
const DARK_BLUE = "FF1E3A5F";
const LIGHT_BLUE = "FFEBF3FC";
const BORDER_COLOR = "FF000000";

const thinBorder = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

const MIN_KG_PER_DAY = 35;

function applyCyanHeader(cell) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CYAN } };
  cell.font = { bold: true, size: 10, color: { argb: TEXT } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = thinBorder;
}

function applyCellBorderCenter(cell, opts = {}) {
  cell.border = thinBorder;
  cell.alignment = {
    horizontal: opts.horizontal || "center",
    vertical: "middle",
    wrapText: !!opts.wrapText,
  };
  cell.font = opts.font || { size: 9, color: { argb: TEXT } };
  if (opts.fill) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
  }
  if (opts.numFmt) cell.numFmt = opts.numFmt;
}

/**
 * Sheet 1: matriks harian (mirip template perusahaan)
 * Sheet 2: rincian transaksi
 */
export async function exportRekapKgLinen(payload, startDate, endDate) {
  const hospital = payload.hospital || {};
  const details = payload.details || [];
  const hospitalName = hospital.hospital_name || "-";
  const { year, month, daysInMonth, monthLabel } = resolveMonthContext(startDate, endDate);

  // day -> { regular: number, express: number }
  const byDay = Array.from({ length: daysInMonth + 1 }, () => ({ regular: 0, express: 0 }));

  details.forEach((row) => {
    const raw = row.tx_date || row.pickup_date;
    if (!raw) return;
    const d = new Date(typeof raw === "string" && raw.length <= 10 ? `${raw}T00:00:00` : raw);
    if (Number.isNaN(d.getTime())) return;
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    const kg = pickKg(row);
    if (!kg) return;
    if (Number(row.is_express) === 1) byDay[day].express += kg;
    else byDay[day].regular += kg;
  });

  const regularDays = [];
  const expressDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    regularDays.push(byDay[day].regular || null);
    expressDays.push(byDay[day].express || null);
  }

  const minimalKg = MIN_KG_PER_DAY * daysInMonth;

  // columns: A=No, B=Jenis, C..(C+days-1)=dates, then TOTAL, HARGA, JUMLAH
  const dayStartCol = 3; // C
  const dayEndCol = dayStartCol + daysInMonth - 1;
  const totalCol = dayEndCol + 1;
  const hargaCol = totalCol + 1;
  const jumlahCol = hargaCol + 1;
  const lastCol = jumlahCol;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AloraSuperApp";
  workbook.created = new Date();

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 1 — Rangkuman (format matriks tanggal)
  // ═══════════════════════════════════════════════════════════════════════════
  const ws1 = workbook.addWorksheet("Rangkuman KG Harian", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 6 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // Column widths
  ws1.getColumn(1).width = 5;
  ws1.getColumn(2).width = 18;
  for (let c = dayStartCol; c <= dayEndCol; c++) ws1.getColumn(c).width = 6;
  ws1.getColumn(totalCol).width = 12;
  ws1.getColumn(hargaCol).width = 12;
  ws1.getColumn(jumlahCol).width = 14;

  // Header 3 baris (judul / RS / bulan)
  ws1.mergeCells(1, 1, 1, lastCol);
  ws1.getCell(1, 1).value = "REKAPITULASI BIAYA LAUNDRY LINEN KILOGRAM (EXPRESS)";
  ws1.getCell(1, 1).font = { bold: true, size: 14, color: { argb: TEXT } };
  ws1.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 22;

  ws1.mergeCells(2, 1, 2, lastCol);
  ws1.getCell(2, 1).value = String(hospitalName || "-").toUpperCase();
  ws1.getCell(2, 1).font = { bold: true, size: 12, color: { argb: TEXT } };
  ws1.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 20;

  ws1.mergeCells(3, 1, 3, lastCol);
  ws1.getCell(3, 1).value = `Bulan : ${monthLabel}`;
  ws1.getCell(3, 1).font = { bold: true, size: 11, color: { argb: TEXT } };
  ws1.getCell(3, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(3).height = 18;

  ws1.addRow([]); // spacer row 4

  // Header row 5–6
  const h1 = 5;
  const h2 = 6;

  ws1.getCell(h1, 1).value = "No";
  ws1.getCell(h1, 2).value = "JENIS LINEN";
  ws1.getCell(h1, dayStartCol).value = "TANGGAL";
  ws1.getCell(h1, totalCol).value = "TOTAL (kg)";
  ws1.getCell(h1, hargaCol).value = "HARGA (Rp)";
  ws1.getCell(h1, jumlahCol).value = "JUMLAH (Rp)";

  ws1.mergeCells(h1, 1, h2, 1);
  ws1.mergeCells(h1, 2, h2, 2);
  ws1.mergeCells(h1, dayStartCol, h1, dayEndCol);
  ws1.mergeCells(h1, totalCol, h2, totalCol);
  ws1.mergeCells(h1, hargaCol, h2, hargaCol);
  ws1.mergeCells(h1, jumlahCol, h2, jumlahCol);

  for (let day = 1; day <= daysInMonth; day++) {
    ws1.getCell(h2, dayStartCol + day - 1).value = day;
  }

  // Style header cells
  for (let r = h1; r <= h2; r++) {
    for (let c = 1; c <= lastCol; c++) {
      applyCyanHeader(ws1.getCell(r, c));
    }
  }
  ws1.getRow(h1).height = 20;
  ws1.getRow(h2).height = 18;

  const addJenisRow = (no, label, dayValues) => {
    const row = ws1.addRow([]);
    const r = row.number;
    ws1.getCell(r, 1).value = no;
    ws1.getCell(r, 2).value = label;

    dayValues.forEach((v, idx) => {
      const cell = ws1.getCell(r, dayStartCol + idx);
      if (v != null && Number(v) !== 0) {
        cell.value = Number(Number(v).toFixed(2));
        cell.numFmt = "0.00";
      } else {
        cell.value = null;
      }
      applyCellBorderCenter(cell);
    });

    // TOTAL formula
    const totalCell = ws1.getCell(r, totalCol);
    const startLetter = ws1.getColumn(dayStartCol).letter;
    const endLetter = ws1.getColumn(dayEndCol).letter;
    totalCell.value = { formula: `SUM(${startLetter}${r}:${endLetter}${r})` };
    totalCell.numFmt = "0.00";
    applyCellBorderCenter(totalCell);

    // HARGA dari Master RS (bisa diubah manual di Excel)
    const hargaCell = ws1.getCell(r, hargaCol);
    const masterPrice = hospital.price_per_kg != null && hospital.price_per_kg !== ""
      ? Number(hospital.price_per_kg)
      : null;
    hargaCell.value = masterPrice != null && Number.isFinite(masterPrice) ? masterPrice : null;
    hargaCell.numFmt = "#,##0";
    applyCellBorderCenter(hargaCell);

    // JUMLAH = TOTAL * HARGA
    const jumlahCell = ws1.getCell(r, jumlahCol);
    const totalLetter = ws1.getColumn(totalCol).letter;
    const hargaLetter = ws1.getColumn(hargaCol).letter;
    jumlahCell.value = { formula: `${totalLetter}${r}*${hargaLetter}${r}` };
    jumlahCell.numFmt = "#,##0";
    applyCellBorderCenter(jumlahCell, { fill: YELLOW });

    applyCellBorderCenter(ws1.getCell(r, 1));
    applyCellBorderCenter(ws1.getCell(r, 2), { horizontal: "left" });

    return r;
  };

  const rowRegular = addJenisRow(1, "Linen", regularDays);
  const rowExpress = addJenisRow(2, "Linen Express", expressDays);

  // TOTAL row
  const totalRowNum = ws1.addRow([]).number;
  ws1.mergeCells(totalRowNum, 1, totalRowNum, 2);
  ws1.getCell(totalRowNum, 1).value = "Total";
  applyCellBorderCenter(ws1.getCell(totalRowNum, 1), {
    font: { bold: true, size: 9, color: { argb: TEXT } },
  });
  applyCellBorderCenter(ws1.getCell(totalRowNum, 2), {
    font: { bold: true, size: 9, color: { argb: TEXT } },
  });

  for (let day = 1; day <= daysInMonth; day++) {
    const c = dayStartCol + day - 1;
    const letter = ws1.getColumn(c).letter;
    const cell = ws1.getCell(totalRowNum, c);
    cell.value = { formula: `${letter}${rowRegular}+${letter}${rowExpress}` };
    cell.numFmt = "0.00";
    applyCellBorderCenter(cell, { font: { bold: true, size: 9, color: { argb: TEXT } } });
  }

  {
    const letter = ws1.getColumn(totalCol).letter;
    const cell = ws1.getCell(totalRowNum, totalCol);
    cell.value = { formula: `${letter}${rowRegular}+${letter}${rowExpress}` };
    cell.numFmt = "0.00";
    applyCellBorderCenter(cell, { font: { bold: true, size: 9, color: { argb: TEXT } } });
  }
  applyCellBorderCenter(ws1.getCell(totalRowNum, hargaCol));
  {
    const letter = ws1.getColumn(jumlahCol).letter;
    const cell = ws1.getCell(totalRowNum, jumlahCol);
    cell.value = { formula: `${letter}${rowRegular}+${letter}${rowExpress}` };
    cell.numFmt = "#,##0";
    applyCellBorderCenter(cell, {
      fill: YELLOW,
      font: { bold: true, size: 9, color: { argb: TEXT } },
    });
  }

  // Rata-rata perhari
  const avgRowNum = ws1.addRow([]).number;
  ws1.mergeCells(avgRowNum, 1, avgRowNum, 2);
  ws1.getCell(avgRowNum, 1).value = "Rata-rata perhari";
  applyCellBorderCenter(ws1.getCell(avgRowNum, 1), {
    font: { size: 9, color: { argb: TEXT } },
    horizontal: "left",
  });
  applyCellBorderCenter(ws1.getCell(avgRowNum, 2));
  for (let c = dayStartCol; c <= dayEndCol; c++) {
    applyCellBorderCenter(ws1.getCell(avgRowNum, c));
  }
  {
    const totalLetter = ws1.getColumn(totalCol).letter;
    const cell = ws1.getCell(avgRowNum, totalCol);
    cell.value = { formula: `${totalLetter}${totalRowNum}/${daysInMonth}` };
    cell.numFmt = "0.00";
    applyCellBorderCenter(cell);
  }
  applyCellBorderCenter(ws1.getCell(avgRowNum, hargaCol));
  applyCellBorderCenter(ws1.getCell(avgRowNum, jumlahCol));

  // Minimal pengambilan
  const minRowNum = ws1.addRow([]).number;
  ws1.mergeCells(minRowNum, 1, minRowNum, 2);
  ws1.getCell(minRowNum, 1).value =
    `Minimal pengambilan linen kotor rata-rata perhari ${MIN_KG_PER_DAY} kg x ${daysInMonth} hari`;
  applyCellBorderCenter(ws1.getCell(minRowNum, 1), {
    font: { size: 8, color: { argb: TEXT } },
    horizontal: "left",
    wrapText: true,
  });
  applyCellBorderCenter(ws1.getCell(minRowNum, 2));
  for (let c = dayStartCol; c <= dayEndCol; c++) {
    applyCellBorderCenter(ws1.getCell(minRowNum, c));
  }
  {
    const cell = ws1.getCell(minRowNum, totalCol);
    cell.value = Number(minimalKg.toFixed(2));
    cell.numFmt = "0.00";
    applyCellBorderCenter(cell);
  }
  {
    const cell = ws1.getCell(minRowNum, hargaCol);
    cell.value = null;
    cell.numFmt = "#,##0";
    applyCellBorderCenter(cell);
  }
  {
    const totalLetter = ws1.getColumn(totalCol).letter;
    const hargaLetter = ws1.getColumn(hargaCol).letter;
    const cell = ws1.getCell(minRowNum, jumlahCol);
    cell.value = { formula: `${totalLetter}${minRowNum}*${hargaLetter}${minRowNum}` };
    cell.numFmt = "#,##0";
    applyCellBorderCenter(cell, { fill: YELLOW });
  }
  ws1.getRow(minRowNum).height = 28;

  // Footer tanda tangan
  ws1.addRow([]);
  const placeRow = ws1.addRow([]);
  ws1.getCell(placeRow.number, 1).value = `Depok, ${monthLabel}`;
  ws1.getCell(placeRow.number, 1).font = { size: 10, color: { argb: TEXT } };

  const hormatRow = ws1.addRow([]);
  ws1.getCell(hormatRow.number, 1).value = "Hormat kami,";
  ws1.getCell(hormatRow.number, 1).font = { size: 10, color: { argb: TEXT } };

  const companyRow = ws1.addRow([]);
  ws1.getCell(companyRow.number, 1).value = "PT. Intersolusi Karya Mandiri";
  ws1.getCell(companyRow.number, 1).font = { size: 10, color: { argb: TEXT } };

  // Spasi untuk tanda tangan
  ws1.addRow([]);
  ws1.addRow([]);
  ws1.addRow([]);
  ws1.addRow([]);

  const nameRow = ws1.addRow([]);
  ws1.getCell(nameRow.number, 1).value = "Susi Eriyanti";
  ws1.getCell(nameRow.number, 1).font = {
    bold: true,
    size: 10,
    color: { argb: TEXT },
    underline: true,
  };

  const titleRow = ws1.addRow([]);
  ws1.getCell(titleRow.number, 1).value = "Staff Admin Finance";
  ws1.getCell(titleRow.number, 1).font = { size: 10, color: { argb: TEXT } };

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 2 — Rincian transaksi (tetap detail)
  // ═══════════════════════════════════════════════════════════════════════════
  const ws2 = workbook.addWorksheet("Rincian Transaksi");
  ws2.views = [{ showGridLines: false }];
  ws2.columns = [
    { width: 6 },
    { width: 22 },
    { width: 18 },
    { width: 18 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
  ];

  const title2 = ws2.addRow(["REKAPITULASI BIAYA LAUNDRY LINEN KILOGRAM (EXPRESS)"]);
  ws2.mergeCells(1, 1, 1, 11);
  title2.getCell(1).font = { bold: true, size: 14, color: { argb: TEXT } };
  title2.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  title2.height = 24;

  const hosp2 = ws2.addRow([String(hospitalName || "-").toUpperCase()]);
  ws2.mergeCells(2, 1, 2, 11);
  hosp2.getCell(1).font = { bold: true, size: 12, color: { argb: TEXT } };
  hosp2.getCell(1).alignment = { horizontal: "center" };

  const per2 = ws2.addRow([`Bulan : ${monthLabel}`]);
  ws2.mergeCells(3, 1, 3, 11);
  per2.getCell(1).font = { bold: true, size: 11, color: { argb: TEXT } };
  per2.getCell(1).alignment = { horizontal: "center" };

  ws2.addRow([]);

  const header2 = ws2.addRow([
    "No",
    "No. Surat",
    "Pickup",
    "Pengantaran",
    "Status",
    "Kg Valet",
    "Kg Admin",
    "Selisih",
    "Express",
    "Pcs Kotor",
    "Pcs Bersih",
  ]);
  header2.height = 22;
  header2.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_BLUE } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  const softBorder = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  details.forEach((row, idx) => {
    const valet = row.total_kg_valet == null || row.total_kg_valet === "" ? null : Number(row.total_kg_valet);
    const admin = row.total_kg_admin == null || row.total_kg_admin === "" ? null : Number(row.total_kg_admin);
    const hasValet = valet != null && Number.isFinite(valet);
    const hasAdmin = admin != null && Number.isFinite(admin);
    const selisih = hasValet && hasAdmin ? admin - valet : null;
    const isExpress = Number(row.is_express) === 1;

    const dataRow = ws2.addRow([
      idx + 1,
      row.form_number || "-",
      fmtDateTime(row.pickup_date),
      fmtDateTime(row.delivery_date),
      row.status || "-",
      hasValet ? Number(valet.toFixed(2)) : "-",
      hasAdmin ? Number(admin.toFixed(2)) : "-",
      selisih == null ? "-" : Number(selisih.toFixed(2)),
      isExpress ? "Ya" : "Tidak",
      Number(row.total_kotor || 0),
      Number(row.total_bersih || 0),
    ]);
    dataRow.height = 20;
    dataRow.eachCell((cell) => {
      cell.border = softBorder;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.font = { size: 9.5, color: { argb: "FF0F172A" } };
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
      }
    });
  });

  if (details.length === 0) {
    const empty = ws2.addRow(["Tidak ada data pada periode ini"]);
    ws2.mergeCells(empty.number, 1, empty.number, 11);
    empty.getCell(1).alignment = { horizontal: "center" };
    empty.getCell(1).font = { italic: true, color: { argb: GRAY } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = String(hospitalName || "RS").replace(/[^\w-]+/g, "_");
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Rekap_KG_${safeName}_${startDate}_${endDate}.xlsx`
  );
}
