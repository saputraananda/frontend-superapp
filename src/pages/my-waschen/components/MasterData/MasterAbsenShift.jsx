import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineSparkles,
  HiOutlineBriefcase,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const TABS = [
  { id: "attendance", label: "Jam Absensi" },
  { id: "grooming", label: "Jam Grooming" },
  { id: "shift", label: "Jam Shift POS" },
];

function timeInput(v) {
  if (!v) return "";
  return String(v).slice(0, 5);
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold select-none",
        Number(isActive) === 1
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", Number(isActive) === 1 ? "bg-emerald-500" : "bg-slate-400")} />
      {Number(isActive) === 1 ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function FlagBadge({ on, label }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        Number(on) === 1
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-400",
      )}
    >
      {Number(on) === 1 ? label : "—"}
    </span>
  );
}

function FieldHint({ children }) {
  return <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{children}</p>;
}

function ModalIntro({ children }) {
  return (
    <div className="rounded-lg border border-[#5f1340]/15 bg-[#5f1340]/5 px-3 py-2 text-[11px] leading-snug text-slate-600">
      {children}
    </div>
  );
}

function SectionTitle({ children, hint }) {
  return (
    <div className="flex items-baseline gap-2 pt-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{children}</p>
      {hint ? <p className="text-[10px] text-slate-400 truncate">{hint}</p> : null}
    </div>
  );
}

const FIELD_INPUT =
  "w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-[#5f1340]";
const FIELD_LABEL = "block text-[11px] font-semibold text-slate-700 mb-0.5";

function SkeletonRows({ cols = 6, rows = 3 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="border-t border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-4 py-4">
          <div className="h-3.5 rounded bg-slate-200" style={{ width: `${40 + ((j * 17) % 50)}%` }} />
        </td>
      ))}
    </tr>
  ));
}

export default function MasterAbsenShift() {
  const [tab, setTab] = useState("attendance");
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [grooming, setGrooming] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [toast, setToast] = useState(null);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteShift, setDeleteShift] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [a, g, s] = await Promise.all([
        api("/waschen/hris/time-masters/attendance"),
        api("/waschen/hris/time-masters/grooming"),
        api("/waschen/hris/time-masters/shifts"),
      ]);
      setAttendance(a.data || []);
      setGrooming(g.data || []);
      setShifts(s.data || []);
    } catch (err) {
      showToast(err.message || "Gagal memuat master jam", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useLiveRefresh(() => load(true));
  useEffect(() => {
    load();
  }, [load]);

  const att = attendance[0];
  const groom = grooming[0];

  const stats = useMemo(() => ({
    absen: att ? `${timeInput(att.open_time)}–${timeInput(att.close_time)}` : "—",
    groomingOn: groom ? Number(groom.feature_enabled) === 1 : false,
    shiftCount: shifts.length,
  }), [att, groom, shifts]);

  const openEdit = (type, row = null) => {
    setFormError("");
    if (type === "attendance") {
      const r = row || att || {};
      setForm({
        id: r.id || null,
        code: r.code || "default",
        name: r.name || "Jam Absensi",
        open_time: timeInput(r.open_time) || "05:00",
        close_time: timeInput(r.close_time) || "23:59",
        after_midnight_open: Number(r.after_midnight_open ?? 1),
        lock_enabled: Number(r.lock_enabled ?? 1),
        lock_start_time: timeInput(r.lock_start_time) || "01:00",
        lock_end_time: timeInput(r.lock_end_time) || "04:00",
        work_date_cutoff_time: timeInput(r.work_date_cutoff_time) || "04:00",
        is_active: Number(r.is_active ?? 1),
        notes: r.notes || "",
      });
    } else if (type === "grooming") {
      const r = row || groom || {};
      setForm({
        id: r.id || null,
        code: r.code || "default",
        name: r.name || "Jam Grooming",
        feature_enabled: Number(r.feature_enabled ?? 1),
        window1_start: timeInput(r.window1_start) || "05:00",
        window1_end: timeInput(r.window1_end) || "09:00",
        window2_enabled: Number(r.window2_enabled ?? 1),
        window2_start: timeInput(r.window2_start) || "10:00",
        window2_end: timeInput(r.window2_end) || "11:30",
        lock_enabled: Number(r.lock_enabled ?? 1),
        lock_after_time: timeInput(r.lock_after_time) || "11:30",
        require_reason_after_lock: Number(r.require_reason_after_lock ?? 1),
        is_active: Number(r.is_active ?? 1),
        notes: r.notes || "",
      });
    } else {
      const r = row || {};
      setForm({
        id: r.id || null,
        shift_number: r.shift_number || (shifts.length + 1),
        code: r.code || "",
        name: r.name || "",
        open_time: timeInput(r.open_time) || "08:00",
        close_time: timeInput(r.close_time) || "17:00",
        remind_open: Number(r.remind_open ?? 1),
        remind_close: Number(r.remind_close ?? 1),
        enforce_open: Number(r.enforce_open ?? 0),
        enforce_close: Number(r.enforce_close ?? 0),
        is_active: Number(r.is_active ?? 1),
        sort_order: r.sort_order ?? r.shift_number ?? 1,
        notes: r.notes || "",
      });
    }
    setEdit({ type, row });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!edit) return;
    setSubmitting(true);
    setFormError("");
    try {
      const pathBase =
        edit.type === "attendance"
          ? "/waschen/hris/time-masters/attendance"
          : edit.type === "grooming"
            ? "/waschen/hris/time-masters/grooming"
            : "/waschen/hris/time-masters/shifts";
      const id = form.id;
      await api(id ? `${pathBase}/${id}` : pathBase, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      showToast("Konfigurasi jam berhasil disimpan");
      setEdit(null);
      await load();
    } catch (err) {
      setFormError(err.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!deleteShift) return;
    setDeleting(true);
    try {
      await api(`/waschen/hris/time-masters/shifts/${deleteShift.id}`, { method: "DELETE" });
      showToast("Jam shift berhasil dihapus");
      setDeleteShift(null);
      await load();
    } catch (err) {
      showToast(err.message || "Gagal menghapus", "error");
    } finally {
      setDeleting(false);
    }
  };

  const heroAction = () => {
    if (tab === "shift") {
      return (
        <button
          type="button"
          onClick={() => openEdit("shift", null)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95 cursor-pointer"
        >
          <HiOutlinePlus className="h-4 w-4" />
          <span>Tambah Shift</span>
        </button>
      );
    }
    if (tab === "grooming") {
      return (
        <button
          type="button"
          onClick={() => openEdit("grooming", groom)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95 cursor-pointer"
        >
          <HiOutlinePencilSquare className="h-4 w-4" />
          <span>Edit Grooming</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => openEdit("attendance", att)}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95 cursor-pointer"
      >
        <HiOutlinePencilSquare className="h-4 w-4" />
        <span>Edit Absensi</span>
      </button>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-700">
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in",
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600",
          )}
        >
          {toast.type === "error" ? (
            <HiOutlineExclamationTriangle className="h-4 w-4" />
          ) : (
            <HiOutlineCheckCircle className="h-4 w-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <PageHero>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Master Absen dan Shift</h1>
          <p className="mt-3 text-base leading-7 text-white/80 sm:text-lg">
            Kelola jam absensi mobile, jam grooming frontliner, dan jam shift POS
          </p>
        </div>
        {heroAction()}
      </PageHero>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jam Absensi</p>
            <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums tracking-tight">{stats.absen}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5f1340]/10 text-[#5f1340]">
            <HiOutlineClock className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fitur Grooming</p>
            <p className={cn("text-2xl font-bold mt-1", stats.groomingOn ? "text-emerald-600" : "text-slate-400")}>
              {stats.groomingOn ? "Aktif" : "Nonaktif"}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <HiOutlineSparkles className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jumlah Shift POS</p>
            <p className="text-3xl font-bold text-slate-800 mt-1 tabular-nums">{stats.shiftCount}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <HiOutlineBriefcase className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-full sm:w-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 sm:flex-none rounded-lg px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap",
                  tab === t.id ? "bg-[#5f1340] text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            Muat ulang
          </button>
        </div>

        <div className="overflow-x-auto">
          {tab === "attendance" && (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Nama</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Buka</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Tutup</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Kunci Malam</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Cut-off</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-center">Flag</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <SkeletonRows cols={8} rows={2} />
                ) : !att ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-base text-slate-400">
                      Belum ada data jam absensi. Klik Edit Absensi untuk membuat.
                    </td>
                  </tr>
                ) : (
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-4 font-semibold text-base text-slate-800 whitespace-nowrap">{att.name || "Jam Absensi"}</td>
                    <td className="px-4 py-4 font-bold text-base tabular-nums text-[#5f1340]">{timeInput(att.open_time)}</td>
                    <td className="px-4 py-4 font-bold text-base tabular-nums text-[#5f1340]">{timeInput(att.close_time)}</td>
                    <td className="px-4 py-4 tabular-nums whitespace-nowrap text-[15px]">
                      {Number(att.lock_enabled)
                        ? `${timeInput(att.lock_start_time)} – ${timeInput(att.lock_end_time)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-4 tabular-nums text-[15px]">{timeInput(att.work_date_cutoff_time)}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex flex-wrap gap-1.5 justify-center">
                        <FlagBadge on={att.after_midnight_open} label="After midnight" />
                        <FlagBadge on={att.lock_enabled} label="Kunci" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge isActive={att.is_active} />
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit("attendance", att)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
                        title="Edit"
                      >
                        <HiOutlinePencilSquare className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "grooming" && (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Nama</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Fitur</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Frontliner Shift 1</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Frontliner Shift 2</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Kunci Setelah</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-center">Flag</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <SkeletonRows cols={8} rows={2} />
                ) : !groom ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-base text-slate-400">
                      Belum ada data jam grooming. Klik Edit Grooming untuk membuat.
                    </td>
                  </tr>
                ) : (
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-4 font-semibold text-base text-slate-800 whitespace-nowrap">{groom.name || "Jam Grooming"}</td>
                    <td className="px-4 py-4">
                      <StatusBadge isActive={groom.feature_enabled} />
                    </td>
                    <td className="px-4 py-4 tabular-nums whitespace-nowrap text-[15px]">
                      {timeInput(groom.window1_start)} – {timeInput(groom.window1_end)}
                    </td>
                    <td className="px-4 py-4 tabular-nums whitespace-nowrap text-[15px]">
                      {Number(groom.window2_enabled)
                        ? `${timeInput(groom.window2_start)} – ${timeInput(groom.window2_end)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-4 tabular-nums text-[15px]">
                      {Number(groom.lock_enabled) ? timeInput(groom.lock_after_time) : "—"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex flex-wrap gap-1.5 justify-center">
                        <FlagBadge on={groom.window2_enabled} label="Shift 2" />
                        <FlagBadge on={groom.lock_enabled} label="Kunci" />
                        <FlagBadge on={groom.require_reason_after_lock} label="Alasan" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge isActive={groom.is_active} />
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit("grooming", groom)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
                        title="Edit"
                      >
                        <HiOutlinePencilSquare className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "shift" && (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider w-12 text-center">No</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Kode</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Nama Shift</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Jam Buka</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Jam Tutup</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <SkeletonRows cols={7} rows={3} />
                ) : shifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-base text-slate-400">
                      Belum ada data jam shift. Klik Tambah Shift untuk membuat.
                    </td>
                  </tr>
                ) : (
                  shifts.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 text-center text-slate-500 font-medium tabular-nums text-[15px]">{idx + 1}</td>
                      <td className="px-4 py-4 font-bold text-base tabular-nums text-[#5f1340] whitespace-nowrap">{s.code}</td>
                      <td className="px-4 py-4 font-semibold text-base text-slate-800 whitespace-nowrap">
                        {s.name}
                        <span className="ml-1.5 text-xs font-medium text-slate-400">#{s.shift_number}</span>
                      </td>
                      <td className="px-4 py-4 tabular-nums text-[15px]">{timeInput(s.open_time)}</td>
                      <td className="px-4 py-4 tabular-nums text-[15px]">{timeInput(s.close_time)}</td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge isActive={s.is_active} />
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit("shift", s)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
                            title="Edit"
                          >
                            <HiOutlinePencilSquare className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteShift(s)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition"
                            title="Hapus"
                          >
                            <HiOutlineTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {edit && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="flex w-full max-w-3xl max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="font-bold text-slate-800 text-base">
                {edit.type === "attendance"
                  ? "Edit Jam Absensi"
                  : edit.type === "grooming"
                    ? "Edit Jam Grooming"
                    : form.id
                      ? "Edit Jam Shift"
                      : "Tambah Jam Shift"}
              </h3>
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-3.5 text-sm">
              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {edit.type === "attendance" && (
                <>
                  <ModalIntro>
                    <strong className="font-semibold text-slate-700">Buka/Tutup</strong> = jam absen normal.
                    {" · "}
                    <strong className="font-semibold text-slate-700">Kunci malam</strong> = absen diblokir.
                    {" · "}
                    <strong className="font-semibold text-slate-700">Cut-off</strong> = sebelum jam ini dihitung tanggal kerja kemarin.
                  </ModalIntro>

                  <SectionTitle hint="— jam tombol absen di Mobile">Jendela absen</SectionTitle>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Buka Absen *</label>
                      <input type="time" required value={form.open_time} onChange={(e) => setForm((f) => ({ ...f, open_time: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Tutup Absen *</label>
                      <input type="time" required value={form.close_time} onChange={(e) => setForm((f) => ({ ...f, close_time: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Cut-off Tanggal Kerja *</label>
                      <input type="time" required value={form.work_date_cutoff_time} onChange={(e) => setForm((f) => ({ ...f, work_date_cutoff_time: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                  </div>

                  <SectionTitle hint="— absen diblokir di rentang ini">Kunci malam</SectionTitle>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Kunci Mulai *</label>
                      <input type="time" required value={form.lock_start_time} onChange={(e) => setForm((f) => ({ ...f, lock_start_time: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Kunci Selesai *</label>
                      <input type="time" required value={form.lock_end_time} onChange={(e) => setForm((f) => ({ ...f, lock_end_time: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Kunci Malam</label>
                      <select value={form.lock_enabled} onChange={(e) => setForm((f) => ({ ...f, lock_enabled: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                    </div>
                  </div>

                  <SectionTitle>Opsi</SectionTitle>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Buka Setelah Tengah Malam</label>
                      <select value={form.after_midnight_open} onChange={(e) => setForm((f) => ({ ...f, after_midnight_open: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                      <FieldHint>Izinkan absen 00:00 s/d jam kunci mulai</FieldHint>
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Status Master</label>
                      <select value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {edit.type === "grooming" && (
                <>
                  <ModalIntro>
                    <strong className="font-semibold text-slate-700">Frontliner Shift 1 / 2</strong> = jam grooming untuk masing-masing shift frontliner.
                    {" · "}
                    Setelah <strong className="font-semibold text-slate-700">jam kunci</strong>, unggah ditutup; bisa wajib isi alasan jika belum lengkap.
                  </ModalIntro>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Fitur Grooming</label>
                      <select value={form.feature_enabled} onChange={(e) => setForm((f) => ({ ...f, feature_enabled: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                      <FieldHint>Nonaktif = tanpa batasan jam</FieldHint>
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Status Master</label>
                      <select value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                    </div>
                  </div>

                  <SectionTitle hint="— jam grooming Frontliner Shift 1">Frontliner Shift 1</SectionTitle>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Mulai *</label>
                      <input type="time" required value={form.window1_start} onChange={(e) => setForm((f) => ({ ...f, window1_start: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Selesai *</label>
                      <input type="time" required value={form.window1_end} onChange={(e) => setForm((f) => ({ ...f, window1_end: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                  </div>

                  <SectionTitle hint="— jam grooming Frontliner Shift 2 (opsional)">Frontliner Shift 2</SectionTitle>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Aktifkan</label>
                      <select value={form.window2_enabled} onChange={(e) => setForm((f) => ({ ...f, window2_enabled: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                    </div>
                    {Number(form.window2_enabled) === 1 ? (
                      <>
                        <div>
                          <label className={FIELD_LABEL}>Mulai *</label>
                          <input type="time" required value={form.window2_start} onChange={(e) => setForm((f) => ({ ...f, window2_start: e.target.value }))} className={FIELD_INPUT} />
                        </div>
                        <div>
                          <label className={FIELD_LABEL}>Selesai *</label>
                          <input type="time" required value={form.window2_end} onChange={(e) => setForm((f) => ({ ...f, window2_end: e.target.value }))} className={FIELD_INPUT} />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 flex items-end pb-2 text-[11px] text-slate-400">Frontliner Shift 2 dimatikan</div>
                    )}
                  </div>

                  <SectionTitle hint="— tutup unggah setelah jam ini">Kunci</SectionTitle>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Kunci Setelah</label>
                      <select value={form.lock_enabled} onChange={(e) => setForm((f) => ({ ...f, lock_enabled: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Jam Kunci *</label>
                      <input type="time" required value={form.lock_after_time} onChange={(e) => setForm((f) => ({ ...f, lock_after_time: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Wajib Alasan</label>
                      <select value={form.require_reason_after_lock} onChange={(e) => setForm((f) => ({ ...f, require_reason_after_lock: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                      <FieldHint>Jika belum lengkap setelah terkunci</FieldHint>
                    </div>
                  </div>
                </>
              )}

              {edit.type === "shift" && (
                <>
                  <ModalIntro>
                    Atur identitas shift dan jam buka/tutup kasir di My Waschen POS.
                  </ModalIntro>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Nomor Shift *</label>
                      <input type="number" min={1} max={9} required value={form.shift_number} onChange={(e) => setForm((f) => ({ ...f, shift_number: Number(e.target.value) }))} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Kode *</label>
                      <input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="pagi" className={cn(FIELD_INPUT, "font-mono")} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Status</label>
                      <select value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: Number(e.target.value) }))} className={FIELD_INPUT}>
                        <option value={1}>Aktif</option>
                        <option value={0}>Nonaktif</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Nama Shift *</label>
                    <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Shift Pagi" className={FIELD_INPUT} />
                  </div>

                  <SectionTitle hint="— jam buka dan tutup kasir">Jam Shift</SectionTitle>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={FIELD_LABEL}>Jam Buka *</label>
                      <input type="time" required value={form.open_time} onChange={(e) => setForm((f) => ({ ...f, open_time: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Jam Tutup *</label>
                      <input type="time" required value={form.close_time} onChange={(e) => setForm((f) => ({ ...f, close_time: e.target.value }))} className={FIELD_INPUT} />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className={FIELD_LABEL}>Catatan</label>
                <input
                  value={form.notes || ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Catatan opsional..."
                  className={FIELD_INPUT}
                />
              </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-white">
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#5f1340]/20 hover:opacity-95 disabled:opacity-50"
                >
                  {submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {deleteShift && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                <HiOutlineExclamationTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Hapus Jam Shift?</h3>
            </div>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus <strong>{deleteShift.name}</strong> (#{deleteShift.shift_number})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteShift(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteShift}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                <span>{deleting ? "Hapus..." : "Ya, Hapus"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
