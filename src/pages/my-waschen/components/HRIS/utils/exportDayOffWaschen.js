import { fmtEmployeeName } from "../../../utils/hrisUtils";
import {
  buildSheet, capitalize, cell, cellStyle, emptyRow, exportedAtText, filterText, fmtDate, fmtDateTime, fmtDay,
  numStyle, periodText, rangeSlug, saveWorkbook, statusStyle, totalLabelStyle, totalStyle,
} from "./excelShared";

// Samakan dengan STATUS_FILTERS di JadwalLibur.jsx
const STATUS_LABEL = {
  pengajuan: "Pengajuan",
  disetujui_leader: "Disetujui leader",
  disetujui: "Disetujui HRD",
  ditolak_leader: "Ditolak leader",
  ditolak: "Ditolak HRD",
};
const statusLabel = (s) => STATUS_LABEL[s] || capitalize(s);

const PENDING = new Set(["pengajuan", "disetujui_leader"]);
const REJECTED = new Set(["ditolak", "ditolak_leader"]);

/**
 * Export jadwal libur Waschen.
 * @param {object} o  { rows, startDate, endDate, periodLabel, filters: { outlet, role, status, search } }
 */
export function exportDayOffWaschenExcel({ rows = [], startDate, endDate, periodLabel, filters = {} }) {
  const lines = [
    periodText(startDate, endDate, periodLabel),
    filterText([
      filters.outlet && `Outlet: ${filters.outlet}`,
      filters.role && `Posisi: ${filters.role}`,
      filters.status && filters.status !== "Semua" && `Status: ${statusLabel(filters.status)}`,
      filters.search && `Cari: "${filters.search}"`,
    ]),
    exportedAtText(),
  ];

  const list = [...rows]
    .map((r) => ({ ...r, name: fmtEmployeeName(r.employee_name) }))
    .sort((a, b) =>
      String(a.off_date).localeCompare(String(b.off_date))
      || String(a.outlet_name || "").localeCompare(String(b.outlet_name || ""))
      || a.name.localeCompare(b.name, "id"));

  // ── Sheet 1: Daftar Jadwal Libur ──
  const H1 = ["No", "Tanggal Libur", "Hari", "Kode", "Nama Karyawan", "Outlet", "Status", "Sumber", "Tanggal Diminta", "Alasan", "Backup", "Catatan Leader", "Catatan Penolakan", "Diajukan"];
  const rows1 = list.map((r, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    const tone = r.status === "disetujui" ? "disetujui" : PENDING.has(r.status) ? "pengajuan" : REJECTED.has(r.status) ? "ditolak" : r.status;
    return [
      cell(i + 1, numStyle(alt)),
      cell(fmtDate(r.off_date), cc),
      cell(fmtDay(r.off_date), cc),
      cell(r.employee_code || "-", cc),
      cell(r.name, cellStyle(alt)),
      cell(r.outlet_name || "-", cellStyle(alt)),
      cell(statusLabel(r.status), statusStyle(tone, alt)),
      cell(capitalize(r.source), cc),
      cell(r.requested_date && r.requested_date !== r.off_date ? fmtDate(r.requested_date) : "-", cc),
      cell(r.reason || "-", cellStyle(alt)),
      cell(r.backup_name ? fmtEmployeeName(r.backup_name) : "-", cellStyle(alt)),
      cell(r.leader_note || "", cellStyle(alt)),
      cell(r.rejection_note || "", cellStyle(alt)),
      cell(fmtDateTime(r.created_at), cc),
    ];
  });
  const ws1 = buildSheet({
    title: "Jadwal Libur Karyawan Waschen",
    lines,
    headers: H1,
    rows: rows1.length ? rows1 : [emptyRow(H1.length)],
    widths: [5, 13, 9, 11, 26, 16, 16, 11, 14, 32, 22, 26, 26, 18],
  });

  // ── Sheet 2: Rekap per Karyawan ──
  const map = new Map();
  list.forEach((r) => {
    const id = String(r.employee_id);
    if (!map.has(id)) map.set(id, { name: r.name, code: r.employee_code, outlet: r.outlet_name, approved: [], pending: 0, rejected: 0 });
    const e = map.get(id);
    if (r.status === "disetujui") e.approved.push(r.off_date);
    else if (PENDING.has(r.status)) e.pending += 1;
    else if (REJECTED.has(r.status)) e.rejected += 1;
  });
  const emps = [...map.values()].sort((a, b) =>
    String(a.outlet || "").localeCompare(String(b.outlet || "")) || a.name.localeCompare(b.name, "id"));

  const H2 = ["No", "Kode", "Nama Karyawan", "Outlet", "Hari Libur Disetujui", "Menunggu", "Ditolak", "Tanggal Libur Disetujui"];
  const rows2 = emps.map((e, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    return [
      cell(i + 1, numStyle(alt)),
      cell(e.code || "-", cc),
      cell(e.name, cellStyle(alt)),
      cell(e.outlet || "-", cellStyle(alt)),
      cell(e.approved.length, e.approved.length ? statusStyle("disetujui", alt) : cc),
      cell(e.pending || "-", e.pending ? statusStyle("pengajuan", alt) : cc),
      cell(e.rejected || "-", e.rejected ? statusStyle("ditolak", alt) : cc),
      cell(e.approved.sort().map((d) => fmtDate(d)).join(", ") || "-", cellStyle(alt)),
    ];
  });
  const sum = (fn) => emps.reduce((s, e) => s + fn(e), 0);
  const ws2 = buildSheet({
    title: "Rekap Jadwal Libur per Karyawan",
    lines,
    headers: H2,
    rows: rows2.length ? rows2 : [emptyRow(H2.length)],
    total: emps.length ? [
      cell("", totalStyle), cell("", totalStyle), cell(`TOTAL (${emps.length} karyawan)`, totalLabelStyle), cell("", totalStyle),
      cell(sum((e) => e.approved.length), totalStyle), cell(sum((e) => e.pending), totalStyle), cell(sum((e) => e.rejected), totalStyle),
      cell("", totalStyle),
    ] : undefined,
    widths: [5, 11, 26, 18, 14, 10, 9, 60],
  });

  saveWorkbook(
    [{ name: "Jadwal Libur", ws: ws1 }, { name: "Rekap Karyawan", ws: ws2 }],
    `jadwal_libur_waschen_${rangeSlug(startDate, endDate)}.xlsx`,
  );
}
