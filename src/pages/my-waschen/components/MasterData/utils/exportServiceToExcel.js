import ExcelJS from "exceljs";

const MAROON = "FF5F1340";
const CREAM = "FFF8F4F7";
const ZEBRA = "FFFBF7F9";
const AMBER = "FFFEF3C7";
const AMBER_FONT = "FF92400E";
const LINE = "FFE7D5DE";
const TEXT = "FF1E293B";
const MUTED = "FF64748B";

const thin = {
  top: { style: "thin", color: { argb: LINE } },
  left: { style: "thin", color: { argb: LINE } },
  bottom: { style: "thin", color: { argb: LINE } },
  right: { style: "thin", color: { argb: LINE } },
};

const HEADERS = [
  "No",
  "Kode",
  "Nama Layanan",
  "Kategori",
  "Satuan",
  "Tarif",
  "Durasi (Hari)",
  "Min. Order",
  "Metode DC",
  "Tambahan jika DC",
  "Status",
];

function paint(cell, { fill, font, align = "center", wrap = false } = {}) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  cell.font = font;
  cell.alignment = { horizontal: align, vertical: "middle", wrapText: wrap };
  cell.border = thin;
}

function setNum(cell, n) {
  const rounded = Math.round(n * 100) / 100;
  const whole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  cell.value = whole ? Math.round(rounded) : rounded;
  cell.numFmt = whole ? "#,##0" : "0.00";
}

export async function exportServiceToExcel(rows = []) {
  const lastCol = HEADERS.length;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Waschen Alora";
  const ws = wb.addWorksheet("Layanan", {
    views: [{ state: "frozen", ySplit: 3, xSplit: 3, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });

  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = "Katalog Layanan Laundry";
  paint(title, {
    fill: MAROON,
    font: { bold: true, size: 16, color: { argb: "FFFFFFFF" }, name: "Calibri" },
    align: "center",
  });
  ws.getRow(1).height = 28;

  const stampLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  ws.mergeCells(2, 1, 2, lastCol);
  const note = ws.getCell(2, 1);
  note.value = `${rows.length} layanan  ·  ${stampLabel}  ·  Wajib DC terkunci  ·  tambahan harga hanya jika kasir memilih DC`;
  paint(note, {
    fill: CREAM,
    font: { size: 10, italic: true, color: { argb: MUTED }, name: "Calibri" },
    align: "left",
  });
  ws.getRow(2).height = 20;

  const headFont = { bold: true, size: 10, color: { argb: "FFFFFFFF" }, name: "Calibri" };
  HEADERS.forEach((label, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value = label;
    paint(cell, { fill: MAROON, font: headFont, wrap: true });
  });
  ws.getRow(3).height = 24;
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: lastCol } };

  rows.forEach((item, index) => {
    const rowNo = index + 4;
    const active = Number(item.is_active) === 1;
    const wajib = Number(item.is_dc_required) === 1;
    const add = Number(item.dc_price_add);
    const hasAdd = !wajib && Number.isFinite(add) && add > 0;
    const baseFill = index % 2 === 1 ? ZEBRA : "FFFFFFFF";
    const fontColor = active ? TEXT : MUTED;
    const values = [
      index + 1,
      item.code || "",
      item.name || "",
      item.category_name || "",
      item.unit || item.unit_symbol || "",
      Number(item.price) || 0,
      Number(item.regular_duration_days) || 0,
      Number(item.min_order_qty) || 0,
      wajib ? "Wajib DC" : "Bebas",
      hasAdd ? add : null,
      active ? "Aktif" : "Nonaktif",
    ];

    values.forEach((value, i) => {
      const cell = ws.getCell(rowNo, i + 1);
      const numeric = i === 5 || i === 6 || i === 7 || (i === 9 && value != null);
      if (i === 9 && value == null) cell.value = "—";
      else if (numeric) setNum(cell, value);
      else cell.value = value;

      const left = i === 2 || i === 3;
      let fill = baseFill;
      let color = fontColor;
      let bold = i === 2;
      if (i === 8 && wajib) {
        fill = AMBER;
        color = AMBER_FONT;
        bold = true;
      }
      paint(cell, {
        fill,
        font: { size: 10, bold, color: { argb: color }, name: "Calibri" },
        align: left ? "left" : "center",
      });
    });
    ws.getRow(rowNo).height = 20;
  });

  const widths = [6, 16, 38, 28, 12, 14, 14, 13, 14, 18, 12];
  widths.forEach((width, i) => {
    ws.getColumn(i + 1).width = width;
  });
  ws.pageSetup.printTitlesRow = "1:3";

  const stamp = new Date().toISOString().slice(0, 10);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `katalog_layanan_${stamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
