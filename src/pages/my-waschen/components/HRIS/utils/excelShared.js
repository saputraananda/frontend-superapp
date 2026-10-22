import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

// Gaya Excel bersama untuk semua export HRIS Waschen (warna brand #5F1340).

export const C = {
  brand:       "5F1340",
  titleBg:     "3B0A27",
  metaBg:      "FDF2F8",
  metaText:    "5F1340",
  altRowBg:    "FAF5F8",
  whiteBg:     "FFFFFF",
  textDark:    "1E293B",
  textGray:    "64748B",
  borderColor: "CBD5E1",

  okBg:    "D1FAE5", okText:    "065F46",
  lateBg:  "FFE4E6", lateText:  "9F1239",
  warnBg:  "FEF3C7", warnText:  "92400E",
  orgBg:   "FFEDD5", orgText:   "9A3412",
  infoBg:  "E0F2FE", infoText:  "075985",
  violetBg: "EDE9FE", violetText: "5B21B6",
  mutedBg: "F1F5F9",
};

const border = () => ({
  top:    { style: "thin", color: { rgb: C.borderColor } },
  bottom: { style: "thin", color: { rgb: C.borderColor } },
  left:   { style: "thin", color: { rgb: C.borderColor } },
  right:  { style: "thin", color: { rgb: C.borderColor } },
});

export const titleStyle = {
  fill: { fgColor: { rgb: C.titleBg } },
  font: { bold: true, sz: 14, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
};

export const metaStyle = {
  fill: { fgColor: { rgb: C.metaBg } },
  font: { sz: 10, color: { rgb: C.metaText }, italic: true, name: "Calibri" },
  alignment: { horizontal: "left", vertical: "center" },
};

export const headerStyle = {
  fill: { fgColor: { rgb: C.brand } },
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: border(),
};

export const totalStyle = { ...headerStyle, fill: { fgColor: { rgb: C.titleBg } } };
export const totalLabelStyle = { ...totalStyle, alignment: { horizontal: "left", vertical: "center" } };

const spacerStyle = { fill: { fgColor: { rgb: "FFFFFF" } } };

export const cellStyle = (isAlt, align = "left", extra = {}) => ({
  fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
  font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
  alignment: { horizontal: align, vertical: "center", wrapText: false },
  border: border(),
  ...extra,
});

export const numStyle = (isAlt) => ({
  ...cellStyle(isAlt, "center"),
  font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" },
});

// Rupiah sebagai angka asli agar bisa dijumlah di Excel
export const moneyStyle = (isAlt, color = C.textDark, bold = false) => ({
  ...cellStyle(isAlt, "right"),
  font: { sz: 10, bold, color: { rgb: color }, name: "Calibri" },
  numFmt: '"Rp" #,##0',
});

export const badgeStyle = (bg, text) => ({
  fill: { fgColor: { rgb: bg } },
  font: { bold: true, sz: 10, color: { rgb: text }, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
  border: border(),
});

// Status umum pengajuan (perizinan, lembur, kasbon, libur)
const STATUS_TONE = {
  pengajuan: [C.warnBg, C.warnText],
  proses: [C.infoBg, C.infoText],
  berlangsung: [C.infoBg, C.infoText],
  disetujui: [C.okBg, C.okText],
  disetujui_leader: [C.infoBg, C.infoText],
  ditolak: [C.lateBg, C.lateText],
  ditolak_leader: [C.orgBg, C.orgText],
  dibatalkan: [C.mutedBg, C.textGray],
  lunas: [C.okBg, C.okText],
  lengkap: [C.okBg, C.okText],
  kurang: [C.warnBg, C.warnText],
  kosong: [C.lateBg, C.lateText],
};

export const statusStyle = (status, isAlt) => {
  const tone = STATUS_TONE[String(status || "").toLowerCase()];
  return tone ? badgeStyle(tone[0], tone[1]) : cellStyle(isAlt, "center");
};

export const cell = (v, s) => {
  if (typeof v === "number" && Number.isFinite(v)) return { v, t: "n", s, ...(s?.numFmt ? { z: s.numFmt } : {}) };
  return { v: v == null ? "" : String(v), t: "s", s };
};
const empty = (s) => ({ v: "", t: "s", s });

/* ── Format ── */

export function fmtDate(d) {
  if (!d) return "-";
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function fmtDay(d) {
  if (!d) return "-";
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(date);
}

// "YYYY-MM-DD HH:mm:ss" (WIB) → "21 Okt 2026 08:15", tanpa geser zona waktu
export function fmtDateTime(v) {
  if (!v) return "-";
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
  if (m && !/Z$|[+-]\d{2}:?\d{2}$/.test(s)) return `${fmtDate(m[1])} ${m[2]}:${m[3]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtMinutes(min) {
  if (!min || min <= 0) return "-";
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}j ${r}m` : `${r}m`;
}

export function capitalize(s) {
  if (!s) return "-";
  return String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function periodText(startDate, endDate, periodLabel) {
  const range = startDate && endDate ? `${fmtDate(startDate)} s.d. ${fmtDate(endDate)}` : "-";
  return `Periode: ${periodLabel ? `${periodLabel} (${range})` : range}`;
}

export function filterText(parts) {
  const list = parts.filter(Boolean);
  return `Filter: ${list.length ? list.join("  |  ") : "Semua data (tanpa filter)"}`;
}

export function exportedAtText() {
  return `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;
}

/* ── Builder ── */

/**
 * Bangun satu sheet: judul + baris info + header + data (+ baris total opsional).
 * @param {object} o
 * @param {string}   o.title
 * @param {string[]} o.lines      Baris info (periode, filter, dsb.)
 * @param {string[]} o.headers
 * @param {Array<Array<object>>} o.rows   Baris data, tiap sel hasil cell()
 * @param {Array<object>} [o.total]       Baris total (sel hasil cell())
 * @param {number[]} o.widths     Lebar kolom (wch)
 * @param {boolean}  [o.autofilter=true]
 */
export function buildSheet({ title, lines = [], headers, rows, total, widths, autofilter = true }) {
  const n = headers.length;
  const data = [
    [cell(title, titleStyle), ...Array.from({ length: n - 1 }, () => empty(titleStyle))],
    ...lines.map((l) => [cell(l, metaStyle), ...Array.from({ length: n - 1 }, () => empty(metaStyle))]),
    Array.from({ length: n }, () => empty(spacerStyle)),
  ];
  const headerRow = data.length;
  data.push(headers.map((h) => cell(h, headerStyle)));
  rows.forEach((r) => data.push(r));
  if (total) data.push(total);

  const ws = XLSXStyle.utils.aoa_to_sheet(data);
  ws["!merges"] = Array.from({ length: headerRow }, (_, r) => ({ s: { r, c: 0 }, e: { r, c: n - 1 } }));
  ws["!cols"] = widths.map((wch) => ({ wch }));
  ws["!rows"] = [{ hpt: 32 }, ...lines.map(() => ({ hpt: 18 })), { hpt: 6 }, { hpt: 28 }];
  if (autofilter && rows.length) {
    ws["!autofilter"] = { ref: XLSXStyle.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: headerRow + rows.length, c: n - 1 } }) };
  }
  return ws;
}

export function emptyRow(n, text = "Tidak ada data") {
  return [cell(text, cellStyle(false, "center", { font: { sz: 10, italic: true, color: { rgb: C.textGray }, name: "Calibri" } })), ...Array.from({ length: n - 1 }, () => cell("", cellStyle(false)))];
}

/** Simpan workbook. sheets: [{ name, ws }] */
export function saveWorkbook(sheets, filename) {
  const wb = XLSXStyle.utils.book_new();
  sheets.forEach(({ name, ws }) => XLSXStyle.utils.book_append_sheet(wb, ws, name.slice(0, 31)));
  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

// Nama outlet untuk keterangan filter di file export
export function outletFilterName(outlets = [], outletId) {
  if (!outletId) return "";
  const o = outlets.find((x) => String(x.id) === String(outletId));
  return o ? o.name : "";
}

// outlet_id → "KODE · Nama" untuk isi kolom outlet
export function makeOutletNamer(outlets = []) {
  const map = new Map(outlets.map((o) => [String(o.id), o]));
  return (id) => {
    const o = map.get(String(id));
    return o ? (o.outlet_code ? `${o.outlet_code} · ${o.name}` : o.name) : "";
  };
}

export function rangeSlug(startDate, endDate) {
  if (startDate && endDate) return `${startDate.replaceAll("-", "")}-${endDate.replaceAll("-", "")}`;
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}
