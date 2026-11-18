import { fmtEmployeeName } from "../../../utils/hrisUtils";
import {
  buildSheet, cell, cellStyle, emptyRow, exportedAtText, filterText, fmtDate, fmtDateTime,
  moneyStyle, numStyle, saveWorkbook, statusStyle, totalLabelStyle, totalStyle, C,
} from "./excelShared";

/**
 * Export Daily Report Waschen (sama dengan Export Excel di Daily Report My Waschen POS):
 * satu sheet per shift = ringkasan shift + tabel nota yang dibayar di shift itu.
 * Ditambah sheet "Ringkasan" di depan yang merangkum semua shift (berguna untuk banyak outlet).
 */

const num = (v) => Number(v) || 0;
const moneyTotal = { ...totalStyle, alignment: { horizontal: "right", vertical: "center" }, numFmt: '"Rp" #,##0' };
const idr = (v) => `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num(v))}`;
const idrOrDash = (v) => (v == null ? "-" : idr(v));

const shiftLabel = (s) => (Number(s.shiftNumber) === 2 ? "Siang" : "Pagi");
const outletOf = (s) => s.outletFullName || s.outletName || `Outlet #${s.outletId}`;
const person = (name) => (name ? fmtEmployeeName(name) : "-");
const fmtTime = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};
const payLabel = (t) => `${t.paymentStatus === "DP" ? "DP " : ""}${t.paymentMethod || "-"}`;

/** Nama sheet unik (maks 31 karakter, tanpa karakter terlarang) */
function sheetName(s, used) {
  const base = `${s.outletCode || s.outletName || s.outletId} ${shiftLabel(s)} #${s.id}`
    .replace(/[\\/?*[\]:]/g, "-");
  let name = base.slice(0, 31);
  let i = 2;
  while (used.has(name)) name = `${base.slice(0, 28)}-${i++}`;
  used.add(name);
  return name;
}

function depositText(d) {
  if (!d) return "-";
  if (d.status !== "uploaded") return `Belum diupload${d.isLate ? ` (terlambat ${d.lateDays} hari)` : ""}`;
  return `Sudah diupload${d.uploadedByName ? ` oleh ${person(d.uploadedByName)}` : ""}${d.uploadedAt ? ` · ${fmtDateTime(d.uploadedAt)}` : ""}${d.isLate ? ` (terlambat ${d.lateDays} hari)` : ""}`;
}

function buildShiftSheet(s, { dateLabel }) {
  const txns = s.transactions || [];
  const lines = [
    `Shift ${shiftLabel(s)} #${s.id} · Status ${s.status || "-"}${s.closeType ? ` · ${s.closeType}` : ""} · ${dateLabel}`,
    `Dibuka: ${fmtDateTime(s.openedAt)} oleh ${person(s.openerName)}   |   Ditutup: ${s.closedAt ? `${fmtDateTime(s.closedAt)} oleh ${person(s.closedByName)}` : "-"}`,
    `Cash Modal Open: ${idr(s.initialCash)}   |   Petty Open: ${idr(s.initialPettyCash)}   |   Cash Aktual Close: ${idrOrDash(s.actualCash)}   |   Revenue: ${idrOrDash(s.declaredRevenue)}`,
    `Expected Cash: ${idr(s.expectedCash)}   |   Selisih: ${idr(s.difference)}   |   Petty Aktual Close: ${idrOrDash(s.actualPettyCash)}   |   System Revenue: ${idr(s.systemCashRevenue)}`,
    `Setoran Tunai: ${depositText(s.deposit)}`,
    ...(s.openImbalanceReason ? [`Alasan imbalance open: ${s.openImbalanceReason}`] : []),
    ...(s.closingNotes ? [`Catatan closing: ${s.closingNotes}`] : []),
    exportedAtText(),
  ];

  const H = ["Tanggal", "Jam", "No Nota", "Customer", "Alamat", "Pembuat Nota", "Bayar", "Nominal", "Disetujui"];
  const rows = txns.map((t, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    const when = t.lastPaidAt;
    return [
      cell(fmtDate(when), cc),
      cell(fmtTime(when), cc),
      cell(t.orderNo, cellStyle(alt)),
      cell(t.customerName || "-", cellStyle(alt)),
      cell(t.customerAddress || "", cellStyle(alt)),
      cell(t.cashierName ? fmtEmployeeName(t.cashierName) : "", cellStyle(alt)),
      cell(payLabel(t), cc),
      cell(num(t.paidHere), moneyStyle(alt, C.textDark, true)),
      cell(t.isVerified ? "Ya" : "Belum", statusStyle(t.isVerified ? "lunas" : "pengajuan", alt)),
    ];
  });
  const total = txns.reduce((sum, t) => sum + num(t.paidHere), 0);

  return buildSheet({
    title: `Daily Report · ${outletOf(s)} · Shift ${shiftLabel(s)}`,
    lines,
    headers: H,
    rows: rows.length ? rows : [emptyRow(H.length, "Belum ada nota dibayar di shift ini")],
    total: txns.length ? [
      cell("", totalStyle), cell("", totalStyle), cell("", totalStyle), cell("", totalStyle), cell("", totalStyle), cell("", totalStyle),
      cell(`TOTAL (${txns.length} nota)`, totalLabelStyle), cell(total, moneyTotal), cell("", totalStyle),
    ] : undefined,
    widths: [13, 8, 24, 26, 34, 24, 18, 16, 12],
  });
}

function buildSummarySheet(shifts, { dateLabel, filters }) {
  const lines = [
    `Tanggal: ${dateLabel}`,
    filterText([
      filters.outlet && `Outlet: ${filters.outlet}`,
      filters.employee && `Karyawan: ${filters.employee}`,
      filters.shift && `Shift: ${filters.shift}`,
      filters.search && `Cari: "${filters.search}"`,
      filters.onlyPendingDeposit && "Belum setoran",
      filters.onlyAttention && "Perlu perhatian",
    ]),
    exportedAtText(),
  ];
  const H = [
    "No", "Outlet", "Shift", "Status", "Dibuka Oleh", "Buka", "Tutup", "Cash Modal Open", "Petty Open",
    "Cash Aktual Close", "Expected Cash", "Selisih", "System Revenue", "Revenue", "Jumlah Nota", "Total Nota Dibayar", "Setoran Tunai",
  ];
  const rows = shifts.map((s, i) => {
    const alt = i % 2 === 1;
    const cc = cellStyle(alt, "center");
    const nota = s.transactions || [];
    const diff = num(s.difference);
    return [
      cell(i + 1, numStyle(alt)),
      cell(outletOf(s), cellStyle(alt)),
      cell(`${shiftLabel(s)} #${s.id}`, cc),
      cell(`${s.status || "-"}${s.closeType ? ` · ${s.closeType}` : ""}`, cc),
      cell(person(s.openerName), cellStyle(alt)),
      cell(fmtDateTime(s.openedAt), cc),
      cell(s.closedAt ? fmtDateTime(s.closedAt) : "-", cc),
      cell(num(s.initialCash), moneyStyle(alt)),
      cell(num(s.initialPettyCash), moneyStyle(alt)),
      s.actualCash != null ? cell(num(s.actualCash), moneyStyle(alt)) : cell("-", cc),
      cell(num(s.expectedCash), moneyStyle(alt)),
      cell(diff, moneyStyle(alt, diff === 0 ? C.textDark : C.lateText, diff !== 0)),
      cell(num(s.systemCashRevenue), moneyStyle(alt)),
      s.declaredRevenue != null ? cell(num(s.declaredRevenue), moneyStyle(alt, C.okText, true)) : cell("-", cc),
      cell(nota.length, numStyle(alt)),
      cell(nota.reduce((sum, t) => sum + num(t.paidHere), 0), moneyStyle(alt, C.textDark, true)),
      cell(depositText(s.deposit), cellStyle(alt)),
    ];
  });
  const sumBy = (fn) => shifts.reduce((sum, s) => sum + fn(s), 0);
  return buildSheet({
    title: "Ringkasan Daily Report Shift Waschen",
    lines,
    headers: H,
    rows: rows.length ? rows : [emptyRow(H.length)],
    total: shifts.length ? [
      cell("", totalStyle), cell(`TOTAL (${shifts.length} shift)`, totalLabelStyle),
      ...Array.from({ length: 5 }, () => cell("", totalStyle)),
      cell(sumBy((s) => num(s.initialCash)), moneyTotal),
      cell(sumBy((s) => num(s.initialPettyCash)), moneyTotal),
      cell(sumBy((s) => num(s.actualCash)), moneyTotal),
      cell(sumBy((s) => num(s.expectedCash)), moneyTotal),
      cell(sumBy((s) => num(s.difference)), moneyTotal),
      cell(sumBy((s) => num(s.systemCashRevenue)), moneyTotal),
      cell(sumBy((s) => num(s.declaredRevenue)), moneyTotal),
      cell(sumBy((s) => (s.transactions || []).length), totalStyle),
      cell(sumBy((s) => (s.transactions || []).reduce((a, t) => a + num(t.paidHere), 0)), moneyTotal),
      cell("", totalStyle),
    ] : undefined,
    widths: [5, 30, 14, 16, 26, 20, 20, 17, 15, 17, 16, 15, 17, 16, 12, 19, 40],
  });
}

/**
 * @param {object} o
 * @param {Array}  o.shifts   Shift yang sedang tampil (sudah terfilter) beserta `transactions`
 * @param {string} o.date     YYYY-MM-DD
 * @param {object} [o.filters] { outlet, employee, shift, search, onlyPendingDeposit } untuk keterangan
 */
export function exportDailyReportWaschenExcel({ shifts = [], date, filters = {} }) {
  const dateLabel = fmtDate(date);
  const used = new Set(["Ringkasan"]);
  const sheets = [
    { name: "Ringkasan", ws: buildSummarySheet(shifts, { dateLabel, filters }) },
    ...shifts.map((s) => ({ name: sheetName(s, used), ws: buildShiftSheet(s, { dateLabel }) })),
  ];
  saveWorkbook(sheets, `daily-report_waschen_${date}.xlsx`);
}
