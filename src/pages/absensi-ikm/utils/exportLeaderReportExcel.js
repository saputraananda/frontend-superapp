import XLSXStyle from "xlsx-js-style";

const PHOTO_BASE = "https://api.ikmalora.com/storage/dailyreport";

const C = {
  titleBg: "0F172A",
  headerBg: "4C1D95",
  metaBg: "EDE9FE",
  metaText: "4C1D95",
  alt: "F5F3FF",
  white: "FFFFFF",
  text: "1E293B",
  border: "CBD5E1",
  link: "1D4ED8",
  leaderBg: "DBEAFE", leaderText: "1D4ED8",
  deputiBg: "EDE9FE", deputiText: "6D28D9",
  bersihBg: "D1FAE5", bersihText: "065F46",
  kotorBg: "FFE4E6", kotorText: "9F1239",
  tepatBg: "D1FAE5", tepatText: "065F46",
  telatBg: "FFE4E6", telatText: "9F1239",
  absentBg: "FEF3C7", absentText: "92400E",
  lateBg: "FFEDD5", lateText: "9A3412",
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

const baseCell = (bg, align = "left", extra = {}) => ({
  fill: { fgColor: { rgb: bg } },
  font: { sz: 10, color: { rgb: C.text }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center", wrapText: true },
  border: border(),
  ...extra,
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
  if (!v) return "-";
  return String(v).slice(0, 5);
}

function photoUrl(row) {
  const raw = row?.briefing_doc_path || row?.briefing_doc_url;
  if (!raw) return null;
  const name = decodeURIComponent(String(raw).split("?")[0].split("/").filter(Boolean).pop() || "");
  if (!name || name === "null") return null;
  return `${PHOTO_BASE}/${encodeURIComponent(name)}`;
}

function badgeStyle(kind, isAlt) {
  const map = {
    Leader: [C.leaderBg, C.leaderText],
    Deputi: [C.deputiBg, C.deputiText],
    Bersih: [C.bersihBg, C.bersihText],
    Kotor: [C.kotorBg, C.kotorText],
    Tepat: [C.tepatBg, C.tepatText],
    Terlambat: [C.telatBg, C.telatText],
    "Tidak Hadir": [C.absentBg, C.absentText],
  };
  const [bg, text] = map[kind] || [isAlt ? C.alt : C.white, C.text];
  return {
    fill: { fgColor: { rgb: bg } },
    font: { bold: true, sz: 10, color: { rgb: text }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  };
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

function sheetSetup(ws, cols, headerRow) {
  ws["!cols"] = cols;
  ws["!rows"] = [{ hpx: 28 }, { hpx: 18 }, { hpx: 18 }, { hpx: 18 }, { hpx: 8 }, { hpx: 32 }];
  ws["!views"] = [{ state: "frozen", ySplit: headerRow }];
  ws["!autofilter"] = { ref: `A${headerRow}:${colLetter(cols.length - 1)}${headerRow}` };
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

function titleBlock(cols, title, metaLines) {
  const rows = [[
    { v: title, t: "s", s: titleStyle },
    ...Array(cols - 1).fill(empty({ fill: { fgColor: { rgb: C.titleBg } } })),
  ]];
  metaLines.forEach((line) => {
    rows.push([
      { v: line, t: "s", s: metaStyle },
      ...Array(cols - 1).fill(empty(metaStyle)),
    ]);
  });
  rows.push(Array(cols).fill(empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));
  return rows;
}

function merges(cols, metaCount) {
  const list = [];
  for (let r = 0; r <= metaCount; r++) list.push({ s: { r, c: 0 }, e: { r, c: cols - 1 } });
  return list;
}

export function exportLeaderReportExcel({
  rows = [],
  startDate,
  endDate,
  areaLabel = "Semua Area",
  search = "",
  periodMode = "cutoff",
}) {
  const periodStr = startDate && endDate ? `${fmtDate(startDate)} s.d. ${fmtDate(endDate)}` : "–";
  const modeLabel = { cutoff: "Periode Cutoff", today: "Hari Ini", custom: "Custom Tanggal" }[periodMode] || periodMode;
  const filterLabel = [
    `Mode: ${modeLabel}`,
    `Area: ${areaLabel}`,
    search ? `Pencarian: "${search}"` : "Pencarian: semua",
  ].join("  |  ");
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}  ·  ${rows.length} laporan`;
  const meta = [`Periode : ${periodStr}`, `Filter  : ${filterLabel}`, exportedAt];

  const COLS = 14;
  const headers = [
    "No", "Tanggal", "PIC", "Posisi", "Area", "Hadir", "Jam Mulai",
    "Ketepatan", "Kebersihan", "Tidak Hadir", "Terlambat", "Catatan Kendala",
    "Foto Briefing", "Pelapor",
  ];

  const wsData = titleBlock(COLS, "LEADER DAILY REPORT — IKM", meta);
  wsData.push(headers.map((h) => ({ v: h, t: "s", s: headerStyle })));

  rows.forEach((r, i) => {
    const isAlt = i % 2 === 1;
    const bg = isAlt ? C.alt : C.white;
    const absent = r.absent_employees || [];
    const late = r.late_employees || [];
    const url = photoUrl(r);
    const ketepatan = r.is_late ? "Terlambat" : "Tepat";
    wsData.push([
      cell(i + 1, baseCell(bg, "center")),
      cell(fmtDate(r.report_date), baseCell(bg, "center")),
      cell(r.pic_name, baseCell(bg)),
      cell(r.role || "-", badgeStyle(r.role, isAlt)),
      cell(r.area_name || "-", baseCell(bg)),
      cell(Number(r.present_count ?? 0), baseCell(bg, "center")),
      cell(fmtTime(r.production_start_time), baseCell(bg, "center")),
      cell(ketepatan, badgeStyle(ketepatan, isAlt)),
      cell(r.area_cleanliness || "-", badgeStyle(r.area_cleanliness, isAlt)),
      cell(absent.length ? absent.map((a) => `${a.full_name || "Karyawan #" + a.employee_id} (${a.absence_reason || "-"})`).join(", ") : "-", baseCell(bg)),
      cell(late.length ? late.map((l) => `${l.full_name || "Karyawan #" + l.employee_id} (${fmtTime(l.late_time)})`).join(", ") : "-", baseCell(bg)),
      cell(r.constraint_notes || "-", baseCell(bg)),
      url ? linkCell(url, isAlt) : cell("-", baseCell(bg, "center")),
      cell(r.reporter_employee_name || "-", baseCell(bg)),
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
  ws["!merges"] = merges(COLS, meta.length);
  if (!rows.length) ws["!merges"].push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: COLS - 1 } });
  sheetSetup(ws, [
    { wpx: 36 }, { wpx: 100 }, { wpx: 160 }, { wpx: 80 }, { wpx: 140 },
    { wpx: 56 }, { wpx: 72 }, { wpx: 90 }, { wpx: 90 }, { wpx: 280 },
    { wpx: 240 }, { wpx: 260 }, { wpx: 110 }, { wpx: 150 },
  ], headerRow);

  const detailHeaders = ["No", "Tanggal", "PIC", "Area", "Jenis", "Karyawan", "Keterangan"];
  const DCOLS = detailHeaders.length;
  const detail = titleBlock(DCOLS, "DETAIL TIDAK HADIR & TERLAMBAT", meta);
  detail.push(detailHeaders.map((h) => ({ v: h, t: "s", s: headerStyle })));

  let n = 0;
  rows.forEach((r) => {
    (r.absent_employees || []).forEach((a) => {
      const isAlt = n % 2 === 1;
      const bg = isAlt ? C.alt : C.white;
      n += 1;
      detail.push([
        cell(n, baseCell(bg, "center")),
        cell(fmtDate(r.report_date), baseCell(bg, "center")),
        cell(r.pic_name, baseCell(bg)),
        cell(r.area_name || "-", baseCell(bg)),
        cell("Tidak Hadir", badgeStyle("Tidak Hadir", isAlt)),
        cell(a.full_name || `Karyawan #${a.employee_id}`, baseCell(bg)),
        cell(a.absence_reason || "-", baseCell(bg, "center")),
      ]);
    });
    (r.late_employees || []).forEach((l) => {
      const isAlt = n % 2 === 1;
      const bg = isAlt ? C.alt : C.white;
      n += 1;
      detail.push([
        cell(n, baseCell(bg, "center")),
        cell(fmtDate(r.report_date), baseCell(bg, "center")),
        cell(r.pic_name, baseCell(bg)),
        cell(r.area_name || "-", baseCell(bg)),
        cell("Terlambat", badgeStyle("Terlambat", isAlt)),
        cell(l.full_name || `Karyawan #${l.employee_id}`, baseCell(bg)),
        cell(fmtTime(l.late_time), baseCell(bg, "center")),
      ]);
    });
  });

  if (!n) {
    detail.push([
      { v: "Tidak ada karyawan tidak hadir atau terlambat pada filter ini", t: "s", s: baseCell(C.white, "center") },
      ...Array(DCOLS - 1).fill(empty(baseCell(C.white))),
    ]);
  }

  const ws2 = XLSXStyle.utils.aoa_to_sheet(detail);
  ws2["!merges"] = merges(DCOLS, meta.length);
  if (!n) ws2["!merges"].push({ s: { r: detail.length - 1, c: 0 }, e: { r: detail.length - 1, c: DCOLS - 1 } });
  sheetSetup(ws2, [
    { wpx: 36 }, { wpx: 100 }, { wpx: 160 }, { wpx: 140 }, { wpx: 100 }, { wpx: 200 }, { wpx: 120 },
  ], headerRow);

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Laporan");
  XLSXStyle.utils.book_append_sheet(wb, ws2, "Detail Absen & Telat");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  a.href = url;
  a.download = `leader_daily_report_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
