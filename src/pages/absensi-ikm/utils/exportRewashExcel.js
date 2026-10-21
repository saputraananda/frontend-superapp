import XLSXStyle from "xlsx-js-style";

const C = {
  titleBg: "0F172A",
  headerBg: "9A3412",
  sectionBg: "1E293B",
  metaBg: "FFEDD5",
  metaText: "7C2D12",
  alt: "FFF7ED",
  white: "FFFFFF",
  text: "1E293B",
  muted: "64748B",
  border: "CBD5E1",
  totalBg: "FED7AA",
  totalText: "7C2D12",
  qtyText: "C2410C",
  bersihBg: "D1FAE5", bersihText: "065F46",
  kotorBg: "FFE4E6", kotorText: "9F1239",
  sewaBg: "F3E8FF", sewaText: "6B21A8",
  rsBg: "D1FAE5", rsText: "047857",
  cardBg: "F8FAFC",
};

const NUM = "#,##0";
const PCT = "0.0%";

const border = (color = C.border) => ({
  top: { style: "thin", color: { rgb: color } },
  bottom: { style: "thin", color: { rgb: color } },
  left: { style: "thin", color: { rgb: color } },
  right: { style: "thin", color: { rgb: color } },
});

const titleStyle = {
  fill: { fgColor: { rgb: C.titleBg } },
  font: { bold: true, sz: 14, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
};

const metaStyle = {
  fill: { fgColor: { rgb: C.metaBg } },
  font: { sz: 10, color: { rgb: C.metaText }, italic: true, name: "Calibri" },
  alignment: { horizontal: "left", vertical: "center" },
};

const headerStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: border(),
};

const sectionStyle = {
  fill: { fgColor: { rgb: C.sectionBg } },
  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
};

const baseCell = (bg, align = "left", extra = {}) => ({
  fill: { fgColor: { rgb: bg } },
  font: { sz: 10, color: { rgb: C.text }, name: "Calibri", ...(extra.font || {}) },
  alignment: { horizontal: align, vertical: "center", wrapText: true },
  border: border(),
  ...(extra.numFmt ? { numFmt: extra.numFmt } : {}),
});

const numCell = (bg, color = C.text, bold = false) =>
  baseCell(bg, "center", { numFmt: NUM, font: { color: { rgb: color }, bold } });

const pctCell = (bg) => baseCell(bg, "center", { numFmt: PCT });

const totalStyle = (align = "center", numFmt) => ({
  fill: { fgColor: { rgb: C.totalBg } },
  font: { bold: true, sz: 10, color: { rgb: C.totalText }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center" },
  border: { ...border(), top: { style: "medium", color: { rgb: C.headerBg } } },
  ...(numFmt ? { numFmt } : {}),
});

const cell = (v, s) => ({ v: v == null || v === "" ? "-" : v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });
const blank = () => empty({ fill: { fgColor: { rgb: C.white } } });

function fmtDate(v) {
  if (!v) return "-";
  const raw = String(v);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + "T00:00:00" : raw);
  if (isNaN(d)) return raw;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function fmtDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

function colLetter(i) {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const ratio = (part, whole) => (whole > 0 ? part / whole : 0);
const ownerLabel = (o) => (String(o || "").toUpperCase() === "SEWA" ? "Sewa" : "RS");
const linenName = (it) => it.linen_display_name || it.hospital_linen_name || it.master_linen_name || `Linen #${it.hospital_linen_id}`;

function ownerCell(owner) {
  const sewa = owner === "Sewa";
  return {
    v: owner,
    t: "s",
    s: {
      fill: { fgColor: { rgb: sewa ? C.sewaBg : C.rsBg } },
      font: { bold: true, sz: 10, color: { rgb: sewa ? C.sewaText : C.rsText }, name: "Calibri" },
      alignment: { horizontal: "center", vertical: "center" },
      border: border(),
    },
  };
}

function itemStats(items = []) {
  let qty = 0;
  let bersih = 0;
  items.forEach((it) => {
    const q = Number(it.qty) || 0;
    qty += q;
    bersih += Math.min(q, Number(it.clear) || 0);
  });
  return { qty, bersih, kotor: Math.max(0, qty - bersih) };
}

function titleBlock(cols, title, metaLines) {
  const rows = [[
    { v: title, t: "s", s: titleStyle },
    ...Array(cols - 1).fill(empty({ fill: { fgColor: { rgb: C.titleBg } } })),
  ]];
  metaLines.forEach((line) => {
    rows.push([{ v: line, t: "s", s: metaStyle }, ...Array(cols - 1).fill(empty(metaStyle))]);
  });
  rows.push(Array(cols).fill(blank()));
  return rows;
}

function merges(cols, metaCount) {
  const list = [];
  for (let r = 0; r <= metaCount; r++) list.push({ s: { r, c: 0 }, e: { r, c: cols - 1 } });
  return list;
}

function fullRow(r, cols) {
  return { s: { r, c: 0 }, e: { r, c: cols - 1 } };
}

function emptyRow(cols, text) {
  return [
    { v: text, t: "s", s: baseCell(C.white, "center", { font: { italic: true, color: { rgb: C.muted } } }) },
    ...Array(cols - 1).fill(empty(baseCell(C.white))),
  ];
}

function tableSheet({ cols, title, meta, headers, body, widths, totalRow, emptyText }) {
  const wsData = titleBlock(cols, title, meta);
  wsData.push(headers.map((h) => ({ v: h, t: "s", s: headerStyle })));
  const headerRow = wsData.length;
  wsData.push(...body);
  if (!body.length) wsData.push(emptyRow(cols, emptyText));
  else if (totalRow) wsData.push(totalRow.cells);

  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
  ws["!merges"] = merges(cols, meta.length);
  if (!body.length) ws["!merges"].push(fullRow(wsData.length - 1, cols));
  else if (totalRow?.labelSpan > 1) {
    const r = wsData.length - 1;
    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: totalRow.labelSpan - 1 } });
  }
  ws["!cols"] = widths.map((wpx) => ({ wpx }));
  const rowsH = [{ hpx: 28 }, ...meta.map(() => ({ hpx: 18 })), { hpx: 8 }, { hpx: 32 }];
  if (body.length && totalRow) rowsH[wsData.length - 1] = { hpx: 22 };
  ws["!rows"] = rowsH;
  ws["!views"] = [{ state: "frozen", ySplit: headerRow }];
  ws["!autofilter"] = { ref: `A${headerRow}:${colLetter(cols - 1)}${headerRow + Math.max(body.length, 1)}` };
  return ws;
}

function totalCells(labelSpan, label, rest) {
  return [
    { v: label, t: "s", s: totalStyle("right") },
    ...Array(labelSpan - 1).fill(empty(totalStyle())),
    ...rest.map(([v, fmt, align]) => (v === null
      ? empty(totalStyle())
      : { v, t: typeof v === "number" ? "n" : "s", s: totalStyle(align || "center", fmt) })),
  ];
}

// ─── Sheet 1: Ringkasan ───────────────────────────────────────────────────────
function buildSummarySheet({ rows, meta, totals }) {
  const COLS = 8;
  const wsData = titleBlock(COLS, "LAPORAN LINEN REWASH — IKM", meta);
  const mergeList = merges(COLS, meta.length);
  const rowH = [{ hpx: 28 }, ...meta.map(() => ({ hpx: 18 })), { hpx: 8 }];

  const section = (text) => {
    mergeList.push(fullRow(wsData.length, COLS));
    rowH[wsData.length] = { hpx: 24 };
    wsData.push([{ v: text, t: "s", s: sectionStyle }, ...Array(COLS - 1).fill(empty(sectionStyle))]);
  };

  section("RINGKASAN UMUM");

  const cards = [
    { label: "Total Laporan", value: totals.laporan, color: C.text, sub: `${totals.rs} rumah sakit` },
    { label: "Total Qty Rewash", value: totals.qty, color: C.qtyText, sub: `${totals.items} baris linen` },
    { label: "Bersih", value: totals.bersih, color: C.bersihText, sub: ratio(totals.bersih, totals.qty), pct: true },
    { label: "Kotor (Belum Bersih)", value: totals.kotor, color: C.kotorText, sub: ratio(totals.kotor, totals.qty), pct: true },
  ];
  const cardBorder = border("E2E8F0");
  const labelRow = [];
  const valueRow = [];
  const subRow = [];
  cards.forEach((c) => {
    const lbl = {
      fill: { fgColor: { rgb: C.cardBg } },
      font: { bold: true, sz: 9, color: { rgb: C.muted }, name: "Calibri" },
      alignment: { horizontal: "center", vertical: "bottom" },
      border: cardBorder,
    };
    const val = {
      fill: { fgColor: { rgb: C.cardBg } },
      font: { bold: true, sz: 20, color: { rgb: c.color }, name: "Calibri" },
      alignment: { horizontal: "center", vertical: "center" },
      border: cardBorder,
      numFmt: NUM,
    };
    const sub = {
      fill: { fgColor: { rgb: C.cardBg } },
      font: { sz: 9, italic: true, color: { rgb: C.muted }, name: "Calibri" },
      alignment: { horizontal: "center", vertical: "top" },
      border: cardBorder,
      ...(c.pct ? { numFmt: '0.0"% dari total qty"' } : {}),
    };
    labelRow.push({ v: c.label.toUpperCase(), t: "s", s: lbl }, empty(lbl));
    valueRow.push({ v: c.value, t: "n", s: val }, empty(val));
    subRow.push(
      c.pct ? { v: c.sub * 100, t: "n", s: sub } : { v: c.sub, t: "s", s: sub },
      empty(sub),
    );
  });
  [labelRow, valueRow, subRow].forEach((row, idx) => {
    const r = wsData.length;
    for (let k = 0; k < cards.length; k++) mergeList.push({ s: { r, c: k * 2 }, e: { r, c: k * 2 + 1 } });
    rowH[r] = { hpx: [22, 36, 20][idx] };
    wsData.push(row);
  });

  rowH[wsData.length] = { hpx: 12 };
  wsData.push(Array(COLS).fill(blank()));

  section("REKAP PER RUMAH SAKIT");

  const byRS = new Map();
  rows.forEach((r) => {
    const key = r.hospital_id ?? r.hospital_name ?? "-";
    if (!byRS.has(key)) byRS.set(key, { name: r.hospital_name || "-", laporan: 0, linen: new Set(), qty: 0, bersih: 0, kotor: 0 });
    const g = byRS.get(key);
    const s = itemStats(r.items);
    g.laporan += 1;
    (r.items || []).forEach((it) => g.linen.add(it.hospital_linen_id));
    g.qty += s.qty;
    g.bersih += s.bersih;
    g.kotor += s.kotor;
  });
  const rsRows = [...byRS.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));

  rowH[wsData.length] = { hpx: 30 };
  wsData.push(["No", "Rumah Sakit", "Jumlah Laporan", "Jenis Linen", "Total Qty", "Bersih", "Kotor", "% Bersih"]
    .map((h) => ({ v: h, t: "s", s: headerStyle })));

  rsRows.forEach((g, i) => {
    const bg = i % 2 === 1 ? C.alt : C.white;
    wsData.push([
      cell(i + 1, baseCell(bg, "center")),
      cell(g.name, baseCell(bg)),
      cell(g.laporan, numCell(bg)),
      cell(g.linen.size, numCell(bg)),
      cell(g.qty, numCell(bg, C.qtyText, true)),
      cell(g.bersih, numCell(bg, C.bersihText, true)),
      cell(g.kotor, numCell(bg, C.kotorText, true)),
      cell(ratio(g.bersih, g.qty), pctCell(bg)),
    ]);
  });

  if (!rsRows.length) {
    mergeList.push(fullRow(wsData.length, COLS));
    wsData.push(emptyRow(COLS, "Tidak ada data untuk filter ini"));
  } else {
    const r = wsData.length;
    mergeList.push({ s: { r, c: 0 }, e: { r, c: 1 } });
    rowH[r] = { hpx: 22 };
    wsData.push(totalCells(2, "TOTAL", [
      [totals.laporan, NUM], [null], [totals.qty, NUM], [totals.bersih, NUM], [totals.kotor, NUM],
      [ratio(totals.bersih, totals.qty), PCT],
    ]));
  }

  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
  ws["!merges"] = mergeList;
  ws["!cols"] = [48, 240, 110, 100, 110, 110, 110, 100].map((wpx) => ({ wpx }));
  ws["!rows"] = rowH;
  return ws;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function exportRewashExcel({
  rows = [],
  startDate,
  endDate,
  filterLabel = "Semua data",
}) {
  const periodStr = startDate && endDate ? `${fmtDate(startDate)} s.d. ${fmtDate(endDate)}` : "–";

  const flat = [];
  rows.forEach((r, ri) => (r.items || []).forEach((it) => flat.push({ r, it, ri })));
  const sum = itemStats(flat.map((f) => f.it));
  const totals = {
    laporan: rows.length,
    items: flat.length,
    rs: new Set(rows.map((r) => r.hospital_id ?? r.hospital_name)).size,
    ...sum,
  };

  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}  ·  ${totals.laporan} laporan  ·  ${totals.qty.toLocaleString("id-ID")} pcs`;
  const meta = [`Periode : ${periodStr}`, `Filter  : ${filterLabel}`, exportedAt];

  // ── Sheet 2: Laporan (per header) ──
  const lapHeaders = [
    "No", "Tanggal", "Pelapor", "Rumah Sakit", "Jenis Linen", "Total Qty",
    "Bersih", "Kotor", "% Bersih", "Catatan", "Diinput Oleh", "Diinput Pada",
  ];
  const lapBody = rows.map((r, i) => {
    const bg = i % 2 === 1 ? C.alt : C.white;
    const s = itemStats(r.items);
    return [
      cell(i + 1, baseCell(bg, "center")),
      cell(fmtDate(r.report_date), baseCell(bg, "center")),
      cell(r.reporter_name, baseCell(bg)),
      cell(r.hospital_name, baseCell(bg)),
      cell((r.items || []).length, numCell(bg)),
      cell(s.qty, numCell(bg, C.qtyText, true)),
      cell(s.bersih, numCell(bg, C.bersihText, true)),
      cell(s.kotor, numCell(bg, C.kotorText, true)),
      cell(ratio(s.bersih, s.qty), pctCell(bg)),
      cell(r.notes, baseCell(bg)),
      cell(r.reporter_employee_name, baseCell(bg)),
      cell(fmtDateTime(r.created_at), baseCell(bg, "center")),
    ];
  });
  const wsLaporan = tableSheet({
    cols: lapHeaders.length,
    title: "DAFTAR LAPORAN LINEN REWASH",
    meta,
    headers: lapHeaders,
    body: lapBody,
    widths: [40, 100, 170, 200, 80, 85, 85, 85, 80, 260, 160, 130],
    emptyText: "Tidak ada data untuk filter ini",
    totalRow: {
      labelSpan: 4,
      cells: totalCells(4, "TOTAL", [
        [totals.items, NUM], [totals.qty, NUM], [totals.bersih, NUM], [totals.kotor, NUM],
        [ratio(totals.bersih, totals.qty), PCT], [null], [null], [null],
      ]),
    },
  });

  // ── Sheet 3: Detail Linen (per item, banding per laporan) ──
  const detHeaders = [
    "No", "Tanggal", "Pelapor", "Rumah Sakit", "Nama Linen", "Kepemilikan",
    "Qty", "Bersih", "Kotor", "% Bersih", "Catatan Linen", "Catatan Laporan",
  ];
  const detBody = flat.map(({ r, it, ri }, i) => {
    const bg = ri % 2 === 1 ? C.alt : C.white;
    const q = Number(it.qty) || 0;
    const b = Math.min(q, Number(it.clear) || 0);
    return [
      cell(i + 1, baseCell(bg, "center")),
      cell(fmtDate(r.report_date), baseCell(bg, "center")),
      cell(r.reporter_name, baseCell(bg)),
      cell(r.hospital_name, baseCell(bg)),
      cell(linenName(it), baseCell(bg, "left", { font: { bold: true } })),
      ownerCell(ownerLabel(it.ownership_type)),
      cell(q, numCell(bg, C.qtyText, true)),
      cell(b, numCell(bg, C.bersihText, true)),
      cell(Math.max(0, q - b), numCell(bg, C.kotorText, true)),
      cell(ratio(b, q), pctCell(bg)),
      cell(it.detail_notes, baseCell(bg)),
      cell(r.notes, baseCell(bg)),
    ];
  });
  const wsDetail = tableSheet({
    cols: detHeaders.length,
    title: "DETAIL LINEN REWASH PER LAPORAN",
    meta,
    headers: detHeaders,
    body: detBody,
    widths: [40, 100, 160, 190, 260, 90, 70, 70, 70, 80, 220, 220],
    emptyText: "Tidak ada data linen untuk filter ini",
    totalRow: {
      labelSpan: 6,
      cells: totalCells(6, "TOTAL", [
        [totals.qty, NUM], [totals.bersih, NUM], [totals.kotor, NUM],
        [ratio(totals.bersih, totals.qty), PCT], [null], [null],
      ]),
    },
  });

  // ── Sheet 4: Rekap per jenis linen ──
  const byLinen = new Map();
  flat.forEach(({ r, it }) => {
    const owner = ownerLabel(it.ownership_type);
    const name = linenName(it);
    const key = `${name}__${owner}`;
    if (!byLinen.has(key)) byLinen.set(key, { name, owner, laporan: new Set(), rs: new Set(), qty: 0, bersih: 0 });
    const g = byLinen.get(key);
    const q = Number(it.qty) || 0;
    g.laporan.add(r.id);
    g.rs.add(r.hospital_id ?? r.hospital_name);
    g.qty += q;
    g.bersih += Math.min(q, Number(it.clear) || 0);
  });
  const linenRows = [...byLinen.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));

  const rekHeaders = [
    "No", "Nama Linen", "Kepemilikan", "Frekuensi Laporan", "Jumlah RS",
    "Total Qty", "Bersih", "Kotor", "% Bersih", "Kontribusi Qty",
  ];
  const rekBody = linenRows.map((g, i) => {
    const bg = i % 2 === 1 ? C.alt : C.white;
    const kotor = Math.max(0, g.qty - g.bersih);
    return [
      cell(i + 1, baseCell(bg, "center")),
      cell(g.name, baseCell(bg, "left", { font: { bold: true } })),
      ownerCell(g.owner),
      cell(g.laporan.size, numCell(bg)),
      cell(g.rs.size, numCell(bg)),
      cell(g.qty, numCell(bg, C.qtyText, true)),
      cell(g.bersih, numCell(bg, C.bersihText, true)),
      cell(kotor, numCell(bg, C.kotorText, true)),
      cell(ratio(g.bersih, g.qty), pctCell(bg)),
      cell(ratio(g.qty, totals.qty), pctCell(bg)),
    ];
  });
  const wsRekap = tableSheet({
    cols: rekHeaders.length,
    title: "REKAP LINEN REWASH PER JENIS LINEN",
    meta,
    headers: rekHeaders,
    body: rekBody,
    widths: [40, 280, 90, 100, 80, 90, 80, 80, 80, 95],
    emptyText: "Tidak ada data linen untuk filter ini",
    totalRow: {
      labelSpan: 5,
      cells: totalCells(5, "TOTAL", [
        [totals.qty, NUM], [totals.bersih, NUM], [totals.kotor, NUM],
        [ratio(totals.bersih, totals.qty), PCT], [totals.qty ? 1 : 0, PCT],
      ]),
    },
  });

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, buildSummarySheet({ rows, meta, totals }), "Ringkasan");
  XLSXStyle.utils.book_append_sheet(wb, wsLaporan, "Laporan");
  XLSXStyle.utils.book_append_sheet(wb, wsDetail, "Detail Linen");
  XLSXStyle.utils.book_append_sheet(wb, wsRekap, "Rekap Jenis Linen");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `linen_rewash_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
