/** Utilitas target Waschen (Master Outlet My Waschen). */

export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const BULAN_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const RUPIAH = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const fmtRupiah = (n) => RUPIAH.format(Number(n) || 0);
export const fmtNum = (n) => (Number(n) || 0).toLocaleString("id-ID");

/** Input nominal: tampil "Rp 170.000.000", disimpan sebagai angka murni ("170000000"). */
export const toDigits = (v) => String(v ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
export const fmtRupiahInput = (digits) => (digits === "" || digits == null ? "" : `Rp ${Number(digits).toLocaleString("id-ID")}`);
export const periodLabel = (tahun, bulan) => `${BULAN[Number(bulan) - 1] || "?"} ${tahun}`;
export const periodShort = (tahun, bulan) => `${BULAN_SHORT[Number(bulan) - 1] || "?"} ${tahun}`;

/** Bulan tagihan berjalan: tanggal 26 ke atas sudah masuk bulan berikutnya (sama dengan Sales). */
export function billingPeriod(now = new Date()) {
  if (now.getDate() >= 26) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { tahun: next.getFullYear(), bulan: next.getMonth() + 1 };
  }
  return { tahun: now.getFullYear(), bulan: now.getMonth() + 1 };
}

export function yearOptions(extra = []) {
  const now = new Date().getFullYear();
  const set = new Set(extra.map(Number).filter(Boolean));
  for (let y = 2025; y <= now + 1; y += 1) set.add(y);
  return [...set].sort((a, b) => b - a);
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-[#5f1340]/50 focus:ring-2 focus:ring-[#5f1340]/15 disabled:bg-slate-50 disabled:text-slate-400";
