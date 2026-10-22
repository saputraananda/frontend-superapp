import { fmtEmployeeName } from "../../../utils/hrisUtils";
import {
  C, badgeStyle, buildSheet, capitalize, cell, cellStyle, emptyRow, exportedAtText, filterText, fmtDate, fmtDateTime,
  moneyStyle, numStyle, periodText, rangeSlug, saveWorkbook, statusStyle, totalLabelStyle, totalStyle,
} from "./excelShared";

const TYPE_STYLE = {
  pinjaman: badgeStyle(C.violetBg, C.violetText),
  kasbon: badgeStyle(C.warnBg, C.warnText),
};
const METHOD_LABEL = { potong_gaji: "Potong gaji", langsung: "Bayar langsung" };
const num = (v) => Number(v) || 0;
const moneyTotal = { ...totalStyle, alignment: { horizontal: "right", vertical: "center" }, numFmt: '"Rp" #,##0' };

/**
 * Export daftar kasbon & pinjaman Waschen (Daftar + Rekap per Karyawan).
 * @param {object} o  { rows, startDate, endDate, periodLabel, allPeriods, filters: { outlet, role, status, type, search } }
 */
export function exportKasbonWaschenExcel({ rows = [], startDate, endDate, periodLabel, allPeriods = false, filters = {} }) {
  const lines = [
    allPeriods ? "Periode: Semua periode" : periodText(startDate, endDate, periodLabel),
    filterText([
      filters.outlet && `Outlet: ${filters.outlet}`,
      filters.role && `Posisi: ${filters.role}`,
      filters.type && filters.type !== "Semua" && `Tipe: ${capitalize(filters.type)}`,
      filters.status && filters.status !== "Semua" && `Status: ${capitalize(filters.status)}`,
      filters.search && `Cari: "${filters.search}"`,
    ]),
    exportedAtText(),
  ];

  const list = [...rows]
    .map((r) => ({ ...r, name: fmtEmployeeName(r.employee_name) }))
    .sort((a, b) => String(a.submission_date).localeCompare(String(b.submission_date)) || a.name.localeCompare(b.name, "id"));

  // ── Sheet 1: Daftar Kasbon ──
  const H1 = [
    "No", "Tanggal", "Nama Karyawan", "Tipe", "Diajukan", "Disetujui", "Metode Bayar", "Tenor", "Cicilan / Termin",
    "Terbayar", "Sisa", "Status", "Keperluan", "Catatan", "Disetujui Oleh", "Waktu Persetujuan", "Catatan Penolakan",
  ];
  const rows1 = list.map((r, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    const approved = r.amount_approved != null;
    return [
      cell(i + 1, numStyle(alt)),
      cell(fmtDate(r.submission_date), cc),
      cell(r.name + (num(r.is_opening_balance) ? " (saldo awal)" : ""), cellStyle(alt)),
      cell(capitalize(r.type), TYPE_STYLE[r.type] || cc),
      cell(num(r.amount_requested), moneyStyle(alt)),
      approved ? cell(num(r.amount_approved), moneyStyle(alt, C.okText, true)) : cell("-", cc),
      cell(METHOD_LABEL[r.payment_method] || capitalize(r.payment_method), cc),
      cell(num(r.tenor_count) ? `${num(r.tenor_count)}x` : "-", cc),
      num(r.installment_amount) ? cell(num(r.installment_amount), moneyStyle(alt)) : cell("-", cc),
      num(r.total_paid) ? cell(num(r.total_paid), moneyStyle(alt)) : cell("-", cc),
      r.remaining != null ? cell(num(r.remaining), moneyStyle(alt, num(r.remaining) ? C.lateText : C.okText, true)) : cell("-", cc),
      cell(capitalize(r.status), statusStyle(r.status, alt)),
      cell(r.purpose || "-", cellStyle(alt)),
      cell(r.notes || r.approved_note || "", cellStyle(alt)),
      cell(r.approved_by_name || "-", cellStyle(alt)),
      cell(r.approved_at ? fmtDateTime(r.approved_at) : "-", cc),
      cell(r.rejection_note || "", cellStyle(alt)),
    ];
  });
  const sumBy = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
  const ws1 = buildSheet({
    title: "Daftar Kasbon & Pinjaman Waschen",
    lines,
    headers: H1,
    rows: rows1.length ? rows1 : [emptyRow(H1.length)],
    total: list.length ? [
      cell("", totalStyle), cell("", totalStyle), cell(`TOTAL (${list.length} pengajuan)`, totalLabelStyle), cell("", totalStyle),
      cell(sumBy(list, (r) => num(r.amount_requested)), moneyTotal),
      cell(sumBy(list, (r) => num(r.amount_approved)), moneyTotal),
      cell("", totalStyle), cell("", totalStyle), cell("", totalStyle),
      cell(sumBy(list, (r) => num(r.total_paid)), moneyTotal),
      cell(sumBy(list, (r) => num(r.remaining)), moneyTotal),
      ...Array.from({ length: 6 }, () => cell("", totalStyle)),
    ] : undefined,
    widths: [5, 13, 28, 10, 15, 15, 14, 7, 15, 15, 15, 12, 30, 30, 20, 18, 28],
  });

  // ── Sheet 2: Rekap per Karyawan (nominal disetujui) ──
  const map = new Map();
  list.forEach((r) => {
    const id = String(r.employee_id);
    if (!map.has(id)) map.set(id, { name: r.name, count: 0, kasbon: 0, pinjaman: 0, paid: 0, remaining: 0, pending: 0 });
    const e = map.get(id);
    e.count += 1;
    if (r.status === "disetujui" || r.status === "lunas") {
      e[r.type === "pinjaman" ? "pinjaman" : "kasbon"] += num(r.amount_approved);
      e.paid += num(r.total_paid);
      e.remaining += num(r.remaining);
    }
    if (r.status === "pengajuan" || r.status === "proses") e.pending += num(r.amount_requested);
  });
  const emps = [...map.values()].sort((a, b) => (b.kasbon + b.pinjaman) - (a.kasbon + a.pinjaman) || a.name.localeCompare(b.name, "id"));

  const H2 = ["No", "Nama Karyawan", "Jml Pengajuan", "Kasbon Disetujui", "Pinjaman Disetujui", "Total Disetujui", "Terbayar", "Sisa Pinjaman", "Menunggu Persetujuan"];
  const rows2 = emps.map((e, i) => {
    const alt = i % 2 === 1;
    return [
      cell(i + 1, numStyle(alt)),
      cell(e.name, cellStyle(alt)),
      cell(e.count, cellStyle(alt, "center")),
      cell(e.kasbon, moneyStyle(alt)),
      cell(e.pinjaman, moneyStyle(alt)),
      cell(e.kasbon + e.pinjaman, moneyStyle(alt, C.okText, true)),
      cell(e.paid, moneyStyle(alt)),
      cell(e.remaining, moneyStyle(alt, e.remaining ? C.lateText : C.textDark, Boolean(e.remaining))),
      cell(e.pending, moneyStyle(alt, e.pending ? C.warnText : C.textDark)),
    ];
  });
  const ws2 = buildSheet({
    title: "Rekap Kasbon & Pinjaman per Karyawan",
    lines: [...lines.slice(0, 2), "Nominal disetujui dari pengajuan berstatus Disetujui/Lunas", lines[2]],
    headers: H2,
    rows: rows2.length ? rows2 : [emptyRow(H2.length)],
    total: emps.length ? [
      cell("", totalStyle), cell(`TOTAL (${emps.length} karyawan)`, totalLabelStyle), cell(sumBy(emps, (e) => e.count), totalStyle),
      cell(sumBy(emps, (e) => e.kasbon), moneyTotal), cell(sumBy(emps, (e) => e.pinjaman), moneyTotal),
      cell(sumBy(emps, (e) => e.kasbon + e.pinjaman), moneyTotal), cell(sumBy(emps, (e) => e.paid), moneyTotal),
      cell(sumBy(emps, (e) => e.remaining), moneyTotal), cell(sumBy(emps, (e) => e.pending), moneyTotal),
    ] : undefined,
    widths: [5, 28, 13, 17, 17, 17, 16, 16, 19],
  });

  saveWorkbook(
    [{ name: "Daftar Kasbon", ws: ws1 }, { name: "Rekap Karyawan", ws: ws2 }],
    `kasbon_waschen_${allPeriods ? "semua-periode" : rangeSlug(startDate, endDate)}.xlsx`,
  );
}

/**
 * Export tab "Pantau Saldo" kasbon (limit bulan ini per karyawan).
 * @param {object} o  { rows, filters: { outlet, role, search } }
 */
export function exportKasbonSaldoWaschenExcel({ rows = [], filters = {} }) {
  const lines = [
    "Limit bulan berjalan · pinjaman = cicilan termin yang jatuh tempo bulan ini",
    filterText([
      filters.outlet && `Outlet: ${filters.outlet}`,
      filters.role && `Posisi: ${filters.role}`,
      filters.search && `Cari: "${filters.search}"`,
    ]),
    exportedAtText(),
  ];
  const H = ["No", "Kode", "Nama Karyawan", "Limit", "Pinjaman", "Kasbon", "Terpakai", "% Terpakai", "Saldo Sisa"];
  const list = rows.map((r) => {
    const terpakai = r.terpakai != null ? num(r.terpakai) : num(r.kasbon) + num(r.pinjaman);
    return { ...r, terpakai, pctUsed: num(r.limit) > 0 ? Math.round((terpakai / num(r.limit)) * 100) : null };
  });
  const body = list.map((r, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    const pctTone = r.pctUsed == null ? cc : r.pctUsed >= 90 ? statusStyle("ditolak", alt) : r.pctUsed >= 60 ? statusStyle("pengajuan", alt) : statusStyle("disetujui", alt);
    return [
      cell(i + 1, numStyle(alt)),
      cell(r.employee_code || "-", cc),
      cell(fmtEmployeeName(r.employee_name), cellStyle(alt)),
      cell(num(r.limit), moneyStyle(alt)),
      cell(num(r.pinjaman), moneyStyle(alt, C.brand)),
      cell(num(r.kasbon), moneyStyle(alt, C.infoText)),
      cell(r.terpakai, moneyStyle(alt)),
      cell(r.pctUsed == null ? "-" : `${r.pctUsed}%`, pctTone),
      cell(num(r.sisa), moneyStyle(alt, C.okText, true)),
    ];
  });
  const sumBy = (fn) => list.reduce((s, x) => s + fn(x), 0);
  const ws = buildSheet({
    title: "Pantau Saldo Kasbon Karyawan Waschen",
    lines,
    headers: H,
    rows: body.length ? body : [emptyRow(H.length)],
    total: list.length ? [
      cell("", totalStyle), cell("", totalStyle), cell(`TOTAL (${list.length} karyawan)`, totalLabelStyle),
      cell(sumBy((r) => num(r.limit)), moneyTotal), cell(sumBy((r) => num(r.pinjaman)), moneyTotal),
      cell(sumBy((r) => num(r.kasbon)), moneyTotal), cell(sumBy((r) => r.terpakai), moneyTotal),
      cell("", totalStyle), cell(sumBy((r) => num(r.sisa)), moneyTotal),
    ] : undefined,
    widths: [5, 11, 28, 16, 16, 16, 16, 11, 16],
  });
  saveWorkbook([{ name: "Pantau Saldo", ws }], `saldo_kasbon_waschen_${rangeSlug()}.xlsx`);
}
