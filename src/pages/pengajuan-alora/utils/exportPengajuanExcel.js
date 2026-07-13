import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  headerBg:    "1E3A5F",
  titleBg:     "0F172A",
  metaBg:      "E0F2FE",
  metaText:    "0C4A6E",
  altRowBg:    "F0F9FF",
  whiteBg:     "FFFFFF",
  textDark:    "1E293B",
  textGray:    "64748B",
  borderColor: "CBD5E1",
  emerald:     "059669",
  emeraldBg:   "D1FAE5",
  emeraldText: "065F46",
  amberBg:     "FEF3C7",
  amberText:   "92400E",
  roseBg:      "FFE4E6",
  roseText:    "9F1239",
  violetBg:    "F3E8FF",
  violetText:  "7C3AED",
  cyanBg:      "ECFEFF",
  cyanText:    "0E7490",
  indigoBg:    "E0E7FF",
  indigoText:  "3730A3",
  // Aging colors
  aging0_30_bg:  "92D050", // green
  aging31_60_bg: "FFFF00", // yellow
  aging61_90_bg: "FFC0CB", // pink
  aging90_bg:    "FF0000", // red
};

// ─── Style factories ─────────────────────────────────────────────────────────
const border = () => ({
  top:    { style: "thin", color: { rgb: C.borderColor } },
  bottom: { style: "thin", color: { rgb: C.borderColor } },
  left:   { style: "thin", color: { rgb: C.borderColor } },
  right:  { style: "thin", color: { rgb: C.borderColor } },
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

const makeCellStyle = (isAlt, align = "left") => ({
  fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
  font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center", wrapText: false },
  border: border(),
});

const summaryLabelStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "right", vertical: "center" },
  border: border(),
};

const summaryValueStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
  border: border(),
};

const summaryEmptyStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  border: border(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const numCell = (v, s) => ({ v: Number(v) || 0, t: "n", s });
const empty = (s) => ({ v: "", t: "s", s });

function fmtDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function fmtRp(v) {
  const n = Number(v) || 0;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function toTitleCase(str) {
  if (!str) return "-";
  return String(str).toLowerCase().replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
}

const STATUS_LABELS = {
  1: "Telah Diajukan",
  2: "Disetujui Supervisor",
  3: "Disetujui Direktur",
  4: "PR Ready",
  5: "Menunggu Bayar",
  6: "Terbayar",
  7: "Selesai",
  9: "Ditolak",
};

function getAgingDays(row) {
  // Aging dihitung dari tanggal approve finance (paid_at) sampai hari ini
  if (row.payment_method !== "kredit" || !row.paid_at) return null;
  const paidDate = new Date(row.paid_at);
  if (Number.isNaN(paidDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  paidDate.setHours(0, 0, 0, 0);
  return Math.floor((today - paidDate) / 86400000);
}

function getAgingBucket(days) {
  if (days === null || days === undefined) return null;
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return ">90";
}

// ─── Main export function ─────────────────────────────────────────────────────
export function exportPengajuanExcel({ records, periodLabel, filters }) {
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

  const filterParts = [];
  if (filters?.type) filterParts.push(`Tipe: ${filters.type}`);
  if (filters?.status) filterParts.push(`Status: ${STATUS_LABELS[filters.status] || filters.status}`);
  if (filters?.payment_method) filterParts.push(`Metode: ${filters.payment_method}`);
  const filterLabel = filterParts.length > 0 ? filterParts.join("  |  ") : "Semua data";

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1: Detail Pengajuan
  // ══════════════════════════════════════════════════════════════════════════
  const COLS = [
    "#", "Kode PR", "Tipe", "Pengaju", "Departemen", "Kategori", "Outlet",
    "Nama Barang", "Merk", "Qty", "Satuan", "Estimasi Harga", "Total Estimasi",
    "Alasan Pembelian", "Status", "Tgl Pengajuan",
    "Vendor/Link", "Vendor Mode",
    "Metode Bayar", "Klasifikasi", "Nominal Bayar", "Biaya Admin", "Total Bayar Aktual", "Termin", "Jatuh Tempo",
    "Tgl Approve SPV", "Tgl Approve GA", "Tgl Approve Finance", "Tgl Bayar", "Tgl Selesai",
    "Aging (Hari)", "Aging Bucket",
  ];
  const TOTAL_COLS = COLS.length;

  const wsData = [];

  // Title + meta
  wsData.push([cell("Laporan Pengajuan Barang & Reimburse", titleStyle), ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle))]);
  wsData.push([cell(`Periode: ${periodLabel || "Semua"}`, metaStyle), ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle))]);
  wsData.push([cell(`Filter: ${filterLabel}`, metaStyle), ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle))]);
  wsData.push([cell(exportedAt, metaStyle), ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle))]);
  wsData.push(Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  // Header row
  wsData.push(COLS.map(h => cell(h, headerStyle)));

  // Data rows
  records.forEach((row, idx) => {
    const isAlt = idx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csC = makeCellStyle(isAlt, "center");
    const csR = makeCellStyle(isAlt, "right");

    const finalQty = row.ga_qty ? Number(row.ga_qty) : Number(row.qty);
    const totalEst = row.estimasi_harga ? Number(row.estimasi_harga) * finalQty : 0;
    const agingDays = getAgingDays(row);
    const agingBucket = getAgingBucket(agingDays);

    const vendorDisplay = row.vendor_mode === "link"
      ? (row.link_title || "-")
      : (row.vendor || "-");

    const terminDisplay = row.termin_value && row.termin_unit
      ? `${row.termin_value} ${row.termin_unit}`
      : "-";

    wsData.push([
      cell(idx + 1, { ...csC, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(row.pr_code || "-", cs),
      cell(row.type === "reimburse" ? "Reimburse" : "Pengajuan", csC),
      cell(toTitleCase(row.pengaju_name), cs),
      cell(toTitleCase(row.department_name), cs),
      cell(row.company_name || "-", cs),
      cell(Number(row.company_id) === 5 && !row.outlet_name ? "Seluruh Outlet" : (row.outlet_name || "-"), cs),
      cell(toTitleCase(row.nama_barang), cs),
      cell(row.ga_merk || row.merk || "-", cs),
      numCell(finalQty, csC),
      cell(row.satuan_name || "-", csC),
      cell(fmtRp(row.estimasi_harga), csR),
      cell(fmtRp(totalEst), { ...csR, font: { bold: true, sz: 10, color: { rgb: C.emerald }, name: "Calibri" } }),
      cell(row.alasan_pembelian || "-", cs),
      cell(STATUS_LABELS[row.status] || String(row.status), csC),
      cell(fmtDate(row.tanggal_pengajuan), csC),
      cell(vendorDisplay, cs),
      cell(row.vendor_mode || "-", csC),
      cell(row.payment_method ? (row.payment_method === "kredit" ? "Kredit" : "Cash") : "-", csC),
      cell(row.classification_name || "-", csC),
      cell(row.nominal_bayar ? fmtRp(row.nominal_bayar) : "-", csR),
      cell(row.admin_fee ? fmtRp(row.admin_fee) : "-", csR),
      cell((Number(row.nominal_bayar) || Number(row.admin_fee)) ? fmtRp((Number(row.nominal_bayar) || 0) + (Number(row.admin_fee) || 0)) : "-", csR),
      cell(terminDisplay, csC),
      cell(row.jatuh_tempo ? fmtDate(row.jatuh_tempo) : "-", csC),
      cell(fmtDate(row.approved_spv_at), csC),
      cell(fmtDate(row.approved_ga_at), csC),
      cell(fmtDate(row.approved_finance_at), csC),
      cell(fmtDate(row.paid_at), csC),
      cell(fmtDate(row.completed_at), csC),
      cell(agingDays !== null ? agingDays : "-", csC),
      cell(agingBucket || "-", csC),
    ]);
  });

  // Summary row
  const totalNominal = records.reduce((sum, r) => {
    const q = r.ga_qty ? Number(r.ga_qty) : Number(r.qty);
    return sum + (Number(r.estimasi_harga) || 0) * q;
  }, 0);

  const totalNominalBayar = records.reduce((sum, r) => {
    return sum + (Number(r.nominal_bayar) || 0);
  }, 0);

  const totalAdminFee = records.reduce((sum, r) => {
    return sum + (Number(r.admin_fee) || 0);
  }, 0);

  const totalActualPay = records.reduce((sum, r) => {
    return sum + (Number(r.nominal_bayar) || 0) + (Number(r.admin_fee) || 0);
  }, 0);

  const summaryRow = Array.from({ length: TOTAL_COLS }, () => empty(summaryEmptyStyle));
  summaryRow[11] = cell("TOTAL:", summaryLabelStyle);
  summaryRow[12] = cell(fmtRp(totalNominal), summaryValueStyle);
  summaryRow[20] = cell(fmtRp(totalNominalBayar), summaryValueStyle);
  summaryRow[21] = cell(fmtRp(totalAdminFee), summaryValueStyle);
  summaryRow[22] = cell(fmtRp(totalActualPay), summaryValueStyle);
  summaryRow[0] = cell(`${records.length} data`, summaryValueStyle);
  wsData.push(summaryRow);

  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
  ];
  ws["!cols"] = [
    { wch: 5 }, { wch: 18 }, { wch: 11 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
    { wch: 24 }, { wch: 14 }, { wch: 7 }, { wch: 8 }, { wch: 16 }, { wch: 16 },
    { wch: 30 }, { wch: 16 }, { wch: 14 },
    { wch: 20 }, { wch: 10 },
    { wch: 11 }, { wch: 11 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 10 },
  ];
  ws["!rows"] = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 26 }];

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2: Aging Summary (hanya kredit)
  // ══════════════════════════════════════════════════════════════════════════
  const kreditRows = records.filter(r => r.payment_method === "kredit" && r.paid_at);

  const agingData = { "0-30": [], "31-60": [], "61-90": [], ">90": [] };
  kreditRows.forEach(row => {
    const days = getAgingDays(row);
    const bucket = getAgingBucket(days);
    if (bucket && agingData[bucket]) agingData[bucket].push(row);
  });

  const AGING_COLS = 8;
  const ws2Data = [];

  // Title
  ws2Data.push([cell("AGING SUMMARY — PURCHASE REQUEST (KREDIT)", titleStyle), ...Array.from({ length: AGING_COLS - 1 }, () => empty(titleStyle))]);
  ws2Data.push([cell(`Periode: ${periodLabel || "Semua"}`, metaStyle), ...Array.from({ length: AGING_COLS - 1 }, () => empty(metaStyle))]);
  ws2Data.push([cell(exportedAt, metaStyle), ...Array.from({ length: AGING_COLS - 1 }, () => empty(metaStyle))]);
  ws2Data.push(Array.from({ length: AGING_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  // Aging summary header
  const agingHdrStyle = (bg) => ({
    fill: { fgColor: { rgb: bg } },
    font: { bold: true, sz: 12, color: { rgb: "000000" }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  });

  ws2Data.push([
    cell("Bucket", headerStyle),
    cell("Jumlah PR", headerStyle),
    cell("Total Nominal", headerStyle),
    empty(headerStyle), empty(headerStyle), empty(headerStyle), empty(headerStyle), empty(headerStyle),
  ]);

  // Aging group header row (colored)
  ws2Data.push([
    cell("0-30", agingHdrStyle(C.aging0_30_bg)),
    cell("31-60", agingHdrStyle(C.aging31_60_bg)),
    cell("61-90", agingHdrStyle(C.aging61_90_bg)),
    cell(">90", agingHdrStyle(C.aging90_bg)),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
  ]);

  // Aging nominal row
  const agingNominalStyle = (bg) => ({
    fill: { fgColor: { rgb: bg } },
    font: { bold: true, sz: 11, color: { rgb: C.textDark }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  });

  const calcBucketTotal = (bucket) => agingData[bucket].reduce((s, r) => {
    const q = r.ga_qty ? Number(r.ga_qty) : Number(r.qty);
    return s + (Number(r.estimasi_harga) || 0) * q;
  }, 0);

  ws2Data.push([
    cell(fmtRp(calcBucketTotal("0-30")), agingNominalStyle("D4EDBC")),
    cell(fmtRp(calcBucketTotal("31-60")), agingNominalStyle("FFFFCC")),
    cell(fmtRp(calcBucketTotal("61-90")), agingNominalStyle("FFE4E1")),
    cell(fmtRp(calcBucketTotal(">90")), agingNominalStyle("FFCCCC")),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
  ]);

  // Count row
  ws2Data.push([
    cell(`${agingData["0-30"].length} PR`, makeCellStyle(false, "center")),
    cell(`${agingData["31-60"].length} PR`, makeCellStyle(false, "center")),
    cell(`${agingData["61-90"].length} PR`, makeCellStyle(false, "center")),
    cell(`${agingData[">90"].length} PR`, makeCellStyle(false, "center")),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
    empty({ fill: { fgColor: { rgb: C.whiteBg } } }),
  ]);

  // Spacer
  ws2Data.push(Array.from({ length: AGING_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));
  ws2Data.push(Array.from({ length: AGING_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  // Detail per bucket
  const buckets = ["0-30", "31-60", "61-90", ">90"];
  const bucketColors = { "0-30": C.aging0_30_bg, "31-60": C.aging31_60_bg, "61-90": C.aging61_90_bg, ">90": C.aging90_bg };

  buckets.forEach(bucket => {
    const rows = agingData[bucket];
    const bucketHdr = {
      fill: { fgColor: { rgb: bucketColors[bucket] } },
      font: { bold: true, sz: 11, color: { rgb: "000000" }, name: "Calibri" },
      alignment: { horizontal: "left", vertical: "center" },
      border: border(),
    };

    ws2Data.push([
      cell(`Aging ${bucket} Hari (${rows.length} PR — ${fmtRp(calcBucketTotal(bucket))})`, bucketHdr),
      ...Array.from({ length: AGING_COLS - 1 }, () => empty(bucketHdr)),
    ]);

    if (rows.length === 0) {
      ws2Data.push([cell("Tidak ada data", makeCellStyle(false, "center")), ...Array.from({ length: AGING_COLS - 1 }, () => empty(makeCellStyle(false)))]);
    } else {
      // Sub-header
      ws2Data.push([
        cell("#", headerStyle),
        cell("Kode PR", headerStyle),
        cell("Nama Barang", headerStyle),
        cell("Pengaju", headerStyle),
        cell("Vendor", headerStyle),
        cell("Nominal", headerStyle),
        cell("Tgl Bayar", headerStyle),
        cell("Aging (Hari)", headerStyle),
      ]);

      rows.forEach((r, i) => {
        const isAlt = i % 2 === 1;
        const cs = makeCellStyle(isAlt);
        const csC = makeCellStyle(isAlt, "center");
        const csR = makeCellStyle(isAlt, "right");
        const q = r.ga_qty ? Number(r.ga_qty) : Number(r.qty);
        const nom = (Number(r.estimasi_harga) || 0) * q;
        const days = getAgingDays(r);

        ws2Data.push([
          cell(i + 1, csC),
          cell(r.pr_code || "-", cs),
          cell(toTitleCase(r.nama_barang), cs),
          cell(toTitleCase(r.pengaju_name), cs),
          cell(r.vendor_mode === "link" ? (r.link_title || "-") : (r.vendor || "-"), cs),
          cell(fmtRp(nom), csR),
          cell(fmtDate(r.paid_at), csC),
          cell(days !== null ? days : "-", csC),
        ]);
      });
    }

    // Spacer between buckets
    ws2Data.push(Array.from({ length: AGING_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));
  });

  const ws2 = XLSXStyle.utils.aoa_to_sheet(ws2Data);
  ws2["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: AGING_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: AGING_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: AGING_COLS - 1 } },
  ];
  ws2["!cols"] = [
    { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
  ];
  ws2["!rows"] = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }];

  // ══════════════════════════════════════════════════════════════════════════
  // Build workbook
  // ══════════════════════════════════════════════════════════════════════════
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Detail Pengajuan");
  XLSXStyle.utils.book_append_sheet(wb, ws2, "Aging Summary");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const dateStr = new Date().toISOString().split("T")[0].replaceAll("-", "");
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `laporan_pengajuan_${dateStr}.xlsx`
  );
}
