import { fmtEmployeeName } from "../../../utils/hrisUtils";
import {
  buildSheet, cell, cellStyle, emptyRow, exportedAtText, filterText, fmtDate, fmtDateTime, fmtDay,
  numStyle, periodText, rangeSlug, saveWorkbook, statusStyle, totalLabelStyle, totalStyle,
} from "./excelShared";

const GROOMING_LABEL = { lengkap: "Lengkap", kurang: "Belum lengkap", kosong: "Belum foto" };
const GROOMING_TARGET = 6;

function pctTone(p, alt) {
  if (p >= 80) return statusStyle("lengkap", alt);
  if (p >= 50) return statusStyle("kurang", alt);
  return statusStyle("kosong", alt);
}

// Sel berisi link ke foto (bisa diklik di Excel)
function linkCell(url, alt) {
  if (!url) return cell("-", cellStyle(alt, "center"));
  const c = cell("Lihat foto", cellStyle(alt, "center", { font: { sz: 10, underline: true, color: { rgb: "2563EB" }, name: "Calibri" } }));
  c.l = { Target: url, Tooltip: url };
  return c;
}

/**
 * Export Dashboard Grooming & Kebersihan Waschen.
 * @param {object} o
 * @param {object[]} o.employees        res.employees dari /attendance/grooming-dashboard
 * @param {object}   [o.summary]        res.summary dari endpoint yang sama
 * @param {object[]} [o.cleanlinessRows] res.data dari /attendance/cleanliness
 * @param {(id) => string} [o.outletName]
 */
export function exportGroomingCleaningWaschenExcel({
  employees = [], summary = null, cleanlinessRows = [], startDate, endDate, periodLabel, filters = {}, outletName,
}) {
  const lines = [
    periodText(startDate, endDate, periodLabel),
    filterText([
      filters.outlet && `Outlet: ${filters.outlet}`,
      filters.role && `Posisi: ${filters.role}`,
      filters.status && filters.status !== "semua" && `Status: ${filters.status}`,
      filters.search && `Cari: "${filters.search}"`,
    ]),
    exportedAtText(),
  ];
  const outletOf = (id) => outletName?.(id) || (id != null ? `#${id}` : "-");

  // ── Sheet 1: Peringkat Disiplin Grooming ──
  const ranked = [...employees].sort((a, b) =>
    b.discipline_pct - a.discipline_pct || b.lengkap - a.lengkap
    || fmtEmployeeName(a.employee_name).localeCompare(fmtEmployeeName(b.employee_name), "id"));
  const H1 = ["Peringkat", "Kode", "Nama Karyawan", "Posisi", "Hari Hadir", "Lengkap", "Belum Lengkap", "Belum Foto", "Disiplin"];
  const rows1 = ranked.map((e, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    return [
      cell(i + 1, numStyle(alt)),
      cell(e.employee_code || "-", cc),
      cell(fmtEmployeeName(e.employee_name), cellStyle(alt)),
      cell(e.role_code || "-", cellStyle(alt)),
      cell(e.days_count || 0, cc),
      cell(e.lengkap || 0, e.lengkap ? statusStyle("lengkap", alt) : cc),
      cell(e.kurang || 0, e.kurang ? statusStyle("kurang", alt) : cc),
      cell(e.kosong || 0, e.kosong ? statusStyle("kosong", alt) : cc),
      cell(`${e.discipline_pct ?? 0}%`, pctTone(e.discipline_pct ?? 0, alt)),
    ];
  });
  const ws1 = buildSheet({
    title: "Peringkat Disiplin Grooming Waschen",
    lines: [...lines.slice(0, 2), `Frontliner & Delivery Staff · lengkap = ${GROOMING_TARGET} foto per hari hadir`, lines[2]],
    headers: H1,
    rows: rows1.length ? rows1 : [emptyRow(H1.length)],
    total: summary && ranked.length ? [
      cell("", totalStyle), cell("", totalStyle), cell(`TOTAL (${ranked.length} karyawan)`, totalLabelStyle), cell("", totalStyle),
      cell(summary.days ?? 0, totalStyle), cell(summary.lengkap ?? 0, totalStyle), cell(summary.kurang ?? 0, totalStyle),
      cell(summary.kosong ?? 0, totalStyle), cell(`${summary.discipline_pct ?? 0}%`, totalStyle),
    ] : undefined,
    widths: [10, 11, 26, 16, 11, 10, 14, 11, 10],
  });

  // ── Sheet 2: Detail Grooming Harian ──
  const days = [];
  employees.forEach((e) => (e.days || []).forEach((d) => days.push({ ...d, emp: e })));
  days.sort((a, b) =>
    String(a.work_date).localeCompare(String(b.work_date))
    || fmtEmployeeName(a.emp.employee_name).localeCompare(fmtEmployeeName(b.emp.employee_name), "id"));
  const H2 = ["No", "Tanggal", "Hari", "Nama Karyawan", "Posisi", "Outlet", "Jumlah Foto", "Status", "Langkah Belum Difoto", "Alasan"];
  const rows2 = days.map((d, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    const missing = (d.photos || []).filter((p) => !p.url).map((p) => p.step_label).join(", ");
    return [
      cell(i + 1, numStyle(alt)),
      cell(fmtDate(d.work_date), cc),
      cell(fmtDay(d.work_date), cc),
      cell(fmtEmployeeName(d.emp.employee_name), cellStyle(alt)),
      cell(d.emp.role_code || "-", cellStyle(alt)),
      cell(outletOf(d.outlet_id), cellStyle(alt)),
      cell(`${d.photo_count ?? 0}/${GROOMING_TARGET}`, cc),
      cell(GROOMING_LABEL[d.status] || d.status || "-", statusStyle(d.status, alt)),
      cell(missing || "-", cellStyle(alt)),
      cell(d.reason || "", cellStyle(alt)),
    ];
  });
  const ws2 = buildSheet({
    title: "Detail Grooming Harian",
    lines,
    headers: H2,
    rows: rows2.length ? rows2 : [emptyRow(H2.length)],
    widths: [5, 13, 9, 26, 16, 18, 11, 14, 48, 32],
  });

  // ── Sheet 3: Foto Kebersihan ──
  const photos = [...cleanlinessRows].sort((a, b) =>
    String(a.work_date).localeCompare(String(b.work_date))
    || String(a.role_code || "").localeCompare(String(b.role_code || ""))
    || String(a.taken_at || "").localeCompare(String(b.taken_at || "")));
  const H3 = ["No", "Tanggal", "Hari", "Sesi", "Outlet", "Posisi / Tim", "Diunggah Oleh", "Waktu Foto", "Foto"];
  const rows3 = photos.map((p, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    const session = p.photo_session || "Pagi";
    return [
      cell(i + 1, numStyle(alt)),
      cell(fmtDate(p.work_date), cc),
      cell(fmtDay(p.work_date), cc),
      cell(session, statusStyle(session === "Pulang" ? "proses" : "pengajuan", alt)),
      cell(outletOf(p.outlet_id), cellStyle(alt)),
      cell(p.role_code || "-", cellStyle(alt)),
      cell(p.uploaded_by_name ? fmtEmployeeName(p.uploaded_by_name) : "-", cellStyle(alt)),
      cell(fmtDateTime(p.taken_at), cc),
      linkCell(p.photo_url, alt),
    ];
  });
  const ws3 = buildSheet({
    title: "Foto Kebersihan Waschen",
    lines: [...lines.slice(0, 2), "Sesi Pagi: sebelum 16:00 WIB · Pulang: 16:00–24:00 WIB", lines[2]],
    headers: H3,
    rows: rows3.length ? rows3 : [emptyRow(H3.length)],
    widths: [5, 13, 9, 9, 20, 18, 24, 18, 12],
  });

  // ── Sheet 4: Rekap Kebersihan per Tanggal & Tim ──
  const recap = new Map();
  photos.forEach((p) => {
    const k = `${p.work_date}|${p.outlet_id}|${p.role_code || "-"}`;
    if (!recap.has(k)) recap.set(k, { date: p.work_date, outlet: outletOf(p.outlet_id), role: p.role_code || "-", pagi: 0, pulang: 0 });
    recap.get(k)[(p.photo_session || "Pagi") === "Pulang" ? "pulang" : "pagi"] += 1;
  });
  const recapRows = [...recap.values()];
  const H4 = ["No", "Tanggal", "Hari", "Outlet", "Posisi / Tim", "Foto Pagi", "Foto Pulang", "Total Foto"];
  const rows4 = recapRows.map((r, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    return [
      cell(i + 1, numStyle(alt)),
      cell(fmtDate(r.date), cc),
      cell(fmtDay(r.date), cc),
      cell(r.outlet, cellStyle(alt)),
      cell(r.role, cellStyle(alt)),
      cell(r.pagi || "-", r.pagi ? cc : statusStyle("kosong", alt)),
      cell(r.pulang || "-", r.pulang ? cc : statusStyle("kosong", alt)),
      cell(r.pagi + r.pulang, cc),
    ];
  });
  const ws4 = buildSheet({
    title: "Rekap Foto Kebersihan per Tanggal & Tim",
    lines,
    headers: H4,
    rows: rows4.length ? rows4 : [emptyRow(H4.length)],
    widths: [5, 13, 9, 20, 18, 11, 12, 11],
  });

  saveWorkbook(
    [
      { name: "Peringkat Grooming", ws: ws1 },
      { name: "Detail Grooming", ws: ws2 },
      { name: "Foto Kebersihan", ws: ws3 },
      { name: "Rekap Kebersihan", ws: ws4 },
    ],
    `grooming_kebersihan_waschen_${rangeSlug(startDate, endDate)}.xlsx`,
  );
}
