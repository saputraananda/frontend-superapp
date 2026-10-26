// =============================================================================
// Payroll Waschen — export Excel.
//
// exportPayrollEmployeeExcel : 1 karyawan  → Ringkasan, Absensi Harian, Lembur,
//                              Perizinan, Libur, Kasbon & Pinjaman, Jadwal Termin, Backup
// exportPayrollAllExcel      : semua       → Rekap + sheet rincian gabungan
//                              (kolom Nama, bisa difilter di Excel)
// Data berasal dari GET /waschen/hris/payroll/:id dan /payroll/details.
// =============================================================================

import { fmtEmployeeName } from "../../../utils/hrisUtils";
import {
  C, badgeStyle, buildSheet, capitalize, cell, cellStyle, emptyRow, exportedAtText, filterText,
  fmtDate, fmtDateTime, fmtDay, moneyStyle, numStyle, periodText, rangeSlug, saveWorkbook, statusStyle,
  totalLabelStyle, totalStyle,
} from "./excelShared";

/* ── Label & format ── */

const DAY_STATUS_LABEL = {
  hadir: "Hadir",
  off: "Libur",
  izin: "Izin",
  sakit: "Sakit",
  cuti: "Cuti",
  tanpa_keterangan: "Tanpa Keterangan",
  belum_berjalan: "Belum Berjalan",
  belum_bergabung: "Belum Bergabung",
  sudah_keluar: "Sudah Keluar",
};

const LEAVE_TYPE_LABEL = { izin: "Izin", sakit: "Sakit", cuti: "Cuti" };

const LEAVE_DURATION_LABEL = {
  full_day: "Full day",
  half_day_morning: "½ hari (pagi)",
  half_day_afternoon: "½ hari (sore)",
};

/** Menit → "152j 30m" (0 → "0j") */
function fmtDur(min) {
  const m = Math.round(Number(min) || 0);
  if (m <= 0) return "0j";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}j ${r}m` : `${h}j`) : `${r}m`;
}

/** Hari (boleh desimal 0,5) → "1,5" */
const fmtDays = (n) => (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 });

const placeLabel = (p) => (p ? (p.code ? `${p.code} · ${p.name}` : p.name) : "-");

const PAY_METHOD_LABEL = { potong_gaji: "Potong Gaji", langsung: "Bayar Langsung" };

/* ── Gaya tambahan ── */

const DAY_TONE = {
  hadir: [C.okBg, C.okText],
  off: [C.infoBg, C.infoText],
  izin: [C.warnBg, C.warnText],
  sakit: [C.lateBg, C.lateText],
  cuti: [C.violetBg, C.violetText],
  tanpa_keterangan: [C.orgBg, C.orgText],
};
const dayStatusStyle = (s, alt) => (DAY_TONE[s] ? badgeStyle(...DAY_TONE[s]) : cellStyle(alt, "center"));
const hoursStyle = (alt) => ({ ...cellStyle(alt, "center"), numFmt: "0.0" });
const toHours = (min) => Math.round(((Number(min) || 0) / 60) * 10) / 10;
const lateStyle = (alt, v) => (v > 0 ? badgeStyle(C.lateBg, C.lateText) : cellStyle(alt, "center"));

const headerLines = ({ startDate, endDate, periodLabel, filters = {} }) => [
  periodText(startDate, endDate, periodLabel),
  filterText([
    filters.outlet && `Outlet: ${filters.outlet}`,
    filters.role && `Posisi: ${filters.role}`,
    filters.search && `Cari: "${filters.search}"`,
  ]),
  exportedAtText(),
];

const nameOf = (d) => fmtEmployeeName(d.employee_name);

/* ── Baris per kategori (prefix = kolom identitas karyawan bila digabung) ── */

function dailyRows(details, withName) {
  const out = [];
  details.forEach((d) => d.days.forEach((x) => {
    const alt = out.length % 2 === 1;
    const cc = cellStyle(alt, "center");
    const notes = [
      x.backup_for.length ? `Backup untuk ${x.backup_for.map((n) => fmtEmployeeName(n)).join(", ")}` : "",
      x.half_day_leave ? `${LEAVE_TYPE_LABEL[x.half_day_leave]} ½ hari` : "",
      x.shift_name ? `${x.shift_name}${x.shift_assumed ? " (asumsi)" : ""}` : "",
      x.late_excused ? "Masuk siang (izin ½ hari pagi), tidak dihitung terlambat" : "",
      x.early_minutes ? `Pulang cepat ${x.early_minutes} menit` : "",
      x.off_but_present ? "Masuk di hari libur" : "",
      x.outside_home ? "Di luar outlet asal" : "",
      x.no_checkout ? "Belum Out" : "",
      x.note || "",
    ].filter(Boolean).join(" · ");
    out.push([
      cell(out.length + 1, numStyle(alt)),
      ...(withName ? [cell(d.employee_code || "-", cc), cell(nameOf(d), cellStyle(alt))] : []),
      cell(fmtDate(x.date), cc),
      cell(fmtDay(x.date), cc),
      cell(DAY_STATUS_LABEL[x.status] || x.status, dayStatusStyle(x.status, alt)),
      cell(x.check_in || "-", cc),
      cell(x.check_out || "-", cc),
      cell(x.work_minutes ? toHours(x.work_minutes) : "", hoursStyle(alt)),
      cell(x.late_minutes || "", lateStyle(alt, x.late_minutes)),
      cell(x.location ? placeLabel(x.location) : "-", cellStyle(alt)),
      cell(x.overtime_minutes ? toHours(x.overtime_minutes) : "", hoursStyle(alt)),
      cell(notes, cellStyle(alt)),
    ]);
  }));
  return out;
}
const DAILY_HEAD = ["Tanggal", "Hari", "Status", "Masuk", "Pulang", "Durasi (jam)", "Terlambat (menit)", "Lokasi", "Lembur (jam)", "Keterangan"];
const DAILY_W = [13, 9, 15, 8, 8, 11, 11, 24, 11, 44];

function overtimeRows(details, withName) {
  const out = [];
  details.forEach((d) => d.overtime_list.forEach((o) => {
    const alt = out.length % 2 === 1;
    const cc = cellStyle(alt, "center");
    out.push([
      cell(out.length + 1, numStyle(alt)),
      ...(withName ? [cell(d.employee_code || "-", cc), cell(nameOf(d), cellStyle(alt))] : []),
      cell(fmtDate(o.date), cc),
      cell(fmtDay(o.date), cc),
      cell(o.start || "-", cc),
      cell(o.end || (o.status === "berlangsung" ? "(aktif)" : "-"), cc),
      cell(o.minutes ? toHours(o.minutes) : "", hoursStyle(alt)),
      cell(o.location ? placeLabel(o.location) : "-", cellStyle(alt)),
      cell(o.reason || "-", cellStyle(alt)),
      cell(o.work_note || "", cellStyle(alt)),
      cell(capitalize(o.status), statusStyle(o.status, alt)),
      cell(o.reviewed_by_name || "-", cellStyle(alt)),
      cell(o.review_note || "", cellStyle(alt)),
    ]);
  }));
  return out;
}
const OT_HEAD = ["Tanggal", "Hari", "Mulai", "Selesai", "Durasi (jam)", "Lokasi", "Alasan", "Catatan Kerja", "Status", "Direview Oleh", "Catatan Review"];
const OT_W = [13, 9, 8, 9, 11, 22, 32, 32, 12, 20, 28];

function leaveRows(details, withName) {
  const out = [];
  details.forEach((d) => d.leave_list.forEach((l) => {
    const alt = out.length % 2 === 1;
    const cc = cellStyle(alt, "center");
    out.push([
      cell(out.length + 1, numStyle(alt)),
      ...(withName ? [cell(d.employee_code || "-", cc), cell(nameOf(d), cellStyle(alt))] : []),
      cell(LEAVE_TYPE_LABEL[l.type] || l.type, cc),
      cell(LEAVE_DURATION_LABEL[l.duration_type] || l.duration_type, cc),
      cell(fmtDate(l.start_date), cc),
      cell(fmtDate(l.end_date), cc),
      cell(l.days_in_period, { ...cellStyle(alt, "center"), numFmt: "0.0" }),
      cell(l.reason || "-", cellStyle(alt)),
      cell(capitalize(l.status), statusStyle(l.status, alt)),
      cell(l.rejection_note || "", cellStyle(alt)),
    ]);
  }));
  return out;
}
const LEAVE_HEAD = ["Jenis", "Durasi", "Mulai", "Selesai", "Hari di Periode", "Alasan", "Status", "Catatan Penolakan"];
const LEAVE_W = [9, 14, 13, 13, 13, 36, 12, 28];

function offRows(details, withName) {
  const out = [];
  details.forEach((d) => d.off_list.forEach((o) => {
    const alt = out.length % 2 === 1;
    const cc = cellStyle(alt, "center");
    out.push([
      cell(out.length + 1, numStyle(alt)),
      ...(withName ? [cell(d.employee_code || "-", cc), cell(nameOf(d), cellStyle(alt))] : []),
      cell(fmtDate(o.date), cc),
      cell(fmtDay(o.date), cc),
      cell(capitalize(o.status), statusStyle(o.status, alt)),
      cell(o.reason || "-", cellStyle(alt)),
      cell(o.backup_name ? fmtEmployeeName(o.backup_name) : "-", cellStyle(alt)),
    ]);
  }));
  return out;
}
const OFF_HEAD = ["Tanggal", "Hari", "Status", "Alasan", "Digantikan Oleh (Backup)"];
const OFF_W = [13, 9, 16, 36, 26];

function loanRows(details, withName) {
  const out = [];
  details.forEach((d) => [...d.kasbon_list, ...d.pinjaman_list].forEach((k) => {
    const alt = out.length % 2 === 1;
    const cc = cellStyle(alt, "center");
    out.push([
      cell(out.length + 1, numStyle(alt)),
      ...(withName ? [cell(d.employee_code || "-", cc), cell(nameOf(d), cellStyle(alt))] : []),
      cell(k.type === "pinjaman" ? "Pinjaman" : "Kasbon", cc),
      cell(fmtDate(k.submission_date), cc),
      cell(k.amount_approved || k.amount_requested, moneyStyle(alt)),
      cell(PAY_METHOD_LABEL[k.payment_method] || "-", cc),
      cell(k.type === "pinjaman" ? `${k.tenor_count}x` : "-", cc),
      cell(k.installment_amount || 0, moneyStyle(alt)),
      cell(k.total_paid, moneyStyle(alt, C.okText)),
      cell(k.remaining, moneyStyle(alt, k.remaining > 0 ? C.lateText : C.textDark)),
      cell(k.deduction_current || 0, moneyStyle(alt)),
      cell(k.deduction_arrears || 0, moneyStyle(alt, k.deduction_arrears > 0 ? C.lateText : C.textDark)),
      cell(k.deduction, moneyStyle(alt, C.brand, true)),
      cell(k.direct || 0, moneyStyle(alt, C.infoText)),
      cell(k.deduction_installments.length ? k.deduction_installments.map((n) => `#${n}`).join(", ") : k.legacy ? "Tanpa jadwal" : "-", cc),
      cell(capitalize(k.status), statusStyle(k.status, alt)),
      cell([k.purpose, k.is_opening_balance ? "Saldo awal" : "", k.legacy ? "Belum ada jadwal termin" : "", k.approved_by_name && `Disetujui ${k.approved_by_name}`]
        .filter(Boolean).join(" · ") || "-", cellStyle(alt)),
    ]);
  }));
  return out;
}
const LOAN_HEAD = ["Jenis", "Tgl Pengajuan", "Nominal", "Metode Bayar", "Tenor", "Cicilan", "Sudah Dibayar", "Sisa",
  "Termin Periode Ini", "Tunggakan", "Potong Gaji", "Bayar Langsung", "Termin Dibebankan", "Status", "Keterangan"];
const LOAN_W = [10, 13, 14, 14, 7, 13, 14, 14, 15, 14, 15, 15, 14, 12, 36];

// Jadwal termin (satu baris per termin) — rincian kasbon & pinjaman
function installmentRows(details, withName) {
  const out = [];
  details.forEach((d) => [...d.kasbon_list, ...d.pinjaman_list].forEach((k) => k.payments.forEach((p) => {
    const alt = out.length % 2 === 1;
    const cc = cellStyle(alt, "center");
    const state = p.status === "terbayar" ? "Lunas" : p.arrears ? "Tunggakan" : p.in_period ? "Periode Ini" : "Belum";
    const tone = { Lunas: [C.okBg, C.okText], Tunggakan: [C.lateBg, C.lateText], "Periode Ini": [C.metaBg, C.brand] }[state];
    out.push([
      cell(out.length + 1, numStyle(alt)),
      ...(withName ? [cell(d.employee_code || "-", cc), cell(nameOf(d), cellStyle(alt))] : []),
      cell(k.type === "pinjaman" ? "Pinjaman" : "Kasbon", cc),
      cell(fmtDate(k.submission_date), cc),
      cell(p.installment_no ? `#${p.installment_no}` : "-", cc),
      cell(fmtDate(p.due_date), cc),
      cell(p.amount, moneyStyle(alt)),
      cell(PAY_METHOD_LABEL[p.method] || capitalize(p.method), cc),
      cell(state, tone ? badgeStyle(...tone) : cc),
      cell(p.paid_at ? fmtDateTime(p.paid_at) : "-", cc),
      cell([p.recorded_by_name && `Dicatat ${p.recorded_by_name}`, p.notes].filter(Boolean).join(" · "), cellStyle(alt)),
    ]);
  })));
  return out;
}
const INST_HEAD = ["Jenis", "Tgl Pengajuan", "Termin", "Jatuh Tempo", "Nominal", "Metode", "Status", "Dibayar Pada", "Catatan"];
const INST_W = [10, 13, 8, 13, 14, 15, 12, 17, 36];

function backupRows(details, withName) {
  const out = [];
  details.forEach((d) => d.backup_list.forEach((b) => {
    const alt = out.length % 2 === 1;
    const cc = cellStyle(alt, "center");
    out.push([
      cell(out.length + 1, numStyle(alt)),
      ...(withName ? [cell(d.employee_code || "-", cc), cell(nameOf(d), cellStyle(alt))] : []),
      cell(fmtDate(b.date), cc),
      cell(fmtDay(b.date), cc),
      cell(fmtEmployeeName(b.replaced_name), cellStyle(alt)),
      cell(b.reason || "-", cellStyle(alt)),
    ]);
  }));
  return out;
}
const BACKUP_HEAD = ["Tanggal", "Hari", "Menggantikan", "Alasan Libur Rekan"];
const BACKUP_W = [13, 9, 28, 40];

function sheetOf(title, lines, head, widths, rows, withName) {
  const headers = ["No", ...(withName ? ["Kode", "Nama Karyawan"] : []), ...head];
  return buildSheet({
    title,
    lines,
    headers,
    rows: rows.length ? rows : [emptyRow(headers.length)],
    widths: [5, ...(withName ? [11, 26] : []), ...widths],
  });
}

/* ── Rekap (satu baris per karyawan) ── */

const REKAP_HEAD = [
  "No", "Kode", "Nama Karyawan", "Posisi", "Outlet Asal",
  "Hadir", "Tanpa Ket.", "Off", "Durasi Kerja (jam)", "Rata-rata / Hari (jam)", "Belum Check-out",
  "Lokasi Absen", "Di Luar Outlet Asal", "Backup",
  "Lembur (x)", "Lembur (jam)", "Izin (hari)", "Sakit (hari)", "Cuti (hari)",
  "Terlambat (x)", "Terlambat (menit)", "Potongan Kasbon", "Potongan Pinjaman", "Tunggakan (sudah termasuk)",
  "Sisa Pinjaman", "Total Potong Gaji", "Bayar Langsung",
];
const REKAP_W = [5, 11, 26, 15, 18, 7, 9, 6, 11, 12, 10, 30, 10, 8, 9, 10, 9, 9, 9, 10, 11, 15, 15, 15, 15, 15, 15];

function rekapRow(r, i) {
  const alt = i % 2 === 1;
  const cc = cellStyle(alt, "center");
  const n = (v) => cell(v, numStyle(alt));
  return [
    cell(i + 1, numStyle(alt)),
    cell(r.employee_code || "-", cc),
    cell(nameOf(r), cellStyle(alt)),
    cell([r.role, r.is_leader ? "(Leader)" : ""].filter(Boolean).join(" ") || "-", cellStyle(alt)),
    cell(placeLabel(r.home_outlet), cellStyle(alt)),
    n(r.hadir),
    cell(r.no_info_days || 0, r.no_info_days ? badgeStyle(C.orgBg, C.orgText) : numStyle(alt)),
    n(r.off),
    cell(toHours(r.work_minutes), hoursStyle(alt)),
    cell(toHours(r.avg_work_minutes), hoursStyle(alt)),
    n(r.incomplete_checkout),
    cell(r.locations.map((l) => `${l.code || l.name} (${l.count})`).join(", ") || "-", cellStyle(alt)),
    n(r.outside_home),
    n(r.backup),
    n(r.overtime.approved_count),
    cell(toHours(r.overtime.approved_minutes), hoursStyle(alt)),
    cell(r.leave.izin, { ...numStyle(alt), numFmt: "0.0" }),
    cell(r.leave.sakit, { ...numStyle(alt), numFmt: "0.0" }),
    cell(r.leave.cuti, { ...numStyle(alt), numFmt: "0.0" }),
    cell(r.late.count, lateStyle(alt, r.late.count)),
    n(r.late.minutes),
    cell(r.kasbon.deduction, moneyStyle(alt)),
    cell(r.pinjaman.deduction, moneyStyle(alt)),
    cell(arrearsOf(r), moneyStyle(alt, arrearsOf(r) > 0 ? C.lateText : C.textDark)),
    cell(r.pinjaman.outstanding, moneyStyle(alt, r.pinjaman.outstanding > 0 ? C.lateText : C.textDark)),
    cell(r.deduction_total, moneyStyle(alt, C.brand, true)),
    cell(r.direct_total || 0, moneyStyle(alt, C.infoText)),
  ];
}

const arrearsOf = (r) => (r.kasbon.arrears || 0) + (r.pinjaman.arrears || 0);

function rekapTotal(rows) {
  const sum = (f) => rows.reduce((s, r) => s + (Number(f(r)) || 0), 0);
  const t = totalStyle;
  const money = { ...totalStyle, alignment: { horizontal: "right", vertical: "center" }, numFmt: '"Rp" #,##0' };
  const hrs = { ...totalStyle, numFmt: "0.0" };
  return [
    cell("TOTAL", totalLabelStyle), cell("", t), cell(`${rows.length} karyawan`, totalLabelStyle), cell("", t), cell("", t),
    cell(sum((r) => r.hadir), t), cell(sum((r) => r.no_info_days), t), cell(sum((r) => r.off), t),
    cell(toHours(sum((r) => r.work_minutes)), hrs), cell("", t), cell(sum((r) => r.incomplete_checkout), t),
    cell("", t), cell(sum((r) => r.outside_home), t), cell(sum((r) => r.backup), t),
    cell(sum((r) => r.overtime.approved_count), t), cell(toHours(sum((r) => r.overtime.approved_minutes)), hrs),
    cell(sum((r) => r.leave.izin), hrs), cell(sum((r) => r.leave.sakit), hrs), cell(sum((r) => r.leave.cuti), hrs),
    cell(sum((r) => r.late.count), t), cell(sum((r) => r.late.minutes), t),
    cell(sum((r) => r.kasbon.deduction), money), cell(sum((r) => r.pinjaman.deduction), money),
    cell(sum(arrearsOf), money),
    cell(sum((r) => r.pinjaman.outstanding), money), cell(sum((r) => r.deduction_total), money),
    cell(sum((r) => r.direct_total), money),
  ];
}

/* ── Ringkasan satu karyawan (Komponen | Nilai | Keterangan) ── */

function summarySheet(d, lines) {
  const items = [
    ["Identitas", ""],
    ["Nama", nameOf(d)],
    ["Kode Karyawan", d.employee_code || "-"],
    ["Posisi", [d.role, d.is_leader ? "(Leader)" : ""].filter(Boolean).join(" ") || "-"],
    ["Outlet Asal", placeLabel(d.home_outlet)],
    ["Kehadiran", ""],
    ["Jumlah Hadir", `${d.hadir} hari`],
    ["Jumlah Off (libur disetujui)", `${d.off} hari`, d.off_pending ? `${d.off_pending} pengajuan libur belum final` : ""],
    ["Tanpa Keterangan", `${d.no_info_days} hari`, "Tidak ada absen, libur, atau izin yang tercatat (s/d kemarin)"],
    ["Durasi Kerja", fmtDur(d.work_minutes), `Rata-rata ${fmtDur(d.avg_work_minutes)} per hari`],
    ["Belum Check-out", `${d.incomplete_checkout} kali`, "Tidak dihitung ke durasi kerja"],
    ["Jumlah Terlambat", `${d.late.count} kali`, [
      d.late.count ? `Total ${d.late.minutes} menit · terlama ${d.late.max} menit` : "Tepat waktu",
      d.role === "Frontliner" ? "Batas ikut shift (Pagi 08:00 / Siang 10:30)" : "Jam masuk 08:00",
      d.late.excused ? `${d.late.excused}x dikecualikan karena izin ½ hari pagi` : "",
    ].filter(Boolean).join(" · ")],
    ...(d.early?.count || d.role === "Frontliner" ? [["Pulang Cepat", `${d.early?.count || 0} kali`, [
      d.early?.count ? `Total ${d.early.minutes} menit` : "",
      "Sebelum jam selesai shift (Pagi 17:00 / Siang 20:00)",
      d.early?.excused ? `${d.early.excused}x dikecualikan karena izin ½ hari siang` : "",
    ].filter(Boolean).join(" · ")]] : []),
    ["Lokasi & Backup", ""],
    ["Lokasi Absen", d.locations.map((l) => `${placeLabel(l)} (${l.count}x)`).join(", ") || "-"],
    ["Absen di Luar Outlet Asal", `${d.outside_home} kali`],
    ["Jumlah Backup", `${d.backup} kali`, "Menggantikan rekan yang libur"],
    ["Lembur & Perizinan", ""],
    ["Lembur Disetujui", `${d.overtime.approved_count} kali · ${fmtDur(d.overtime.approved_minutes)}`,
      [d.overtime.pending_count && `${d.overtime.pending_count} menunggu`, d.overtime.rejected_count && `${d.overtime.rejected_count} ditolak`].filter(Boolean).join(" · ")],
    ["Izin", `${fmtDays(d.leave.izin)} hari`],
    ["Sakit", `${fmtDays(d.leave.sakit)} hari`],
    ["Cuti", `${fmtDays(d.leave.cuti)} hari`,
      [d.leave.pending && `${d.leave.pending} pengajuan menunggu`, d.leave.rejected && `${d.leave.rejected} ditolak`].filter(Boolean).join(" · ")],
    ["Kasbon & Pinjaman", ""],
    ["Potongan Kasbon", d.kasbon.deduction, [
      `${d.kasbon.count} kasbon diajukan di periode`,
      d.kasbon.arrears && `termasuk tunggakan Rp ${d.kasbon.arrears.toLocaleString("id-ID")}`,
      d.kasbon.pending && `${d.kasbon.pending} pengajuan menunggu (belum dipotong)`,
    ].filter(Boolean).join(" · ")],
    ["Potongan Cicilan Pinjaman", d.pinjaman.deduction, [
      `${d.pinjaman.active} pinjaman aktif`,
      d.pinjaman.arrears && `termasuk tunggakan Rp ${d.pinjaman.arrears.toLocaleString("id-ID")}`,
      d.pinjaman.pending && `${d.pinjaman.pending} pengajuan menunggu (belum dipotong)`,
    ].filter(Boolean).join(" · ")],
    ["Sisa Pinjaman", d.pinjaman.outstanding],
    ["Bayar Langsung (tidak potong gaji)", d.direct_total || 0, "Termin kasbon/pinjaman dengan metode bayar langsung"],
    ["Total Potong Gaji Periode Ini", d.deduction_total],
  ];
  let alt = false;
  const rows = items.map(([k, v, note = ""]) => {
    if (v === "" && !note) {
      // judul kelompok
      const s = { ...cellStyle(false), fill: { fgColor: { rgb: C.metaBg } }, font: { bold: true, sz: 10, color: { rgb: C.brand }, name: "Calibri" } };
      return [cell(k, s), cell("", s), cell("", s)];
    }
    alt = !alt;
    const isMoney = typeof v === "number";
    const bold = k.startsWith("Total");
    return [
      cell(k, cellStyle(alt, "left", { font: { sz: 10, bold, color: { rgb: C.textDark }, name: "Calibri" } })),
      cell(v, isMoney ? moneyStyle(alt, bold ? C.brand : C.textDark, bold) : cellStyle(alt, "left", { font: { sz: 10, bold: true, color: { rgb: C.textDark }, name: "Calibri" } })),
      cell(note, cellStyle(alt, "left", { font: { sz: 9, italic: true, color: { rgb: C.textGray }, name: "Calibri" } })),
    ];
  });
  return buildSheet({
    title: `Ringkasan Payroll — ${nameOf(d)}`,
    lines,
    headers: ["Komponen", "Nilai", "Keterangan"],
    rows,
    widths: [30, 30, 60],
    autofilter: false,
  });
}

/* ── Export ── */

const slug = (s) => String(s || "").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");

/**
 * Export payroll satu karyawan.
 * @param {object} o { detail, startDate, endDate, periodLabel }
 */
export function exportPayrollEmployeeExcel({ detail, startDate, endDate, periodLabel }) {
  const lines = [
    `Karyawan: ${nameOf(detail)}${detail.employee_code ? ` (${detail.employee_code})` : ""}`,
    periodText(startDate, endDate, periodLabel),
    exportedAtText(),
  ];
  const one = [detail];
  saveWorkbook([
    { name: "Ringkasan", ws: summarySheet(detail, lines) },
    { name: "Absensi Harian", ws: sheetOf("Absensi Harian", lines, DAILY_HEAD, DAILY_W, dailyRows(one, false), false) },
    { name: "Lembur", ws: sheetOf("Lembur", lines, OT_HEAD, OT_W, overtimeRows(one, false), false) },
    { name: "Perizinan", ws: sheetOf("Perizinan (Izin / Sakit / Cuti)", lines, LEAVE_HEAD, LEAVE_W, leaveRows(one, false), false) },
    { name: "Libur", ws: sheetOf("Jadwal Libur", lines, OFF_HEAD, OFF_W, offRows(one, false), false) },
    { name: "Kasbon & Pinjaman", ws: sheetOf("Kasbon & Pinjaman", lines, LOAN_HEAD, LOAN_W, loanRows(one, false), false) },
    { name: "Jadwal Termin", ws: sheetOf("Jadwal Termin Kasbon & Pinjaman", lines, INST_HEAD, INST_W, installmentRows(one, false), false) },
    { name: "Backup", ws: sheetOf("Backup (Menggantikan Rekan Libur)", lines, BACKUP_HEAD, BACKUP_W, backupRows(one, false), false) },
  ], `Payroll_${slug(nameOf(detail))}_${rangeSlug(startDate, endDate)}.xlsx`);
}

/**
 * Export payroll semua karyawan (sesuai filter).
 * @param {object} o { details, startDate, endDate, periodLabel, filters: { outlet, role, search } }
 */
export function exportPayrollAllExcel({ details = [], startDate, endDate, periodLabel, filters = {} }) {
  const lines = headerLines({ startDate, endDate, periodLabel, filters });
  const rekapRows = details.map(rekapRow);
  const rekap = buildSheet({
    title: "Rekap Payroll Karyawan Waschen",
    lines,
    headers: REKAP_HEAD,
    rows: rekapRows.length ? rekapRows : [emptyRow(REKAP_HEAD.length)],
    total: rekapRows.length ? rekapTotal(details) : undefined,
    widths: REKAP_W,
  });
  saveWorkbook([
    { name: "Rekap", ws: rekap },
    { name: "Absensi Harian", ws: sheetOf("Absensi Harian Semua Karyawan", lines, DAILY_HEAD, DAILY_W, dailyRows(details, true), true) },
    { name: "Lembur", ws: sheetOf("Lembur Semua Karyawan", lines, OT_HEAD, OT_W, overtimeRows(details, true), true) },
    { name: "Perizinan", ws: sheetOf("Perizinan Semua Karyawan", lines, LEAVE_HEAD, LEAVE_W, leaveRows(details, true), true) },
    { name: "Libur", ws: sheetOf("Jadwal Libur Semua Karyawan", lines, OFF_HEAD, OFF_W, offRows(details, true), true) },
    { name: "Kasbon & Pinjaman", ws: sheetOf("Kasbon & Pinjaman Semua Karyawan", lines, LOAN_HEAD, LOAN_W, loanRows(details, true), true) },
    { name: "Jadwal Termin", ws: sheetOf("Jadwal Termin Semua Karyawan", lines, INST_HEAD, INST_W, installmentRows(details, true), true) },
    { name: "Backup", ws: sheetOf("Backup Semua Karyawan", lines, BACKUP_HEAD, BACKUP_W, backupRows(details, true), true) },
  ], `Payroll_Waschen_${rangeSlug(startDate, endDate)}.xlsx`);
}
