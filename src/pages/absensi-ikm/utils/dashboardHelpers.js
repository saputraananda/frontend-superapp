// Helper & konstanta warna yang dipakai bersama oleh dashboard IKM (Rewash & Linen Report).

export function cn(...c) { return c.filter(Boolean).join(" "); }

// Warna kategorikal (urutan tetap): biru = utama/bersih, oranye = kedua/kotor/sewa, aqua = ketiga
export const COLOR_PRIMARY = "#2a78d6";
export const COLOR_SECONDARY = "#eb6834";
export const COLOR_TERTIARY = "#1baf7a";
export const COLOR_GRID = "#e2e8f0";
export const COLOR_AXIS = "#94a3b8";

const nf = new Intl.NumberFormat("id-ID");
export const fmtNum = (n) => nf.format(Number(n) || 0);
export const fmtPct = (n) => `${(Number(n) || 0).toFixed(1).replace(".", ",")}%`;

export function shortDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : String(d.getDate());
}
