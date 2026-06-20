/**
 * formatRupiah — Format angka ke tampilan Rupiah (Rp 1.000 / Rp 1.000.000)
 * Untuk display di tabel / teks.
 */
export function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "Rp0";
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(n)) return "Rp0";
  return "Rp" + Math.floor(n).toLocaleString("id-ID");
}

/**
 * formatRupiahInput — Format angka saat diketik di input.
 * Output: "1.000" agar user lihat pemisah ribuan.
 * Menerima input berupa string digit (hasil parseRupiahInput).
 */
export function formatRupiahInput(value) {
  if (!value || value === "0") return "";
  return Number(value).toLocaleString("id-ID");
}

/**
 * parseRupiahInput — Balikin dari "1.000" → "1000" (string digit).
 * Hapus semua non-digit (titik pemisah ribuan).
 */
export function parseRupiahInput(value) {
  if (!value) return "0";
  return value.replace(/\./g, "");
}
