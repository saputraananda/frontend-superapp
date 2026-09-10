import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { BASE_URL } from "../../../lib/api";

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

function fmtKg(v) {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })} Kg`;
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtRp(v) {
  const n = toNumber(v);
  if (n === null) return "-";
  return `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

function buildProxySigUrl(sig) {
  if (!sig) return null;
  if (
    sig.startsWith("data:") ||
    sig.startsWith("http://") ||
    sig.startsWith("https://") ||
    sig.startsWith("blob:")
  ) {
    return sig;
  }
  const filename = sig.split("/").pop();
  const base = (BASE_URL || "").replace(/\/$/, "");
  return `${base}/ikm/linen-transactions/signature-proxy?name=${encodeURIComponent(filename)}`;
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: "include", mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    let extension = "png";
    const mime = (blob.type || "").toLowerCase();
    if (mime.includes("png")) extension = "png";
    else if (mime.includes("gif")) extension = "gif";
    else if (mime.includes("jpg") || mime.includes("jpeg")) extension = "jpeg";
    return { buffer, extension };
  } catch (err) {
    console.warn("Gagal fetch gambar tanda tangan:", url, err);
    return null;
  }
}

function styleMetaLabel(cell) {
  cell.font = { bold: true, size: 10, color: { argb: "FF475569" } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function styleMetaValue(cell) {
  cell.font = { size: 10, color: { argb: "FF0F172A" } };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

export async function exportSerahTerimaLinenExcel(transactionData) {
  if (!transactionData || !transactionData.header) {
    alert("Data transaksi tidak valid untuk diekspor");
    return;
  }

  const { header, details = [] } = transactionData;

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Serah Terima Linen");
  ws.views = [{ showGridLines: false }];

  // Lebar kolom: A cukup untuk label meta, bukan hanya nomor urut
  ws.columns = [
    { width: 24 },
    { width: 28 },
    { width: 16 },
    { width: 15 },
    { width: 24 },
    { width: 15 },
    { width: 24 },
  ];

  const darkBlue = "FF1E3A5F";
  const lightBlue = "FFEBF3FC";
  const grayBorder = "FFCBD5E1";
  const orangeBg = "FFFFF7ED";
  const emeraldBg = "FFF0FDF4";
  const amberBg = "FFFFFBEB";

  const thinBorder = {
    top: { style: "thin", color: { argb: grayBorder } },
    left: { style: "thin", color: { argb: grayBorder } },
    bottom: { style: "thin", color: { argb: grayBorder } },
    right: { style: "thin", color: { argb: grayBorder } },
  };

  const thickBottom = {
    top: { style: "thin", color: { argb: grayBorder } },
    left: { style: "thin", color: { argb: grayBorder } },
    bottom: { style: "medium", color: { argb: darkBlue } },
    right: { style: "thin", color: { argb: grayBorder } },
  };

  // ── Judul ────────────────────────────────────────────────────────────────
  const titleRow = ws.addRow(["FORMULIR SERAH TERIMA LINEN RUMAH SAKIT"]);
  ws.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: darkBlue } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.height = 26;

  const subTitleRow = ws.addRow([`Nomor Surat: ${header.form_number || "-"}`]);
  ws.mergeCells(`A${subTitleRow.number}:G${subTitleRow.number}`);
  subTitleRow.getCell(1).font = { size: 10, bold: true, color: { argb: "FF334155" } };
  subTitleRow.getCell(1).alignment = { horizontal: "center" };

  ws.addRow([]);

  // ── Metadata (2 kolom) ───────────────────────────────────────────────────
  const addMetaPair = (leftLabel, leftValue, rightLabel, rightValue) => {
    const row = ws.addRow([
      leftLabel,
      leftValue,
      "",
      "",
      rightLabel || "",
      rightValue || "",
      "",
    ]);
    ws.mergeCells(`B${row.number}:D${row.number}`);
    if (rightLabel) {
      ws.mergeCells(`F${row.number}:G${row.number}`);
    } else {
      ws.mergeCells(`B${row.number}:G${row.number}`);
    }
    row.height = 20;
    styleMetaLabel(row.getCell(1));
    styleMetaValue(row.getCell(2));
    if (rightLabel) {
      styleMetaLabel(row.getCell(5));
      styleMetaValue(row.getCell(6));
    }
    return row;
  };

  addMetaPair(
    "Rumah Sakit",
    header.hospital_name || "-",
    "Status",
    header.status || "PROSES"
  );
  addMetaPair(
    "Tanggal Pickup",
    fmtDateTime(header.pickup_date),
    "Tanggal Pengantaran",
    fmtDateTime(header.delivery_date)
  );
  addMetaPair(
    "Petugas IKM (Pickup)",
    header.pickup_by_name || "-",
    "Petugas IKM (Delivery)",
    header.delivery_by_name || "-"
  );

  const notesStr = [
    header.notes_pickup ? `Pickup: ${header.notes_pickup}` : "",
    header.notes_delivery ? `Delivery: ${header.notes_delivery}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const notesRow = ws.addRow(["Catatan", notesStr || "-", "", "", "", "", ""]);
  ws.mergeCells(`B${notesRow.number}:G${notesRow.number}`);
  notesRow.height = 20;
  styleMetaLabel(notesRow.getCell(1));
  styleMetaValue(notesRow.getCell(2));

  ws.addRow([]);

  // ── Kilogram & Express ───────────────────────────────────────────────────
  const isExpress = Number(header.is_express) === 1;
  const kgSectionTitle = ws.addRow(["KETERANGAN KILOGRAM & EXPRESS"]);
  ws.mergeCells(`A${kgSectionTitle.number}:G${kgSectionTitle.number}`);
  kgSectionTitle.getCell(1).font = { bold: true, size: 10, color: { argb: darkBlue } };
  kgSectionTitle.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: amberBg },
  };
  kgSectionTitle.getCell(1).alignment = { vertical: "middle" };
  kgSectionTitle.height = 22;
  for (let c = 1; c <= 7; c++) {
    kgSectionTitle.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: amberBg },
    };
    kgSectionTitle.getCell(c).border = thinBorder;
  }

  const kgRow1 = ws.addRow([
    "Perhitungan Valet bersama RS",
    fmtKg(header.total_kg_valet),
    "",
    "",
    "Layanan Express",
    isExpress ? "Ya (Express)" : "Tidak",
    "",
  ]);
  ws.mergeCells(`B${kgRow1.number}:D${kgRow1.number}`);
  ws.mergeCells(`F${kgRow1.number}:G${kgRow1.number}`);
  kgRow1.height = 20;
  styleMetaLabel(kgRow1.getCell(1));
  styleMetaValue(kgRow1.getCell(2));
  styleMetaLabel(kgRow1.getCell(5));
  styleMetaValue(kgRow1.getCell(6));
  kgRow1.getCell(6).font = {
    bold: true,
    size: 10,
    color: { argb: isExpress ? "FFB45309" : "FF0F172A" },
  };

  const kgRow2 = ws.addRow([
    "Perhitungan Admin IKM",
    fmtKg(header.total_kg_admin),
    "",
    "",
    "",
    "",
    "",
  ]);
  ws.mergeCells(`B${kgRow2.number}:D${kgRow2.number}`);
  kgRow2.height = 20;
  styleMetaLabel(kgRow2.getCell(1));
  styleMetaValue(kgRow2.getCell(2));

  // ── Tarif per kg (express punya harga khusus, bukan kelipatan tarif reguler) ─
  if (Number(header.billing_by_kg) === 1) {
    const regularPrice = toNumber(header.price_per_kg);
    // Express default 2x harga reguler, kecuali RS punya tarif khusus
    const customExpressPrice = toNumber(header.express_price_per_kg);
    const expressPrice =
      customExpressPrice != null
        ? customExpressPrice
        : regularPrice != null
          ? regularPrice * 2
          : null;
    const unitPrice = isExpress ? expressPrice : regularPrice;
    const billedKg = toNumber(header.total_kg_admin) ?? toNumber(header.total_kg_valet);

    const priceRow = ws.addRow([
      isExpress ? "Tarif Express per Kg" : "Tarif Reguler per Kg",
      fmtRp(unitPrice),
      "",
      "",
      "Estimasi Biaya",
      unitPrice != null && billedKg != null ? fmtRp(unitPrice * billedKg) : "-",
      "",
    ]);
    ws.mergeCells(`B${priceRow.number}:D${priceRow.number}`);
    ws.mergeCells(`F${priceRow.number}:G${priceRow.number}`);
    priceRow.height = 20;
    styleMetaLabel(priceRow.getCell(1));
    styleMetaValue(priceRow.getCell(2));
    styleMetaLabel(priceRow.getCell(5));
    styleMetaValue(priceRow.getCell(6));
    priceRow.getCell(6).font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
  }

  // Selisih kg jika keduanya terisi
  const kgValet = header.total_kg_valet !== null && header.total_kg_valet !== undefined && header.total_kg_valet !== ""
    ? Number(header.total_kg_valet)
    : null;
  const kgAdmin = header.total_kg_admin !== null && header.total_kg_admin !== undefined && header.total_kg_admin !== ""
    ? Number(header.total_kg_admin)
    : null;
  if (kgValet !== null && Number.isFinite(kgValet) && kgAdmin !== null && Number.isFinite(kgAdmin)) {
    const diff = kgAdmin - kgValet;
    const diffRow = ws.addRow([
      "Selisih Kg (Admin − Valet)",
      `${diff.toLocaleString("id-ID", { maximumFractionDigits: 2 })} Kg`,
      "",
      "",
      "",
      "",
      "",
    ]);
    ws.mergeCells(`B${diffRow.number}:D${diffRow.number}`);
    diffRow.height = 20;
    styleMetaLabel(diffRow.getCell(1));
    styleMetaValue(diffRow.getCell(2));
    if (diff !== 0) {
      diffRow.getCell(2).font = { bold: true, size: 10, color: { argb: "FFBE123C" } };
    }
  }

  ws.addRow([]);

  // ── Tabel detail ─────────────────────────────────────────────────────────
  const headerRow = ws.addRow([
    "No",
    "Nama Item Linen",
    "Kepemilikan",
    "Qty Kotor (Pcs)",
    "Qty Bersih (Pcs)",
    "Selisih",
    "Catatan",
  ]);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: darkBlue } };
    cell.border = thinBorder;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  let totalKotor = 0;
  let totalBersih = 0;
  let totalSelisih = 0;
  let hasBersih = false;

  details.forEach((d, idx) => {
    const kotor = Number(d.qty_kotor || 0);
    const bersih =
      d.qty_bersih !== null && d.qty_bersih !== "" ? Number(d.qty_bersih) : null;
    const selisih = bersih !== null ? kotor - bersih : null;

    totalKotor += kotor;
    if (bersih !== null) {
      totalBersih += bersih;
      hasBersih = true;
    }
    if (selisih !== null) totalSelisih += selisih;

    const row = ws.addRow([
      idx + 1,
      d.linen_display_name || `Linen #${d.hospital_linen_id}`,
      d.ownership_type === "SEWA" ? "Sewa" : "Rumah Sakit",
      kotor,
      bersih !== null ? bersih : "-",
      selisih !== null ? selisih : "-",
      d.notes || "",
    ]);

    row.height = 20;
    row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: orangeBg } };
    row.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: emeraldBg } };

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.font = { size: 9.5, color: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
  });

  const totalRow = ws.addRow([
    "TOTAL",
    "",
    "",
    totalKotor,
    hasBersih ? totalBersih : "-",
    hasBersih ? totalSelisih : "-",
    "",
  ]);
  ws.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.height = 22;
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
    cell.border = thickBottom;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  ws.addRow([]);

  // ── Tanda tangan ─────────────────────────────────────────────────────────
  const sigTitleRow = ws.addRow(["DOKUMENTASI TANDA TANGAN SERAH TERIMA"]);
  ws.mergeCells(`A${sigTitleRow.number}:G${sigTitleRow.number}`);
  sigTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: darkBlue } };
  sigTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  sigTitleRow.height = 22;

  ws.addRow([]);

  const sigHeaders = ws.addRow([
    "PENERIMAAN LINEN KOTOR (PICKUP)",
    "",
    "",
    "",
    "PENGIRIMAN LINEN BERSIH (DELIVERY)",
    "",
    "",
  ]);
  ws.mergeCells(`A${sigHeaders.number}:C${sigHeaders.number}`);
  ws.mergeCells(`E${sigHeaders.number}:G${sigHeaders.number}`);
  sigHeaders.getCell(1).font = { bold: true, size: 9.5, color: { argb: "FF9A3412" } };
  sigHeaders.getCell(1).alignment = { horizontal: "center" };
  sigHeaders.getCell(5).font = { bold: true, size: 9.5, color: { argb: "FF047857" } };
  sigHeaders.getCell(5).alignment = { horizontal: "center" };

  const sigRoles = ws.addRow([
    "Petugas IKM (Pickup)",
    "Petugas RS (Kotor)",
    "Perawat RS (Kotor)",
    "",
    "Petugas IKM (Delivery)",
    "Petugas RS (Bersih)",
    "Perawat RS (Bersih)",
  ]);
  sigRoles.eachCell((cell) => {
    cell.font = { bold: true, size: 8.5, color: { argb: "FF475569" } };
    cell.alignment = { horizontal: "center", wrapText: true };
  });
  sigRoles.height = 28;

  const sigImgRow = ws.addRow([]);
  sigImgRow.height = 72;

  const sigNames = ws.addRow([
    header.pickup_by_name || "-",
    header.hospital_staff_pickup || "-",
    header.hospital_assistant_pickup || "-",
    "",
    header.delivery_by_name || "-",
    header.hospital_staff_delivery || "-",
    header.hospital_assistant_delivery || "-",
  ]);
  sigNames.eachCell((cell) => {
    cell.font = { size: 9, color: { argb: "FF1E293B" } };
    cell.alignment = { horizontal: "center", wrapText: true };
  });

  const sigColumns = [
    { name: header.signature_valet_pickup, col: 1 },
    { name: header.signature_hospital_pickup, col: 2 },
    { name: header.signature_assistant_pickup, col: 3 },
    { name: header.signature_valet_delivery, col: 5 },
    { name: header.signature_hospital_delivery, col: 6 },
    { name: header.signature_assistant_delivery, col: 7 },
  ];

  for (const item of sigColumns) {
    if (!item.name) continue;
    const url = buildProxySigUrl(item.name);
    const img = await fetchImageBuffer(url);
    if (!img) continue;
    const imgId = workbook.addImage(img);
    ws.addImage(imgId, {
      tl: { col: item.col - 1 + 0.15, row: sigImgRow.number - 1 + 0.1 },
      ext: { width: 110, height: 70 },
      editAs: "oneCell",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const filename = `Serah_Terima_Linen_${header.form_number || header.id}.xlsx`;
  saveAs(blob, filename);
}
