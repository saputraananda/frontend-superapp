import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
const TEXT = "FF000000";
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

function toPrice(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build a daily KG matrix sheet (same layout for all 3 sheets).
 * rows: [{ no, label, dayValues, unitPrice }]
 */
function buildMatrixSheet(workbook, {
  sheetName,
  title,
  hospitalName,
  monthLabel,
  daysInMonth,
  rows,
}) {
  const dayStartCol = 3; // C
  const dayEndCol = dayStartCol + daysInMonth - 1;
  const totalCol = dayEndCol + 1;
  const hargaCol = totalCol + 1;
  const jumlahCol = hargaCol + 1;
  const lastCol = jumlahCol;
  const minimalKg = MIN_KG_PER_DAY * daysInMonth;

  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true, state: "frozen", ySplit: 6 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 20;
  for (let c = dayStartCol; c <= dayEndCol; c++) ws.getColumn(c).width = 6;
  ws.getColumn(totalCol).width = 12;
  ws.getColumn(hargaCol).width = 12;
  ws.getColumn(jumlahCol).width = 14;

  // Header 3 baris
  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: TEXT } };
  ws.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, lastCol);
  ws.getCell(2, 1).value = String(hospitalName || "-").toUpperCase();
  ws.getCell(2, 1).font = { bold: true, size: 12, color: { argb: TEXT } };
  ws.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;

  ws.mergeCells(3, 1, 3, lastCol);
  ws.getCell(3, 1).value = `Bulan : ${monthLabel}`;
  ws.getCell(3, 1).font = { bold: true, size: 11, color: { argb: TEXT } };
  ws.getCell(3, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 18;

  ws.addRow([]); // spacer row 4

  const h1 = 5;
  const h2 = 6;

  ws.getCell(h1, 1).value = "No";
  ws.getCell(h1, 2).value = "JENIS LINEN";
  ws.getCell(h1, dayStartCol).value = "TANGGAL";
  ws.getCell(h1, totalCol).value = "TOTAL (kg)";
  ws.getCell(h1, hargaCol).value = "HARGA (Rp)";
  ws.getCell(h1, jumlahCol).value = "JUMLAH (Rp)";

  ws.mergeCells(h1, 1, h2, 1);
  ws.mergeCells(h1, 2, h2, 2);
  ws.mergeCells(h1, dayStartCol, h1, dayEndCol);
  ws.mergeCells(h1, totalCol, h2, totalCol);
  ws.mergeCells(h1, hargaCol, h2, hargaCol);
  ws.mergeCells(h1, jumlahCol, h2, jumlahCol);

  for (let day = 1; day <= daysInMonth; day++) {
    ws.getCell(h2, dayStartCol + day - 1).value = day;
  }

  for (let r = h1; r <= h2; r++) {
    for (let c = 1; c <= lastCol; c++) {
      applyCyanHeader(ws.getCell(r, c));
    }
  }
  ws.getRow(h1).height = 20;
  ws.getRow(h2).height = 18;

  const addJenisRow = (no, label, dayValues, unitPrice) => {
    const row = ws.addRow([]);
    const r = row.number;
    ws.getCell(r, 1).value = no;
    ws.getCell(r, 2).value = label;

    dayValues.forEach((v, idx) => {
      const cell = ws.getCell(r, dayStartCol + idx);
      if (v != null && Number(v) !== 0) {
        cell.value = Number(Number(v).toFixed(2));
        cell.numFmt = "0.00";
      } else {
        cell.value = null;
      }
      applyCellBorderCenter(cell);
    });

    const totalCell = ws.getCell(r, totalCol);
    const startLetter = ws.getColumn(dayStartCol).letter;
    const endLetter = ws.getColumn(dayEndCol).letter;
    totalCell.value = { formula: `SUM(${startLetter}${r}:${endLetter}${r})` };
    totalCell.numFmt = "0.00";
    applyCellBorderCenter(totalCell);

    const hargaCell = ws.getCell(r, hargaCol);
    hargaCell.value = unitPrice != null ? unitPrice : null;
    hargaCell.numFmt = "#,##0";
    applyCellBorderCenter(hargaCell);

    const jumlahCell = ws.getCell(r, jumlahCol);
    const totalLetter = ws.getColumn(totalCol).letter;
    const hargaLetter = ws.getColumn(hargaCol).letter;
    jumlahCell.value = { formula: `${totalLetter}${r}*${hargaLetter}${r}` };
    jumlahCell.numFmt = "#,##0";
    applyCellBorderCenter(jumlahCell, { fill: YELLOW });

    applyCellBorderCenter(ws.getCell(r, 1));
    applyCellBorderCenter(ws.getCell(r, 2), { horizontal: "left" });

    return r;
  };

  const dataRowNums = rows.map((item) =>
    addJenisRow(item.no, item.label, item.dayValues, item.unitPrice)
  );

  // TOTAL row
  const totalRowNum = ws.addRow([]).number;
  ws.mergeCells(totalRowNum, 1, totalRowNum, 2);
  ws.getCell(totalRowNum, 1).value = "Total";
  applyCellBorderCenter(ws.getCell(totalRowNum, 1), {
    font: { bold: true, size: 9, color: { argb: TEXT } },
  });
  applyCellBorderCenter(ws.getCell(totalRowNum, 2), {
    font: { bold: true, size: 9, color: { argb: TEXT } },
  });

  const sumFormula = (colLetter) =>
    dataRowNums.map((r) => `${colLetter}${r}`).join("+");

  for (let day = 1; day <= daysInMonth; day++) {
    const c = dayStartCol + day - 1;
    const letter = ws.getColumn(c).letter;
    const cell = ws.getCell(totalRowNum, c);
    cell.value = { formula: sumFormula(letter) };
    cell.numFmt = "0.00";
    applyCellBorderCenter(cell, { font: { bold: true, size: 9, color: { argb: TEXT } } });
  }

  {
    const letter = ws.getColumn(totalCol).letter;
    const cell = ws.getCell(totalRowNum, totalCol);
    cell.value = { formula: sumFormula(letter) };
    cell.numFmt = "0.00";
    applyCellBorderCenter(cell, { font: { bold: true, size: 9, color: { argb: TEXT } } });
  }
  applyCellBorderCenter(ws.getCell(totalRowNum, hargaCol));
  {
    const letter = ws.getColumn(jumlahCol).letter;
    const cell = ws.getCell(totalRowNum, jumlahCol);
    cell.value = { formula: sumFormula(letter) };
    cell.numFmt = "#,##0";
    applyCellBorderCenter(cell, {
      fill: YELLOW,
      font: { bold: true, size: 9, color: { argb: TEXT } },
    });
  }

  // Rata-rata perhari
  const avgRowNum = ws.addRow([]).number;
  ws.mergeCells(avgRowNum, 1, avgRowNum, 2);
  ws.getCell(avgRowNum, 1).value = "Rata-rata perhari";
  applyCellBorderCenter(ws.getCell(avgRowNum, 1), {
    font: { size: 9, color: { argb: TEXT } },
    horizontal: "left",
  });
  applyCellBorderCenter(ws.getCell(avgRowNum, 2));
  for (let c = dayStartCol; c <= dayEndCol; c++) {
    applyCellBorderCenter(ws.getCell(avgRowNum, c));
  }
  {
    const totalLetter = ws.getColumn(totalCol).letter;
    const cell = ws.getCell(avgRowNum, totalCol);
    cell.value = { formula: `${totalLetter}${totalRowNum}/${daysInMonth}` };
    cell.numFmt = "0.00";
    applyCellBorderCenter(cell);
  }
  applyCellBorderCenter(ws.getCell(avgRowNum, hargaCol));
  applyCellBorderCenter(ws.getCell(avgRowNum, jumlahCol));

  // Minimal pengambilan
  const minRowNum = ws.addRow([]).number;
  ws.mergeCells(minRowNum, 1, minRowNum, 2);
  ws.getCell(minRowNum, 1).value =
    `Minimal pengambilan linen kotor rata-rata perhari ${MIN_KG_PER_DAY} kg x ${daysInMonth} hari`;
  applyCellBorderCenter(ws.getCell(minRowNum, 1), {
    font: { size: 8, color: { argb: TEXT } },
    horizontal: "left",
    wrapText: true,
  });
  applyCellBorderCenter(ws.getCell(minRowNum, 2));
  for (let c = dayStartCol; c <= dayEndCol; c++) {
    applyCellBorderCenter(ws.getCell(minRowNum, c));
  }
  {
    const cell = ws.getCell(minRowNum, totalCol);
    cell.value = Number(minimalKg.toFixed(2));
    cell.numFmt = "0.00";
    applyCellBorderCenter(cell);
  }
  {
    const cell = ws.getCell(minRowNum, hargaCol);
    cell.value = null;
    cell.numFmt = "#,##0";
    applyCellBorderCenter(cell);
  }
  {
    const totalLetter = ws.getColumn(totalCol).letter;
    const hargaLetter = ws.getColumn(hargaCol).letter;
    const cell = ws.getCell(minRowNum, jumlahCol);
    cell.value = { formula: `${totalLetter}${minRowNum}*${hargaLetter}${minRowNum}` };
    cell.numFmt = "#,##0";
    applyCellBorderCenter(cell, { fill: YELLOW });
  }
  ws.getRow(minRowNum).height = 28;

  // Footer tanda tangan
  ws.addRow([]);
  const placeRow = ws.addRow([]);
  ws.getCell(placeRow.number, 1).value = `Depok, ${monthLabel}`;
  ws.getCell(placeRow.number, 1).font = { size: 10, color: { argb: TEXT } };

  const hormatRow = ws.addRow([]);
  ws.getCell(hormatRow.number, 1).value = "Hormat kami,";
  ws.getCell(hormatRow.number, 1).font = { size: 10, color: { argb: TEXT } };

  const companyRow = ws.addRow([]);
  ws.getCell(companyRow.number, 1).value = "PT. Intersolusi Karya Mandiri";
  ws.getCell(companyRow.number, 1).font = { size: 10, color: { argb: TEXT } };

  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);

  const nameRow = ws.addRow([]);
  ws.getCell(nameRow.number, 1).value = "Susi Eriyanti";
  ws.getCell(nameRow.number, 1).font = {
    bold: true,
    size: 10,
    color: { argb: TEXT },
    underline: true,
  };

  const titleRow = ws.addRow([]);
  ws.getCell(titleRow.number, 1).value = "Staff Admin Finance";
  ws.getCell(titleRow.number, 1).font = { size: 10, color: { argb: TEXT } };

  return ws;
}

/**
 * Sheet 1: Rangkuman KG Harian (Non Express + Express)
 * Sheet 2: Linen Non Express
 * Sheet 3: Linen Express
 */
export async function exportRekapKgLinen(payload, startDate, endDate) {
  const hospital = payload.hospital || {};
  const details = payload.details || [];
  const hospitalName = hospital.hospital_name || "-";
  const { year, month, daysInMonth, monthLabel } = resolveMonthContext(startDate, endDate);

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

  const regularPrice = toPrice(hospital.price_per_kg);
  const customExpressPrice = toPrice(hospital.express_price_per_kg);
  const expressPrice =
    customExpressPrice != null
      ? customExpressPrice
      : regularPrice != null
        ? regularPrice * 2
        : null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AloraSuperApp";
  workbook.created = new Date();

  const common = { hospitalName, monthLabel, daysInMonth };

  // Sheet 1 — Rangkuman (keduanya)
  buildMatrixSheet(workbook, {
    ...common,
    sheetName: "Rangkuman KG Harian",
    title: "REKAPITULASI BIAYA LAUNDRY LINEN KILOGRAM",
    rows: [
      { no: 1, label: "Linen Non Express", dayValues: regularDays, unitPrice: regularPrice },
      { no: 2, label: "Linen Express", dayValues: expressDays, unitPrice: expressPrice },
    ],
  });

  // Sheet 2 — Non Express saja
  buildMatrixSheet(workbook, {
    ...common,
    sheetName: "Linen Non Express",
    title: "REKAPITULASI BIAYA LAUNDRY LINEN KILOGRAM (NON EXPRESS)",
    rows: [
      { no: 1, label: "Linen Non Express", dayValues: regularDays, unitPrice: regularPrice },
    ],
  });

  // Sheet 3 — Express saja
  buildMatrixSheet(workbook, {
    ...common,
    sheetName: "Linen Express",
    title: "REKAPITULASI BIAYA LAUNDRY LINEN KILOGRAM (EXPRESS)",
    rows: [
      { no: 1, label: "Linen Express", dayValues: expressDays, unitPrice: expressPrice },
    ],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = String(hospitalName || "RS").replace(/[^\w-]+/g, "_");
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Rekap_KG_${safeName}_${startDate}_${endDate}.xlsx`
  );
}
