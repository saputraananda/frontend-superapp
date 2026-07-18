import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { BASE_URL } from "../../../lib/api";

// ── Helper format ────────────────────────────────────────────────────────────
function fmtDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function buildProxySigUrl(fileName) {
  if (!fileName) return null;
  const base = (BASE_URL || "").replace(/\/$/, "");
  const safe = encodeURIComponent(String(fileName).replace(/^\/+/, ""));
  return `${base}/ikm/linen-transactions/signature-proxy?name=${safe}`;
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: "include", mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    let extension = "png"; // default fallback
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

export async function exportSerahTerimaLinenExcel(transactionData) {
  if (!transactionData || !transactionData.header) {
    alert("Data transaksi tidak valid untuk diekspor");
    return;
  }

  const { header, details = [] } = transactionData;

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Serah Terima Linen");

  // Gridlines visible
  ws.views = [{ showGridLines: true }];

  // Column definitions
  ws.columns = [
    { key: "col_a", width: 6 },   // No
    { key: "col_b", width: 32 },  // Nama Linen
    { key: "col_c", width: 18 },  // Kepemilikan
    { key: "col_d", width: 18 },  // Qty Kotor
    { key: "col_e", width: 18 },  // Qty Bersih
    { key: "col_f", width: 15 },  // Selisih
    { key: "col_g", width: 25 },  // Catatan
  ];

  // Colors
  const darkBlue = "FF1E3A5F";
  const lightBlue = "FFEBF3FC";
  const grayBorder = "FFCBD5E1";
  const orangeBg = "FFFFF7ED";
  const emeraldBg = "FFF0FDF4";

  // Border styles
  const thinBorder = {
    top: { style: "thin", color: { argb: grayBorder } },
    left: { style: "thin", color: { argb: grayBorder } },
    bottom: { style: "thin", color: { argb: grayBorder } },
    right: { style: "thin", color: { argb: grayBorder } },
  };

  const doubleBottomBorder = {
    top: { style: "thin", color: { argb: grayBorder } },
    left: { style: "thin", color: { argb: grayBorder } },
    bottom: { style: "double", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: grayBorder } },
  };

  // 1. Corporate Header
  ws.addRow(["PT INTERSOLUSI KARYA MANDIRI"]).getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E3A8A" } };
  ws.addRow(["Alora Group Indonesia | Unit Layanan Linen Rumah Sakit"]).getCell(1).font = { italic: true, size: 9, color: { argb: "FF64748B" } };
  ws.addRow([]); // Spacer

  // 2. Document Title
  const titleRow = ws.addRow(["FORMULIR SERAH TERIMA LINEN RUMAH SAKIT"]);
  ws.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  const titleCell = ws.getCell(`A${titleRow.number}`);
  titleCell.font = { bold: true, size: 15, color: { argb: darkBlue } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleRow.height = 28;

  // Form Number
  const subTitleRow = ws.addRow([`Nomor Formulir: ${header.form_number}`]);
  ws.mergeCells(`A${subTitleRow.number}:G${subTitleRow.number}`);
  const subTitleCell = ws.getCell(`A${subTitleRow.number}`);
  subTitleCell.font = { fontName: "Courier New", size: 10, bold: true, color: { argb: "FF334155" } };
  subTitleCell.alignment = { horizontal: "center" };

  ws.addRow([]); // Spacer

  // 3. Metadata Table
  const metaStart = ws.rowsCount + 1;
  const r1 = ws.addRow(["Rumah Sakit", `: ${header.hospital_name || "-"}`, "", "", "Status", `: ${header.status || "PROSES"}`]);
  const r2 = ws.addRow(["Tanggal Pickup", `: ${fmtDateTime(header.pickup_date)}`, "", "", "Tanggal Pengantaran", `: ${fmtDateTime(header.delivery_date)}`]);
  const r3 = ws.addRow(["Petugas IKM (Pickup)", `: ${header.pickup_by_name || "-"}`, "", "", "Petugas IKM (Delivery)", `: ${header.delivery_by_name || "-"}`]);
  const r4 = ws.addRow(["Catatan", `: ${header.notes || "-"}`, "", "", "", ""]);

  // Merge values cells for metadata
  ws.mergeCells(`B${r1.number}:D${r1.number}`);
  ws.mergeCells(`B${r2.number}:D${r2.number}`);
  ws.mergeCells(`B${r3.number}:D${r3.number}`);
  ws.mergeCells(`B${r4.number}:G${r4.number}`);
  ws.mergeCells(`F${r1.number}:G${r1.number}`);
  ws.mergeCells(`F${r2.number}:G${r2.number}`);
  ws.mergeCells(`F${r3.number}:G${r3.number}`);

  // Style metadata rows
  for (let r = metaStart; r < metaStart + 4; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    row.eachCell((cell) => {
      cell.font = { size: 10, color: { argb: "FF1E293B" } };
      cell.alignment = { vertical: "middle" };
    });
    // Labels bold
    row.getCell(1).font = { bold: true, size: 10, color: { argb: "FF475569" } };
    row.getCell(5).font = { bold: true, size: 10, color: { argb: "FF475569" } };
  }

  ws.addRow([]); // Spacer

  // 4. Details Table Header
  const headerRow = ws.addRow([
    "No",
    "Nama Item Linen",
    "Kepemilikan",
    "Qty Kotor (Pcs)",
    "Qty Bersih (Pcs)",
    "Selisih",
    "Catatan"
  ]);
  headerRow.height = 26;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: darkBlue }
    };
    cell.border = thinBorder;
    cell.alignment = {
      horizontal: colNumber === 1 || colNumber === 3 ? "center" : colNumber >= 4 && colNumber <= 6 ? "right" : "left",
      vertical: "middle"
    };
  });

  // 5. Details Table Rows
  let totalKotor = 0;
  let totalBersih = 0;
  let totalSelisih = 0;

  details.forEach((d, idx) => {
    const kotor = Number(d.qty_kotor || 0);
    const bersih = d.qty_bersih !== null && d.qty_bersih !== "" ? Number(d.qty_bersih) : null;
    const selisih = bersih !== null ? kotor - bersih : null;

    totalKotor += kotor;
    if (bersih !== null) totalBersih += bersih;
    if (selisih !== null) totalSelisih += selisih;

    const row = ws.addRow([
      idx + 1,
      d.linen_display_name || `Linen #${d.hospital_linen_id}`,
      d.ownership_type === "SEWA" ? "Sewa (Rental)" : "Rumah Sakit",
      kotor,
      bersih !== null ? bersih : "-",
      selisih !== null ? selisih : "-",
      d.notes || ""
    ]);

    row.height = 20;

    // Apply colors to numeric cells for readability
    row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: orangeBg } };
    row.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: emeraldBg } };

    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      cell.font = { size: 9.5 };
      cell.alignment = {
        horizontal: colNumber === 1 || colNumber === 3 ? "center" : colNumber >= 4 && colNumber <= 6 ? "right" : "left",
        vertical: "middle"
      };
    });
  });

  // Total Row
  const totalRow = ws.addRow([
    "TOTAL SUMMARY",
    "",
    "",
    totalKotor,
    totalBersih,
    totalSelisih,
    ""
  ]);
  ws.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: lightBlue }
    };
    cell.border = doubleBottomBorder;
    cell.alignment = {
      horizontal: colNumber <= 3 ? "center" : colNumber >= 4 && colNumber <= 6 ? "right" : "left",
      vertical: "middle"
    };
  });

  ws.addRow([]); // Spacer

  // 6. Signatures Section Title
  const sigTitleRow = ws.addRow(["DOKUMENTASI TANDA TANGAN DIGITAL SERAH TERIMA"]);
  ws.mergeCells(`A${sigTitleRow.number}:G${sigTitleRow.number}`);
  const sigTitleCell = ws.getCell(`A${sigTitleRow.number}`);
  sigTitleCell.font = { bold: true, size: 11, color: { argb: darkBlue } };
  sigTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  sigTitleRow.height = 24;

  ws.addRow([]); // Spacer

  // 7. Signature Columns Headers
  const sigHeaders = ws.addRow([
    "PENERIMAAN LINEN KOTOR (PICKUP)", "", "", "",
    "PENGIRIMAN LINEN BERSIH (DELIVERY)", "", ""
  ]);
  ws.mergeCells(`A${sigHeaders.number}:C${sigHeaders.number}`);
  ws.mergeCells(`E${sigHeaders.number}:G${sigHeaders.number}`);
  sigHeaders.getCell(1).font = { bold: true, size: 9.5, color: { argb: "FFC2410C" } }; // Orange/brown
  sigHeaders.getCell(1).alignment = { horizontal: "center" };
  sigHeaders.getCell(5).font = { bold: true, size: 9.5, color: { argb: "FF047857" } }; // Green
  sigHeaders.getCell(5).alignment = { horizontal: "center" };

  const sigRoles = ws.addRow([
    "Petugas IKM (Pickup)", "Petugas RS (Kotor)", "Perawat RS (Kotor)", "",
    "Petugas IKM (Delivery)", "Petugas RS (Bersih)", "Perawat RS (Bersih)"
  ]);
  sigRoles.eachCell((cell) => {
    cell.font = { bold: true, size: 9, color: { argb: "FF475569" } };
    cell.alignment = { horizontal: "center" };
  });

  // 8. Signatures Drawing Row
  const sigImgRow = ws.addRow([]);
  sigImgRow.height = 70; // High row to fit signatures

  // 9. Signee Names Row
  const sigNames = ws.addRow([
    header.pickup_by_name || "-",
    header.hospital_staff_pickup || "-",
    header.hospital_assistant_pickup || "-",
    "",
    header.delivery_by_name || "-",
    header.hospital_staff_delivery || "-",
    header.hospital_assistant_delivery || "-"
  ]);
  sigNames.eachCell((cell) => {
    cell.font = { italic: true, size: 9, color: { argb: "FF1E293B" } };
    cell.alignment = { horizontal: "center" };
  });

  // Embed Signatures if they exist
  const sigColumns = [
    { name: header.signature_valet_pickup, col: 1 },
    { name: header.signature_hospital_pickup, col: 2 },
    { name: header.signature_assistant_pickup, col: 3 },
    { name: header.signature_valet_delivery, col: 5 },
    { name: header.signature_hospital_delivery, col: 6 },
    { name: header.signature_assistant_delivery, col: 7 },
  ];

  for (const item of sigColumns) {
    if (item.name) {
      const url = buildProxySigUrl(item.name);
      const img = await fetchImageBuffer(url);
      if (img) {
        const imgId = workbook.addImage(img);
        ws.addImage(imgId, {
          tl: { col: item.col - 1 + 0.1, row: sigImgRow.number - 1 + 0.05 },
          ext: { width: 120, height: 80 },
          editAs: "oneCell",
        });
      }
    }
  }

  // Generate blob & save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const filename = `Serah_Terima_Linen_${header.form_number || header.id}.xlsx`;
  saveAs(blob, filename);
}
