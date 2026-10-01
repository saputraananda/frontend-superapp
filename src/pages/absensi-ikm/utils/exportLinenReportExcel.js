import XLSXStyle from "xlsx-js-style";

const PHOTO_BASE = "https://api.ikmalora.com/storage/linenreport";

const C = {
  titleBg: "0F172A",
  headerBg: "1E3A5F",
  metaBg: "E0F2FE",
  metaText: "0C4A6E",
  alt: "F0F9FF",
  white: "FFFFFF",
  text: "1E293B",
  border: "CBD5E1",
  link: "1D4ED8",
};

const STATUS = {
  terkirim: { label: "Terkirim", bg: "F1F5F9", text: "475569" },
  proses: { label: "Diproses", bg: "FEF3C7", text: "92400E" },
  selesai: { label: "Selesai", bg: "D1FAE5", text: "065F46" },
};

const border = () => ({
  top: { style: "thin", color: { rgb: C.border } },
  bottom: { style: "thin", color: { rgb: C.border } },
  left: { style: "thin", color: { rgb: C.border } },
  right: { style: "thin", color: { rgb: C.border } },
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

const baseCell = (bg, align = "left") => ({
  fill: { fgColor: { rgb: bg } },
  font: { sz: 10, color: { rgb: C.text }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center", wrapText: true },
  border: border(),
});

const cell = (v, s) => ({ v: v == null || v === "" ? "-" : v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

function fmtDate(v) {
  if (!v) return "-";
  const raw = String(v);
  const d = new Date(/^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) + "T00:00:00" : raw);
  if (isNaN(d)) return raw;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function fmtTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function photoUrl(raw) {
  if (!raw) return null;
  const name = decodeURIComponent(String(raw).split("?")[0].split("/").filter(Boolean).pop() || "");
  if (!name || name === "null") return null;
  return `${PHOTO_BASE}/${encodeURIComponent(name)}`;
}

function linkCell(url, isAlt) {
  return {
    v: "Lihat Foto",
    t: "s",
    l: { Target: url, Tooltip: url },
    s: {
      fill: { fgColor: { rgb: isAlt ? C.alt : C.white } },
      font: { sz: 10, color: { rgb: C.link }, underline: true, name: "Calibri" },
      alignment: { horizontal: "center", vertical: "center" },
      border: border(),
    },
  };
}

function statusCell(status, isAlt) {
  const meta = STATUS[status] || { label: status || "-", bg: isAlt ? C.alt : C.white, text: C.text };
  return {
    v: meta.label,
    t: "s",
    s: {
      fill: { fgColor: { rgb: meta.bg } },
      font: { bold: true, sz: 10, color: { rgb: meta.text }, name: "Calibri" },
      alignment: { horizontal: "center", vertical: "center" },
      border: border(),
    },
  };
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

const OWNER = { rental: "Sewa", hospital: "RS", rs: "RS" };

export function exportLinenReportExcel({
  rows = [],
  startDate,
  endDate,
  filterLabel = "Semua data",
}) {
  const periodStr = startDate && endDate ? `${fmtDate(startDate)} s.d. ${fmtDate(endDate)}` : "–";
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}  ·  ${rows.length} laporan`;
  const headers = [
    "No", "Tanggal", "Waktu", "Pelapor", "Lantai", "Area", "Rumah Sakit",
    "Lokasi", "Kepemilikan", "Status", "Jenis Linen", "Temuan", "Qty",
    "Catatan Kirim", "Foto Temuan", "Catatan Proses", "Foto Proses",
    "Catatan Selesai", "Foto Selesai",
  ];
  const COLS = headers.length;
  const meta = [`Periode : ${periodStr}`, `Filter  : ${filterLabel}`, exportedAt];

  const wsData = [[
    { v: "LAPORAN TEMUAN LINEN IKM", t: "s", s: titleStyle },
    ...Array(COLS - 1).fill(empty({ fill: { fgColor: { rgb: C.titleBg } } })),
  ]];
  meta.forEach((line) => {
    wsData.push([
      { v: line, t: "s", s: metaStyle },
      ...Array(COLS - 1).fill(empty(metaStyle)),
    ]);
  });
  wsData.push(Array(COLS).fill(empty({ fill: { fgColor: { rgb: C.white } } })));
  wsData.push(headers.map((h) => ({ v: h, t: "s", s: headerStyle })));

  rows.forEach((r, i) => {
    const isAlt = i % 2 === 1;
    const bg = isAlt ? C.alt : C.white;
    const foto = photoUrl(r.attachment_url || r.attachment_path);
    const proses = photoUrl(r.process_path_url || r.process_path);
    const selesai = photoUrl(r.completed_path_url || r.completed_path);
    const own = OWNER[String(r.ownership_type || "").toLowerCase()] || r.ownership_type || "-";
    wsData.push([
      cell(i + 1, baseCell(bg, "center")),
      cell(fmtDate(r.report_date || r.created_at), baseCell(bg, "center")),
      cell(fmtTime(r.created_at) || "-", baseCell(bg, "center")),
      cell(r.reporter_name, baseCell(bg)),
      cell(r.floor || "-", baseCell(bg, "center")),
      cell(r.area_name || "-", baseCell(bg)),
      cell(r.hospital_name || "-", baseCell(bg)),
      cell(r.finding_location || "-", baseCell(bg, "center")),
      cell(own, baseCell(bg, "center")),
      statusCell(r.status, isAlt),
      cell(r.linen_type, baseCell(bg)),
      cell(r.finding_type, baseCell(bg)),
      cell(Number(r.finding_qty) || 0, baseCell(bg, "center")),
      cell(r.sending_note || "-", baseCell(bg)),
      foto ? linkCell(foto, isAlt) : cell("-", baseCell(bg, "center")),
      cell(r.process_note || "-", baseCell(bg)),
      proses ? linkCell(proses, isAlt) : cell("-", baseCell(bg, "center")),
      cell(r.completed_note || "-", baseCell(bg)),
      selesai ? linkCell(selesai, isAlt) : cell("-", baseCell(bg, "center")),
    ]);
  });

  if (!rows.length) {
    wsData.push([
      { v: "Tidak ada data untuk filter ini", t: "s", s: baseCell(C.white, "center") },
      ...Array(COLS - 1).fill(empty(baseCell(C.white))),
    ]);
  }

  const headerRow = meta.length + 3;
  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
  ws["!merges"] = [];
  for (let r = 0; r <= meta.length; r++) ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
  if (!rows.length) ws["!merges"].push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: COLS - 1 } });
  ws["!cols"] = [
    { wpx: 36 }, { wpx: 100 }, { wpx: 60 }, { wpx: 160 }, { wpx: 70 },
    { wpx: 120 }, { wpx: 160 }, { wpx: 90 }, { wpx: 90 }, { wpx: 90 },
    { wpx: 140 }, { wpx: 140 }, { wpx: 48 }, { wpx: 220 }, { wpx: 100 },
    { wpx: 220 }, { wpx: 100 }, { wpx: 220 }, { wpx: 100 },
  ];
  ws["!rows"] = [{ hpx: 28 }, { hpx: 18 }, { hpx: 18 }, { hpx: 18 }, { hpx: 8 }, { hpx: 32 }];
  ws["!views"] = [{ state: "frozen", ySplit: headerRow }];
  ws["!autofilter"] = { ref: `A${headerRow}:${colLetter(COLS - 1)}${headerRow}` };

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Laporan Linen");
  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan_linen_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
