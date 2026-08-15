import XLSXStyle from "xlsx-js-style";

const C = {
  headerBg: "1b3459",
  titleBg: "12233c",
  metaBg: "E8EEF5",
  metaText: "1b3459",
  altRowBg: "F1F5F9",
  whiteBg: "FFFFFF",
  textDark: "1E293B",
  borderColor: "CBD5E1",
  kasbon_bg: "DBEAFE",
  kasbon_text: "1E40AF",
  pinjaman_bg: "CFFAFE",
  pinjaman_text: "0E7490",
  pengajuan_bg: "FEF3C7",
  pengajuan_text: "92400E",
  proses_bg: "DBEAFE",
  proses_text: "1D4ED8",
  disetujui_bg: "D1FAE5",
  disetujui_text: "065F46",
  ditolak_bg: "FFE4E6",
  ditolak_text: "9F1239",
  total_bg: "EFF6FF",
  total_text: "1E40AF",
  grandTotalBg: "1b3459",
  grandTotalText: "FFFFFF",
};

const border = () => ({
  top: { style: "thin", color: { rgb: C.borderColor } },
  bottom: { style: "thin", color: { rgb: C.borderColor } },
  left: { style: "thin", color: { rgb: C.borderColor } },
  right: { style: "thin", color: { rgb: C.borderColor } },
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

const headerStyleLeft = {
  ...headerStyle,
  alignment: { ...headerStyle.alignment, horizontal: "left" },
};

const makeCellStyle = (isAlt, align = "left") => ({
  fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
  font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center" },
  border: border(),
});

const makeRupiahStyle = (isAlt) => ({
  ...makeCellStyle(isAlt, "right"),
  numFmt: "#,##0",
});

const makeStatusStyle = (status, isAlt) => {
  const map = {
    pengajuan: { bg: C.pengajuan_bg, text: C.pengajuan_text },
    proses: { bg: C.proses_bg, text: C.proses_text },
    disetujui: { bg: C.disetujui_bg, text: C.disetujui_text },
    ditolak: { bg: C.ditolak_bg, text: C.ditolak_text },
  };
  const colors = map[status] || { bg: isAlt ? C.altRowBg : C.whiteBg, text: C.textDark };
  return {
    fill: { fgColor: { rgb: colors.bg } },
    font: { bold: true, sz: 10, color: { rgb: colors.text }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  };
};

const makeTipeStyle = (type, isAlt) => {
  const map = {
    kasbon: { bg: C.kasbon_bg, text: C.kasbon_text },
    pinjaman: { bg: C.pinjaman_bg, text: C.pinjaman_text },
  };
  const colors = map[type] || { bg: isAlt ? C.altRowBg : C.whiteBg, text: C.textDark };
  return {
    fill: { fgColor: { rgb: colors.bg } },
    font: { bold: true, sz: 10, color: { rgb: colors.text }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  };
};

const grandTotalStyle = (align = "center") => ({
  fill: { fgColor: { rgb: C.grandTotalBg } },
  font: { bold: true, sz: 10, color: { rgb: C.grandTotalText }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center" },
  border: border(),
});

const grandTotalRupiahStyle = () => ({
  ...grandTotalStyle("right"),
  numFmt: "#,##0",
});

const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? `${v.slice(0, 10)}T00:00:00` : v
  );
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function toDateKey(v) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

const STATUS_LABEL = {
  pengajuan: "Pengajuan",
  proses: "Proses",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

const TYPE_LABEL = {
  kasbon: "Kasbon",
  pinjaman: "Pinjaman",
};

function toTitleCase(str) {
  if (!str) return "-";
  return String(str)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function exportKasbonCleanoxExcel({
  rows = [],
  summary = [],
  startDate,
  endDate,
  filters = {},
}) {
  const periodStr =
    startDate && endDate ? `${fmtDate(startDate)} s.d. ${fmtDate(endDate)}` : "–";
  const filterParts = [];
  if (filters.type) filterParts.push(`Tipe: ${TYPE_LABEL[filters.type] || filters.type}`);
  if (filters.status)
    filterParts.push(`Status: ${STATUS_LABEL[filters.status] || filters.status}`);
  if (filters.search) filterParts.push(`Pencarian: "${filters.search}"`);
  const filterLabel = filterParts.length
    ? filterParts.join("  |  ")
    : "Semua data (tanpa filter)";
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  })}`;

  const COLS = 8;
  const wsData1 = [];

  wsData1.push([
    { v: "REKAP KASBON & PINJAMAN CLEANOX", t: "s", s: titleStyle },
    ...Array(COLS - 1).fill(empty({ fill: { fgColor: { rgb: C.titleBg } } })),
  ]);
  wsData1.push([
    { v: `Periode : ${periodStr}`, t: "s", s: metaStyle },
    ...Array(COLS - 1).fill(empty(metaStyle)),
  ]);
  wsData1.push([
    { v: `Filter   : ${filterLabel}`, t: "s", s: metaStyle },
    ...Array(COLS - 1).fill(empty(metaStyle)),
  ]);
  wsData1.push([
    { v: exportedAt, t: "s", s: metaStyle },
    ...Array(COLS - 1).fill(empty(metaStyle)),
  ]);
  wsData1.push(Array(COLS).fill(empty({})));

  wsData1.push([
    cell("No", headerStyle),
    cell("Tanggal", headerStyleLeft),
    cell("Karyawan", headerStyleLeft),
    cell("Tipe", headerStyle),
    cell("Jumlah Diajukan", headerStyle),
    cell("Jumlah Disetujui", headerStyle),
    cell("Status", headerStyle),
    cell("Keperluan", headerStyleLeft),
  ]);

  let totalRequested = 0;
  let totalApproved = 0;

  rows.forEach((r, idx) => {
    const isAlt = idx % 2 === 1;
    const req = Number(r.amount_requested) || 0;
    const appr = Number(r.amount_approved) || 0;
    totalRequested += req;
    totalApproved += appr;

    wsData1.push([
      cell(idx + 1, makeCellStyle(isAlt, "center")),
      cell(fmtDate(r.submission_date), makeCellStyle(isAlt)),
      cell(toTitleCase(r.employee_name), makeCellStyle(isAlt)),
      cell(TYPE_LABEL[r.type] || r.type, makeTipeStyle(r.type, isAlt)),
      { v: req, t: "n", s: makeRupiahStyle(isAlt) },
      appr > 0
        ? { v: appr, t: "n", s: makeRupiahStyle(isAlt) }
        : cell("-", makeCellStyle(isAlt, "center")),
      cell(STATUS_LABEL[r.status] || r.status, makeStatusStyle(r.status, isAlt)),
      cell(r.purpose || "-", makeCellStyle(isAlt)),
    ]);
  });

  wsData1.push([
    cell("TOTAL", grandTotalStyle("left")),
    empty(grandTotalStyle()),
    { v: `${rows.length} pengajuan`, t: "s", s: grandTotalStyle() },
    empty(grandTotalStyle()),
    { v: totalRequested, t: "n", s: grandTotalRupiahStyle() },
    { v: totalApproved, t: "n", s: grandTotalRupiahStyle() },
    empty(grandTotalStyle()),
    empty(grandTotalStyle()),
  ]);

  const ws1 = XLSXStyle.utils.aoa_to_sheet(wsData1);
  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: COLS - 1 } },
  ];
  ws1["!cols"] = [
    { wpx: 36 },
    { wpx: 90 },
    { wpx: 160 },
    { wpx: 72 },
    { wpx: 110 },
    { wpx: 110 },
    { wpx: 80 },
    { wpx: 200 },
  ];
  ws1["!rows"] = [
    { hpx: 28 },
    { hpx: 20 },
    { hpx: 20 },
    { hpx: 20 },
    { hpx: 6 },
    { hpx: 32 },
  ];

  // Sheet 2: daily rekap
  const dayMap = new Map();
  rows.forEach((r) => {
    const dk = toDateKey(r.submission_date);
    if (!dayMap.has(dk)) {
      dayMap.set(dk, {
        kasbon: { count: 0, req: 0, appr: 0 },
        pinjaman: { count: 0, req: 0, appr: 0 },
      });
    }
    const day = dayMap.get(dk);
    const tipe = r.type === "kasbon" ? "kasbon" : "pinjaman";
    day[tipe].count += 1;
    day[tipe].req += Number(r.amount_requested) || 0;
    day[tipe].appr += Number(r.amount_approved) || 0;
  });

  const sortedDays = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const COLS_DAILY = 10;
  const wsData2 = [];
  const grpStyle = (rgb) => ({
    fill: { fgColor: { rgb } },
    font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: border(),
  });

  wsData2.push([
    { v: "REKAPITULASI HARIAN KASBON & PINJAMAN CLEANOX", t: "s", s: titleStyle },
    ...Array(COLS_DAILY - 1).fill(empty({ fill: { fgColor: { rgb: C.titleBg } } })),
  ]);
  wsData2.push([
    { v: `Periode : ${periodStr}`, t: "s", s: metaStyle },
    ...Array(COLS_DAILY - 1).fill(empty(metaStyle)),
  ]);
  wsData2.push([
    { v: exportedAt, t: "s", s: metaStyle },
    ...Array(COLS_DAILY - 1).fill(empty(metaStyle)),
  ]);
  wsData2.push(Array(COLS_DAILY).fill(empty({})));

  wsData2.push([
    cell("No", headerStyle),
    cell("Tanggal", headerStyleLeft),
    cell("KASBON", grpStyle("1E40AF")),
    empty({ fill: { fgColor: { rgb: "1E40AF" } }, border: border() }),
    empty({ fill: { fgColor: { rgb: "1E40AF" } }, border: border() }),
    cell("PINJAMAN", grpStyle("0E7490")),
    empty({ fill: { fgColor: { rgb: "0E7490" } }, border: border() }),
    empty({ fill: { fgColor: { rgb: "0E7490" } }, border: border() }),
    cell("TOTAL DIAJUKAN", headerStyle),
    cell("TOTAL DISETUJUI", headerStyle),
  ]);
  wsData2.push([
    empty(headerStyle),
    empty(headerStyleLeft),
    cell("Jml", grpStyle("2563EB")),
    cell("Diajukan", grpStyle("2563EB")),
    cell("Disetujui", grpStyle("2563EB")),
    cell("Jml", grpStyle("0891B2")),
    cell("Diajukan", grpStyle("0891B2")),
    cell("Disetujui", grpStyle("0891B2")),
    empty(headerStyle),
    empty(headerStyle),
  ]);

  let grandReq = 0;
  let grandAppr = 0;
  let grandKbCount = 0;
  let grandKbReq = 0;
  let grandKbAppr = 0;
  let grandPjCount = 0;
  let grandPjReq = 0;
  let grandPjAppr = 0;

  sortedDays.forEach(([dk, day], idx) => {
    const isAlt = idx % 2 === 1;
    const totalReq = day.kasbon.req + day.pinjaman.req;
    const totalAppr = day.kasbon.appr + day.pinjaman.appr;
    grandReq += totalReq;
    grandAppr += totalAppr;
    grandKbCount += day.kasbon.count;
    grandKbReq += day.kasbon.req;
    grandKbAppr += day.kasbon.appr;
    grandPjCount += day.pinjaman.count;
    grandPjReq += day.pinjaman.req;
    grandPjAppr += day.pinjaman.appr;

    wsData2.push([
      cell(idx + 1, makeCellStyle(isAlt, "center")),
      cell(fmtDate(dk), makeCellStyle(isAlt)),
      cell(day.kasbon.count, makeCellStyle(isAlt, "center")),
      { v: day.kasbon.req, t: "n", s: makeRupiahStyle(isAlt) },
      day.kasbon.appr > 0
        ? { v: day.kasbon.appr, t: "n", s: makeRupiahStyle(isAlt) }
        : cell("-", makeCellStyle(isAlt, "center")),
      cell(day.pinjaman.count, makeCellStyle(isAlt, "center")),
      { v: day.pinjaman.req, t: "n", s: makeRupiahStyle(isAlt) },
      day.pinjaman.appr > 0
        ? { v: day.pinjaman.appr, t: "n", s: makeRupiahStyle(isAlt) }
        : cell("-", makeCellStyle(isAlt, "center")),
      { v: totalReq, t: "n", s: makeRupiahStyle(isAlt) },
      { v: totalAppr, t: "n", s: makeRupiahStyle(isAlt) },
    ]);
  });

  wsData2.push([
    cell("TOTAL", grandTotalStyle("left")),
    { v: `${sortedDays.length} hari`, t: "s", s: grandTotalStyle() },
    cell(grandKbCount, grandTotalStyle()),
    { v: grandKbReq, t: "n", s: grandTotalRupiahStyle() },
    { v: grandKbAppr, t: "n", s: grandTotalRupiahStyle() },
    cell(grandPjCount, grandTotalStyle()),
    { v: grandPjReq, t: "n", s: grandTotalRupiahStyle() },
    { v: grandPjAppr, t: "n", s: grandTotalRupiahStyle() },
    { v: grandReq, t: "n", s: grandTotalRupiahStyle() },
    { v: grandAppr, t: "n", s: grandTotalRupiahStyle() },
  ]);

  const ws2 = XLSXStyle.utils.aoa_to_sheet(wsData2);
  ws2["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS_DAILY - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS_DAILY - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: COLS_DAILY - 1 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 7 } },
    { s: { r: 4, c: 8 }, e: { r: 5, c: 8 } },
    { s: { r: 4, c: 9 }, e: { r: 5, c: 9 } },
    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
    { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
  ];
  ws2["!cols"] = [
    { wpx: 36 },
    { wpx: 90 },
    { wpx: 40 },
    { wpx: 100 },
    { wpx: 100 },
    { wpx: 40 },
    { wpx: 100 },
    { wpx: 100 },
    { wpx: 110 },
    { wpx: 110 },
  ];

  // Sheet 3: employee summary
  const COLS_EMP = 8;
  const wsData3 = [];
  wsData3.push([
    { v: "RINGKASAN KASBON & PINJAMAN PER KARYAWAN CLEANOX", t: "s", s: titleStyle },
    ...Array(COLS_EMP - 1).fill(empty({ fill: { fgColor: { rgb: C.titleBg } } })),
  ]);
  wsData3.push([
    { v: `Periode : ${periodStr}`, t: "s", s: metaStyle },
    ...Array(COLS_EMP - 1).fill(empty(metaStyle)),
  ]);
  wsData3.push([
    { v: exportedAt, t: "s", s: metaStyle },
    ...Array(COLS_EMP - 1).fill(empty(metaStyle)),
  ]);
  wsData3.push(Array(COLS_EMP).fill(empty({})));
  wsData3.push([
    cell("No", headerStyle),
    cell("Karyawan", headerStyleLeft),
    cell("Jml Kasbon", headerStyle),
    cell("Total Kasbon", headerStyle),
    cell("Jml Pinjaman", headerStyle),
    cell("Total Pinjaman", headerStyle),
    cell("Total Semua", headerStyle),
    cell("Sisa Hutang", headerStyle),
  ]);

  let empGrandKasbon = 0;
  let empGrandPinjaman = 0;
  let empGrandAll = 0;
  let empGrandSisa = 0;

  summary.forEach((emp, idx) => {
    const isAlt = idx % 2 === 1;
    const kb = Number(emp.kasbon_total) || 0;
    const pj = Number(emp.pinjaman_total) || 0;
    const all = Number(emp.total_all) || 0;
    const sisa = Number(emp.sisa) || 0;
    empGrandKasbon += kb;
    empGrandPinjaman += pj;
    empGrandAll += all;
    empGrandSisa += sisa;

    wsData3.push([
      cell(idx + 1, makeCellStyle(isAlt, "center")),
      cell(toTitleCase(emp.employee_name), makeCellStyle(isAlt)),
      cell(emp.kasbon_count, makeCellStyle(isAlt, "center")),
      { v: kb, t: "n", s: makeRupiahStyle(isAlt) },
      cell(emp.pinjaman_count, makeCellStyle(isAlt, "center")),
      { v: pj, t: "n", s: makeRupiahStyle(isAlt) },
      {
        v: all,
        t: "n",
        s: {
          ...makeRupiahStyle(isAlt),
          font: { bold: true, sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
        },
      },
      sisa > 0
        ? {
            v: sisa,
            t: "n",
            s: {
              fill: { fgColor: { rgb: "FEF3C7" } },
              font: { bold: true, sz: 10, color: { rgb: "92400E" }, name: "Calibri" },
              alignment: { horizontal: "right", vertical: "center" },
              border: border(),
              numFmt: "#,##0",
            },
          }
        : cell("Nihil", {
            fill: { fgColor: { rgb: "D1FAE5" } },
            font: { bold: true, sz: 10, color: { rgb: "065F46" }, name: "Calibri" },
            alignment: { horizontal: "center", vertical: "center" },
            border: border(),
          }),
    ]);
  });

  wsData3.push([
    cell("TOTAL", grandTotalStyle("left")),
    { v: `${summary.length} karyawan`, t: "s", s: grandTotalStyle() },
    empty(grandTotalStyle()),
    { v: empGrandKasbon, t: "n", s: grandTotalRupiahStyle() },
    empty(grandTotalStyle()),
    { v: empGrandPinjaman, t: "n", s: grandTotalRupiahStyle() },
    { v: empGrandAll, t: "n", s: grandTotalRupiahStyle() },
    { v: empGrandSisa, t: "n", s: grandTotalRupiahStyle() },
  ]);

  const ws3 = XLSXStyle.utils.aoa_to_sheet(wsData3);
  ws3["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS_EMP - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS_EMP - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: COLS_EMP - 1 } },
  ];
  ws3["!cols"] = [
    { wpx: 36 },
    { wpx: 160 },
    { wpx: 80 },
    { wpx: 110 },
    { wpx: 80 },
    { wpx: 110 },
    { wpx: 120 },
    { wpx: 110 },
  ];

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws1, "Daftar Pengajuan");
  XLSXStyle.utils.book_append_sheet(wb, ws2, "Rekapitulasi Harian");
  XLSXStyle.utils.book_append_sheet(wb, ws3, "Ringkasan Karyawan");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  a.href = url;
  a.download = `rekap_kasbon_pinjaman_cleanox_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
