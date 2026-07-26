import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

function colIndexToLabel(idx) {
  let label = "";
  let temp = idx;
  while (temp > 0) {
    let rem = (temp - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    temp = Math.floor((temp - 1) / 26);
  }
  return label;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatPeriodTitle(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end)) return "";
  const startMonth = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(start);
  const startYear = start.getFullYear();
  const endMonth = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(end);
  const endYear = end.getFullYear();
  if (startMonth === endMonth && startYear === endYear) {
    return `${startMonth.toUpperCase()} ${startYear}`;
  }
  return `${startMonth.toUpperCase()} ${startYear} - ${endMonth.toUpperCase()} ${endYear}`;
}

export async function exportRekapCuciLinenSewa(rekapData, startDate, endDate, ownershipType = "SEWA") {
  const { hospitals = [], linens = [], transactions = [] } = rekapData;

  if (hospitals.length === 0) {
    alert("Tidak ada data rumah sakit untuk diekspor");
    return;
  }

  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const workbook = new ExcelJS.Workbook();

  const C = {
    navyDeep:   "FF0F2544",
    navyMid:    "FF1B3D6F",
    teal:       "FF00838F",
    tealLight:  "FFE0F7FA",
    amber:      "FFFFB300",
    amberFont:  "FF4E3400",
    summaryBg:  "FFE8EEF8",
    sumBorder:  "FF1B3D6F",
    white:      "FFFFFFFF",
    fontDark:   "FF0F2544",
    fontMuted:  "FF546E7A",
    borderGray: "FFB0BEC5",
    borderDark: "FF546E7A",
    rowAlt:     "FFF4F6F9",
    todayCell:  "FFFFF9C4",
  };

  const bThin   = (c = C.borderGray) => ({ style: "thin",   color: { argb: c } });
  const bMedium = (c = C.borderDark) => ({ style: "medium", color: { argb: c } });
  const borderAll = { top: bThin(), left: bThin(), bottom: bThin(), right: bThin() };
  const borderSummary = {
    top: bMedium(C.sumBorder), left: bThin(), bottom: bMedium(C.sumBorder), right: bThin(),
  };

  function styleFill(argb) {
    return { type: "pattern", pattern: "solid", fgColor: { argb } };
  }

  const todayISO = formatDateISO(new Date());

  // ── Fetch logo once (ikm.png from /public) ─────────────────────────────
  let logoBuffer = null;
  try {
    const logoRes = await fetch("/ikm.png");
    if (logoRes.ok) logoBuffer = await logoRes.arrayBuffer();
  } catch (_) { /* logo optional */ }

  for (const hospital of hospitals) {
    const hospitalLinens = linens.filter((l) => Number(l.hospital_id) === Number(hospital.id));
    if (hospitalLinens.length === 0) continue;

    const sheetName = hospital.hospital_name.substring(0, 30);
    const ws = workbook.addWorksheet(sheetName);

    const numDates         = dates.length;
    const firstDateColIdx  = 3;
    const lastDateColIdx   = 2 + numDates;
    const totalColIdx      = 3 + numDates;
    const beratColIdx      = 4 + numDates;
    const totalBeratColIdx = 5 + numDates;
    const hargaCuciColIdx  = 6 + numDates;
    const hargaSewaColIdx  = 7 + numDates;
    const totalBiayaColIdx = 8 + numDates;
    const lastColLabel      = colIndexToLabel(totalBiayaColIdx);
    const firstDateColLabel = colIndexToLabel(firstDateColIdx);
    const lastDateColLabel  = colIndexToLabel(lastDateColIdx);

    const cols = [];
    cols.push({ width: 5.5 });
    cols.push({ width: 38 });
    for (let i = 0; i < numDates; i++) cols.push({ width: 4.5 });
    cols.push({ width: 11 });
    cols.push({ width: 10 });
    cols.push({ width: 14 });
    cols.push({ width: 17 });
    cols.push({ width: 15 });
    cols.push({ width: 19 });
    ws.columns = cols;

    // ── Rows 1-3: Header block ──────────────────────────────────────────────
    // Layout: [Logo A1:B3] | [Title / RS Name / Period  C1:lastCol row1-3]
    const titleText = ownershipType === "SEWA"
      ? "REKAPITULASI CUCI LINEN MILIK PT INTERSOLUSI KARYA MANDIRI"
      : "REKAPITULASI CUCI LINEN MILIK RUMAH SAKIT";

    const r1 = ws.addRow([]);  // Row 1
    const r2 = ws.addRow([]);  // Row 2
    const r3 = ws.addRow([]);  // Row 3

    r1.height = 36;
    r2.height = 30;
    r3.height = 22;

    // Merge A1:B3 for logo area
    ws.mergeCells(`A1:B3`);

    // Merge C1:lastCol across all 3 rows so text block is one big centered cell
    ws.mergeCells(`C1:${lastColLabel}3`);

    // Title block (single merged cell spanning rows 1-3, right side)
    const ctBlock = r1.getCell(3);
    ctBlock.value = {
      richText: [
        {
          text: titleText + "\n",
          font: { bold: true, size: 18, color: { argb: C.navyDeep }, name: "Calibri" },
        },
        {
          text: hospital.hospital_name.toUpperCase() + "\n",
          font: { bold: true, size: 14, color: { argb: C.navyDeep }, name: "Calibri" },
        },
        {
          text: `PERIODE : ${formatPeriodTitle(startDate, endDate)}`,
          font: { size: 10, color: { argb: C.fontMuted }, name: "Calibri", italic: false },
        },
      ],
    };
    ctBlock.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // Add logo image — use ext (pixels) to preserve natural aspect ratio
    if (logoBuffer) {
      const logoImageId = workbook.addImage({ buffer: logoBuffer, extension: "png" });
      ws.addImage(logoImageId, {
        tl: { col: 1.8, row: 0.5},
        ext: { width: 150, height: 72 },  // ~2:1 aspect ratio, fits 3 rows
        editAs: "oneCell",
      });
    }

    // Row 4: Spacer
    ws.addRow([]).height = 6;





    // Row 5: Header Level 1 — No | Jenis Linen | TANGGAL (merged) | summary cols
    // IMPORTANT: precompute h2RowNum BEFORE any mergeCells calls.
    // ws.mergeCells('A5:A6') internally creates row 6, which would advance ws.rowCount
    // and cause ws.addRow(h2Data) to land on row 7 instead of 6.
    const h1RowNum = ws.rowCount + 1;
    const h2RowNum = h1RowNum + 1; // precomputed — not derived from ws.rowCount after merges

    const h1Data = ["No", "Jenis Linen", "TANGGAL"];
    for (let i = 1; i < numDates; i++) h1Data.push("");
    h1Data.push("Total\n(Pcs)", "Berat\n(gr)", "Total Berat\n(kg)", "Harga Cuci", "Harga Sewa", "Total Biaya");

    const h1Row = ws.addRow(h1Data);
    h1Row.height = 30;

    // Merge cells for 2-level header
    ws.mergeCells(`${firstDateColLabel}${h1RowNum}:${lastDateColLabel}${h1RowNum}`);
    ws.mergeCells(`A${h1RowNum}:A${h2RowNum}`);
    ws.mergeCells(`B${h1RowNum}:B${h2RowNum}`);
    for (let ci = totalColIdx; ci <= totalBiayaColIdx; ci++) {
      const cl = colIndexToLabel(ci);
      ws.mergeCells(`${cl}${h1RowNum}:${cl}${h2RowNum}`);
    }

    h1Row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > totalBiayaColIdx) return;
      const isDateGroup = colNumber >= firstDateColIdx && colNumber <= lastDateColIdx;
      cell.fill      = styleFill(isDateGroup ? C.teal : C.navyDeep);
      cell.font      = { bold: true, size: 9.5, color: { argb: C.white }, name: "Calibri" };
      cell.border    = borderAll;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    // Row 6: Header Level 2 — date numbers
    // Use ws.getRow(h2RowNum) so we target exactly the pre-computed row.
    const h2Row = ws.getRow(h2RowNum);
    h2Row.height = 16;
    dates.forEach((d, i) => {
      h2Row.getCell(firstDateColIdx + i).value = d.getDate();
    });

    h2Row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber < firstDateColIdx || colNumber > lastDateColIdx) return;
      const d       = dates[colNumber - firstDateColIdx];
      const isToday = d ? formatDateISO(d) === todayISO : false;
      cell.fill      = styleFill(isToday ? C.amber : C.tealLight);
      cell.font      = { bold: true, size: 8.5, color: { argb: isToday ? C.amberFont : C.navyMid }, name: "Calibri" };
      cell.border    = borderAll;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Data rows (start from row 7)
    const dataStartRow = ws.rowCount + 1;

    const txMap = new Map();
    transactions.forEach((tx) => {
      if (Number(tx.hospital_id) === Number(hospital.id)) {
        txMap.set(`${tx.tx_date}-${tx.hospital_linen_id}`, Number(tx.total_qty_kotor || 0));
      }
    });

    hospitalLinens.forEach((linen, idx) => {
      const rowBg   = idx % 2 === 1 ? C.rowAlt : C.white;
      const rowData = [idx + 1, linen.linen_display_name];
      dates.forEach((d) => {
        const key = `${formatDateISO(d)}-${linen.hospital_linen_id}`;
        rowData.push(txMap.get(key) || 0);
      });
      // Cast to Number to avoid #VALUE! when DB returns numeric strings
      rowData.push(null, Number(linen.grammage) || 0, null, Number(linen.washing_price) || 0, Number(linen.rental_price) || 0, null);

      const row = ws.addRow(rowData);
      row.height = 18;
      const ri = row.number;

      const fc   = colIndexToLabel(firstDateColIdx);
      const lc   = colIndexToLabel(lastDateColIdx);
      const tc   = colIndexToLabel(totalColIdx);
      const bc   = colIndexToLabel(beratColIdx);
      const tbc  = colIndexToLabel(totalBeratColIdx);
      const hc   = colIndexToLabel(hargaCuciColIdx);
      const sc   = colIndexToLabel(hargaSewaColIdx);

      row.getCell(totalColIdx).value      = { formula: `=SUM(${fc}${ri}:${lc}${ri})` };
      row.getCell(totalBeratColIdx).value = { formula: `=${tc}${ri}*${bc}${ri}/1000` };
      if (linen.washing_price_type === "KG") {
        row.getCell(totalBiayaColIdx).value = { formula: `=(${hc}${ri}*${tbc}${ri})+(${sc}${ri}*${tc}${ri})` };
      } else {
        row.getCell(totalBiayaColIdx).value = { formula: `=(${hc}${ri}*${tc}${ri})+(${sc}${ri}*${tc}${ri})` };
      }

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > totalBiayaColIdx) return;
        const isDateCol    = colNumber >= firstDateColIdx && colNumber <= lastDateColIdx;
        const isSummaryCol = colNumber >= totalColIdx;
        const d            = isDateCol ? dates[colNumber - firstDateColIdx] : null;
        const isToday      = d ? formatDateISO(d) === todayISO : false;

        cell.fill      = styleFill(isToday ? C.todayCell : rowBg);
        cell.font      = { size: 9, name: "Calibri", color: { argb: C.fontDark }, bold: colNumber === 1 };
        cell.border    = borderAll;
        cell.alignment = {
          horizontal: colNumber === 2 ? "left" : "center",
          vertical: "middle",
        };

        if (colNumber >= firstDateColIdx && colNumber <= totalColIdx)  cell.numFmt = "#,##0;-;-";
        else if (colNumber === beratColIdx)       cell.numFmt = "#,##0";
        else if (colNumber === totalBeratColIdx)  cell.numFmt = "#,##0.000";
        else if (colNumber === hargaCuciColIdx || colNumber === hargaSewaColIdx || colNumber === totalBiayaColIdx)
          cell.numFmt = '"Rp "#,##0';
      });
    });

    // Summary row
    const dataEndRow  = ws.rowCount;
    const summaryData = ["TOTAL", ""];

    for (let i = 0; i < numDates; i++) {
      const cl = colIndexToLabel(firstDateColIdx + i);
      summaryData.push({ formula: `=SUM(${cl}${dataStartRow}:${cl}${dataEndRow})` });
    }
    const tcl   = colIndexToLabel(totalColIdx);
    const tbcl  = colIndexToLabel(totalBeratColIdx);
    const biycl = colIndexToLabel(totalBiayaColIdx);
    summaryData.push({ formula: `=SUM(${tcl}${dataStartRow}:${tcl}${dataEndRow})` });
    summaryData.push("");
    summaryData.push({ formula: `=SUM(${tbcl}${dataStartRow}:${tbcl}${dataEndRow})` });
    summaryData.push("", "");
    summaryData.push({ formula: `=SUM(${biycl}${dataStartRow}:${biycl}${dataEndRow})` });

    const sumRow = ws.addRow(summaryData);
    sumRow.height = 22;
    ws.mergeCells(`A${sumRow.number}:B${sumRow.number}`);

    sumRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > totalBiayaColIdx) return;
      cell.fill      = styleFill(C.summaryBg);
      cell.font      = { bold: true, size: 9.5, name: "Calibri", color: { argb: C.navyDeep } };
      cell.border    = borderSummary;
      cell.alignment = {
        horizontal: colNumber === 2 ? "left" : "center",
        vertical: "middle",
      };
      if (colNumber >= firstDateColIdx && colNumber <= totalColIdx) cell.numFmt = "#,##0;-;-";
      else if (colNumber === totalBeratColIdx) cell.numFmt = "#,##0.000";
      else if (colNumber === totalBiayaColIdx) cell.numFmt = '"Rp "#,##0';
    });

    // Freeze: 2 left cols + header rows
    ws.views = [{ state: "frozen", xSplit: 2, ySplit: h2RowNum, showGridLines: false }];
  }

  const buffer  = await workbook.xlsx.writeBuffer();
  const blob    = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const docName = ownershipType === "SEWA" ? "Rekap_Cuci_Linen_Sewa" : "Rekap_Cuci_Linen_RS";
  saveAs(blob, `${docName}_${startDate}_${endDate}.xlsx`);
}
