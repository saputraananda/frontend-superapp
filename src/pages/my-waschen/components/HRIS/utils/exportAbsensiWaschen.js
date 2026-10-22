import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";
import { fmtEmployeeName, groomingStatusLabel } from "../../../utils/hrisUtils";

// Jam masuk Waschen. Check-in setelah 08:00 (mulai 08:01) dihitung terlambat.
// Samakan dengan JAM_MASUK_MIN di DashboardHRWaschen.jsx.
const JAM_MASUK_MIN = 8 * 60;

// ─── Color palette (brand Waschen) ───────────────────────────────────────────
const C = {
  brand:       "5F1340",
  titleBg:     "3B0A27",
  metaBg:      "FDF2F8", // pink-50
  metaText:    "5F1340",
  altRowBg:    "FAF5F8",
  whiteBg:     "FFFFFF",
  textDark:    "1E293B",
  textGray:    "64748B",
  borderColor: "CBD5E1",

  okBg:   "D1FAE5", okText:   "065F46",
  lateBg: "FFE4E6", lateText: "9F1239",
  warnBg: "FEF3C7", warnText: "92400E",
  orgBg:  "FFEDD5", orgText:  "9A3412",
  infoBg: "E0F2FE", infoText: "075985",
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
  fill: { fgColor: { rgb: C.brand } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: border(),
};

const spacerStyle = { fill: { fgColor: { rgb: "FFFFFF" } } };

const makeCellStyle = (isAlt, align = "left", extra = {}) => ({
  fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
  font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center", wrapText: false },
  border: border(),
  ...extra,
});

const badgeStyle = (bg, text) => ({
  fill: { fgColor: { rgb: bg } },
  font: { bold: true, sz: 10, color: { rgb: text }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
  border: border(),
});

const numStyle = (isAlt) => ({
  ...makeCellStyle(isAlt, "center"),
  font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" },
});

const STATUS_STYLE = {
  "Lengkap":            badgeStyle(C.okBg, C.okText),
  "Belum check-out":    badgeStyle(C.warnBg, C.warnText),
  "Belum check-in":     badgeStyle(C.lateBg, C.lateText),
  "Foto belum lengkap": badgeStyle(C.orgBg, C.orgText),
};

const GROOMING_STYLE = {
  lengkap:     badgeStyle(C.okBg, C.okText),
  kurang:      badgeStyle(C.warnBg, C.warnText),
  kosong:      badgeStyle(C.lateBg, C.lateText),
  tidak_wajib: badgeStyle("F1F5F9", C.textGray),
};

const cell = (v, s) => ({ v: v ?? "", t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Waktu dari server berformat "YYYY-MM-DD HH:mm:ss" (WIB). Baca jam langsung dari
// string supaya tidak tergeser zona waktu browser.
function toMinutes(v) {
  if (!v) return null;
  const s = String(v);
  if (!/Z$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const m = s.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
}

function fmtClock(min) {
  if (min == null || Number.isNaN(min)) return "-";
  const m = Math.round(min);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function fmtMinutes(min) {
  if (!min || min <= 0) return "-";
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}j ${r}m` : `${r}m`;
}

function fmtDate(d) {
  if (!d) return "-";
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function fmtDay(d) {
  if (!d) return "-";
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(date);
}

function durationMin(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const diff = new Date(String(checkOut).replace(" ", "T")) - new Date(String(checkIn).replace(" ", "T"));
  return diff > 0 ? diff / 60000 : null;
}

function pct(part, total) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function complianceStyle(p) {
  if (p >= 90) return badgeStyle(C.okBg, C.okText);
  if (p >= 75) return badgeStyle(C.warnBg, C.warnText);
  return badgeStyle(C.lateBg, C.lateText);
}

function metaRows(title, total, lines) {
  return [
    [cell(title, titleStyle), ...Array.from({ length: total - 1 }, () => empty(titleStyle))],
    ...lines.map((l) => [cell(l, metaStyle), ...Array.from({ length: total - 1 }, () => empty(metaStyle))]),
    Array.from({ length: total }, () => empty(spacerStyle)),
  ];
}

function metaMerges(count, total) {
  return Array.from({ length: count }, (_, r) => ({ s: { r, c: 0 }, e: { r, c: total - 1 } }));
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Export absensi Waschen ke Excel (3 sheet: Riwayat, Rekap Karyawan, Rekap Outlet).
 *
 * @param {object}   opts
 * @param {object[]} opts.records       Baris dari GET /waschen/hris/attendance
 * @param {string}   opts.startDate     YYYY-MM-DD
 * @param {string}   opts.endDate       YYYY-MM-DD
 * @param {string}   [opts.periodLabel] Mis. "Oktober 2026"
 * @param {object}   [opts.filters]     { outlet, role, status, search, onlyIncomplete }
 * @param {(id) => string} [opts.outletName] Nama outlet / lokasi dari outlet_id
 */
export function exportAbsensiWaschenExcel({ records = [], startDate, endDate, periodLabel, filters = {}, outletName }) {
  const getOutlet = (r) => {
    if (r.absen_location_name) return `${r.absen_location_code ? `${r.absen_location_code} · ` : ""}${r.absen_location_name} (Backup)`;
    return outletName?.(r.outlet_id) || (r.outlet_id != null ? `#${r.outlet_id}` : "-");
  };

  const rows = records
    .map((r) => {
      const inMin = toMinutes(r.check_in_time);
      const late = inMin != null && inMin > JAM_MASUK_MIN;
      return {
        ...r,
        inMin,
        outMin: toMinutes(r.check_out_time),
        late,
        lateMin: late ? inMin - JAM_MASUK_MIN : 0,
        durMin: durationMin(r.check_in_time, r.check_out_time),
        outletLabel: getOutlet(r),
        name: fmtEmployeeName(r.employee_name, `#${r.employee_id}`),
      };
    })
    .sort((a, b) =>
      String(a.work_date).localeCompare(String(b.work_date))
      || a.name.localeCompare(b.name, "id")
      || (a.inMin ?? 0) - (b.inMin ?? 0));

  const periodStr = startDate && endDate ? `${fmtDate(startDate)} s.d. ${fmtDate(endDate)}` : "-";
  const filterParts = [];
  if (filters.outlet) filterParts.push(`Outlet: ${filters.outlet}`);
  if (filters.role) filterParts.push(`Posisi: ${filters.role}`);
  if (filters.status && filters.status !== "Semua") filterParts.push(`Status: ${filters.status}`);
  if (filters.onlyIncomplete) filterParts.push("Hanya belum lengkap");
  if (filters.search) filterParts.push(`Cari: "${filters.search}"`);
  if (filters.employees?.length) {
    const n = filters.employees;
    filterParts.push(`Karyawan: ${n.length <= 3 ? n.join(", ") : `${n.slice(0, 3).join(", ")} +${n.length - 3} lainnya`}`);
  }
  const lines = [
    `Periode: ${periodLabel ? `${periodLabel} (${periodStr})` : periodStr}`,
    `Filter: ${filterParts.length ? filterParts.join("  |  ") : "Semua data (tanpa filter)"}`,
    `Jam masuk 08:00 · check-in setelah 08:00 dihitung terlambat`,
    `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`,
  ];

  // ── Sheet 1: Riwayat Absensi ────────────────────────────────────────────────
  const H1 = [
    "No", "Tanggal", "Hari", "Kode", "Nama Karyawan", "Posisi", "Outlet / Lokasi",
    "Jam Masuk", "Jam Pulang", "Durasi", "Ketepatan", "Telat", "Grooming", "Status", "Catatan Masuk", "Catatan Pulang",
  ];
  const ws1Data = metaRows("Riwayat Absensi Karyawan Waschen", H1.length, lines);
  const headerRow1 = ws1Data.length;
  ws1Data.push(H1.map((h) => cell(h, headerStyle)));

  rows.forEach((r, i) => {
    const alt = i % 2 === 1;
    const cs = makeCellStyle(alt);
    const cc = makeCellStyle(alt, "center");
    const ketepatan = r.inMin == null ? "-" : r.late ? "Terlambat" : "Tepat waktu";
    ws1Data.push([
      cell(i + 1, numStyle(alt)),
      cell(fmtDate(r.work_date), cc),
      cell(fmtDay(r.work_date), cc),
      cell(r.employee_code || "-", cc),
      cell(r.name, cs),
      cell(r.role_code || "-", cs),
      cell(r.outletLabel, cs),
      cell(fmtClock(r.inMin), r.late ? badgeStyle(C.lateBg, C.lateText) : cc),
      cell(fmtClock(r.outMin), r.check_out_time ? cc : badgeStyle(C.warnBg, C.warnText)),
      cell(fmtMinutes(r.durMin), cc),
      cell(ketepatan, r.inMin == null ? cc : r.late ? badgeStyle(C.lateBg, C.lateText) : badgeStyle(C.okBg, C.okText)),
      cell(r.late ? fmtMinutes(r.lateMin) : "-", r.late ? badgeStyle(C.lateBg, C.lateText) : cc),
      cell(groomingStatusLabel(r.grooming_status) || "-", GROOMING_STYLE[r.grooming_status] || cc),
      cell(r.status_label || "-", STATUS_STYLE[r.status_label] || cc),
      cell(r.check_in_note || "", cs),
      cell(r.check_out_note || "", cs),
    ]);
  });

  const ws1 = XLSXStyle.utils.aoa_to_sheet(ws1Data);
  ws1["!merges"] = metaMerges(headerRow1, H1.length);
  ws1["!cols"] = [
    { wch: 5 }, { wch: 13 }, { wch: 9 }, { wch: 11 }, { wch: 26 }, { wch: 15 }, { wch: 26 },
    { wch: 10 }, { wch: 10 }, { wch: 9 }, { wch: 12 }, { wch: 9 }, { wch: 13 }, { wch: 18 }, { wch: 32 }, { wch: 32 },
  ];
  ws1["!rows"] = [{ hpt: 32 }, ...lines.map(() => ({ hpt: 18 })), { hpt: 6 }, { hpt: 26 }];
  ws1["!autofilter"] = { ref: XLSXStyle.utils.encode_range({ s: { r: headerRow1, c: 0 }, e: { r: headerRow1 + rows.length, c: H1.length - 1 } }) };
  ws1["!freeze"] = { xSplit: 0, ySplit: headerRow1 + 1 };

  // ── Sheet 2: Rekap Kepatuhan Karyawan ───────────────────────────────────────
  const empMap = new Map();
  rows.forEach((r) => {
    const id = String(r.employee_id);
    if (!empMap.has(id)) {
      empMap.set(id, {
        name: r.name, code: r.employee_code, role: r.role_code, outlets: new Set(),
        days: new Set(), hadir: 0, telat: 0, lateSum: 0, maxLate: 0, inSum: 0, noOut: 0, noIn: 0, workMin: 0, lastLate: null,
      });
    }
    const e = empMap.get(id);
    e.outlets.add(r.outletLabel);
    if (r.work_date) e.days.add(String(r.work_date).slice(0, 10));
    if (r.inMin == null) { e.noIn += 1; return; }
    e.hadir += 1;
    e.inSum += r.inMin;
    if (!r.check_out_time) e.noOut += 1;
    if (r.durMin) e.workMin += r.durMin;
    if (r.late) {
      e.telat += 1;
      e.lateSum += r.lateMin;
      e.maxLate = Math.max(e.maxLate, r.lateMin);
      if (!e.lastLate || r.work_date > e.lastLate) e.lastLate = r.work_date;
    }
  });
  const emps = [...empMap.values()]
    .map((e) => ({ ...e, tepat: e.hadir - e.telat, kepatuhan: pct(e.hadir - e.telat, e.hadir) }))
    .sort((a, b) => b.telat - a.telat || b.lateSum - a.lateSum || a.name.localeCompare(b.name, "id"));

  const H2 = [
    "No", "Kode", "Nama Karyawan", "Posisi", "Outlet / Lokasi", "Hari Hadir", "Tepat Waktu", "Terlambat",
    "Kepatuhan", "Total Telat", "Rata-rata Telat", "Telat Terlama", "Rata-rata Jam Masuk", "Total Jam Kerja",
    "Belum Check-out", "Terakhir Telat",
  ];
  const ws2Data = metaRows("Rekap Kepatuhan Karyawan Waschen", H2.length, lines);
  const headerRow2 = ws2Data.length;
  ws2Data.push(H2.map((h) => cell(h, headerStyle)));

  emps.forEach((e, i) => {
    const alt = i % 2 === 1;
    const cs = makeCellStyle(alt);
    const cc = makeCellStyle(alt, "center");
    ws2Data.push([
      cell(i + 1, numStyle(alt)),
      cell(e.code || "-", cc),
      cell(e.name, cs),
      cell(e.role || "-", cs),
      cell([...e.outlets].join(", "), cs),
      cell(e.hadir, cc),
      cell(e.tepat, cc),
      cell(e.telat, e.telat ? badgeStyle(C.lateBg, C.lateText) : cc),
      cell(e.hadir ? `${e.kepatuhan}%` : "-", e.hadir ? complianceStyle(e.kepatuhan) : cc),
      cell(fmtMinutes(e.lateSum), cc),
      cell(e.telat ? fmtMinutes(e.lateSum / e.telat) : "-", cc),
      cell(fmtMinutes(e.maxLate), cc),
      cell(e.hadir ? fmtClock(e.inSum / e.hadir) : "-", cc),
      cell(fmtMinutes(e.workMin), cc),
      cell(e.noOut || "-", e.noOut ? badgeStyle(C.warnBg, C.warnText) : cc),
      cell(e.lastLate ? fmtDate(e.lastLate) : "-", cc),
    ]);
  });

  // Baris total
  const tot = emps.reduce((s, e) => ({
    hadir: s.hadir + e.hadir, telat: s.telat + e.telat, lateSum: s.lateSum + e.lateSum,
    inSum: s.inSum + e.inSum, noOut: s.noOut + e.noOut, workMin: s.workMin + e.workMin,
  }), { hadir: 0, telat: 0, lateSum: 0, inSum: 0, noOut: 0, workMin: 0 });
  const totStyle = { ...headerStyle, fill: { fgColor: { rgb: C.titleBg } } };
  ws2Data.push([
    cell("", totStyle), cell("", totStyle), cell(`TOTAL (${emps.length} karyawan)`, { ...totStyle, alignment: { horizontal: "left", vertical: "center" } }),
    cell("", totStyle), cell("", totStyle),
    cell(tot.hadir, totStyle), cell(tot.hadir - tot.telat, totStyle), cell(tot.telat, totStyle),
    cell(`${pct(tot.hadir - tot.telat, tot.hadir)}%`, totStyle),
    cell(fmtMinutes(tot.lateSum), totStyle), cell(tot.telat ? fmtMinutes(tot.lateSum / tot.telat) : "-", totStyle),
    cell("", totStyle), cell(tot.hadir ? fmtClock(tot.inSum / tot.hadir) : "-", totStyle),
    cell(fmtMinutes(tot.workMin), totStyle), cell(tot.noOut, totStyle), cell("", totStyle),
  ]);

  const ws2 = XLSXStyle.utils.aoa_to_sheet(ws2Data);
  ws2["!merges"] = metaMerges(headerRow2, H2.length);
  ws2["!cols"] = [
    { wch: 5 }, { wch: 11 }, { wch: 26 }, { wch: 15 }, { wch: 24 }, { wch: 10 }, { wch: 11 }, { wch: 10 },
    { wch: 11 }, { wch: 11 }, { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 13 }, { wch: 14 },
  ];
  ws2["!rows"] = [{ hpt: 32 }, ...lines.map(() => ({ hpt: 18 })), { hpt: 6 }, { hpt: 30 }];
  ws2["!freeze"] = { xSplit: 0, ySplit: headerRow2 + 1 };

  // ── Sheet 3: Rekap per Outlet / Lokasi ──────────────────────────────────────
  const outMap = new Map();
  rows.forEach((r) => {
    if (r.inMin == null) return;
    const k = r.outletLabel;
    if (!outMap.has(k)) outMap.set(k, { label: k, people: new Set(), hadir: 0, telat: 0, lateSum: 0, inSum: 0 });
    const o = outMap.get(k);
    o.people.add(String(r.employee_id));
    o.hadir += 1;
    o.inSum += r.inMin;
    if (r.late) { o.telat += 1; o.lateSum += r.lateMin; }
  });
  const outs = [...outMap.values()]
    .map((o) => ({ ...o, kepatuhan: pct(o.hadir - o.telat, o.hadir) }))
    .sort((a, b) => a.kepatuhan - b.kepatuhan || b.telat - a.telat);

  const H3 = ["No", "Outlet / Lokasi", "Karyawan", "Check-in", "Tepat Waktu", "Terlambat", "Kepatuhan", "Total Telat", "Rata-rata Telat", "Rata-rata Jam Masuk"];
  const ws3Data = metaRows("Rekap Kepatuhan per Outlet / Lokasi", H3.length, lines);
  const headerRow3 = ws3Data.length;
  ws3Data.push(H3.map((h) => cell(h, headerStyle)));
  outs.forEach((o, i) => {
    const alt = i % 2 === 1;
    const cc = makeCellStyle(alt, "center");
    ws3Data.push([
      cell(i + 1, numStyle(alt)),
      cell(o.label, makeCellStyle(alt)),
      cell(o.people.size, cc),
      cell(o.hadir, cc),
      cell(o.hadir - o.telat, cc),
      cell(o.telat, o.telat ? badgeStyle(C.lateBg, C.lateText) : cc),
      cell(`${o.kepatuhan}%`, complianceStyle(o.kepatuhan)),
      cell(fmtMinutes(o.lateSum), cc),
      cell(o.telat ? fmtMinutes(o.lateSum / o.telat) : "-", cc),
      cell(fmtClock(o.inSum / o.hadir), cc),
    ]);
  });
  const ws3 = XLSXStyle.utils.aoa_to_sheet(ws3Data);
  ws3["!merges"] = metaMerges(headerRow3, H3.length);
  ws3["!cols"] = [{ wch: 5 }, { wch: 32 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
  ws3["!rows"] = [{ hpt: 32 }, ...lines.map(() => ({ hpt: 18 })), { hpt: 6 }, { hpt: 26 }];

  // ── Workbook ────────────────────────────────────────────────────────────────
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws1, "Riwayat Absensi");
  XLSXStyle.utils.book_append_sheet(wb, ws2, "Rekap Karyawan");
  XLSXStyle.utils.book_append_sheet(wb, ws3, "Rekap Outlet");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const range = startDate && endDate ? `${startDate.replaceAll("-", "")}-${endDate.replaceAll("-", "")}` : new Date().toISOString().slice(0, 10).replaceAll("-", "");
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `absensi_waschen_${range}.xlsx`,
  );
}
