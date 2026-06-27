export function formatRupiahNumber(value) {
  if (value === null || value === undefined || value === "") return "0";
  
  const strVal = String(value).trim();
  const rawNum = Number(strVal);
  
  let n;
  if (!isNaN(rawNum)) {
    n = Math.round(rawNum);
  } else {
    const cleanStr = strVal.replace(/[^0-9]/g, "");
    n = Number(cleanStr);
  }

  if (!Number.isFinite(n)) return "0";
  return Number(n).toLocaleString("id-ID");
}

export function formatRupiah(value) {
  return `Rp ${formatRupiahNumber(value)}`;
}

export function unformatRupiahNumber(text) {
  if (text === null || text === undefined) return "";
  const digits = String(text).replace(/[^0-9]/g, "");
  return digits;
}
