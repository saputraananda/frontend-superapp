import XLSX from "xlsx-js-style";

export default function exportLinenRumahSakit({ items, hospitalName }) {
  const wsData = [];

  // ── Title row ──
  wsData.push({
    A: { v: `Data Linen - ${hospitalName}`, t: "s", s: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } } },
  });
  // Empty row
  wsData.push({});

  // ── Header row ──
  const HEADERS = ["No", "Nama Linen", "Nama di RS", "Kepemilikan", "Satuan", "Gramasi", "Harga Cuci", "Harga Sewa", "Stok IKM", "Stok RS", "Stok Total"];
  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "991B1B" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top:  { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    },
  };
  const headerRow = {};
  HEADERS.forEach((h, i) => {
    headerRow[XLSX.utils.encode_col(i)] = { v: h, t: "s", s: headerStyle };
  });
  wsData.push(headerRow);

  // ── Data rows ──
  const cellCenter = { alignment: { horizontal: "center", vertical: "center" } };
  const cellLeft   = { alignment: { horizontal: "left", vertical: "center" } };
  const cellBorder = { border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const altFill    = { fill: { fgColor: { rgb: "FEF2F2" } } };

  items.forEach((a, i) => {
    const ownerLabel = a.ownership_type === "MILIK_RS" ? "Milik RS" : a.ownership_type === "SEWA" ? "Sewa" : a.ownership_type;
    const washLabel  = a.washing_price_type === "KG"
      ? `${Number(a.washing_price || 0).toLocaleString("id-ID")}/Kg`
      : Number(a.washing_price || 0).toLocaleString("id-ID");
    const rentLabel  = Number(a.rental_price || 0).toLocaleString("id-ID");

    const nameParts = [
      a.master_linen_name,
      a.size_name,
      a.color_name,
      a.material_name,
    ].filter(Boolean).join(" ");

    const isEven = i % 2 === 1;
    const baseStyle = { ...cellBorder, ...(isEven ? altFill : {}) };

    const row = {};
    const vals = [
      String(i + 1),
      nameParts,
      a.hospital_linen_name || "-",
      ownerLabel,
      a.unit || "-",
      a.grammage ? `${a.grammage}g` : "-",
      washLabel,
      rentLabel,
      String(a.stock_in_ikm ?? 0),
      String(a.stock_in_rs ?? 0),
      String(a.current_stock ?? 0),
    ];
    vals.forEach((v, ci) => {
      row[XLSX.utils.encode_col(ci)] = {
        v,
        t: "s",
        s: { ...baseStyle, ...(ci === 0 ? cellCenter : cellLeft) },
      };
    });
    wsData.push(row);
  });

  // ── Build worksheet ──
  const ws = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(ws, wsData.map(r => {
    const cols = Object.keys(r).sort();
    return cols.map(c => r[c]);
  }), { origin: "A1" });

  // Merge title row across all columns
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }];

  // ── Column widths ──
  ws["!cols"] = [
    { wch: 5 },   // No
    { wch: 40 },  // Nama Linen
    { wch: 25 },  // Nama di RS
    { wch: 14 },  // Kepemilikan
    { wch: 10 },  // Satuan
    { wch: 12 },  // Gramasi
    { wch: 18 },  // Harga Cuci
    { wch: 18 },  // Harga Sewa
    { wch: 12 },  // Stok IKM
    { wch: 12 },  // Stok RS
    { wch: 12 },  // Stok Total
  ];

  // ── Row heights ──
  ws["!rows"] = [
    { hpt: 36 },  // Title
    { hpt: 6 },   // Spacer
    { hpt: 28 },  // Header
  ];

  // ── Generate & download ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Linen RS");
  const safeName = (hospitalName || "Rumah Sakit").replace(/[^a-zA-Z0-9\s_-]/g, "").trim().replace(/\s+/g, "_");
  XLSX.writeFile(wb, `Linen_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
