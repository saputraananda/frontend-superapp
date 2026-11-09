import { useCallback, useState } from "react";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition";

export const cardCls = "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-lg shadow-slate-200/50";

export const primaryBtnCls =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50";

export const ghostBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50";

export const iconBtnCls = "rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600";

export const SOURCE_LABEL = { REQUEST: "Pengajuan", SKILL_MATRIX: "Skill matrix", ROUTINE: "Rutin" };

export const PARTICIPANT_STATUS = {
  ASSIGNED: "Belum mulai",
  PRE_DONE: "Pre-test selesai",
  POST_DONE: "Post-test selesai",
  FEEDBACK_DONE: "Feedback terisi",
  ABSENT: "Tidak hadir",
};

export const RESULT_META = {
  LULUS: { label: "Lulus", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  LULUS_PERBAIKAN: { label: "Lulus dengan perbaikan", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  TIDAK_LULUS: { label: "Tidak lulus", cls: "border-rose-200 bg-rose-50 text-rose-700" },
};

/** Angka desimal dengan koma, "-" kalau kosong. */
export const fmt = (value) => (value === null || value === undefined ? "-" : String(Number(value)).replace(".", ","));

/** "2026-11-10 08:00:00" menjadi "10/11/2026 08.00". */
export const fmtDatetime = (value) => {
  if (!value) return "-";
  const [date, time = ""] = String(value).split(/[ T]/);
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y} ${time.slice(0, 5).replace(":", ".")}`;
};

export function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, showToast };
}
