import ExcelJS from "exceljs";

export const SEWA_RATE = 0.075;

function colIndexToLabel(idx) {
  let label = "";
  let temp = idx;
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    temp = Math.floor((temp - 1) / 26);
  }
  return label;
}

function parseLocalDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftISO(iso, days) {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
}

function daysInclusive(from, to) {
  return Math.round((parseLocalDate(to) - parseLocalDate(from)) / 86400000) + 1;
}

function eachDate(startDate, endDate) {
  const dates = [];
  let cursor = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  while (cursor <= end) {
    dates.push(formatDateISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function monthShort(iso) {
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(parseLocalDate(iso));
}

function formatLong(iso) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(parseLocalDate(iso));
}

function formatPeriodTitle(startDate, endDate) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const startMonth = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(start);
  const endMonth = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(end);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startMonth.toUpperCase()} ${start.getFullYear()}`;
  }
  return `${startMonth.toUpperCase()} ${start.getFullYear()} - ${endMonth.toUpperCase()} ${end.getFullYear()}`;
}

function segmentLabel(from, to) {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (from === to) return `${a.getDate()} ${monthShort(from)}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}-${b.getDate()} ${monthShort(from)}`;
  }
  return `${a.getDate()} ${monthShort(from)}-${b.getDate()} ${monthShort(to)}`;
}

function safeSheetName(name, usedNames) {
  let base = String(name || "Sheet").replace(/[\\/*?:[\]]/g, " ").replace(/\s+/g, " ").trim().substring(0, 28) || "Sheet";
  let candidate = base;
  let i = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = `${base.substring(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

/** Stok awal = stok RS sekarang dikurangi mutasi BAST sejak awal periode. */
export function computeSewaBill({ stockNow, movements, usageQty, price, startDate, endDate, breakpoints = [] }) {
  const nets = new Map();
  let netFromStart = 0;
  for (const move of movements || []) {
    const date = String(move.date || "").slice(0, 10);
    const pengiriman = Number(move.pengiriman) || 0;
    const penarikan = Number(move.penarikan) || 0;
    if (date >= startDate) netFromStart += pengiriman - penarikan;
    if (date < startDate || date > endDate) continue;
    const prev = nets.get(date) || { pengiriman: 0, penarikan: 0 };
    prev.pengiriman += pengiriman;
    prev.penarikan += penarikan;
    nets.set(date, prev);
  }

  const opening = (Number(stockNow) || 0) - netFromStart;
  const points = [...new Set(
    [...breakpoints, ...nets.keys()].map((date) => String(date).slice(0, 10)).filter((date) => date > startDate && date <= endDate)
  )].sort();
  const ordered = [startDate, ...points];
  let stock = opening;
  const segments = [];
  const unit = Number(price) || 0;

  for (let i = 0; i < ordered.length; i += 1) {
    const from = ordered[i];
    const move = nets.get(from);
    if (move) stock += move.pengiriman - move.penarikan;
    const to = i + 1 < ordered.length ? shiftISO(ordered[i + 1], -1) : endDate;
    const days = daysInclusive(from, to);
    segments.push({ from, to, days, qty: stock, amount: stock * unit * SEWA_RATE * days });
  }

  const aktual = (Number(usageQty) || 0) * unit;
  const minimal = segments.reduce((sum, segment) => sum + segment.amount, 0);
  return { opening, closing: stock, segments, aktual, minimal, billed: Math.max(aktual, minimal), nets };
}

function assertSewaBill() {
  const sample = computeSewaBill({
    stockNow: 15,
    movements: [],
    usageQty: 41,
    price: 1850,
    startDate: "2025-05-01",
    endDate: "2025-05-31",
  });
  if (sample.opening !== 15) throw new Error(`opening sample ${sample.opening}`);
  if (Math.round(sample.minimal) !== 64519) throw new Error(`minimal sample ${sample.minimal}`);
  if (sample.aktual !== 75850) throw new Error(`aktual sample ${sample.aktual}`);
  if (sample.billed !== 75850) throw new Error(`billed sample ${sample.billed}`);

  const walk = computeSewaBill({
    stockNow: 40,
    movements: [
      { date: "2026-05-08", pengiriman: 5, penarikan: 0 },
      { date: "2026-05-20", pengiriman: 5, penarikan: 0 },
    ],
    usageQty: 50,
    price: 10000,
    startDate: "2026-05-01",
    endDate: "2026-05-31",
    breakpoints: ["2026-05-08", "2026-05-20"],
  });
  if (walk.opening !== 30 || walk.closing !== 40) throw new Error(`walk stock ${walk.opening}/${walk.closing}`);
  if (walk.segments.map((segment) => `${segment.qty}x${segment.days}`).join(",") !== "30x7,35x12,40x12") {
    throw new Error(`walk segments ${walk.segments.map((segment) => segment.days + ":" + segment.qty).join(",")}`);
  }
  if (walk.minimal !== 832500 || walk.aktual !== 500000 || walk.billed !== 832500) {
    throw new Error(`walk money ${walk.minimal}/${walk.aktual}/${walk.billed}`);
  }

  const pulled = computeSewaBill({
    stockNow: 25,
    movements: [{ date: "2026-05-08", pengiriman: 0, penarikan: 5 }],
    usageQty: 0,
    price: 1000,
    startDate: "2026-05-01",
    endDate: "2026-05-10",
  });
  if (pulled.opening !== 30 || pulled.segments[0].qty !== 30 || pulled.segments[1].qty !== 25) {
    throw new Error(`pull ${pulled.opening}`);
  }
}

const entry = globalThis.process?.argv?.[1] || "";
if (entry.replaceAll("\\", "/").endsWith("/exportSewaLinen.js")) {
  assertSewaBill();
  console.log("sewa bill ok");
}

export async function exportSewaLinen(rekapData, startDate, endDate) {
  const { hospitals = [], linens = [], movements = [], usage = [] } = rekapData;
  if (!hospitals.length) throw new Error("Tidak ada data rumah sakit untuk diekspor");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || "") || !/^\d{4}-\d{2}-\d{2}$/.test(endDate || "") || startDate > endDate) {
    throw new Error("Rentang tanggal rekap tidak valid");
  }

  const dates = eachDate(startDate, endDate);
  const spansMonths = dates[0].slice(0, 7) !== dates[dates.length - 1].slice(0, 7);
  const dayBefore = shiftISO(startDate, -1);
  const { saveAs } = await import("file-saver");
  const workbook = new ExcelJS.Workbook();
  const usedSheetNames = new Set();

  const C = {
    navyDeep: "FF0F2544",
    navyMid: "FF1B3D6F",
    teal: "FF00838F",
    tealLight: "FFE0F7FA",
    amber: "FFFFB300",
    amberFont: "FF4E3400",
    summaryBg: "FFE8EEF8",
    white: "FFFFFFFF",
    fontDark: "FF0F2544",
    fontMuted: "FF546E7A",
    borderGray: "FFB0BEC5",
    rowAlt: "FFF4F6F9",
  };
  const borderAll = ["top", "left", "bottom", "right"].reduce((acc, side) => {
    acc[side] = { style: "thin", color: { argb: C.borderGray } };
    return acc;
  }, {});
  const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

  let logoBuffer = null;
  try {
    const logoRes = await fetch("/ikm.png");
    if (logoRes.ok) logoBuffer = new Uint8Array(await logoRes.arrayBuffer());
  } catch { /* logo optional */ }

  for (const hospital of hospitals) {
    const hospitalLinens = linens.filter((linen) => Number(linen.hospital_id) === Number(hospital.id));
    if (!hospitalLinens.length) continue;

    const hospitalMoves = movements.filter((move) => Number(move.hospital_id) === Number(hospital.id));
    const inPeriod = hospitalMoves.filter((move) => {
      const date = String(move.move_date).slice(0, 10);
      return date >= startDate && date <= endDate;
    });
    const kirimDates = [...new Set(inPeriod.filter((move) => Number(move.qty_pengiriman) > 0).map((move) => String(move.move_date).slice(0, 10)))].sort();
    const tarikDates = [...new Set(inPeriod.filter((move) => Number(move.qty_penarikan) > 0).map((move) => String(move.move_date).slice(0, 10)))].sort();
    const breakpoints = [...new Set([...kirimDates, ...tarikDates])].sort();

    const usageMap = new Map();
    usage.forEach((row) => {
      if (Number(row.hospital_id) === Number(hospital.id)) {
        usageMap.set(`${row.tx_date}-${row.hospital_linen_id}`, Number(row.total_qty_kotor) || 0);
      }
    });

    const columns = [
      { key: "name", title: "Jenis Linen", width: 32 },
      { key: "opening", title: `Stok Per\n${formatLong(dayBefore)}`, width: 18 },
    ];
    kirimDates.forEach((date) => columns.push({ key: `kirim:${date}`, title: `${parseLocalDate(date).getDate()} ${monthShort(date)}`, group: "Pengiriman Linen", width: 12 }));
    tarikDates.forEach((date) => columns.push({ key: `tarik:${date}`, title: `${parseLocalDate(date).getDate()} ${monthShort(date)}`, group: "Penarikan Linen", width: 12 }));
    columns.push({ key: "closing", title: "Stok Linen", width: 12 });
    dates.forEach((date) => columns.push({
      key: `pakai:${date}`,
      title: spansMonths ? `${parseLocalDate(date).getDate()}/${parseLocalDate(date).getMonth() + 1}` : parseLocalDate(date).getDate(),
      group: "Tanggal Pemakaian",
      width: 4.5,
    }));
    columns.push({ key: "total", title: "Total\n(Pcs)", width: 10 });
    columns.push({ key: "harga", title: "Harga", width: 12 });
    columns.push({ key: "aktual", title: "Biaya Sewa\nAktual", width: 16 });
    const segmentTemplate = computeSewaBill({ stockNow: 0, movements: [], usageQty: 0, price: 0, startDate, endDate, breakpoints }).segments;
    segmentTemplate.forEach((segment) => columns.push({
      key: `seg:${segment.from}`,
      title: segmentLabel(segment.from, segment.to),
      group: "Biaya Sewa 7,5%",
      width: 14,
    }));
    columns.push({ key: "minimal", title: "Total Biaya\nSewa 7,5%", width: 16 });
    columns.push({ key: "tagih", title: "Jumlah Biaya\nSewa Ditagihkan", width: 18 });

    const ws = workbook.addWorksheet(safeSheetName(hospital.hospital_name, usedSheetNames));
    ws.columns = columns.map((column) => ({ width: column.width }));
    const lastCol = columns.length;
    const lastLabel = colIndexToLabel(lastCol);

    ws.addRow([]).height = 36;
    ws.addRow([]).height = 30;
    ws.addRow([]).height = 22;
    ws.mergeCells("A1:B3");
    if (lastCol > 2) ws.mergeCells(`C1:${lastLabel}3`);
    const titleCell = ws.getRow(1).getCell(3);
    titleCell.value = {
      richText: [
        { text: "REKAP SEWA LINEN\n", font: { bold: true, size: 18, color: { argb: C.navyDeep }, name: "Calibri" } },
        { text: `${hospital.hospital_name.toUpperCase()}\n`, font: { bold: true, size: 14, color: { argb: C.navyDeep }, name: "Calibri" } },
        { text: `PERIODE : ${formatPeriodTitle(startDate, endDate)}`, font: { size: 10, color: { argb: C.fontMuted }, name: "Calibri" } },
      ],
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (logoBuffer) {
      const logoId = workbook.addImage({ buffer: logoBuffer, extension: "png" });
      ws.addImage(logoId, { tl: { col: 0.15, row: 0.35 }, ext: { width: 150, height: 72 }, editAs: "oneCell" });
    }
    ws.addRow([]).height = 6;

    const h1 = ws.addRow(columns.map((column) => column.group || column.title));
    const h2 = ws.addRow(columns.map((column) => column.title));
    h1.height = 22;
    h2.height = 30;
    let cursor = 0;
    while (cursor < columns.length) {
      const group = columns[cursor].group;
      let end = cursor;
      if (group) {
        while (end + 1 < columns.length && columns[end + 1].group === group) end += 1;
        if (end > cursor) ws.mergeCells(h1.number, cursor + 1, h1.number, end + 1);
      } else {
        ws.mergeCells(h1.number, cursor + 1, h2.number, cursor + 1);
      }
      cursor = end + 1;
    }

    const paintHeader = (row, groupRow) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > lastCol) return;
        const column = columns[colNumber - 1];
        const isUse = column.group === "Tanggal Pemakaian" || column.key.startsWith("pakai:");
        const isBill = column.key === "tagih" || column.group === "Biaya Sewa 7,5%" || column.key === "minimal" || column.key === "aktual";
        cell.fill = fill(isBill && !groupRow ? C.amber : isUse ? C.teal : C.navyDeep);
        cell.font = { bold: true, size: 9, color: { argb: isBill && !groupRow ? C.amberFont : C.white }, name: "Calibri" };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = borderAll;
      });
    };
    paintHeader(h1, true);
    paintHeader(h2, false);

    const dataStart = ws.rowCount + 1;
    const indexOf = (key) => columns.findIndex((column) => column.key === key) + 1;
    const firstUse = indexOf(`pakai:${dates[0]}`);
    const lastUse = indexOf(`pakai:${dates[dates.length - 1]}`);
    const firstSeg = indexOf(`seg:${segmentTemplate[0].from}`);
    const lastSeg = indexOf(`seg:${segmentTemplate[segmentTemplate.length - 1].from}`);

    hospitalLinens.forEach((linen, idx) => {
      const linenMoves = hospitalMoves
        .filter((move) => Number(move.hospital_linen_id) === Number(linen.hospital_linen_id))
        .map((move) => ({
          date: String(move.move_date).slice(0, 10),
          pengiriman: Number(move.qty_pengiriman) || 0,
          penarikan: Number(move.qty_penarikan) || 0,
        }));
      const usageQty = dates.reduce((sum, date) => sum + (usageMap.get(`${date}-${linen.hospital_linen_id}`) || 0), 0);
      const bill = computeSewaBill({
        stockNow: linen.stock_in_rs,
        movements: linenMoves,
        usageQty,
        price: linen.rental_price,
        startDate,
        endDate,
        breakpoints,
      });
      const values = columns.map((column) => {
        if (column.key === "name") return linen.linen_display_name;
        if (column.key === "opening") return bill.opening;
        if (column.key === "closing") return bill.closing;
        if (column.key === "harga") return Number(linen.rental_price) || 0;
        if (column.key.startsWith("kirim:")) return bill.nets.get(column.key.slice(6))?.pengiriman || 0;
        if (column.key.startsWith("tarik:")) return bill.nets.get(column.key.slice(6))?.penarikan || 0;
        if (column.key.startsWith("pakai:")) return usageMap.get(`${column.key.slice(6)}-${linen.hospital_linen_id}`) || 0;
        if (column.key.startsWith("seg:")) return bill.segments.find((segment) => segment.from === column.key.slice(4))?.amount || 0;
        return null;
      });
      const row = ws.addRow(values);
      row.height = 18;
      const ri = row.number;
      row.getCell(indexOf("total")).value = { formula: `SUM(${colIndexToLabel(firstUse)}${ri}:${colIndexToLabel(lastUse)}${ri})` };
      row.getCell(indexOf("aktual")).value = { formula: `${colIndexToLabel(indexOf("total"))}${ri}*${colIndexToLabel(indexOf("harga"))}${ri}` };
      row.getCell(indexOf("minimal")).value = { formula: `SUM(${colIndexToLabel(firstSeg)}${ri}:${colIndexToLabel(lastSeg)}${ri})` };
      row.getCell(indexOf("tagih")).value = { formula: `MAX(${colIndexToLabel(indexOf("aktual"))}${ri},${colIndexToLabel(indexOf("minimal"))}${ri})` };

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > lastCol) return;
        const column = columns[colNumber - 1];
        cell.fill = fill(idx % 2 === 1 ? C.rowAlt : C.white);
        cell.font = { size: 9, name: "Calibri", color: { argb: C.fontDark }, bold: column.key === "tagih" };
        cell.border = borderAll;
        cell.alignment = { horizontal: column.key === "name" ? "left" : "center", vertical: "middle" };
        if (column.key.startsWith("pakai:") || column.key.startsWith("kirim:") || column.key.startsWith("tarik:") || column.key === "total" || column.key === "opening" || column.key === "closing") {
          cell.numFmt = "#,##0;-;-";
        } else if (column.key !== "name") {
          cell.numFmt = '"Rp "#,##0';
        }
      });
    });

    const dataEnd = ws.rowCount;
    const summary = ws.addRow(columns.map((column, index) => {
      if (index === 0) return "TOTAL";
      if (["total", "aktual", "minimal", "tagih", "opening", "closing"].includes(column.key) || column.key.startsWith("pakai:") || column.key.startsWith("kirim:") || column.key.startsWith("tarik:") || column.key.startsWith("seg:")) {
        const label = colIndexToLabel(index + 1);
        return { formula: `SUM(${label}${dataStart}:${label}${dataEnd})` };
      }
      return null;
    }));
    summary.height = 22;
    summary.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > lastCol) return;
      const column = columns[colNumber - 1];
      cell.fill = fill(C.summaryBg);
      cell.font = { bold: true, size: 9.5, name: "Calibri", color: { argb: C.navyDeep } };
      cell.border = borderAll;
      cell.alignment = { horizontal: colNumber === 1 ? "left" : "center", vertical: "middle" };
      if (column.key.startsWith("pakai:") || column.key.startsWith("kirim:") || column.key.startsWith("tarik:") || ["total", "opening", "closing"].includes(column.key)) {
        cell.numFmt = "#,##0;-;-";
      } else if (column.key !== "name" && column.key !== "harga") {
        cell.numFmt = '"Rp "#,##0';
      }
    });

    ws.views = [{ state: "frozen", xSplit: 2, ySplit: h2.number, showGridLines: false }];
  }

  if (!workbook.worksheets.length) throw new Error("Tidak ada linen sewa untuk diekspor pada periode ini");
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Rekap_Sewa_Linen_${startDate}_${endDate}.xlsx`);
}
