import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { buildSerahTerimaExportData, signatureStages, toTitleCase } from "./serahTerimaLinenExportData";

// Struktur mengikuti LMS (Ringkasan Global + satu sheet per unit/ruangan + TTD per tahap),
// gaya (font, ukuran, warna) mengikuti export SuperApp.

const darkBlue = "FF1E3A5F";
const lightBlue = "FFEBF3FC";
const grayBorder = "FFCBD5E1";
const orangeBg = "FFFFF7ED";
const emeraldBg = "FFF0FDF4";
const amberBg = "FFFFFBEB";
const slate50 = "FFF8FAFC";

const thinBorder = {
  top: { style: "thin", color: { argb: grayBorder } },
  left: { style: "thin", color: { argb: grayBorder } },
  bottom: { style: "thin", color: { argb: grayBorder } },
  right: { style: "thin", color: { argb: grayBorder } },
};
const thickBottom = { ...thinBorder, bottom: { style: "medium", color: { argb: darkBlue } } };
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function fmtDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const fmtKg = (v) => (num(v) === null ? "-" : `${num(v).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Kg`);
const fmtRp = (v) => (num(v) === null ? "-" : `Rp ${num(v).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`);

function styleMetaLabel(cell) {
  cell.font = { bold: true, size: 10, color: { argb: "FF475569" } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}
function styleMetaValue(cell) {
  cell.font = { size: 10, color: { argb: "FF0F172A" } };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

async function fetchImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: "include", mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const mime = (blob.type || "").toLowerCase();
    if (!mime.startsWith("image/")) return null;
    const extension = mime.includes("gif") ? "gif" : mime.includes("jp") ? "jpeg" : "png";
    return { buffer: await blob.arrayBuffer(), extension };
  } catch (err) {
    console.warn("Gagal fetch gambar tanda tangan:", url, err);
    return null;
  }
}

// Kolom: A No | B Nama Item | C Kepemilikan | D Kotor | E Bersih | F Selisih | G Catatan
const COLS = 7;

function writeSheet(workbook, ws, { tx, title, unitName, items, stages, images, showKg }) {
  ws.views = [{ showGridLines: false }];
  ws.columns = [{ width: 7 }, { width: 34 }, { width: 15 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 30 }];

  // ── Judul ──
  const titleRow = ws.addRow([title]);
  ws.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: darkBlue } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.height = 26;

  const subTitleRow = ws.addRow([`Nomor Surat: ${tx.form_number || "-"}`]);
  ws.mergeCells(`A${subTitleRow.number}:G${subTitleRow.number}`);
  subTitleRow.getCell(1).font = { size: 10, bold: true, color: { argb: "FF334155" } };
  subTitleRow.getCell(1).alignment = { horizontal: "center" };

  ws.addRow([]);

  // ── Metadata: label A:B, nilai C:D, label E:F, nilai G ──
  const addMetaPair = (leftLabel, leftValue, rightLabel, rightValue) => {
    const row = ws.addRow([leftLabel, "", leftValue, "", rightLabel || "", "", rightValue || ""]);
    ws.mergeCells(`A${row.number}:B${row.number}`);
    if (rightLabel) {
      ws.mergeCells(`C${row.number}:D${row.number}`);
      ws.mergeCells(`E${row.number}:F${row.number}`);
      styleMetaLabel(row.getCell(5));
      styleMetaValue(row.getCell(7));
    } else {
      ws.mergeCells(`C${row.number}:G${row.number}`);
    }
    row.height = 20;
    styleMetaLabel(row.getCell(1));
    styleMetaValue(row.getCell(3));
    return row;
  };

  addMetaPair("Rumah Sakit", tx.hospital_name || "-", "Unit / Ruangan", unitName || "Semua Unit");
  addMetaPair("Tanggal Pickup", fmtDateTime(tx.pickup_date), "Tanggal Pengantaran", fmtDateTime(tx.delivery_date));
  addMetaPair("Petugas IKM (Pickup)", toTitleCase(tx.pickup_name) || "-", "Petugas IKM (Delivery)", toTitleCase(tx.delivery_name) || "-");
  addMetaPair("Status", tx.status || "PROSES");
  const notesStr = [tx.notes_pickup ? `Pickup: ${tx.notes_pickup}` : "", tx.notes_delivery ? `Delivery: ${tx.notes_delivery}` : ""]
    .filter(Boolean)
    .join(" | ");
  addMetaPair("Catatan", notesStr || "-");

  ws.addRow([]);

  // ── Kilogram & Express (hanya ringkasan global) ──
  if (showKg) {
    const isExpress = Number(tx.is_express) === 1;
    const isBillingKg = Number(tx.billing_by_kg) === 1;
    const sec = ws.addRow(["KETERANGAN KILOGRAM & EXPRESS"]);
    ws.mergeCells(`A${sec.number}:G${sec.number}`);
    sec.getCell(1).font = { bold: true, size: 10, color: { argb: darkBlue } };
    sec.getCell(1).alignment = { vertical: "middle" };
    sec.height = 22;
    for (let c = 1; c <= COLS; c++) {
      sec.getCell(c).fill = fill(amberBg);
      sec.getCell(c).border = thinBorder;
    }

    const r1 = addMetaPair("Perhitungan Valet bersama RS", fmtKg(tx.total_kg_valet), "Layanan Express", isExpress ? "Ya (Express)" : "Tidak");
    r1.getCell(7).font = { bold: true, size: 10, color: { argb: isExpress ? "FFB45309" : "FF0F172A" } };
    if (isBillingKg) {
      addMetaPair("Perhitungan Admin IKM", fmtKg(tx.total_kg_admin), "Kg Perjanjian", fmtKg(tx.kg_agreement));
      const regular = num(tx.price_per_kg);
      const custom = num(tx.express_price_per_kg);
      const expressPrice = custom != null ? custom : regular != null ? regular * 2 : null;
      const unitPrice = isExpress ? expressPrice : regular;
      const billedKg = num(tx.kg_total);
      const r3 = addMetaPair("Total Kg Ditagihkan", fmtKg(tx.kg_total), "Estimasi Biaya",
        unitPrice != null && billedKg != null ? fmtRp(unitPrice * billedKg) : "-");
      r3.getCell(3).font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
      r3.getCell(7).font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
      addMetaPair(isExpress ? "Tarif Express per Kg" : "Tarif Reguler per Kg", fmtRp(unitPrice));
    } else {
      addMetaPair("Perhitungan Admin IKM", fmtKg(tx.total_kg_admin));
    }
    const kgValet = num(tx.total_kg_valet);
    const kgAdmin = num(tx.total_kg_admin);
    if (kgValet !== null && kgAdmin !== null) {
      const diff = kgAdmin - kgValet;
      const r = addMetaPair("Selisih Kg (Admin − Valet)", `${diff.toLocaleString("id-ID", { maximumFractionDigits: 2 })} Kg`);
      if (diff !== 0) r.getCell(3).font = { bold: true, size: 10, color: { argb: "FFBE123C" } };
    }
    ws.addRow([]);
  }

  // ── Tabel item ──
  const headerRow = ws.addRow(["No", "Nama Item Linen", "Kepemilikan", "Qty Kotor (Pcs)", "Qty Bersih (Pcs)", "Selisih", "Catatan"]);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = fill(darkBlue);
    cell.border = thinBorder;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  let totalKotor = 0;
  let totalBersih = 0;
  let hasBersih = false;
  items.forEach((d, idx) => {
    const kotor = d.qty_kotor || 0;
    const bersih = d.qty_bersih;
    totalKotor += kotor;
    if (bersih !== null) {
      totalBersih += bersih;
      hasBersih = true;
    }
    const row = ws.addRow([idx + 1, d.linen_name, d.ownership, kotor, bersih ?? "-", bersih !== null ? kotor - bersih : "-", d.notes || ""]);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > COLS) return;
      cell.border = thinBorder;
      cell.font = { size: 9.5, color: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: col === 2 || col === 7 ? "left" : "center", vertical: "middle", wrapText: true };
    });
    row.getCell(4).fill = fill(orangeBg);
    row.getCell(5).fill = fill(emeraldBg);
  });

  const totalRow = ws.addRow(["TOTAL", "", "", totalKotor, hasBersih ? totalBersih : "-", hasBersih ? totalKotor - totalBersih : "-", ""]);
  ws.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.height = 22;
  totalRow.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > COLS) return;
    cell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
    cell.fill = fill(lightBlue);
    cell.border = thickBottom;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  ws.addRow([]);

  // ── Tanda tangan ──
  const sigTitleRow = ws.addRow(["DOKUMENTASI TANDA TANGAN SERAH TERIMA"]);
  ws.mergeCells(`A${sigTitleRow.number}:G${sigTitleRow.number}`);
  sigTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: darkBlue } };
  sigTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  sigTitleRow.height = 22;

  stages.forEach((stage, stageIdx) => {
    if (stageIdx > 0) ws.addRow([]).height = 10;
    const isPickup = stage.kind === "pickup";
    // 2 kolom: A:C | D:G, 3 kolom: A:B | C:E | F:G
    const spans = stage.cols.length === 3 ? [[1, 2], [3, 5], [6, 7]] : [[1, 3], [4, 7]];
    const L = (c) => String.fromCharCode(64 + c);
    const mergeSpans = (rowNum, rowEnd = rowNum) => spans.forEach(([a, b]) => ws.mergeCells(`${L(a)}${rowNum}:${L(b)}${rowEnd}`));
    const borderRows = (from, to) => {
      for (let r = from; r <= to; r++) for (let c = 1; c <= COLS; c++) ws.getCell(r, c).border = thinBorder;
    };

    const sec = ws.addRow([stage.title]);
    ws.mergeCells(`A${sec.number}:G${sec.number}`);
    sec.getCell(1).font = { bold: true, size: 9.5, color: { argb: isPickup ? "FF9A3412" : "FF047857" } };
    sec.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    sec.getCell(1).fill = fill(isPickup ? orangeBg : emeraldBg);
    sec.height = 22;
    borderRows(sec.number, sec.number);

    const labels = ws.addRow([]);
    labels.height = 20;
    mergeSpans(labels.number);
    stage.cols.forEach((col, i) => {
      const cell = labels.getCell(spans[i][0]);
      cell.value = col.label;
      cell.font = { bold: true, size: 8.5, color: { argb: "FF475569" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = fill(slate50);
    });
    borderRows(labels.number, labels.number);

    const imgStart = labels.number + 1;
    const imgEnd = imgStart + 4;
    for (let r = imgStart; r <= imgEnd; r++) ws.getRow(r).height = 14;
    mergeSpans(imgStart, imgEnd);
    borderRows(imgStart, imgEnd);
    stage.cols.forEach((col, i) => {
      const [a, b] = spans[i];
      const img = stage.pending ? null : images.get(col.sig);
      if (img) {
        ws.addImage(workbook.addImage(img), {
          tl: { col: a - 1 + 0.1, row: imgStart - 1 + 0.1 },
          br: { col: b - 0.1, row: imgEnd - 0.1 },
          editAs: "oneCell",
        });
      } else {
        const cell = ws.getCell(imgStart, a);
        cell.value = stage.pending ? `(${stage.pending})` : "(Belum Tanda Tangan)";
        cell.font = { italic: true, size: 8, color: { argb: "FF94A3B8" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    const names = ws.getRow(imgEnd + 1);
    names.height = 22;
    mergeSpans(names.number);
    stage.cols.forEach((col, i) => {
      const cell = names.getCell(spans[i][0]);
      cell.value = `(${toTitleCase(col.name) || "—"})`;
      cell.font = { bold: true, size: 9, color: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    borderRows(names.number, names.number);
  });
}

export async function exportSerahTerimaLinenExcel(transactionData) {
  const { tx, global, rooms } = buildSerahTerimaExportData(transactionData);

  const sheets = [
    { name: "Ringkasan Global", unitName: null, items: global, stages: signatureStages(tx, null), showKg: true },
    ...rooms.map((room) => ({ name: room.name, unitName: room.name, items: room.items, stages: signatureStages(tx, room.unit), showKg: false })),
  ];

  // Ambil semua gambar TTD sekali (bisa dipakai ulang antar sheet)
  const urls = [...new Set(sheets.flatMap((s) => s.stages.flatMap((st) => st.cols.map((c) => c.sig))).filter(Boolean))];
  const fetched = await Promise.all(urls.map(fetchImage));
  const images = new Map(urls.map((u, i) => [u, fetched[i]]));

  const workbook = new ExcelJS.Workbook();
  const usedNames = new Set();
  for (const sheet of sheets) {
    // Nama sheet Excel maks 31 karakter, tanpa : \ / ? * [ ] dan harus unik
    const base = sheet.name.replace(/[:\\/?*[\]]/g, "-").replace(/\s+/g, " ").trim().substring(0, 28) || "Tanpa Ruangan";
    let name = base;
    for (let n = 2; usedNames.has(name.toLowerCase()); n++) name = `${base} ${n}`;
    usedNames.add(name.toLowerCase());
    writeSheet(workbook, workbook.addWorksheet(name), {
      tx,
      title: "FORMULIR SERAH TERIMA LINEN RUMAH SAKIT",
      unitName: sheet.unitName,
      items: sheet.items,
      stages: sheet.stages,
      images,
      showKg: sheet.showKg,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Serah_Terima_Linen_${tx.form_number || tx.id}.xlsx`);
}
