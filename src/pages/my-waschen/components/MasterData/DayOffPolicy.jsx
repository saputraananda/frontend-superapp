import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineSun,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineCalendarDays,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** "20" | "18-22" | "1,3,5" | "1-3,10" → [1..31] urut unik, [] kalau tidak valid. */
function parseOpenDays(spec) {
  const days = new Set();
  for (const part of String(spec ?? "").replace(/\s+/g, "").split(",").filter(Boolean)) {
    const m = part.match(/^(\d{1,2})(?:-(\d{1,2}))?$/);
    if (!m) return [];
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    if (from < 1 || to > 31 || from > to) return [];
    for (let d = from; d <= to; d += 1) days.add(d);
  }
  return [...days].sort((a, b) => a - b);
}

function toSpec(days) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const chunks = [];
  for (let i = 0; i < sorted.length; i += 1) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1;
    chunks.push(j > i ? `${sorted[i]}-${sorted[j]}` : String(sorted[i]));
    i = j;
  }
  return chunks.join(",");
}

function formatOpenDays(spec) {
  const days = parseOpenDays(spec ?? 20);
  return days.length ? toSpec(days).replace(/-/g, "–").replace(/,/g, ", ") : "-";
}

function openDaysForm(spec) {
  const days = parseOpenDays(spec ?? 20);
  const isRange = days.length > 1 && days[days.length - 1] - days[0] === days.length - 1;
  return {
    open_mode: days.length <= 1 ? "single" : isRange ? "range" : "custom",
    open_single: days[0] ?? 20,
    open_from: days[0] ?? 18,
    open_to: days[days.length - 1] ?? 22,
    open_custom: days,
  };
}

function specFromForm(form) {
  if (form.open_mode === "range") {
    const from = Number(form.open_from);
    const to = Number(form.open_to);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 31 || from >= to) return null;
    return `${from}-${to}`;
  }
  if (form.open_mode === "custom") return form.open_custom.length ? toSpec(form.open_custom) : null;
  const day = Number(form.open_single);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? String(day) : null;
}

const OPEN_MODES = [
  { key: "single", label: "1 Tanggal" },
  { key: "range", label: "Range" },
  { key: "custom", label: "Custom" },
];

const EMPTY = {
  policy_id: null,
  outlet_id: "",
  role_id: "",
  max_days_per_month: 4,
  ...openDaysForm("20"),
  min_notice_days: 1,
  allow_past_date_request: 0,
  is_active: 1,
  notes: "",
};

const INPUT = "w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]";

function StatusBadge({ isActive }) {
  const on = Number(isActive) === 1;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
      on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-emerald-500" : "bg-slate-400")} />
      {on ? "Aktif" : "Nonaktif"}
    </span>
  );
}

export default function DayOffPolicy() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api("/waschen/day-off-policies");
      setRows(res.data || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useLiveRefresh(() => load(true));
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const active = rows.filter((r) => Number(r.is_active) === 1);
    return {
      total: rows.length,
      active: active.length,
      openDay: formatOpenDays(active[0]?.request_open_day ?? rows[0]?.request_open_day),
    };
  }, [rows]);

  const openCreate = () => {
    setForm(EMPTY);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      ...row,
      outlet_id: row.outlet_id ?? "",
      role_id: row.role_id ?? "",
      ...openDaysForm(row.request_open_day),
      allow_past_date_request: Number(row.allow_past_date_request),
      is_active: Number(row.is_active),
    });
    setFormError("");
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const openDays = specFromForm(form);
    if (!openDays) {
      setFormError(
        form.open_mode === "range"
          ? "Range tanggal pengajuan harus 1 sampai 31, dan tanggal awal lebih kecil dari tanggal akhir."
          : form.open_mode === "custom"
            ? "Pilih minimal satu tanggal pengajuan."
            : "Tanggal pengajuan harus antara 1 dan 31.",
      );
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        outlet_id: form.outlet_id || null,
        role_id: form.role_id || null,
        max_days_per_month: Number(form.max_days_per_month),
        request_open_day: openDays,
        min_notice_days: Number(form.min_notice_days),
      };
      if (form.policy_id) {
        await api(`/waschen/day-off-policies/${form.policy_id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Rules libur diperbarui");
      } else {
        await api("/waschen/day-off-policies", { method: "POST", body: JSON.stringify(payload) });
        showToast("Rules libur ditambahkan");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/day-off-policies/${deleteTarget.policy_id}`, { method: "DELETE" });
      showToast("Rules libur dihapus");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl", toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <PageHero>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Rules Libur</h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
            Kuota dan tanggal buka pengajuan jadwal libur karyawan
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
        >
          <HiOutlinePlus className="h-4 w-4" />
          <span>Tambah Rules</span>
        </button>
      </PageHero>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Rules", value: stats.total, icon: HiOutlineSun, tone: "purple" },
          { label: "Aktif", value: stats.active, icon: HiOutlineCheckCircle, tone: "emerald" },
          { label: "Tanggal Pengajuan", value: stats.openDay, icon: HiOutlineCalendarDays, tone: "amber" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
              <p className={cn("text-2xl font-bold mt-0.5", s.tone === "emerald" ? "text-emerald-600" : "text-slate-800")}>{s.value}</p>
            </div>
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              s.tone === "emerald" ? "bg-emerald-50 text-emerald-600" : s.tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600",
            )}>
              <s.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider w-12 text-center">No</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Outlet</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Posisi</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Max/Bulan</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Tgl Pengajuan</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Min H-x</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Lampau</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={9} className="px-4 py-4"><div className="h-3.5 rounded bg-slate-200 w-full" /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Belum ada rules libur</td></tr>
              ) : rows.map((r, idx) => (
                <tr key={r.policy_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-center text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{r.outlet_id ?? "Global"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{r.role_id ?? "Semua"}</td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-800">{r.max_days_per_month}</td>
                  <td className="px-4 py-3.5 text-center font-bold text-[#5f1340]">{formatOpenDays(r.request_open_day)}</td>
                  <td className="px-4 py-3.5 text-center">{r.min_notice_days}</td>
                  <td className="px-4 py-3.5 text-center">{Number(r.allow_past_date_request) ? "Ya" : "Tidak"}</td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge isActive={r.is_active} /></td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(r)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition">
                        <HiOutlinePencilSquare className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(r)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition">
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">{form.policy_id ? "Edit Rules Libur" : "Tambah Rules Libur"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center gap-2">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Maksimal hari libur / bulan</label>
                <input type="number" min={1} max={31} required value={form.max_days_per_month} onChange={(e) => setForm({ ...form, max_days_per_month: e.target.value })} className={INPUT} />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal pengajuan</label>
                <div className="mb-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  {OPEN_MODES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setForm({ ...form, open_mode: m.key })}
                      className={cn(
                        "rounded-lg py-1.5 text-[11px] font-semibold transition",
                        form.open_mode === m.key ? "bg-white text-[#5f1340] shadow-sm" : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {form.open_mode === "single" && (
                  <input type="number" min={1} max={31} required value={form.open_single} onChange={(e) => setForm({ ...form, open_single: e.target.value })} className={INPUT} />
                )}
                {form.open_mode === "range" && (
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={31} required value={form.open_from} onChange={(e) => setForm({ ...form, open_from: e.target.value })} className={INPUT} aria-label="Dari tanggal" />
                    <span className="text-slate-400">s/d</span>
                    <input type="number" min={1} max={31} required value={form.open_to} onChange={(e) => setForm({ ...form, open_to: e.target.value })} className={INPUT} aria-label="Sampai tanggal" />
                  </div>
                )}
                {form.open_mode === "custom" && (
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                      const on = form.open_custom.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            open_custom: on ? form.open_custom.filter((x) => x !== d) : [...form.open_custom, d].sort((a, b) => a - b),
                          })}
                          className={cn(
                            "rounded-lg border py-1.5 text-[11px] font-semibold tabular-nums transition",
                            on ? "border-[#5f1340] bg-[#5f1340] text-white" : "border-slate-200 text-slate-600 hover:border-[#5f1340]/40",
                          )}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  Pengajuan dibuka di tanggal terpilih: {formatOpenDays(specFromForm(form))}. Karyawan memilih tanggal libur periode 26 sampai 25.
                </p>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Minimal notice (H-x)</label>
                <input type="number" min={0} max={30} value={form.min_notice_days} onChange={(e) => setForm({ ...form, min_notice_days: e.target.value })} className={INPUT} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Number(form.allow_past_date_request) === 1} onChange={(e) => setForm({ ...form, allow_past_date_request: e.target.checked ? 1 : 0 })} className="rounded border-slate-300 text-[#5f1340] focus:ring-[#5f1340]" />
                <span className="font-semibold text-slate-700">Izinkan permintaan tanggal lampau</span>
              </label>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select value={form.is_active} onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })} className={INPUT}>
                  <option value={1}>Aktif</option>
                  <option value={0}>Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={INPUT} />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-50">
                  {submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                <HiOutlineExclamationTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Hapus rules libur?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Rules tanggal pengajuan <strong>{formatOpenDays(deleteTarget.request_open_day)}</strong> dengan kuota {deleteTarget.max_days_per_month} hari akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" disabled={deleting} onClick={remove} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {deleting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                <span>{deleting ? "Menghapus..." : "Ya, Hapus"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
