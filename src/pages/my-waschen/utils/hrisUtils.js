import { useState } from "react";
import { formatEmployeeName } from "./FormatName";

/** Nama karyawan untuk tampilan UI (Title Case) */
export function fmtEmployeeName(name, fallback = "—") {
  const formatted = formatEmployeeName(name, "");
  return formatted || fallback;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const PAGE_WRAP = "p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto min-w-0 w-full";

export const SUMMARY_GRID = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3";

export const FILTER_SECTION = "rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 lg:p-5 shadow-sm min-w-0";

export const TABLE_SECTION = "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-0";

export const WASCHEN_ROLE_OPTIONS = [
  { value: "Frontliner", label: "Frontliner" },
  { value: "Washing Staff", label: "Washing Staff" },
  { value: "Ironing Staff", label: "Ironing Staff" },
  { value: "Packing Staff", label: "Packing Staff" },
  { value: "Delivery Staff", label: "Delivery Staff" },
];

export function fmtDateShort(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}

export function capitalizeStatus(s) {
  if (!s) return "—";
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

export function leaveStatusBadge(status) {
  if (status === "disetujui") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "ditolak") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function kasbonStatusBadge(status) {
  if (status === "disetujui") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "ditolak") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "proses") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function dayOffStatusBadge(status) {
  if (status === "disetujui") return "border-violet-200 bg-violet-50 text-violet-700";
  if (status === "ditolak") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function calcDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const diff = new Date(checkOut) - new Date(checkIn);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function leaveDurationLabel(type) {
  if (type === "half_day_morning") return "Setengah hari (pagi)";
  if (type === "half_day_afternoon") return "Setengah hari (sore)";
  return "Full day";
}

export function leaveTypeLabel(type) {
  if (type === "sakit") return "Sakit";
  if (type === "cuti") return "Cuti";
  return "Izin";
}

export function leaveTypeBadge(type) {
  if (type === "sakit") return "border-rose-200 bg-rose-50 text-rose-700";
  if (type === "cuti") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function attendanceStatusBadge(label) {
  if (label === "Lengkap") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (label === "Belum check-out") return "border-amber-200 bg-amber-50 text-amber-800";
  if (label === "Foto belum lengkap") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function useSort(initial = { col: "work_date", dir: "desc" }) {
  const [sort, setSort] = useState(initial);
  const toggle = (col) => {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc",
    }));
  };
  const apply = (rows, getters = {}) => {
    const g = getters[sort.col] || ((r) => r[sort.col]);
    return [...rows].sort((a, b) => {
      const av = g(a);
      const bv = g(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  };
  return { sort, toggle, apply };
}
