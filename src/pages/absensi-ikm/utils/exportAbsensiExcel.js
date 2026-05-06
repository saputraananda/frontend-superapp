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

  // Status colours
  status_lengkap_bg:      "D1FAE5", status_lengkap_text:      "065F46",
  status_belum_out_bg:    "FEF3C7", status_belum_out_text:    "92400E",
  status_belum_in_bg:     "FFE4E6", status_belum_in_text:     "9F1239",
  status_foto_bg:         "FFEDD5", status_foto_text:         "9A3412",

  // Lupa absen keluar
  lupa_absen_bg:    "FEE2E2", // red-100
  lupa_absen_text:  "DC2626", // red-600
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

const makeShiftStyle = (shiftType, isAlt) => {
  const key = String(shiftType || "").toLowerCase();
  const map = {
    pagi:   { bg: C.shift_pagi_bg,   text: C.shift_pagi_text },
    siang:  { bg: C.shift_siang_bg,  text: C.shift_siang_text },
    sore:   { bg: C.shift_sore_bg,   text: C.shift_sore_text },
    lembur: { bg: C.shift_lembur_bg, text: C.shift_lembur_text },
  };
  const colors = map[key] || { bg: isAlt ? C.altRowBg : C.whiteBg, text: C.textDark };
  return {
    fill: { fgColor: { rgb: colors.bg } },
    font: { bold: true, sz: 10, color: { rgb: colors.text }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  };
};

const makeStatusStyle = (statusLabel, isAlt) => {
  const map = {
    "Lengkap":            { bg: C.status_lengkap_bg,   text: C.status_lengkap_text },
    "Belum check-out":    { bg: C.status_belum_out_bg,  text: C.status_belum_out_text },
    "Belum check-in":     { bg: C.status_belum_in_bg,   text: C.status_belum_in_text },
    "Foto belum lengkap": { bg: C.status_foto_bg,       text: C.status_foto_text },
  };
  const colors = map[statusLabel] || { bg: isAlt ? C.altRowBg : C.whiteBg, text: C.textDark };
  return {
    fill: { fgColor: { rgb: colors.bg } },
    font: { bold: true, sz: 10, color: { rgb: colors.text }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  };
};

const lupaAbsenStyle = {
  fill: { fgColor: { rgb: C.lupa_absen_bg } },
  font: { bold: true, sz: 10, color: { rgb: C.lupa_absen_text }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
  border: border(),
};

// Summary row styles
const summaryLabelStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "right", vertical: "center" },
  border: border(),
};
const summaryValueStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
  border: border(),
};
const summaryEmptyStyle = {
  fill: { fgColor: { rgb: C.headerBg } },
  border: border(),
};

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

function fmtDateTime(d) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function calcDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "-";
  const diff = new Date(checkOut) - new Date(checkIn);
  if (diff <= 0) return "-";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function getStatusLabel(row) {
  const hasCheckIn = Boolean(row.check_in_time);
  const hasCheckOut = Boolean(row.check_out_time);
  const hasCheckInPhoto = Boolean(row.check_in_photo_name || row.check_in_photo_url);
  const hasCheckOutPhoto = Boolean(row.check_out_photo_name || row.check_out_photo_url);

  if (!hasCheckIn) return "Belum check-in";
  if (!hasCheckOut) return "Belum check-out";
  if (!hasCheckInPhoto || !hasCheckOutPhoto) return "Foto belum lengkap";
  return "Lengkap";
}

/**
 * Determine if an employee "lupa absen keluar" — they checked in but never checked out.
 * If check_in_time exists but check_out_time is falsy → lupa absen keluar.
 */
function isLupaAbsenKeluar(row) {
  return Boolean(row.check_in_time) && !row.check_out_time;
}

// ─── Main export function ─────────────────────────────────────────────────────
export function exportAbsensiExcel({
  records,
  periodLabel,
  activePeriod,
  filters,
  summary,
}) {
  const TOTAL_COLS = 9;

  const periodStr = activePeriod
    ? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
    : "–";

  // Build filter info string
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

  // ── Collect rows ──────────────────────────────────────────────────────────
  const wsData = [];

  // Row 0: Title
  wsData.push([
    cell("Detail Riwayat Absensi IKM", titleStyle),
    ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle)),
  ]);

  // Row 1: Period
  wsData.push([
    cell(`Periode: ${periodLabel || periodStr}`, metaStyle),
    ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle)),
  ]);

  // Row 2: Filter info
  wsData.push([
    cell(`Filter: ${filterLabel}`, metaStyle),
    ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle)),
  ]);

  // Row 3: Exported at
  wsData.push([
    cell(exportedAt, metaStyle),
    ...Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle)),
  ]);

  // Row 4: Blank spacer
  wsData.push(Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  // Row 5: Column headers
  const HEADERS = [
    "#",
    "Tanggal Kerja",
    "Nama Karyawan",
    "Kode Karyawan",
    "Shift",
    "Absen In",
    "Absen Out",
    "Durasi",
    "Status",
  ];
  wsData.push(HEADERS.map((h) => cell(h, headerStyle)));

  // Row 6+: Data rows
  let lupaCount = 0;
  records.forEach((row, idx) => {
    const isAlt = idx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");
    const lupa = isLupaAbsenKeluar(row);
    if (lupa) lupaCount++;

    const statusLabel = row.status_label || getStatusLabel(row);
    const duration = calcDuration(row.check_in_time, row.check_out_time);

    // For Absen Out cell: if lupa absen keluar, show red cell
    const absenOutCell = lupa
      ? cell("Lupa Absen Keluar", lupaAbsenStyle)
      : cell(row.check_out_time ? fmtDateTime(row.check_out_time) : "-", csCenter);

    // For Duration cell: if lupa, also red
    const durationCell = lupa
      ? cell("-", lupaAbsenStyle)
      : cell(duration, csCenter);

    // Keterangan column
    const keterangan = lupa ? "Lupa Absen Keluar" : "";
    const keteranganCell = lupa
      ? cell(keterangan, lupaAbsenStyle)
      : cell(keterangan, cs);

    const isValet = Boolean(row.is_valet || row.is_valet === 1 || row.is_valet === "1");
    const shiftStr = String(row.shift_type || "-").toUpperCase() + (isValet ? " (VALET)" : "");

    wsData.push([
      cell(idx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(row.work_date ? fmtDate(row.work_date) : "-", csCenter),
      cell(row.employee_name || "-", cs),
      cell(row.employee_code || "-", { ...csCenter, font: { sz: 9, color: { rgb: C.textGray }, name: "Courier New" } }),
      cell(shiftStr, makeShiftStyle(row.shift_type, isAlt)),
      cell(row.check_in_time ? fmtDateTime(row.check_in_time) : "-", csCenter),
      absenOutCell,
      durationCell,
      cell(statusLabel, makeStatusStyle(statusLabel, isAlt)),
    ]);
  });

  // Summary footer
  const totalRecords = records.length;
  const totalLengkap = records.filter((r) => (r.status_label || getStatusLabel(r)) === "Lengkap").length;
  const totalBelumOut = records.filter((r) => isLupaAbsenKeluar(r)).length;
  const totalBelumIn = records.filter((r) => (r.status_label || getStatusLabel(r)) === "Belum check-in").length;

  const sl = summaryLabelStyle;
  const sv = summaryValueStyle;
  const se = summaryEmptyStyle;

  // Spacer before summary
  wsData.push(Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  wsData.push([
    empty(se), empty(se), empty(se), empty(se), empty(se), empty(se),
    cell("Total Record", sl), cell(totalRecords, sv), empty(se),
  ]);
  wsData.push([
    empty(se), empty(se), empty(se), empty(se), empty(se), empty(se),
    cell("Lengkap", sl), cell(totalLengkap, sv), empty(se),
  ]);
  wsData.push([
    empty(se), empty(se), empty(se), empty(se), empty(se), empty(se),
    cell("Lupa Absen Keluar", sl),
    cell(totalBelumOut, {
      ...sv,
      font: { ...sv.font, color: { rgb: totalBelumOut > 0 ? "FCA5A5" : "FFFFFF" } },
    }),
    empty(se),
  ]);
  wsData.push([
    empty(se), empty(se), empty(se), empty(se), empty(se), empty(se),
    cell("Belum Check-in", sl), cell(totalBelumIn, sv), empty(se),
  ]);

  // ── Build worksheet 1 ───────────────────────────────────────────────────────
  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

  // Merge title / meta rows
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } },
  ];

  // Column widths
  ws["!cols"] = [
    { wch: 5  }, // #
    { wch: 16 }, // Tanggal Kerja
    { wch: 24 }, // Nama Karyawan
    { wch: 14 }, // Kode
    { wch: 16 }, // Shift
    { wch: 22 }, // Absen In
    { wch: 22 }, // Absen Out
    { wch: 10 }, // Durasi
    { wch: 20 }, // Status
  ];

  // Row heights
  ws["!rows"] = [
    { hpt: 32 }, // Title
    { hpt: 18 }, // Periode
    { hpt: 18 }, // Filter
    { hpt: 18 }, // Exported at
    { hpt: 6  }, // Spacer
    { hpt: 24 }, // Header
  ];

  // ── Build Worksheet 2: Summary by Employee ────────────────────────────────
  const summaryWsData = [];

  summaryWsData.push([
    cell("Rangkuman Jam Kerja Tiap Karyawan", titleStyle),
    ...Array.from({ length: 7 }, () => empty(titleStyle)),
  ]);

  summaryWsData.push([
    cell(`Periode: ${periodLabel || periodStr}`, metaStyle),
    ...Array.from({ length: 7 }, () => empty(metaStyle)),
  ]);

  summaryWsData.push(Array.from({ length: 8 }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  const VALET_HIGHLIGHT = {
    fill: { fgColor: { rgb: "FFF7ED" } }, // orange-50
    font: { bold: true, sz: 10, color: { rgb: "C2410C" }, name: "Calibri" }, // orange-700
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
  };

  const SUM_HEADERS = ["#", "Nama Karyawan", "Total Pagi", "Total Siang", "Total Sore", "Total Lembur", "Total Keseluruhan", "Keterangan"];
  summaryWsData.push(SUM_HEADERS.map((h) => cell(h, headerStyle)));

  // Build employee summary map — include ALL employees from records (even no-checkout)
  const employeeMapFull = new Map();
  records.forEach((row) => {
    const id = row.employee_id ?? row.employee_name;
    if (!employeeMapFull.has(id)) {
      employeeMapFull.set(id, {
        name: row.employee_name || "-",
        pagi: 0,
        siang: 0,
        sore: 0,
        lembur: 0,
        hasValet: false,
        hasNormal: false,
      });
    }

    const emp = employeeMapFull.get(id);

    // Track valet vs normal flag
    const isValet = Boolean(row.is_valet) || row.is_valet === 1 || row.is_valet === "1";
    if (isValet) emp.hasValet = true;
    else emp.hasNormal = true;

    // Only accumulate duration if both check_in & check_out exist
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

  // Sort alphabetically by name
  const sortedEmployees = [...employeeMapFull.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "id-ID")
  );

  sortedEmployees.forEach((emp, sumIdx) => {
    const isAlt = sumIdx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");

    const totalMin = emp.pagi + emp.siang + emp.sore + emp.lembur;

    // Determine keterangan: Normal + Valet (hijau) | Valet (merah) | Normal (biru)
    let keteranganStr = "";
    let keteranganStyle = cs;
    if (emp.hasValet && emp.hasNormal) {
      keteranganStr = "Normal + Valet";
      keteranganStyle = {
        fill: { fgColor: { rgb: "DCFCE7" } }, // green-100
        font: { bold: true, sz: 10, color: { rgb: "15803D" }, name: "Calibri" }, // green-700
        alignment: { horizontal: "center", vertical: "center" },
        border: border(),
      };
    } else if (emp.hasValet) {
      keteranganStr = "Valet";
      keteranganStyle = {
        fill: { fgColor: { rgb: "FEE2E2" } }, // red-100
        font: { bold: true, sz: 10, color: { rgb: "DC2626" }, name: "Calibri" }, // red-600
        alignment: { horizontal: "center", vertical: "center" },
        border: border(),
      };
    } else if (emp.hasNormal) {
      keteranganStr = "Normal";
      keteranganStyle = {
        fill: { fgColor: { rgb: "DBEAFE" } }, // blue-100
        font: { bold: true, sz: 10, color: { rgb: "1D4ED8" }, name: "Calibri" }, // blue-700
        alignment: { horizontal: "center", vertical: "center" },
        border: border(),
      };
    }

    summaryWsData.push([
      cell(sumIdx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(emp.name, cs),
      cell(formatMinutes(emp.pagi), csCenter),
      cell(formatMinutes(emp.siang), csCenter),
      cell(formatMinutes(emp.sore), csCenter),
      cell(formatMinutes(emp.lembur), csCenter),
      cell(formatMinutes(totalMin), { ...csCenter, font: { ...csCenter.font, bold: true } }),
      cell(keteranganStr, keteranganStyle),
    ]);
  });

  const ws2 = XLSXStyle.utils.aoa_to_sheet(summaryWsData);
  ws2["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
  ];
  ws2["!cols"] = [
    { wch: 5 },  // #
    { wch: 28 }, // Nama
    { wch: 14 }, // Pagi
    { wch: 14 }, // Siang
    { wch: 14 }, // Sore
    { wch: 14 }, // Lembur
    { wch: 18 }, // Total
    { wch: 14 }, // Keterangan
  ];
  ws2["!rows"] = [
    { hpt: 32 }, // Title
    { hpt: 18 }, // Periode
    { hpt: 6  }, // Spacer
    { hpt: 24 }, // Header
  ];

  // ── Build workbook ────────────────────────────────────────────────────────
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Riwayat Absensi");
  XLSXStyle.utils.book_append_sheet(wb, ws2, "Resume Karyawan");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });

  const dateStr = (activePeriod?.startDate ?? new Date().toISOString().split("T")[0]).replaceAll("-", "");
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `riwayat_absensi_ikm_${dateStr}.xlsx`
  );
}