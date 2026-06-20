/**
 * formatRupiah — Format angka ke tampilan Rupiah (Rp 1.000 / Rp 1.000.000)
 * Untuk display di tabel / teks.
 */
export function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "Rp0";
  const n = typeof value === "string" ? parseFloat(value.replace(/\D/g, "") || "0") : Number(value);
  if (isNaN(n)) return "Rp0";
  return "Rp" + n.toLocaleString("id-ID");
}

/**
 * formatRupiahInput — Format angka saat diketik di input.
 * Output: "1.000" agar user lihat pemisah ribuan.
 * Simpan di state sebagai string angka (tanpa titik).
 */
export function formatRupiahInput(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

/**
 * parseRupiahInput — Balikin dari "1.000" → "1000" (string digit)
 */
export function parseRupiahInput(value) {
  return value.replace(/\D/g, "");
}
