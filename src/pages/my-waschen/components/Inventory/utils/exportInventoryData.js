import ExcelJS from "exceljs";

const MAROON = "FF5F1340";
const MAROON_SOFT = "FF7A2458";
const CREAM = "FFF8F4F7";
const ZEBRA = "FFFBF7F9";
const RED_FILL = "FFFECACA";
const RED_FONT = "FF9F1239";
const LINE = "FFE7D5DE";
const TEXT = "FF1E293B";
const MUTED = "FF64748B";

const thin = {
  top: { style: "thin", color: { argb: LINE } },
  left: { style: "thin", color: { argb: LINE } },
  bottom: { style: "thin", color: { argb: LINE } },
  right: { style: "thin", color: { argb: LINE } },
};

function paint(cell, { fill, font, align = "center", wrap = false } = {}) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  cell.font = font;
  cell.alignment = { horizontal: align, vertical: "middle", wrapText: wrap };
  cell.border = thin;
}

function qtyNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function setQty(cell, n) {
  const rounded = Math.round(n * 100) / 100;
  const whole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  cell.value = whole ? Math.round(rounded) : rounded;
  cell.numFmt = whole ? "#,##0" : "0.00";
}

function belowMin(qty, min) {
  return min > 0 && qty < min;
}

function outletLabel(o) {
  return o.name || o.full_name || o.outlet_code || `Outlet ${o.outlet_id}`;
}

/**
 * Excel: No | Nama | Min Stock | Satuan | Cabang (qty_current per outlet).
 * Sel merah bila qty_current di bawah min_stock outlet tersebut.
 */
export async function exportInventoryData({ outlets = [], catalog = [], stockRows = [] }) {
  const outletList = [...outlets].sort((a, b) => Number(a.outlet_id) - Number(b.outlet_id));
  const byItem = new Map();
  for (const row of stockRows) {
    const itemId = Number(row.item_id);
    if (!byItem.has(itemId)) byItem.set(itemId, new Map());
    byItem.get(itemId).set(Number(row.outlet_id), row);
  }

  const items = [...catalog].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id"));
  const wb = new ExcelJS.Workbook();
  wb.creator = "Waschen Alora";
  const lastCol = 4 + Math.max(outletList.length, 1);
  const ws = wb.addWorksheet("Stok", {
    views: [{ state: "frozen", ySplit: 4, xSplit: 2, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });

  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = "Stok Barang per Cabang";
  paint(title, {
    fill: MAROON,
    font: { bold: true, size: 16, color: { argb: "FFFFFFFF" }, name: "Calibri" },
    align: "center",
  });
  ws.getRow(1).height = 28;

  const stampLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  ws.mergeCells(2, 1, 2, lastCol);
  const note = ws.getCell(2, 1);
  note.value = `Sisa stok saat ini  ·  ${stampLabel}  ·  sel merah = di bawah min stock`;
  paint(note, {
    fill: CREAM,
    font: { size: 10, italic: true, color: { argb: MUTED }, name: "Calibri" },
    align: "left",
  });
  ws.getRow(2).height = 20;

  const fixed = ["No", "Nama", "Min Stock", "Satuan"];
  fixed.forEach((label, i) => {
    ws.mergeCells(3, i + 1, 4, i + 1);
    ws.getCell(3, i + 1).value = label;
  });
  if (outletList.length) {
    ws.mergeCells(3, 5, 3, 4 + outletList.length);
    ws.getCell(3, 5).value = "Cabang";
    outletList.forEach((o, i) => {
      ws.getCell(4, 5 + i).value = outletLabel(o);
    });
  } else {
    ws.getCell(3, 5).value = "Cabang";
  }

  const headFont = { bold: true, size: 10, color: { argb: "FFFFFFFF" }, name: "Calibri" };
  for (let col = 1; col <= lastCol; col += 1) {
    paint(ws.getCell(3, col), { fill: MAROON, font: headFont, wrap: true });
    paint(ws.getCell(4, col), {
      fill: col <= 4 ? MAROON : MAROON_SOFT,
      font: { ...headFont, size: 9 },
      wrap: true,
    });
  }
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 32;

  items.forEach((item, index) => {
    const rowNo = index + 5;
    const zebra = index % 2 === 1;
    const baseFill = zebra ? ZEBRA : "FFFFFFFF";
    const cells = byItem.get(Number(item.id));
    let minShown = 0;
    if (cells) {
      for (const stock of cells.values()) {
        const n = qtyNum(stock.min_stock);
        if (n > minShown) minShown = n;
      }
    }
    const values = [index + 1, item.name || "", minShown, item.unit || ""];
    values.forEach((value, i) => {
      const cell = ws.getCell(rowNo, i + 1);
      cell.value = value;
      if (i === 2) setQty(cell, value);
      paint(cell, {
        fill: baseFill,
        font: { size: 10, bold: i === 1, color: { argb: TEXT }, name: "Calibri" },
        align: i === 1 ? "left" : "center",
      });
    });

    outletList.forEach((o, i) => {
      const cell = ws.getCell(rowNo, 5 + i);
      const stock = cells?.get(Number(o.outlet_id));
      if (!stock) {
        cell.value = "—";
        paint(cell, { fill: baseFill, font: { size: 10, color: { argb: "FFCBD5E1" }, name: "Calibri" } });
        return;
      }
      const qty = qtyNum(stock.qty_current);
      const min = qtyNum(stock.min_stock);
      setQty(cell, qty);
      if (belowMin(qty, min)) {
        paint(cell, { fill: RED_FILL, font: { size: 10, bold: true, color: { argb: RED_FONT }, name: "Calibri" } });
      } else {
        paint(cell, { fill: baseFill, font: { size: 10, color: { argb: TEXT }, name: "Calibri" } });
      }
    });
    ws.getRow(rowNo).height = 20;
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 34;
  ws.getColumn(3).width = 13;
  ws.getColumn(4).width = 12;
  for (let i = 0; i < outletList.length; i += 1) ws.getColumn(5 + i).width = 15;
  ws.pageSetup.printTitlesRow = "1:4";

  const stamp = new Date().toISOString().slice(0, 10);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `stok_inventory_${stamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
