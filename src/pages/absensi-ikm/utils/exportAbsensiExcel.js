import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  headerBg:    "1E3A5F", // dark blue
  titleBg:     "0F172A", // slate-900
  metaBg:      "E0F2FE", // sky-100
  metaText:    "0C4A6E", // sky-900
  altRowBg:    "F0F9FF", // sky-50
  whiteBg:     "FFFFFF",
  textDark:    "1E293B", // slate-800
  textGray:    "64748B",
  borderColor: "CBD5E1", // slate-300

  // Shift colours
  shift_pagi_bg:    "E0F2FE", shift_pagi_text:    "0369A1",
  shift_siang_bg:   "FEF3C7", shift_siang_text:   "92400E",
  shift_sore_bg:    "FFEDD5", shift_sore_text:     "9A3412",
  shift_lembur_bg:  "F3E8FF", shift_lembur_text:   "7C3AED",
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

function fmtDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function fmtTime(d) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// ─── Main export function ─────────────────────────────────────────────────────
export function exportAbsensiExcel({
  records,
  periodLabel,
  activePeriod,
  filters,
  leaveResumeMap = new Map(),
}) {
  const periodStr = activePeriod
    ? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
    : "–";

  const filterParts = [];
  if (filters?.shiftType) filterParts.push(`Shift: ${filters.shiftType.toUpperCase()}`);
  if (filters?.onlyIncomplete) filterParts.push("Hanya data belum lengkap");
  if (filters?.selectedEmployeeNames?.length > 0) {
    const names = filters.selectedEmployeeNames;
    filterParts.push(
      names.length <= 3
        ? `Karyawan: ${names.join(", ")}`
        : `Karyawan: ${names.slice(0, 3).join(", ")} +${names.length - 3} lainnya`
    );
  }
  if (filters?.statusFilter) filterParts.push(`Status: ${filters.statusFilter}`);
  const filterLabel = filterParts.length > 0 ? filterParts.join("  |  ") : "Semua data (tanpa filter)";
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

  // ── Sheet 1: Pivot layout — employee × ALL dates in period ────────────────
  // Cols: # | Nama | Tanggal | Pagi×3 | Siang×3 | Sore×3 | Lembur×3 | Grand Total | Lembur Final
  const TOTAL_COLS = 17;
  const SHIFTS = ["pagi", "siang", "sore", "lembur"];
  const WORK_HOURS_PER_DAY = 8 * 60; // 480 minutes

  // ── Generate full date list for the period ────────────────────────────────
  const allDates = [];
  if (activePeriod?.startDate && activePeriod?.endDate) {
    const cur = new Date(activePeriod.startDate);
    const end = new Date(activePeriod.endDate);
    while (cur <= end) {
      allDates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }

  // ── Collect all unique employees (sorted A-Z) ─────────────────────────────
  const empMeta = new Map(); // empKey → { name, employee_id }
  records.forEach((row) => {
    const empKey = row.employee_id ?? row.employee_name;
    if (!empMeta.has(empKey)) {
      empMeta.set(empKey, {
        name: row.employee_name || "-",
        employee_id: row.employee_id,
      });
    }
  });
  const sortedEmps = [...empMeta.entries()].sort((a, b) =>
    String(a[1].name).localeCompare(String(b[1].name), "id-ID")
  );

  // ── Build attendance lookup: empKey + date + shift → {in, out} ───────────
  const attendLookup = new Map(); // key: `${empKey}||${date}||${shift}`
  records.forEach((row) => {
    const empKey = row.employee_id ?? row.employee_name;
    const dateKey = row.work_date ? String(row.work_date).slice(0, 10) : "-";
    const shiftKey = String(row.shift_type || "").toLowerCase();
    const lk = `${empKey}||${dateKey}||${shiftKey}`;
    if (!attendLookup.has(lk)) attendLookup.set(lk, { in: null, out: null });
    const entry = attendLookup.get(lk);
    if (row.check_in_time)  entry.in  = row.check_in_time;
    if (row.check_out_time) entry.out = row.check_out_time;
  });

  // ── Duration in minutes helper ─────────────────────────────────────────────
  const diffMinutes = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const d = new Date(checkOut) - new Date(checkIn);
    return d > 0 ? d / 60000 : 0;
  };

  const fmtMin = (m) => {
    if (!m || m <= 0) return "-";
    const h = Math.floor(m / 60);
    const mn = Math.floor(m % 60);
    return h > 0 ? `${h}j ${mn}m` : `${mn}m`;
  };

  // ── Style helpers ──────────────────────────────────────────────────────────
  const shiftGroupHeaderStyle = (shiftKey) => {
    const colorMap = {
      pagi:   { bg: "0369A1", text: "FFFFFF" },
      siang:  { bg: "92400E", text: "FFFFFF" },
      sore:   { bg: "9A3412", text: "FFFFFF" },
      lembur: { bg: "6D28D9", text: "FFFFFF" },
    };
    const c = colorMap[shiftKey] || { bg: C.headerBg, text: "FFFFFF" };
    return { fill: { fgColor: { rgb: c.bg } }, font: { bold: true, sz: 10, color: { rgb: c.text }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: border() };
  };

  const shiftCellStyle = (shiftKey, isMissing = false) => {
    const colorMap = {
      pagi:   { bg: isMissing ? "FEE2E2" : C.shift_pagi_bg,   text: isMissing ? "DC2626" : C.shift_pagi_text },
      siang:  { bg: isMissing ? "FEE2E2" : C.shift_siang_bg,  text: isMissing ? "DC2626" : C.shift_siang_text },
      sore:   { bg: isMissing ? "FEE2E2" : C.shift_sore_bg,   text: isMissing ? "DC2626" : C.shift_sore_text },
      lembur: { bg: isMissing ? "FEE2E2" : C.shift_lembur_bg, text: isMissing ? "DC2626" : C.shift_lembur_text },
    };
    const c = colorMap[shiftKey] || { bg: "FFFFFF", text: C.textGray };
    return { fill: { fgColor: { rgb: c.bg } }, font: { sz: 10, color: { rgb: c.text }, name: "Calibri", italic: isMissing }, alignment: { horizontal: "center", vertical: "center" }, border: border() };
  };

  const emptyShiftSty = (isAlt) => ({
    fill: { fgColor: { rgb: isAlt ? C.altRowBg : "F8FAFC" } },
    font: { sz: 10, color: { rgb: "CBD5E1" }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  });

  const grandTotalStyle = (isAlt, isOver) => ({
    fill: { fgColor: { rgb: isOver ? "DCFCE7" : (isAlt ? C.altRowBg : C.whiteBg) } },
    font: { bold: true, sz: 10, color: { rgb: isOver ? "15803D" : C.textDark }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  });

  const lemburFinalStyle = (isAlt, hasLembur) => ({
    fill: { fgColor: { rgb: hasLembur ? "F3E8FF" : (isAlt ? C.altRowBg : C.whiteBg) } },
    font: { bold: hasLembur, sz: 10, color: { rgb: hasLembur ? "7C3AED" : C.textGray }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  });

  // ── Build wsData ──────────────────────────────────────────────────────────
  const wsData = [];
  const emptyHdr = { fill: { fgColor: { rgb: C.headerBg } }, border: border() };
  const grandTotalHdrStyle = { fill: { fgColor: { rgb: "166534" } }, font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: border() };
  const lemburFinalHdrStyle = { fill: { fgColor: { rgb: "5B21B6" } }, font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: border() };

  // Title / meta rows
  wsData.push([cell("Detail Riwayat Absensi IKM", titleStyle), ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle))]);
  wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle))]);
  wsData.push([cell(`Filter: ${filterLabel}`, metaStyle), ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle))]);
  wsData.push([cell(exportedAt, metaStyle), ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle))]);
  wsData.push(Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  // Row 5: Group headers
  wsData.push([
    empty(emptyHdr), empty(emptyHdr), empty(emptyHdr), // #, Nama, Tanggal
    cell("Shift Pagi",   shiftGroupHeaderStyle("pagi")),   empty(emptyHdr), empty(emptyHdr),
    cell("Shift Siang",  shiftGroupHeaderStyle("siang")),  empty(emptyHdr), empty(emptyHdr),
    cell("Shift Sore",   shiftGroupHeaderStyle("sore")),   empty(emptyHdr), empty(emptyHdr),
    cell("Shift Lembur", shiftGroupHeaderStyle("lembur")), empty(emptyHdr), empty(emptyHdr),
    cell("Grand Total", grandTotalHdrStyle),
    cell("Lembur Final", lemburFinalHdrStyle),
  ]);

  // Row 6: Sub-headers
  wsData.push([
    "#", "Nama Karyawan", "Tanggal",
    "Masuk", "Keluar", "Total",
    "Masuk", "Keluar", "Total",
    "Masuk", "Keluar", "Total",
    "Masuk", "Keluar", "Total",
    "Grand Total", "Lembur Final",
  ].map((h) => cell(h, headerStyle)));

  // Row 7+: Data rows — one row per employee per date
  let rowIdx = 0;
  const datesToRender = allDates.length > 0 ? allDates : [...new Set(records.map(r => String(r.work_date || "").slice(0, 10)).filter(Boolean))].sort();

  sortedEmps.forEach(([empKey, meta]) => {
    datesToRender.forEach((dateKey) => {
      const isAlt = rowIdx % 2 === 1;
      const cs = makeCellStyle(isAlt);
      const csCenter = makeCellStyle(isAlt, "center");

      const shiftCells = [];
      let grandTotalMin = 0;

      SHIFTS.forEach((s) => {
        const lk = `${empKey}||${dateKey}||${s}`;
        const data = attendLookup.get(lk) || { in: null, out: null };
        const hasIn  = Boolean(data.in);
        const hasOut = Boolean(data.out);

        if (!hasIn && !hasOut) {
          shiftCells.push(cell("-", emptyShiftSty(isAlt)), cell("-", emptyShiftSty(isAlt)), cell("-", emptyShiftSty(isAlt)));
        } else {
          const isMissingOut = hasIn && !hasOut;
          const mins = diffMinutes(data.in, data.out);
          grandTotalMin += mins;
          const sty = shiftCellStyle(s, isMissingOut);
          shiftCells.push(
            cell(hasIn  ? fmtTime(data.in)  : "-", sty),
            cell(hasOut ? fmtTime(data.out) : "Lupa Absen Keluar", isMissingOut ? { ...sty, font: { ...sty.font, bold: true } } : sty),
            cell(fmtMin(mins), sty),
          );
        }
      });

      const isOver = grandTotalMin > WORK_HOURS_PER_DAY;
      const lemburFinalMin = Math.max(0, grandTotalMin - WORK_HOURS_PER_DAY);

      wsData.push([
        cell(rowIdx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
        cell(meta.name, cs),
        cell(fmtDate(dateKey), csCenter),
        ...shiftCells,
        cell(grandTotalMin > 0 ? fmtMin(grandTotalMin) : "-", grandTotalStyle(isAlt, isOver)),
        cell(lemburFinalMin > 0 ? fmtMin(lemburFinalMin) : "-", lemburFinalStyle(isAlt, lemburFinalMin > 0)),
      ]);
      rowIdx++;
    });
  });

  // ── Build worksheet 1 ─────────────────────────────────────────────────────
  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } },
    { s: { r: 5, c: 3 }, e: { r: 5, c: 5  } }, // Shift Pagi
    { s: { r: 5, c: 6 }, e: { r: 5, c: 8  } }, // Shift Siang
    { s: { r: 5, c: 9 }, e: { r: 5, c: 11 } }, // Shift Sore
    { s: { r: 5, c: 12}, e: { r: 5, c: 14 } }, // Shift Lembur
  ];

  ws["!cols"] = [
    { wch: 5  }, // #
    { wch: 24 }, // Nama
    { wch: 15 }, // Tanggal
    { wch: 20 }, // Masuk Pagi
    { wch: 20 }, // Keluar Pagi
    { wch: 10 }, // Total Pagi
    { wch: 20 }, // Masuk Siang
    { wch: 20 }, // Keluar Siang
    { wch: 10 }, // Total Siang
    { wch: 20 }, // Masuk Sore
    { wch: 20 }, // Keluar Sore
    { wch: 10 }, // Total Sore
    { wch: 20 }, // Masuk Lembur
    { wch: 20 }, // Keluar Lembur
    { wch: 10 }, // Total Lembur
    { wch: 13 }, // Grand Total
    { wch: 13 }, // Lembur Final
  ];

  ws["!rows"] = [
    { hpt: 32 }, // Title
    { hpt: 18 }, // Periode
    { hpt: 18 }, // Filter
    { hpt: 18 }, // Exported at
    { hpt: 6  }, // Spacer
    { hpt: 22 }, // Group header
    { hpt: 24 }, // Sub-header
  ];





  // ── Build Worksheet 2: Resume Karyawan ───────────────────────────────────
  // Layout: # | Nama | Keterangan | [Jam Kerja×5] | Total Hari Kerja | Total Kehadiran | Total Lembur Harian | Jam Kerja Wajib | Jam Lembur | [Pengajuan×3] | [Leader×4]
  // Total cols: 3 + 5 + 5 + 3 + 4 = 20
  const TOTAL_S2 = 20;

  // Compute period stats: total days in cutoff, minus 4 weekend/holiday
  let totalPeriodDays = 0;
  if (activePeriod?.startDate && activePeriod?.endDate) {
    const s2 = new Date(activePeriod.startDate);
    const e2 = new Date(activePeriod.endDate);
    totalPeriodDays = Math.round((e2 - s2) / 86400000) + 1;
  }
  const LIBUR_PER_CUTOFF = 4;
  const totalHariKerja = Math.max(0, totalPeriodDays - LIBUR_PER_CUTOFF);

  // Count attendance days per employee (dates with any check-in)
  const empAttendDays = new Map(); // empKey → Set of dateKeys
  records.forEach((row) => {
    if (!row.check_in_time) return;
    const empKey = row.employee_id ?? row.employee_name;
    const dk = row.work_date ? String(row.work_date).slice(0, 10) : null;
    if (!dk) return;
    if (!empAttendDays.has(empKey)) empAttendDays.set(empKey, new Set());
    empAttendDays.get(empKey).add(dk);
  });

  const summaryWsData = [];

  // Style helpers for new stat columns
  const statHdrStyle = (bg) => ({
    fill: { fgColor: { rgb: bg } },
    font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: border(),
  });
  const statCellStyle = (isAlt, highlight = false, highlightBg = "FEF3C7", highlightText = "92400E") => ({
    fill: { fgColor: { rgb: highlight ? highlightBg : (isAlt ? C.altRowBg : C.whiteBg) } },
    font: { bold: highlight, sz: 10, color: { rgb: highlight ? highlightText : C.textDark }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  });

  // Title + meta
  summaryWsData.push([cell("Resume Karyawan IKM", titleStyle), ...Array.from({ length: TOTAL_S2 - 1 }, () => empty(titleStyle))]);
  summaryWsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...Array.from({ length: TOTAL_S2 - 1 }, () => empty(metaStyle))]);
  summaryWsData.push(Array.from({ length: TOTAL_S2 }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  // Row 3: Group headers
  const groupHeaderJamKerja = { fill: { fgColor: { rgb: C.headerBg } }, font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: border() };
  const groupHeaderPengajuan = { fill: { fgColor: { rgb: "1E6B3C" } }, font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: border() };
  const groupHeaderLeader    = { fill: { fgColor: { rgb: "7C3AED" } }, font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: border() };
  const emptyGroupStyle = { fill: { fgColor: { rgb: C.headerBg } }, border: border() };

  // Stat group header colours
  const hariKerjaHdr  = statHdrStyle("0F4C81"); // dark blue
  const kehadiranHdr  = statHdrStyle("065F46"); // dark emerald
  const lemburHarHdr  = statHdrStyle("7F1D1D"); // dark red
  const jwajibHdr     = statHdrStyle("1C3D5A"); // navy
  const jlemburHdr    = statHdrStyle("5B21B6"); // dark purple

  summaryWsData.push([
    cell("#", headerStyle),                               // col 0 — merge r3-r4
    cell("Nama Karyawan", headerStyle),                   // col 1 — merge r3-r4
    cell("Keterangan", headerStyle),                      // col 2 — merge r3-r4
    cell("Jam Kerja", groupHeaderJamKerja),               // 5 cols: Pagi Siang Sore Lembur Grand
    empty(emptyGroupStyle), empty(emptyGroupStyle), empty(emptyGroupStyle), empty(emptyGroupStyle),
    cell("Total Hari Kerja",    hariKerjaHdr),            // col 8  — merge r3-r4
    cell("Total Kehadiran",     kehadiranHdr),            // col 9  — merge r3-r4
    cell("Total Lembur Harian", lemburHarHdr),            // col 10 — merge r3-r4
    cell("Jam Kerja Wajib",     jwajibHdr),               // col 11 — merge r3-r4
    cell("Jam Lembur",          jlemburHdr),              // col 12 — merge r3-r4
    cell("Pengajuan Karyawan", groupHeaderPengajuan),     // 3 cols
    empty(emptyGroupStyle), empty(emptyGroupStyle),
    cell("Laporan Leader", groupHeaderLeader),            // 4 cols
    empty(emptyGroupStyle), empty(emptyGroupStyle), empty(emptyGroupStyle),
  ]);

  // Row 4: Column sub-headers
  // Stat cols (8-12) intentionally blank here — they merge vertically with row 3 headers above
  const SUM_HEADERS = [
    "#", "Nama Karyawan", "Keterangan",
    "Total Pagi", "Total Siang", "Total Sore", "Total Lembur", "Grand Total",
    "", "", "", "", "",  // merged from row 3 (stat cols)
    "Sakit", "Izin", "Cuti",
    "Sakit", "Izin", "Alfa", "Telat",
  ];
  summaryWsData.push(SUM_HEADERS.map((h, i) =>
    (i >= 8 && i <= 12) ? empty(headerStyle) : cell(h, headerStyle)
  ));

  // Build employee summary map
  const employeeMapFull = new Map();
  records.forEach((row) => {
    const id = row.employee_id ?? row.employee_name;
    if (!employeeMapFull.has(id)) {
      employeeMapFull.set(id, {
        name: row.employee_name || "-",
        employee_id: Number(row.employee_id) || null,
        empKey: id,
        pagi: 0, siang: 0, sore: 0, lembur: 0,
        hasValet: false, hasNormal: false,
      });
    }
    const emp = employeeMapFull.get(id);
    const isValet = Boolean(row.is_valet) || row.is_valet === 1 || row.is_valet === "1";
    if (isValet) emp.hasValet = true; else emp.hasNormal = true;
    if (row.check_in_time && row.check_out_time) {
      const diff = new Date(row.check_out_time) - new Date(row.check_in_time);
      if (diff > 0) {
        const minutes = diff / 60000;
        const shift = String(row.shift_type).toLowerCase();
        if (shift === "pagi") emp.pagi += minutes;
        else if (shift === "siang") emp.siang += minutes;
        else if (shift === "sore") emp.sore += minutes;
        else if (shift === "lembur") emp.lembur += minutes;
      }
    }
  });

  const formatMinutes = (m) => {
    if (!m || m <= 0) return "-";
    const h = Math.floor(m / 60);
    const min = Math.floor(m % 60);
    return h > 0 ? `${h}j ${min}m` : `${min}m`;
  };
  const fmtCount = (n) => (n > 0 ? String(n) : "-");

  const pengajuanBg = { bg: "F0FDF4", text: "15803D" };
  const leaderBg    = { bg: "FAF5FF", text: "7C3AED" };
  const makePengajuanStyle = (isAlt, value) => ({
    fill: { fgColor: { rgb: value > 0 ? pengajuanBg.bg : (isAlt ? C.altRowBg : C.whiteBg) } },
    font: { sz: 10, bold: value > 0, color: { rgb: value > 0 ? pengajuanBg.text : C.textGray }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" }, border: border(),
  });
  const makeLeaderStyle = (isAlt, value) => ({
    fill: { fgColor: { rgb: value > 0 ? leaderBg.bg : (isAlt ? C.altRowBg : C.whiteBg) } },
    font: { sz: 10, bold: value > 0, color: { rgb: value > 0 ? leaderBg.text : C.textGray }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" }, border: border(),
  });

  const sortedEmployees = [...employeeMapFull.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "id-ID")
  );

  sortedEmployees.forEach((emp, sumIdx) => {
    const isAlt = sumIdx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");

    // Keterangan
    let keteranganStr = "";
    let keteranganStyle = cs;
    if (emp.hasValet && emp.hasNormal) {
      keteranganStr = "Normal + Valet";
      keteranganStyle = { fill: { fgColor: { rgb: "DCFCE7" } }, font: { bold: true, sz: 10, color: { rgb: "15803D" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" }, border: border() };
    } else if (emp.hasValet) {
      keteranganStr = "Valet";
      keteranganStyle = { fill: { fgColor: { rgb: "FEE2E2" } }, font: { bold: true, sz: 10, color: { rgb: "DC2626" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" }, border: border() };
    } else {
      keteranganStr = "Normal";
      keteranganStyle = { fill: { fgColor: { rgb: "DBEAFE" } }, font: { bold: true, sz: 10, color: { rgb: "1D4ED8" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" }, border: border() };
    }

    // Grand Total jam kerja (menit)
    const grandMin = emp.pagi + emp.siang + emp.sore + emp.lembur;

    // Attendance stats
    const kehadiran = empAttendDays.get(emp.empKey)?.size ?? 0;
    // Lembur Harian: hanya ada jika kehadiran MELEBIHI total hari kerja
    const lemburHarian = Math.max(0, kehadiran - totalHariKerja);
    // Jam Kerja Wajib: 8 jam × total hari kerja dalam periode
    const jamKerjaWajibMin = totalHariKerja * 8 * 60;
    const jamLemburMin = Math.max(0, grandMin - jamKerjaWajibMin);

    // Leave data
    const leaveData = (emp.employee_id && leaveResumeMap.get(emp.employee_id)) || {};
    const pSakit = Number(leaveData.pengajuan_sakit || 0);
    const pIzin  = Number(leaveData.pengajuan_izin  || 0);
    const pCuti  = Number(leaveData.pengajuan_cuti  || 0);
    const lSakit = Number(leaveData.laporan_sakit   || 0);
    const lIzin  = Number(leaveData.laporan_izin    || 0);
    const lAlfa  = Number(leaveData.laporan_alfa    || 0);
    const lTelat = Number(leaveData.laporan_telat   || 0);

    summaryWsData.push([
      cell(sumIdx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(emp.name, cs),
      cell(keteranganStr, keteranganStyle),
      // Jam Kerja
      cell(formatMinutes(emp.pagi),   csCenter),
      cell(formatMinutes(emp.siang),  csCenter),
      cell(formatMinutes(emp.sore),   csCenter),
      cell(formatMinutes(emp.lembur), csCenter),
      cell(formatMinutes(grandMin), { ...csCenter, font: { ...csCenter.font, bold: true } }),
      // Stats
      cell(String(totalHariKerja),     statCellStyle(isAlt)),
      cell(String(kehadiran),          statCellStyle(isAlt, kehadiran < totalHariKerja, "DCFCE7", "065F46")),
      cell(fmtCount(lemburHarian),     statCellStyle(isAlt, lemburHarian > 0, "FEE2E2", "DC2626")),
      cell(formatMinutes(jamKerjaWajibMin), csCenter),
      cell(jamLemburMin > 0 ? formatMinutes(jamLemburMin) : "-", statCellStyle(isAlt, jamLemburMin > 0, "F3E8FF", "7C3AED")),
      // Pengajuan
      cell(fmtCount(pSakit), makePengajuanStyle(isAlt, pSakit)),
      cell(fmtCount(pIzin),  makePengajuanStyle(isAlt, pIzin)),
      cell(fmtCount(pCuti),  makePengajuanStyle(isAlt, pCuti)),
      // Leader
      cell(fmtCount(lSakit), makeLeaderStyle(isAlt, lSakit)),
      cell(fmtCount(lIzin),  makeLeaderStyle(isAlt, lIzin)),
      cell(fmtCount(lAlfa),  makeLeaderStyle(isAlt, lAlfa)),
      cell(fmtCount(lTelat), makeLeaderStyle(isAlt, lTelat)),
    ]);
  });

  const ws2 = XLSXStyle.utils.aoa_to_sheet(summaryWsData);
  ws2["!merges"] = [
    { s: { r: 0, c: 0  }, e: { r: 0, c: TOTAL_S2 - 1 } }, // title
    { s: { r: 1, c: 0  }, e: { r: 1, c: TOTAL_S2 - 1 } }, // periode
    // Row 3-4 vertical merges for single-col headers (#, Nama, Keterangan)
    { s: { r: 3, c: 0  }, e: { r: 4, c: 0  } }, // #
    { s: { r: 3, c: 1  }, e: { r: 4, c: 1  } }, // Nama
    { s: { r: 3, c: 2  }, e: { r: 4, c: 2  } }, // Keterangan
    // Jam Kerja horizontal merge (row 3 only, row 4 has sub-headers)
    { s: { r: 3, c: 3  }, e: { r: 3, c: 7  } }, // Jam Kerja
    // Stat cols: vertical merge rows 3-4 (no sub-header in row 4)
    { s: { r: 3, c: 8  }, e: { r: 4, c: 8  } }, // Total Hari Kerja
    { s: { r: 3, c: 9  }, e: { r: 4, c: 9  } }, // Total Kehadiran
    { s: { r: 3, c: 10 }, e: { r: 4, c: 10 } }, // Total Lembur Harian
    { s: { r: 3, c: 11 }, e: { r: 4, c: 11 } }, // Jam Kerja Wajib
    { s: { r: 3, c: 12 }, e: { r: 4, c: 12 } }, // Jam Lembur
    // Pengajuan & Leader: horizontal row 3, sub-headers in row 4
    { s: { r: 3, c: 13 }, e: { r: 3, c: 15 } }, // Pengajuan (3 cols)
    { s: { r: 3, c: 16 }, e: { r: 3, c: 19 } }, // Leader (4 cols)
  ];
  ws2["!cols"] = [
    { wch: 5  }, // #
    { wch: 26 }, // Nama
    { wch: 14 }, // Keterangan
    { wch: 12 }, // Pagi
    { wch: 12 }, // Siang
    { wch: 12 }, // Sore
    { wch: 12 }, // Lembur
    { wch: 14 }, // Grand Total
    { wch: 12 }, // Total Hari Kerja
    { wch: 12 }, // Total Kehadiran
    { wch: 14 }, // Total Lembur Harian
    { wch: 13 }, // Jam Kerja Wajib
    { wch: 12 }, // Jam Lembur
    { wch: 9  }, // P.Sakit
    { wch: 9  }, // P.Izin
    { wch: 9  }, // P.Cuti
    { wch: 9  }, // L.Sakit
    { wch: 9  }, // L.Izin
    { wch: 9  }, // L.Alfa
    { wch: 9  }, // L.Telat
  ];
  ws2["!rows"] = [
    { hpt: 32 }, // Title
    { hpt: 18 }, // Periode
    { hpt: 6  }, // Spacer
    { hpt: 28 }, // Group header
    { hpt: 30 }, // Column header
  ];

  // ── Build Worksheet 3: Keterlambatan ─────────────────────────────────────
  // Karyawan reguler (is_valet = 0), shift pagi, masuk setelah 10:15.
  // Valet dikosongkan dan tidak dihitung.
  const LATE_AFTER_MIN = 10 * 60 + 15;
  const clockMinutes = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  };
  const isValetRow = (row) => row.is_valet === 1 || row.is_valet === true || row.is_valet === "1";

  const lateRows = records
    .filter((row) => {
      if (isValetRow(row)) return false;
      if (String(row.shift_type || "").toLowerCase() !== "pagi") return false;
      if (!row.check_in_time) return false;
      const mins = clockMinutes(row.check_in_time);
      return mins != null && mins > LATE_AFTER_MIN;
    })
    .sort((a, b) => {
      const byName = String(a.employee_name || "").localeCompare(String(b.employee_name || ""), "id-ID");
      if (byName) return byName;
      const byId = String(a.employee_id ?? "").localeCompare(String(b.employee_id ?? ""));
      if (byId) return byId;
      return String(a.work_date || a.check_in_time).localeCompare(String(b.work_date || b.check_in_time));
    });

  const groups = [];
  lateRows.forEach((row) => {
    const key = row.employee_id ?? row.employee_name;
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) groups.push({ key, name: row.employee_name || "-", rows: [row] });
    else last.rows.push(row);
  });

  const LATE_COLS = 9;
  const lateMark = () => ({
    fill: { fgColor: { rgb: "FEF3C7" } },
    font: { bold: true, sz: 10, color: { rgb: "92400E" }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  });
  const mergeStyle = (align = "center") => ({
    fill: { fgColor: { rgb: "FFFFFF" } },
    font: { bold: true, sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
    alignment: { horizontal: align, vertical: "center", wrapText: true },
    border: border(),
  });
  const lateWs = [];
  const lateMerges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: LATE_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: LATE_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: LATE_COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: LATE_COLS - 1 } },
  ];
  lateWs.push([cell("Keterlambatan Absensi IKM", titleStyle), ...Array.from({ length: LATE_COLS - 1 }, () => empty(titleStyle))]);
  lateWs.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...Array.from({ length: LATE_COLS - 1 }, () => empty(metaStyle))]);
  lateWs.push([cell("Karyawan reguler · shift pagi · masuk setelah 10:15 · valet tidak dihitung", metaStyle), ...Array.from({ length: LATE_COLS - 1 }, () => empty(metaStyle))]);
  lateWs.push([cell(`${exportedAt}  ·  ${lateRows.length} keterlambatan · ${groups.length} karyawan`, metaStyle), ...Array.from({ length: LATE_COLS - 1 }, () => empty(metaStyle))]);
  lateWs.push(Array.from({ length: LATE_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));
  lateWs.push(["No", "Nama Karyawan", "Total Keterlambatan", "Tanggal", "Shift", "Jam Masuk", "Jam Keluar", "Batas", "Terlambat"].map((h) => cell(h, headerStyle)));

  groups.forEach((g, gi) => {
    const start = lateWs.length;
    g.rows.forEach((row, i) => {
      const isAlt = i % 2 === 1;
      const csCenter = makeCellStyle(isAlt, "center");
      const mins = clockMinutes(row.check_in_time);
      const lateMin = Math.max(0, (mins ?? 0) - LATE_AFTER_MIN);
      const idStyle = mergeStyle("center");
      const nameStyle = mergeStyle("left");
      lateWs.push([
        i === 0 ? cell(gi + 1, idStyle) : empty(idStyle),
        i === 0 ? cell(g.name, nameStyle) : empty(nameStyle),
        i === 0 ? cell(`${g.rows.length}X`, idStyle) : empty(idStyle),
        cell(fmtDate(row.work_date || row.check_in_time), csCenter),
        cell("Pagi", csCenter),
        cell(fmtTime(row.check_in_time), lateMark(isAlt)),
        cell(row.check_out_time ? fmtTime(row.check_out_time) : "-", csCenter),
        cell("10:15", csCenter),
        cell(fmtMin(lateMin), lateMark(isAlt)),
      ]);
    });
    if (g.rows.length > 1) {
      const end = start + g.rows.length - 1;
      lateMerges.push({ s: { r: start, c: 0 }, e: { r: end, c: 0 } });
      lateMerges.push({ s: { r: start, c: 1 }, e: { r: end, c: 1 } });
      lateMerges.push({ s: { r: start, c: 2 }, e: { r: end, c: 2 } });
    }
  });

  if (!groups.length) {
    lateWs.push([
      cell("Tidak ada keterlambatan pada filter ini", makeCellStyle(false, "center")),
      ...Array.from({ length: LATE_COLS - 1 }, () => empty(makeCellStyle(false))),
    ]);
    lateMerges.push({ s: { r: lateWs.length - 1, c: 0 }, e: { r: lateWs.length - 1, c: LATE_COLS - 1 } });
  }

  const ws3 = XLSXStyle.utils.aoa_to_sheet(lateWs);
  ws3["!merges"] = lateMerges;
  ws3["!cols"] = [
    { wch: 5 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
  ];
  ws3["!rows"] = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 }];

  // ── Build workbook ────────────────────────────────────────────────────────
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Riwayat Absensi");
  XLSXStyle.utils.book_append_sheet(wb, ws2, "Resume Karyawan");
  XLSXStyle.utils.book_append_sheet(wb, ws3, "Keterlambatan");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });

  const dateStr = (activePeriod?.startDate ?? new Date().toISOString().split("T")[0]).replaceAll("-", "");
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `riwayat_absensi_ikm_${dateStr}.xlsx`
  );
}