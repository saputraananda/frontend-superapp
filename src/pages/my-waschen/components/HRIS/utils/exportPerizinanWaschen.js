import { fmtEmployeeName, leaveDurationLabel, leaveTypeLabel } from "../../../utils/hrisUtils";
import {
  C, badgeStyle, buildSheet, capitalize, cell, cellStyle, emptyRow, exportedAtText, filterText, fmtDate, fmtDateTime,
  numStyle, periodText, rangeSlug, saveWorkbook, statusStyle, totalLabelStyle, totalStyle,
} from "./excelShared";

const TYPE_STYLE = {
  izin: badgeStyle(C.warnBg, C.warnText),
  sakit: badgeStyle(C.lateBg, C.lateText),
  cuti: badgeStyle(C.infoBg, C.infoText),
};

// Jumlah hari perizinan (setengah hari = 0,5)
function leaveDays(r) {
  if (!r.start_date || !r.end_date) return 0;
  const s = new Date(`${String(r.start_date).slice(0, 10)}T00:00:00`);
  const e = new Date(`${String(r.end_date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  const days = Math.round((e - s) / 86400000) + 1;
  return String(r.duration_type || "").startsWith("half_day") ? days * 0.5 : days;
}

/**
 * Export perizinan (izin/sakit/cuti) Waschen.
 * @param {object} o  { rows, startDate, endDate, periodLabel, filters: { outlet, role, status, type, search } }
 */
export function exportPerizinanWaschenExcel({ rows = [], startDate, endDate, periodLabel, filters = {} }) {
  const lines = [
    periodText(startDate, endDate, periodLabel),
    filterText([
      filters.outlet && `Outlet: ${filters.outlet}`,
      filters.role && `Posisi: ${filters.role}`,
      filters.type && filters.type !== "Semua" && `Tipe: ${leaveTypeLabel(filters.type)}`,
      filters.status && filters.status !== "Semua" && `Status: ${capitalize(filters.status)}`,
      filters.search && `Cari: "${filters.search}"`,
    ]),
    exportedAtText(),
  ];

  const list = [...rows].sort((a, b) =>
    String(a.start_date).localeCompare(String(b.start_date))
    || fmtEmployeeName(a.employee_name).localeCompare(fmtEmployeeName(b.employee_name), "id"));

  // ── Sheet 1: Daftar Perizinan ──
  const H1 = ["No", "Kode", "Nama Karyawan", "Tipe", "Durasi", "Mulai", "Selesai", "Jumlah Hari", "Alasan", "Status", "Catatan Penolakan", "Lampiran", "Diajukan"];
  const rows1 = list.map((r, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    return [
      cell(i + 1, numStyle(alt)),
      cell(r.employee_code || "-", cc),
      cell(fmtEmployeeName(r.employee_name), cellStyle(alt)),
      cell(leaveTypeLabel(r.leave_type), TYPE_STYLE[r.leave_type] || TYPE_STYLE.izin),
      cell(leaveDurationLabel(r.duration_type), cc),
      cell(fmtDate(r.start_date), cc),
      cell(fmtDate(r.end_date), cc),
      cell(leaveDays(r), cc),
      cell(r.reason || "-", cellStyle(alt)),
      cell(capitalize(r.status), statusStyle(r.status, alt)),
      cell(r.rejection_note || "", cellStyle(alt)),
      cell(r.doctor_note_url ? "Ada" : "-", cc),
      cell(fmtDateTime(r.created_at), cc),
    ];
  });
  const ws1 = buildSheet({
    title: "Daftar Perizinan Karyawan Waschen",
    lines,
    headers: H1,
    rows: rows1.length ? rows1 : [emptyRow(H1.length)],
    widths: [5, 11, 26, 9, 20, 13, 13, 11, 40, 12, 28, 10, 18],
  });

  // ── Sheet 2: Rekap per Karyawan (hanya yang disetujui dihitung hari) ──
  const map = new Map();
  list.forEach((r) => {
    const id = String(r.employee_id);
    if (!map.has(id)) {
      map.set(id, { name: fmtEmployeeName(r.employee_name), code: r.employee_code, izin: 0, sakit: 0, cuti: 0, total: 0, pengajuan: 0, disetujui: 0, ditolak: 0 });
    }
    const e = map.get(id);
    e.total += 1;
    if (e[r.status] != null) e[r.status] += 1;
    if (r.status === "disetujui") {
      const type = ["izin", "sakit", "cuti"].includes(r.leave_type) ? r.leave_type : "izin";
      e[type] += leaveDays(r);
    }
  });
  const emps = [...map.values()].sort((a, b) => (b.izin + b.sakit + b.cuti) - (a.izin + a.sakit + a.cuti) || a.name.localeCompare(b.name, "id"));

  const H2 = ["No", "Kode", "Nama Karyawan", "Hari Izin", "Hari Sakit", "Hari Cuti", "Total Hari", "Jml Pengajuan", "Menunggu", "Disetujui", "Ditolak"];
  const rows2 = emps.map((e, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    const days = e.izin + e.sakit + e.cuti;
    return [
      cell(i + 1, numStyle(alt)),
      cell(e.code || "-", cc),
      cell(e.name, cellStyle(alt)),
      cell(e.izin || "-", e.izin ? TYPE_STYLE.izin : cc),
      cell(e.sakit || "-", e.sakit ? TYPE_STYLE.sakit : cc),
      cell(e.cuti || "-", e.cuti ? TYPE_STYLE.cuti : cc),
      cell(days || "-", cc),
      cell(e.total, cc),
      cell(e.pengajuan || "-", e.pengajuan ? statusStyle("pengajuan", alt) : cc),
      cell(e.disetujui || "-", cc),
      cell(e.ditolak || "-", e.ditolak ? statusStyle("ditolak", alt) : cc),
    ];
  });
  const sum = (k) => emps.reduce((s, e) => s + e[k], 0);
  const ws2 = buildSheet({
    title: "Rekap Perizinan per Karyawan",
    lines: [...lines.slice(0, 2), "Hari izin/sakit/cuti hanya dari pengajuan yang disetujui · setengah hari = 0,5", lines[2]],
    headers: H2,
    rows: rows2.length ? rows2 : [emptyRow(H2.length)],
    total: emps.length ? [
      cell("", totalStyle), cell("", totalStyle), cell(`TOTAL (${emps.length} karyawan)`, totalLabelStyle),
      cell(sum("izin"), totalStyle), cell(sum("sakit"), totalStyle), cell(sum("cuti"), totalStyle),
      cell(sum("izin") + sum("sakit") + sum("cuti"), totalStyle), cell(sum("total"), totalStyle),
      cell(sum("pengajuan"), totalStyle), cell(sum("disetujui"), totalStyle), cell(sum("ditolak"), totalStyle),
    ] : undefined,
    widths: [5, 11, 26, 10, 10, 10, 11, 13, 11, 11, 10],
  });

  saveWorkbook(
    [{ name: "Daftar Perizinan", ws: ws1 }, { name: "Rekap Karyawan", ws: ws2 }],
    `perizinan_waschen_${rangeSlug(startDate, endDate)}.xlsx`,
  );
}
