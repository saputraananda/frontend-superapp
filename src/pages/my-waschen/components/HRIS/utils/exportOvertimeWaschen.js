import { fmtEmployeeName } from "../../../utils/hrisUtils";
import {
  buildSheet, capitalize, cell, cellStyle, emptyRow, exportedAtText, filterText, fmtDate, fmtDateTime, fmtDay,
  fmtMinutes, numStyle, periodText, rangeSlug, saveWorkbook, statusStyle, totalLabelStyle, totalStyle,
} from "./excelShared";

const hhmm = (t) => (t ? String(t).slice(0, 5) : "-");

function toMin(t) {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Durasi lembur dalam menit. Pakai start_at/end_at (datetime) bila ada, kalau tidak dari jam.
function durationMin(r) {
  if (r.start_at && r.end_at) {
    const d = new Date(String(r.end_at).replace(" ", "T")) - new Date(String(r.start_at).replace(" ", "T"));
    if (d > 0) return d / 60000;
  }
  const s = toMin(r.start_time);
  const e = toMin(r.end_time);
  if (s == null || e == null) return 0;
  return e >= s ? e - s : e + 1440 - s; // lewat tengah malam
}

/**
 * Export lembur Waschen.
 * @param {object} o  { rows, startDate, endDate, periodLabel, filters: { outlet, role, status, search } }
 */
export function exportOvertimeWaschenExcel({ rows = [], startDate, endDate, periodLabel, filters = {} }) {
  const lines = [
    periodText(startDate, endDate, periodLabel),
    filterText([
      filters.outlet && `Outlet: ${filters.outlet}`,
      filters.role && `Posisi: ${filters.role}`,
      filters.status && filters.status !== "Semua" && `Status: ${capitalize(filters.status)}`,
      filters.search && `Cari: "${filters.search}"`,
    ]),
    exportedAtText(),
  ];

  const list = [...rows]
    .map((r) => ({ ...r, dur: durationMin(r), name: fmtEmployeeName(r.employee_name) }))
    .sort((a, b) =>
      String(a.overtime_date).localeCompare(String(b.overtime_date))
      || a.name.localeCompare(b.name, "id")
      || String(a.start_time).localeCompare(String(b.start_time)));

  // ── Sheet 1: Daftar Lembur ──
  const H1 = ["No", "Kode", "Nama Karyawan", "Tanggal", "Hari", "Mulai", "Selesai", "Durasi", "Alasan", "Catatan Kerja", "Status", "Direview Oleh", "Waktu Review", "Catatan Review"];
  const rows1 = list.map((r, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    return [
      cell(i + 1, numStyle(alt)),
      cell(r.employee_code || "-", cc),
      cell(r.name, cellStyle(alt)),
      cell(fmtDate(r.overtime_date), cc),
      cell(fmtDay(r.overtime_date), cc),
      cell(hhmm(r.start_time), cc),
      cell(r.status === "berlangsung" && !r.end_time ? "(aktif)" : hhmm(r.end_time), cc),
      cell(fmtMinutes(r.dur), cc),
      cell(r.reason || "-", cellStyle(alt)),
      cell(r.work_note || "", cellStyle(alt)),
      cell(capitalize(r.status), statusStyle(r.status, alt)),
      cell(r.reviewed_by_name || "-", cellStyle(alt)),
      cell(r.reviewed_at ? fmtDateTime(r.reviewed_at) : "-", cc),
      cell(r.approval_note || r.rejection_note || "", cellStyle(alt)),
    ];
  });
  const ws1 = buildSheet({
    title: "Daftar Lembur Karyawan Waschen",
    lines,
    headers: H1,
    rows: rows1.length ? rows1 : [emptyRow(H1.length)],
    widths: [5, 11, 26, 13, 9, 8, 9, 9, 36, 36, 13, 20, 18, 30],
  });

  // ── Sheet 2: Rekap per Karyawan ──
  const map = new Map();
  list.forEach((r) => {
    const id = String(r.employee_id);
    if (!map.has(id)) map.set(id, { name: r.name, code: r.employee_code, sesi: 0, approved: 0, approvedMin: 0, allMin: 0, pengajuan: 0, ditolak: 0, days: new Set() });
    const e = map.get(id);
    e.sesi += 1;
    e.allMin += r.dur;
    if (r.status === "disetujui") {
      e.approved += 1;
      e.approvedMin += r.dur;
      if (r.overtime_date) e.days.add(String(r.overtime_date).slice(0, 10));
    }
    if (r.status === "pengajuan" || r.status === "berlangsung") e.pengajuan += 1;
    if (r.status === "ditolak") e.ditolak += 1;
  });
  const emps = [...map.values()].sort((a, b) => b.approvedMin - a.approvedMin || a.name.localeCompare(b.name, "id"));

  const H2 = ["No", "Kode", "Nama Karyawan", "Jumlah Sesi", "Sesi Disetujui", "Hari Lembur Disetujui", "Jam Lembur Disetujui", "Jam Disetujui (desimal)", "Total Jam Semua Sesi", "Menunggu", "Ditolak"];
  const rows2 = emps.map((e, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    return [
      cell(i + 1, numStyle(alt)),
      cell(e.code || "-", cc),
      cell(e.name, cellStyle(alt)),
      cell(e.sesi, cc),
      cell(e.approved, cc),
      cell(e.days.size, cc),
      cell(fmtMinutes(e.approvedMin), e.approvedMin ? statusStyle("disetujui", alt) : cc),
      cell(Math.round((e.approvedMin / 60) * 100) / 100, cc),
      cell(fmtMinutes(e.allMin), cc),
      cell(e.pengajuan || "-", e.pengajuan ? statusStyle("pengajuan", alt) : cc),
      cell(e.ditolak || "-", e.ditolak ? statusStyle("ditolak", alt) : cc),
    ];
  });
  const sum = (k) => emps.reduce((s, e) => s + e[k], 0);
  const ws2 = buildSheet({
    title: "Rekap Lembur per Karyawan",
    lines: [...lines.slice(0, 2), "Jam lembur disetujui = total durasi sesi berstatus Disetujui", lines[2]],
    headers: H2,
    rows: rows2.length ? rows2 : [emptyRow(H2.length)],
    total: emps.length ? [
      cell("", totalStyle), cell("", totalStyle), cell(`TOTAL (${emps.length} karyawan)`, totalLabelStyle),
      cell(sum("sesi"), totalStyle), cell(sum("approved"), totalStyle),
      cell(emps.reduce((s, e) => s + e.days.size, 0), totalStyle),
      cell(fmtMinutes(sum("approvedMin")), totalStyle), cell(Math.round((sum("approvedMin") / 60) * 100) / 100, totalStyle),
      cell(fmtMinutes(sum("allMin")), totalStyle), cell(sum("pengajuan"), totalStyle), cell(sum("ditolak"), totalStyle),
    ] : undefined,
    widths: [5, 11, 26, 11, 12, 14, 14, 14, 14, 10, 9],
  });

  saveWorkbook(
    [{ name: "Daftar Lembur", ws: ws1 }, { name: "Rekap Karyawan", ws: ws2 }],
    `lembur_waschen_${rangeSlug(startDate, endDate)}.xlsx`,
  );
}
