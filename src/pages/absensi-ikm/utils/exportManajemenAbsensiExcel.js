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

  // Status colours
  status_lengkap_bg:      "D1FAE5", status_lengkap_text:      "065F46",
  status_belum_out_bg:    "FEF3C7", status_belum_out_text:    "92400E",
  status_belum_in_bg:     "FFE4E6", status_belum_in_text:     "9F1239",
  status_foto_bg:         "FFEDD5", status_foto_text:         "9A3412",
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

function calcDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "-";
  const diff = new Date(checkOut) - new Date(checkIn);
  if (diff <= 0) return "-";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export function exportManagementAbsensiExcel({ records, periodLabel, activePeriod, filters, leaveResumeMap = new Map() }) {
  const periodStr = activePeriod
    ? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
    : "–";

  const filterParts = [];
  if (filters?.onlyIncomplete) filterParts.push("Hanya data belum lengkap");
  if (filters?.statusFilter) filterParts.push(`Status: ${filters.statusFilter}`);
  if (filters?.selectedEmployeeNames?.length > 0) {
    const names = filters.selectedEmployeeNames;
    filterParts.push(
      names.length <= 3
        ? `Karyawan: ${names.join(", ")}`
        : `Karyawan: ${names.slice(0, 3).join(", ")} +${names.length - 3} lainnya`
    );
  }
  const filterLabel = filterParts.length > 0 ? filterParts.join("  |  ") : "Semua data (tanpa filter)";
  const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

  // ── Sheet 1: Absensi Manajemen ──────────────────────────────────────────────
  const TOTAL_COLS = 11;
  const wsData = [];

  // Title / meta rows
  const emptyTitle = Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle));
  const emptyMeta = Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle));
  const emptySpacer = Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } }));

  wsData.push([cell("Riwayat Absensi Manajemen IKM", titleStyle), ...emptyTitle]);
  wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
  wsData.push([cell(`Filter: ${filterLabel}`, metaStyle), ...emptyMeta]);
  wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
  wsData.push(emptySpacer);

  // Headers
  const headers = [
    "No", "Tanggal", "NIK", "Nama Karyawan", "Jabatan",
    "Jam Absen In", "Jam Absen Out", "Durasi", "Lokasi In", "Lokasi Out", "Status"
  ];
  wsData.push(headers.map(h => cell(h, headerStyle)));

  // Data rows
  records.forEach((r, idx) => {
    const isAlt = idx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");

    wsData.push([
      cell(idx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(fmtDate(r.work_date), csCenter),
      cell(r.employee_code || "-", csCenter),
      cell(r.employee_name || "-", cs),
      cell(r.jabatan || "-", cs),
      cell(fmtTime(r.check_in_time), csCenter),
      cell(fmtTime(r.check_out_time), csCenter),
      cell(calcDuration(r.check_in_time, r.check_out_time), csCenter),
      cell(r.check_in_lat ? `${r.check_in_lat}, ${r.check_in_lng}` : "-", csCenter),
      cell(r.check_out_lat ? `${r.check_out_lat}, ${r.check_out_lng}` : "-", csCenter),
      cell(r.status_label || "-", makeStatusStyle(r.status_label, isAlt)),
    ]);
  });

  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

  // Merge metadata rows
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } },
  ];

  // Column widths
  ws["!cols"] = [
    { wch: 5 },  // No
    { wch: 15 }, // Tanggal
    { wch: 12 }, // NIK
    { wch: 25 }, // Nama Karyawan
    { wch: 15 }, // Jabatan
    { wch: 15 }, // Jam Absen In
    { wch: 15 }, // Jam Absen Out
    { wch: 10 }, // Durasi
    { wch: 22 }, // Lokasi In
    { wch: 22 }, // Lokasi Out
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


  // ── Sheet 2: Resume Karyawan ──────────────────────────────────────────────
  const TOTAL_S2 = 12;
  const summaryWsData = [];

  // Compute period days
  let totalPeriodDays = 0;
  if (activePeriod?.startDate && activePeriod?.endDate) {
    const s2 = new Date(activePeriod.startDate);
    const e2 = new Date(activePeriod.endDate);
    totalPeriodDays = Math.round((e2 - s2) / 86400000) + 1;
  }
  const LIBUR_PER_CUTOFF = 4;
  const totalHariKerja = Math.max(0, totalPeriodDays - LIBUR_PER_CUTOFF);

  // Unique work dates per employee
  const empAttendDays = new Map(); // empKey → Set of dateKeys
  records.forEach((row) => {
    if (!row.check_in_time) return;
    const empKey = row.employee_id ?? row.employee_name;
    const dk = row.work_date ? String(row.work_date).slice(0, 10) : null;
    if (!dk) return;
    if (!empAttendDays.has(empKey)) empAttendDays.set(empKey, new Set());
    empAttendDays.get(empKey).add(dk);
  });

  // Style helpers for stat columns
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

  const hariKerjaHdr  = statHdrStyle("0F4C81"); // dark blue
  const kehadiranHdr  = statHdrStyle("065F46"); // dark emerald
  const lemburHarHdr  = statHdrStyle("7F1D1D"); // dark red
  const jwajibHdr     = statHdrStyle("1C3D5A"); // navy
  const jlemburHdr    = statHdrStyle("5B21B6"); // dark purple
  const groupHeaderPengajuan = { fill: { fgColor: { rgb: "1E6B3C" } }, font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: border() };
  const emptyGroupStyle = { fill: { fgColor: { rgb: C.headerBg } }, border: border() };

  // Title / meta rows
  summaryWsData.push([cell("Resume Karyawan Manajemen IKM", titleStyle), ...Array.from({ length: TOTAL_S2 - 1 }, () => empty(titleStyle))]);
  summaryWsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...Array.from({ length: TOTAL_S2 - 1 }, () => empty(metaStyle))]);
  summaryWsData.push(Array.from({ length: TOTAL_S2 }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

  // Row 3: Group headers
  summaryWsData.push([
    cell("#", headerStyle),
    cell("Nama Karyawan", headerStyle),
    cell("Keterangan", headerStyle),
    cell("Grand Total Jam Kerja", headerStyle),
    cell("Total Hari Kerja",    hariKerjaHdr),
    cell("Total Kehadiran",     kehadiranHdr),
    cell("Total Lembur Harian", lemburHarHdr),
    cell("Jam Kerja Wajib",     jwajibHdr),
    cell("Jam Lembur",          jlemburHdr),
    cell("Pengajuan Karyawan", groupHeaderPengajuan),
    empty(emptyGroupStyle), empty(emptyGroupStyle),
  ]);

  // Row 4: Column sub-headers
  const SUM_HEADERS = [
    "", "", "", "", "", "", "", "", "",
    "Sakit", "Izin", "Cuti",
  ];
  summaryWsData.push(SUM_HEADERS.map((h, i) =>
    (i < 9) ? empty(headerStyle) : cell(h, headerStyle)
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
        totalMinutes: 0,
      });
    }
    const emp = employeeMapFull.get(id);
    if (row.check_in_time && row.check_out_time) {
      const diff = new Date(row.check_out_time) - new Date(row.check_in_time);
      if (diff > 0) {
        emp.totalMinutes += (diff / 60000);
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
  const makePengajuanStyle = (isAlt, value) => ({
    fill: { fgColor: { rgb: value > 0 ? pengajuanBg.bg : (isAlt ? C.altRowBg : C.whiteBg) } },
    font: { sz: 10, bold: value > 0, color: { rgb: value > 0 ? pengajuanBg.text : C.textGray }, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center" }, border: border(),
  });

  const sortedEmployees = [...employeeMapFull.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "id-ID")
  );

  sortedEmployees.forEach((emp, sumIdx) => {
    const isAlt = sumIdx % 2 === 1;
    const cs = makeCellStyle(isAlt);
    const csCenter = makeCellStyle(isAlt, "center");

    const keteranganStr = "Normal";
    const keteranganStyle = { fill: { fgColor: { rgb: "DBEAFE" } }, font: { bold: true, sz: 10, color: { rgb: "1D4ED8" }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" }, border: border() };

    // Attendance stats
    const kehadiran = empAttendDays.get(emp.empKey)?.size ?? 0;
    const lemburHarian = Math.max(0, kehadiran - totalHariKerja);
    const jamKerjaWajibMin = totalHariKerja * 8 * 60;
    const jamLemburMin = Math.max(0, emp.totalMinutes - jamKerjaWajibMin);

    // Leave data
    const leaveData = (emp.employee_id && leaveResumeMap.get(emp.employee_id)) || {};
    const pSakit = Number(leaveData.pengajuan_sakit || 0);
    const pIzin  = Number(leaveData.pengajuan_izin  || 0);
    const pCuti  = Number(leaveData.pengajuan_cuti  || 0);

    summaryWsData.push([
      cell(sumIdx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
      cell(emp.name, cs),
      cell(keteranganStr, keteranganStyle),
      cell(formatMinutes(emp.totalMinutes), csCenter),
      cell(String(totalHariKerja),     statCellStyle(isAlt)),
      cell(String(kehadiran),          statCellStyle(isAlt, kehadiran < totalHariKerja, "DCFCE7", "065F46")),
      cell(fmtCount(lemburHarian),     statCellStyle(isAlt, lemburHarian > 0, "FEE2E2", "DC2626")),
      cell(formatMinutes(jamKerjaWajibMin), csCenter),
      cell(jamLemburMin > 0 ? formatMinutes(jamLemburMin) : "-", statCellStyle(isAlt, jamLemburMin > 0, "F3E8FF", "7C3AED")),
      // Pengajuan
      cell(fmtCount(pSakit), makePengajuanStyle(isAlt, pSakit)),
      cell(fmtCount(pIzin),  makePengajuanStyle(isAlt, pIzin)),
      cell(fmtCount(pCuti),  makePengajuanStyle(isAlt, pCuti)),
    ]);
  });

  const ws2 = XLSXStyle.utils.aoa_to_sheet(summaryWsData);

  ws2["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_S2 - 1 } }, // title
    { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_S2 - 1 } }, // periode
    // Row 3-4 vertical merges for single-col headers
    { s: { r: 3, c: 0  }, e: { r: 4, c: 0  } }, // #
    { s: { r: 3, c: 1  }, e: { r: 4, c: 1  } }, // Nama Karyawan
    { s: { r: 3, c: 2  }, e: { r: 4, c: 2  } }, // Keterangan
    { s: { r: 3, c: 3  }, e: { r: 4, c: 3  } }, // Grand Total Jam Kerja
    { s: { r: 3, c: 4  }, e: { r: 4, c: 4  } }, // Total Hari Kerja
    { s: { r: 3, c: 5  }, e: { r: 4, c: 5  } }, // Total Kehadiran
    { s: { r: 3, c: 6  }, e: { r: 4, c: 6  } }, // Total Lembur Harian
    { s: { r: 3, c: 7  }, e: { r: 4, c: 7  } }, // Jam Kerja Wajib
    { s: { r: 3, c: 8  }, e: { r: 4, c: 8  } }, // Jam Lembur
    // Pengajuan: horizontal row 3, sub-headers in row 4
    { s: { r: 3, c: 9  }, e: { r: 3, c: 11 } }, // Pengajuan Karyawan (3 cols)
  ];

  ws2["!cols"] = [
    { wch: 5  }, // #
    { wch: 26 }, // Nama
    { wch: 14 }, // Keterangan
    { wch: 20 }, // Grand Total Jam Kerja
    { wch: 12 }, // Total Hari Kerja
    { wch: 12 }, // Total Kehadiran
    { wch: 14 }, // Total Lembur Harian
    { wch: 13 }, // Jam Kerja Wajib
    { wch: 12 }, // Jam Lembur
    { wch: 9  }, // P.Sakit
    { wch: 9  }, // P.Izin
    { wch: 9  }, // P.Cuti
  ];

  ws2["!rows"] = [
    { hpt: 32 }, // Title
    { hpt: 18 }, // Periode
    { hpt: 6  }, // Spacer
    { hpt: 28 }, // Group header
    { hpt: 30 }, // Column header
  ];


  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Absensi Manajemen");
  XLSXStyle.utils.book_append_sheet(wb, ws2, "Resume Karyawan");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const dateStr = (activePeriod?.startDate ?? new Date().toISOString().split("T")[0]).replaceAll("-", "");
  
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `riwayat_absensi_manajemen_ikm_${dateStr}.xlsx`
  );
}