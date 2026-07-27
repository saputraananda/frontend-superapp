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

export async function exportRekapCuciLinenKhusus(rekapData, startDate, endDate, ownershipType = "SEWA") {
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

  // Fetch logo once (ikm.png from /public)
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
    const pColIdx          = 4 + numDates;
    const lColIdx          = 5 + numDates;
    const luasColIdx       = 6 + numDates;
    const hargaCuciColIdx  = 7 + numDates;
    const totalBiayaColIdx = 8 + numDates;
    const lastColLabel      = colIndexToLabel(totalBiayaColIdx);
    const firstDateColLabel = colIndexToLabel(firstDateColIdx);
    const lastDateColLabel  = colIndexToLabel(lastDateColIdx);

    const cols = [];
    cols.push({ width: 5.5 });
    cols.push({ width: 38 });
    for (let i = 0; i < numDates; i++) cols.push({ width: 4.5 });
    cols.push({ width: 11 }); // Total (Pcs)
    cols.push({ width: 10 }); // P
    cols.push({ width: 10 }); // L
    cols.push({ width: 12 }); // Luas (M2)
    cols.push({ width: 15 }); // Harga Cuci
    cols.push({ width: 19 }); // Total Biaya
    ws.columns = cols;

    // Header block
    const r1 = ws.addRow([]);
    const r2 = ws.addRow([]);
    const r3 = ws.addRow([]);

    r1.height = 36;
    r2.height = 30;
    r3.height = 22;

    ws.mergeCells(`A1:B3`);
    ws.mergeCells(`C1:${lastColLabel}3`);

    const ctBlock = r1.getCell(3);
    ctBlock.value = {
      richText: [
        {
          text: "REKAPITULASI CUCI LINEN\n",
          font: { bold: true, size: 18, color: { argb: C.navyDeep }, name: "Calibri" },
        },
        {
          text: hospital.hospital_name.toUpperCase() + "\n",
          font: { bold: true, size: 14, color: { argb: C.navyDeep }, name: "Calibri" },
        },
        {
          text: `PERIODE : ${formatPeriodTitle(startDate, endDate)}`,
          font: { size: 10, color: { argb: C.fontMuted }, name: "Calibri" },
        },
      ],
    };
    ctBlock.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    if (logoBuffer) {
      const logoImageId = workbook.addImage({ buffer: logoBuffer, extension: "png" });
      ws.addImage(logoImageId, {
        tl: { col: 1.8, row: 0.5},
        ext: { width: 150, height: 72 },
        editAs: "oneCell",
      });
    }

    ws.addRow([]).height = 6;

    // Header Level 1
    const h1RowNum = ws.rowCount + 1;
    const h2RowNum = h1RowNum + 1;

    const h1Data = ["No", "Jenis Linen Khusus", "TANGGAL"];
    for (let i = 1; i < numDates; i++) h1Data.push("");
    h1Data.push("Total\n(Pcs)", "P (M)", "L (M)", "Luas\n(M2)", "Harga Cuci", "Total Biaya");

    const h1Row = ws.addRow(h1Data);
    h1Row.height = 30;

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

    // Header Level 2 - Dates
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

    // Find all unique custom items (linen + dimensions) that have transactions
    const uniqueItemsMap = new Map();
    transactions.forEach((tx) => {
      if (Number(tx.hospital_id) !== Number(hospital.id)) return;
      const lenVal = tx.length_cm !== null && tx.length_cm !== undefined ? Number(tx.length_cm) : null;
      const widVal = tx.width_cm !== null && tx.width_cm !== undefined ? Number(tx.width_cm) : null;
      const areaVal = tx.area_m2 !== null && tx.area_m2 !== undefined ? Number(tx.area_m2) : null;
      
      const key = `${tx.hospital_linen_id}-${lenVal}-${widVal}`;
      if (!uniqueItemsMap.has(key)) {
        const masterLinen = hospitalLinens.find(l => Number(l.hospital_linen_id) === Number(tx.hospital_linen_id));
        const baseName = masterLinen ? masterLinen.linen_display_name : `Linen #${tx.hospital_linen_id}`;
        
        const lenStr = lenVal !== null ? `${lenVal} m` : "";
        const widStr = widVal !== null ? `${widVal} m` : "";
        const finalName = [
          baseName,
          lenStr && widStr ? `${lenStr} x ${widStr}` : ""
        ].filter(Boolean).join(" ");

        uniqueItemsMap.set(key, {
          hospital_linen_id: tx.hospital_linen_id,
          linen_display_name: finalName,
          washing_price: masterLinen ? Number(masterLinen.washing_price) : 0,
          length_cm: lenVal,
          width_cm: widVal,
          area_m2: areaVal,
        });
      }
    });

    const uniqueItemsList = Array.from(uniqueItemsMap.values());

    // Append any master linens that had no transactions in this period
    hospitalLinens.forEach(master => {
      const exists = uniqueItemsList.some(item => Number(item.hospital_linen_id) === Number(master.hospital_linen_id));
      if (!exists) {
        uniqueItemsList.push({
          hospital_linen_id: master.hospital_linen_id,
          linen_display_name: master.linen_display_name,
          washing_price: Number(master.washing_price) || 0,
          length_cm: null,
          width_cm: null,
          area_m2: null,
        });
      }
    });

    const dataStartRow = ws.rowCount + 1;

    const txMap = new Map();
    transactions.forEach((tx) => {
      if (Number(tx.hospital_id) === Number(hospital.id)) {
        const lenVal = tx.length_cm !== null && tx.length_cm !== undefined ? Number(tx.length_cm) : null;
        const widVal = tx.width_cm !== null && tx.width_cm !== undefined ? Number(tx.width_cm) : null;
        const key = `${tx.tx_date}-${tx.hospital_linen_id}-${lenVal}-${widVal}`;
        txMap.set(key, Number(tx.total_qty_kotor || 0));
      }
    });

    uniqueItemsList.forEach((item, idx) => {
      const rowBg   = idx % 2 === 1 ? C.rowAlt : C.white;
      const rowData = [idx + 1, item.linen_display_name];
      dates.forEach((d) => {
        const key = `${formatDateISO(d)}-${item.hospital_linen_id}-${item.length_cm}-${item.width_cm}`;
        rowData.push(txMap.get(key) || 0);
      });

      rowData.push(
        null, // Total placeholder for formula
        item.length_cm, // P
        item.width_cm, // L
        item.area_m2, // Luas
        Number(item.washing_price) || 0, // Harga Cuci
        null // Total Biaya placeholder for formula
      );

      const row = ws.addRow(rowData);
      row.height = 18;
      const ri = row.number;

      const fc   = colIndexToLabel(firstDateColIdx);
      const lc   = colIndexToLabel(lastDateColIdx);
      const tc   = colIndexToLabel(totalColIdx);
      const pc   = colIndexToLabel(pColIdx);
      const lcCol = colIndexToLabel(lColIdx);
      const lsc  = colIndexToLabel(luasColIdx);
      const hc   = colIndexToLabel(hargaCuciColIdx);

      row.getCell(totalColIdx).value = { formula: `=SUM(${fc}${ri}:${lc}${ri})` };
      row.getCell(totalBiayaColIdx).value = { formula: `=${tc}${ri}*${lsc}${ri}*${hc}${ri}` };

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

        if (colNumber >= firstDateColIdx && colNumber <= totalColIdx) cell.numFmt = "#,##0;-;-";
        else if (colNumber === pColIdx || colNumber === lColIdx) cell.numFmt = "#,##0.00";
        else if (colNumber === luasColIdx) cell.numFmt = "#,##0.00";
        else if (colNumber === hargaCuciColIdx || colNumber === totalBiayaColIdx)
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
    const biycl = colIndexToLabel(totalBiayaColIdx);
    summaryData.push({ formula: `=SUM(${tcl}${dataStartRow}:${tcl}${dataEndRow})` });
    summaryData.push("", "", "", ""); // Placeholders for P, L, Luas, Harga Cuci
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
      else if (colNumber === totalBiayaColIdx) cell.numFmt = '"Rp "#,##0';
    });

    ws.views = [{ state: "frozen", xSplit: 2, ySplit: h2RowNum, showGridLines: false }];
  }

  const buffer  = await workbook.xlsx.writeBuffer();
  const blob    = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const docName = ownershipType === "SEWA" ? "Rekap_Cuci_Linen_Khusus_Sewa" : "Rekap_Cuci_Linen_Khusus_RS";
  saveAs(blob, `${docName}_${startDate}_${endDate}.xlsx`);
}
