export const cn = (...a) => a.filter(Boolean).join(" ");

export const fmtIDR = (n) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

export const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);