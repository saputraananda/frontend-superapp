import kopSuratIkm from "../../../assets/images/kop_surat_ikm.png";
import { buildSerahTerimaExportData, signatureStages, toTitleCase } from "./serahTerimaLinenExportData";

// Disamakan dengan PDF Serah Terima Linen di LMS (/rs/serah-terima-linen):
// halaman 1 ringkasan global, lalu satu halaman per unit/ruangan, kop surat diulang per halaman.

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export default function exportSerahTerimaLinenPDF(transactionData) {
  const { tx, global, rooms } = buildSerahTerimaExportData(transactionData);

  const printWindow = window.open("", "_blank", "width=950,height=1200");
  if (!printWindow) return false;

  const kopSrc = new URL(kopSuratIkm, window.location.origin).href;
  const pickupDateObj = new Date(tx.pickup_date);
  const formattedPickupDate = isNaN(pickupDateObj) ? "—" : pickupDateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const deliveryDateObj = tx.delivery_date ? new Date(tx.delivery_date) : null;
  const validDelivery = deliveryDateObj && !isNaN(deliveryDateObj);
  const formattedDeliveryDate = validDelivery ? deliveryDateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const formattedDeliveryTime = validDelivery
    ? deliveryDateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".") + " WIB"
    : "—";

  const infoLine = (label, value, width = 130, bold = true) =>
    `<p style="margin: 0; display: flex; align-items: center;"><span style="width: ${width}px; font-weight: 700; color: #94a3b8;">${label}</span> <span style="color: #0f172a;${bold ? " font-weight: 700;" : ""}">${esc(value)}</span></p>`;

  const kgExpressInfoHtml = (() => {
    const hasKg = tx.total_kg_valet != null && tx.total_kg_valet !== "";
    const hasExpress = Number(tx.is_express) === 1;
    const hasAgreement = Number(tx.billing_by_kg) === 1 && tx.kg_agreement != null;
    if (!hasKg && !hasExpress && !hasAgreement) return "";
    const fmt = (v) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });
    return [
      infoLine("Total Kg:", hasKg ? fmt(tx.total_kg_valet) : "—"),
      infoLine("Express:", hasExpress ? "Ya" : "Tidak"),
      hasAgreement ? infoLine("Kg Perjanjian:", fmt(tx.kg_agreement)) : "",
      hasAgreement ? infoLine("Total Kg Ditagihkan:", tx.kg_total != null ? fmt(tx.kg_total) : "—") : "",
    ].join("");
  })();

  const renderSigImg = (sigSrc, pendingMsg) => {
    if (pendingMsg) return `<span style="font-size: 8px; color: #94a3b8; font-style: italic;">${pendingMsg}</span>`;
    if (sigSrc) return `<img src="${esc(sigSrc)}" style="max-height: 48px; max-width: 90%; object-fit: contain;" />`;
    return '<span style="font-size: 8px; color: #94a3b8; font-style: italic;">(Belum Tanda Tangan)</span>';
  };

  const stageStyle = {
    pickup: { bg: "#e2efd8", color: "#1e4620" },
    delivery: { bg: "#d9e1f2", color: "#1e2a4a" },
  };

  const renderStageHtml = (stage, last) => {
    const { bg, color } = stageStyle[stage.kind];
    const n = stage.cols.length;
    const colW = n === 3 ? "33.3%" : "50%";
    const cells = (fn) => stage.cols.map((c, i) => fn(c, i < n - 1)).join("");
    return `
      <div class="sig-stage" style="border: 1.5px solid #0f172a; border-radius: 8px; overflow: hidden;${last ? "" : " margin-bottom: 15px;"}">
        <div style="background: ${bg}; padding: 4px 10px; font-weight: 800; border-bottom: 1.5px solid #0f172a; color: ${color}; text-transform: uppercase; letter-spacing: 0.05em; font-size: 9px;">
          ${esc(stage.title)}
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-weight: 700;">
          <tr>${cells((c, border) => `<td style="width: ${colW}; ${border ? "border-right: 1.5px solid #0f172a; " : ""}padding: 4px; background: #f8fafc; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #0f172a;">${esc(c.label)}</td>`)}</tr>
          <tr>${cells((c, border) => `<td style="${border ? "border-right: 1.5px solid #0f172a; " : ""}height: 55px; vertical-align: middle;">${renderSigImg(c.sig, stage.pending)}</td>`)}</tr>
          <tr>${cells((c, border) => `<td style="${border ? "border-right: 1.5px solid #0f172a; " : ""}padding: 4px; border-top: 1.5px solid #0f172a; font-size: 8px; text-transform: uppercase;">(${esc(toTitleCase(c.name) || "—")})</td>`)}</tr>
        </table>
      </div>`;
  };

  const signaturesHtml = (unit) => {
    const stages = signatureStages(tx, unit);
    return `<div style="margin-top: 24px; font-size: 10px; color: #0f172a;">${stages.map((s, i) => renderStageHtml(s, i === stages.length - 1)).join("")}</div>`;
  };

  const rowsHtml = (items) =>
    items
      .map((item, idx) => {
        const kotor = item.qty_kotor || 0;
        const bersih = tx.delivered ? item.qty_bersih || 0 : 0;
        const selisih = Math.max(0, kotor - bersih);
        const td = 'style="padding: 10px 16px; border-right: 1px solid #0f172a; text-align: center; font-weight: 700;"';
        return `
        <tr style="color: #0f172a; border-bottom: 1px solid #0f172a;">
          <td ${td}>${idx + 1}</td>
          <td style="padding: 10px 16px; border-right: 1px solid #0f172a;">${esc(item.linen_name)}</td>
          <td ${td}>${kotor}</td>
          <td ${td}>${tx.delivered ? bersih : "—"}</td>
          <td ${td}>${tx.delivered ? selisih : "—"}</td>
          <td style="padding: 10px 16px; color: #475569; font-style: italic;">${esc(item.notes || "—")}</td>
        </tr>`;
      })
      .join("");

  const pageHtml = ({ subtitle, subtitleColor, titleSize, items, unit }) => `
      <table class="print-frame">
        <thead><tr><td><img src="${kopSrc}" class="kop" /></td></tr></thead>
        <tfoot><tr><td><div class="page-bottom-space"></div></td></tr></tfoot>
        <tbody><tr><td>
        <div class="paper-content">
          <div style="text-align: center; margin-top: -55px; margin-bottom: 15px;">
            <h1 style="font-size: ${titleSize}px; font-weight: 900; letter-spacing: 0.05em; color: #0f172a; margin: 0; line-height: 1.1; text-transform: uppercase;">FORM SERAH TERIMA LINEN</h1>
            <p style="font-size: 10.5px; font-weight: 800; color: ${subtitleColor}; margin-top: 5px; margin-bottom: 0; text-transform: uppercase; letter-spacing: 0.05em;">${esc(subtitle)}</p>
            <p style="font-size: 9px; font-weight: 700; color: #64748b; margin-top: 4px; margin-bottom: 0; text-transform: uppercase; letter-spacing: 0.05em;">No. Form: ${esc(tx.form_number || "—")}</p>
          </div>

          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #0f172a; font-size: 10.5px; font-weight: 600; color: #475569;">
            <div style="display: flex; flex-direction: column; gap: 5px;">
              ${infoLine("Kepada Yth:", tx.hospital_name || "Rumah Sakit")}
              ${infoLine("Tanggal Pengambilan:", formattedPickupDate)}
              ${kgExpressInfoHtml}
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px; text-align: left;">
              ${infoLine("Tanggal Pengiriman:", formattedDeliveryDate, 125, false)}
              ${infoLine("Jam:", formattedDeliveryTime, 125, false)}
            </div>
          </div>

          <div style="padding: 12px 0;">
            <table class="items-table" style="width: 100%; text-align: left; border-collapse: collapse; border: 1px solid #0f172a; font-size: 10.5px; font-weight: 600;">
              <thead>
                <tr style="background-color: #f1f5f9; color: #0f172a; text-transform: uppercase; font-weight: 900; border-bottom: 1px solid #0f172a; font-size: 8.5px; letter-spacing: 0.05em;">
                  <th style="padding: 8px 16px; border-right: 1px solid #0f172a; text-align: center; width: 44px;">NO</th>
                  <th style="padding: 8px 16px; border-right: 1px solid #0f172a; text-align: center;">NAMA BARANG</th>
                  <th style="padding: 8px 16px; border-right: 1px solid #0f172a; text-align: center; width: 80px;">KOTOR</th>
                  <th style="padding: 8px 16px; border-right: 1px solid #0f172a; text-align: center; width: 80px;">BERSIH</th>
                  <th style="padding: 8px 16px; border-right: 1px solid #0f172a; text-align: center; width: 80px;">SELISIH</th>
                  <th style="padding: 8px 16px; text-align: center;">KETERANGAN</th>
                </tr>
              </thead>
              <tbody>${rowsHtml(items)}</tbody>
            </table>
          </div>

          ${signaturesHtml(unit)}
        </div>
        </td></tr></tbody>
      </table>`;

  const pages = [
    pageHtml({ subtitle: "PT INTERSOLUSI KARYA MANDIRI", subtitleColor: "#126776", titleSize: 20, items: global, unit: null }),
    ...rooms.map((room) => pageHtml({ subtitle: `Unit: ${room.name}`, subtitleColor: "#1ea59e", titleSize: 18, items: room.items, unit: room.unit })),
  ].join("");

  const htmlContent = `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Form Serah Terima - ${esc(tx.form_number || "Linen")}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0f172a; background: #ffffff; margin: 0; padding: 0; font-size: 11px; line-height: 1.4;
        }
        .paper-content { padding: 0 15mm 15mm 15mm; }
        @media print { html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; } }
        /* Satu formulir = satu tabel cetak: kop di thead diulang di setiap halaman */
        .print-frame { width: 210mm; margin: 0 auto; border-collapse: collapse; }
        .print-frame > thead > tr > td, .print-frame > tbody > tr > td, .print-frame > tfoot > tr > td { padding: 0; }
        .print-frame > thead { display: table-header-group; }
        .print-frame > tfoot { display: table-footer-group; }
        .print-frame ~ .print-frame { break-before: page; page-break-before: always; }
        .kop { width: 100%; display: block; }
        .page-bottom-space { height: 14mm; }
        .items-table thead { display: table-header-group; }
        .items-table tr { break-inside: avoid; page-break-inside: avoid; }
        .sig-stage { break-inside: avoid; page-break-inside: avoid; }
      </style>
    </head>
    <body>
      ${pages}
      <script>
        // Tunggu kop & TTD selesai dimuat sebelum dialog cetak
        window.addEventListener('load', function () { setTimeout(function () { window.print(); window.close(); }, 350); });
      </script>
    </body>
    </html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return true;
}
