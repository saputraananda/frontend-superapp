import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowDownTray,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineClock,
  HiOutlineDocumentCheck,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api, BASE_URL } from "../../../lib/api";
import { exportAbsensiCleanoxExcel } from "../utils/exportAbsensiCleanoxExcel";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultCutoffSelection(now = new Date(), cutoffStartDay = 26) {
  const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
  const endDay = startDay - 1;

  let cutoffMonth = now.getMonth() + 1;
  let cutoffYear = now.getFullYear();

  if (now.getDate() > endDay) {
    cutoffMonth += 1;
    if (cutoffMonth > 12) {
      cutoffMonth = 1;
      cutoffYear += 1;
    }
  }

  const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
  const end = new Date(cutoffYear, cutoffMonth - 1, endDay);

  return {
    cutoffMonth,
    cutoffYear,
    cutoffStartDay: startDay,
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
}

function toneClass(tone) {
  if (tone === "emerald") return "bg-emerald-50 border-emerald-100 text-emerald-700";
  if (tone === "amber") return "bg-amber-50 border-amber-100 text-amber-700";
  if (tone === "rose") return "bg-rose-50 border-rose-100 text-rose-700";
  return "bg-blue-50 border-blue-100 text-blue-700";
}

const PERIOD_MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

function StatCard({ title, value, subtitle, tone = "blue", Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm text-left w-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClass(tone))}>
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function calcDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const mins = Math.floor((new Date(checkOut) - new Date(checkIn)) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}j ${m}m`;
}

function capitalEachWord(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDateTimeLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusBadge({ label }) {
  const map = {
    Lengkap: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: HiOutlineCheckCircle },
    Libur: { cls: "bg-slate-100 text-slate-700 border-slate-300", Icon: HiOutlineCalendarDays },
    "Belum check-out": { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: HiOutlineClock },
    "Belum check-in": { cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: HiOutlineExclamationTriangle },
    "Foto belum lengkap": { cls: "bg-orange-50 text-orange-700 border-orange-200", Icon: HiOutlinePhoto },
  };
  const { cls, Icon: BadgeIcon } = map[label] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: null };

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls)}>
      {BadgeIcon ? <BadgeIcon className="h-3.5 w-3.5" /> : null}
      {label || "-"}
    </span>
  );
}

function AuthenticatedImage({ path, alt, className, onClick, iconSize = "h-5 w-5", objectFit = "cover" }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    (async () => {
      if (!path) {
        setSrc(null);
        setError(true);
        return;
      }
      try {
        setError(false);
        const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Gagal memuat foto");
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        if (!cancelled) {
          setSrc(null);
          setError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  const imgCls = objectFit === "contain" ? "h-full w-full object-contain" : "h-full w-full object-cover";

  if (error || !src) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100 text-slate-400", className)}>
        <HiOutlinePhoto className={cn("opacity-50", iconSize)} />
      </div>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("block overflow-hidden p-0", className)}>
        <img src={src} alt={alt} className={imgCls} />
      </button>
    );
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <img src={src} alt={alt} className={imgCls} />
    </div>
  );
}

function PhotoThumb({ path, label, onOpen, className = "h-10 w-10" }) {
  if (!path) {
    return <span className="text-xs text-slate-300">-</span>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Lihat ${label}`}
      className="group relative overflow-visible rounded-lg"
    >
      <AuthenticatedImage
        path={path}
        alt={label}
        className={cn(
          "rounded-lg border border-slate-200 bg-slate-100 transition group-hover:border-blue-300 group-hover:scale-[1.04]",
          className,
        )}
        iconSize="h-4 w-4"
      />
    </button>
  );
}

function PhotoViewerModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition hover:bg-white hover:text-slate-800"
          aria-label="Tutup preview foto"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
        <AuthenticatedImage
          path={item.url}
          alt={item.label}
          className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl bg-slate-900"
          iconSize="h-10 w-10"
          objectFit="contain"
        />
      </div>
    </div>,
    document.body,
  );
}

function EditAttendanceModal({ item, onClose, onSaved }) {
  const [checkIn, setCheckIn] = useState(toDateTimeLocalInput(item?.check_in_at));
  const [checkOut, setCheckOut] = useState(toDateTimeLocalInput(item?.check_out_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCheckIn(toDateTimeLocalInput(item?.check_in_at));
    setCheckOut(toDateTimeLocalInput(item?.check_out_at));
    setError("");
  }, [item]);

  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (checkIn && checkOut && checkOut <= checkIn) {
      setError("Jam keluar harus lebih besar dari jam masuk");
      return;
    }
    try {
      setSaving(true);
      await api(`/cleanox/attendance/records/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          check_in_at: checkIn || null,
          check_out_at: checkOut || null,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Edit Jam Absensi</h3>
            <p className="mt-0.5 text-xs text-slate-400">Ubah jam absen in/out untuk record ini</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <p className="font-bold text-slate-700">{capitalEachWord(item.full_name)}</p>
            <p className="text-slate-400">{item.employee_code || "-"}</p>
            <p className="mt-1 text-slate-500">{formatDate(item.attendance_date)}</p>
          </div>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Jam Absen In</span>
            <input
              type="datetime-local"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Jam Absen Out</span>
            <input
              type="datetime-local"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteAttendanceModal({ item, onClose, onConfirm, deleting, error }) {
  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <HiOutlineTrash className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Hapus Record Absensi</h3>
              <p className="mt-0.5 text-xs text-slate-400">Pastikan record yang dipilih sudah benar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-60"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <p className="font-bold text-slate-700">{capitalEachWord(item.full_name) || "-"}</p>
            <p className="text-slate-400">{item.employee_code || "-"}</p>
            <p className="mt-1 text-slate-500">{formatDate(item.attendance_date)}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="font-semibold uppercase tracking-wider text-slate-400">Absen In</p>
                <p className="mt-0.5 text-slate-700">{formatDateTime(item.check_in_at)}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="font-semibold uppercase tracking-wider text-slate-400">Absen Out</p>
                <p className="mt-0.5 text-slate-700">{formatDateTime(item.check_out_at)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <p className="font-bold">Peringatan</p>
            <p className="mt-0.5">Aksi ini akan menghapus record secara permanen dan tidak bisa dibatalkan.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAbsensiCleanoxModal({ employeeOptions, onClose, onSaved }) {
  const todayVal = toDateInput(new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayVal);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [empDropOpen, setEmpDropOpen] = useState(false);
  const empDropRef = useRef(null);

  const filteredEmps = useMemo(() => {
    const kw = empSearch.trim().toLowerCase();
    if (!kw) return employeeOptions;
    return employeeOptions.filter(
      (e) =>
        String(e.employee_name || "")
          .toLowerCase()
          .includes(kw) ||
        String(e.employee_code || "")
          .toLowerCase()
          .includes(kw) ||
        String(e.employee_id || "").includes(kw),
    );
  }, [employeeOptions, empSearch]);

  const selectedEmp = useMemo(
    () => employeeOptions.find((e) => String(e.employee_id) === String(employeeId)) || null,
    [employeeOptions, employeeId],
  );

  useEffect(() => {
    if (!empDropOpen) return undefined;
    const onDown = (e) => {
      if (empDropRef.current && !empDropRef.current.contains(e.target)) setEmpDropOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [empDropOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!employeeId) {
      setError("Pilih karyawan terlebih dahulu");
      return;
    }
    if (!attendanceDate) {
      setError("Tanggal kerja wajib diisi");
      return;
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      setError("Jam keluar harus lebih besar dari jam masuk");
      return;
    }

    try {
      setSaving(true);
      await api("/cleanox/attendance/records", {
        method: "POST",
        body: JSON.stringify({
          employee_id: Number(employeeId),
          attendance_date: attendanceDate,
          check_in_at: checkIn || null,
          check_out_at: checkOut || null,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Gagal menambahkan absensi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <HiOutlinePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tambah Absensi Cleanox</h3>
              <p className="text-[11px] text-slate-400">Input absensi manual oleh admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-5 py-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Pilih Karyawan Cleanox</span>
            <div className="relative" ref={empDropRef}>
              <button
                type="button"
                onClick={() => setEmpDropOpen((v) => !v)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm outline-none transition",
                  selectedEmp
                    ? "border-purple-300 bg-purple-50/40 text-slate-800 ring-2 ring-purple-500/15"
                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-300",
                )}
              >
                {selectedEmp ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
                      {String(selectedEmp.employee_name || "?")[0].toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <span className="truncate text-sm font-semibold text-slate-800">
                          {capitalEachWord(selectedEmp.employee_name)}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {selectedEmp.employee_code || `ID ${selectedEmp.employee_id}`}
                        </span>
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <HiOutlineMagnifyingGlass className="h-4 w-4" />
                    Cari & pilih karyawan...
                  </span>
                )}
                <HiOutlineChevronDown
                  className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", empDropOpen && "rotate-180")}
                />
              </button>

              {empDropOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-2">
                    <div className="relative">
                      <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        type="text"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        placeholder="Ketik nama, kode NIK, atau ID..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                      />
                    </div>
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {filteredEmps.length === 0 ? (
                      <li className="px-4 py-6 text-center text-xs text-slate-400">Karyawan tidak ditemukan</li>
                    ) : (
                      filteredEmps.map((emp) => {
                        const isSelected = String(emp.employee_id) === String(employeeId);
                        return (
                          <li key={emp.employee_id}>
                            <button
                              type="button"
                              onClick={() => {
                                setEmployeeId(String(emp.employee_id));
                                setEmpDropOpen(false);
                                setEmpSearch("");
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition",
                                isSelected ? "bg-purple-50 text-purple-700" : "text-slate-700 hover:bg-slate-50",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                  isSelected ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500",
                                )}
                              >
                                {String(emp.employee_name || "?")[0].toUpperCase()}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">
                                  {capitalEachWord(emp.employee_name)}
                                </span>
                                <span className="block text-[11px] text-slate-400">
                                  {emp.employee_code || `ID ${emp.employee_id}`}
                                </span>
                              </span>
                              {isSelected && (
                                <HiOutlineCheckCircle className="ml-auto h-4 w-4 shrink-0 text-purple-500" />
                              )}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Tanggal Kerja</span>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Foto grooming tidak wajib diisi saat input manual. Record tanpa foto akan berstatus belum lengkap.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                Jam Absen In <span className="font-normal text-slate-400">(opsional)</span>
              </span>
              <input
                type="datetime-local"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                Jam Absen Out <span className="font-normal text-slate-400">(opsional)</span>
              </span>
              <input
                type="datetime-local"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Tambah Absensi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-slate-100">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 w-20 rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

function MobileAttendanceCard({ row, onOpenReview, onOpenIn, onOpenOut, onEdit, onDelete, deleting }) {
  const duration = calcDuration(row.check_in_at, row.check_out_at);
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-800">{capitalEachWord(row.full_name)}</p>
          <p className="mt-0.5 text-xs text-slate-400">{row.employee_code || "-"}</p>
          <p className="text-xs text-slate-400">{formatDate(row.attendance_date)}</p>
        </div>
        <StatusBadge label={row.status_label} />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
        <div>
          <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">Absen In</p>
          <p className="text-slate-700">{formatDateTime(row.check_in_at)}</p>
        </div>
        <div>
          <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">Absen Out</p>
          <p className="text-slate-700">
            {row.check_out_at ? formatDateTime(row.check_out_at) : <span className="italic text-slate-400">belum</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">Foto In</span>
          {row.check_in_photo?.url ? (
            <PhotoThumb
              path={row.check_in_photo.url}
              label={`Foto check-in ${row.full_name}`}
              onOpen={() => onOpenIn?.(row)}
              className="h-10 w-10"
            />
          ) : (
            <span className="text-slate-300">-</span>
          )}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">Foto Out</span>
          {row.check_out_photo?.url ? (
            <PhotoThumb
              path={row.check_out_photo.url}
              label={`Foto check-out ${row.full_name}`}
              onOpen={() => onOpenOut(row)}
              className="h-10 w-10"
            />
          ) : (
            <span className="text-slate-300">-</span>
          )}
        </div>
        {duration && (
          <span className="inline-flex items-center gap-1">
            <HiOutlineClock className="h-3.5 w-3.5" />
            Durasi: <strong className="ml-0.5 text-slate-700">{duration}</strong>
          </span>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Foto Grooming</p>
        <div className="flex flex-wrap gap-2">
          {(row.photos || []).map((photo) => (
            <div key={photo.photo_type} className="flex flex-col items-center gap-1">
              <PhotoThumb
                path={photo.url}
                label={photo.label}
                onOpen={() => onOpenReview(row, photo)}
                className="h-12 w-12"
              />
              <span className="max-w-[3.5rem] truncate text-[10px] text-slate-400">{photo.label.replace("Foto ", "")}</span>
            </div>
          ))}
        </div>
      </div>

      {!row.is_off_day && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <HiOutlinePencilSquare className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(row)}
            disabled={deleting}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            <HiOutlineTrash className="h-3.5 w-3.5" />
            {deleting ? "Menghapus..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AbsensiKaryawanCleanox() {
  const todayStr = useMemo(() => toDateInput(new Date()), []);
  const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date(), 26), []);
  const cutoffStartDay = 26;

  const [periodMode, setPeriodMode] = useState("cutoff");
  const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
  const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
  const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employeeSummary, setEmployeeSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [photoViewer, setPhotoViewer] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
  }, []);

  const activePeriod = useMemo(() => {
    if (periodMode === "today") {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (periodMode === "custom") {
      return {
        startDate: customStartDate || todayStr,
        endDate: customEndDate || customStartDate || todayStr,
      };
    }
    const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
    const endDay = startDay - 1;
    const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
    const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
    return { startDate: toDateInput(start), endDate: toDateInput(end) };
  }, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear]);

  const activePeriodLabel = useMemo(() => {
    if (periodMode === "today") return `Hari ini (${formatDate(todayStr)})`;
    if (periodMode === "custom") {
      return `Custom ${formatDate(activePeriod.startDate)} - ${formatDate(activePeriod.endDate)}`;
    }
    const monthLabel = PERIOD_MONTHS.find((m) => m.value === cutoffMonth)?.label || `Bulan ${cutoffMonth}`;
    return `Cutoff ${monthLabel} ${cutoffYear} (${formatDate(activePeriod.startDate)} - ${formatDate(activePeriod.endDate)})`;
  }, [periodMode, todayStr, activePeriod.startDate, activePeriod.endDate, cutoffMonth, cutoffYear]);

  useEffect(() => {
    document.title = "Absensi Karyawan Cleanox | Alora Group Indonesia";
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api("/cleanox/attendance/employees");
        if (cancelled) return;
        const options = (response.data || []).map((row) => ({
          employee_id: Number(row.employee_id),
          employee_code: row.employee_code || null,
          employee_name: row.full_name || `ID ${row.employee_id}`,
        }));
        setEmployeeOptions(options);
      } catch {
        if (!cancelled) setEmployeeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const startDate = activePeriod.startDate;
      const endDate = activePeriod.endDate;
      if (!startDate || !endDate) return;
      if (endDate < startDate) {
        setFetchError("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai");
        setRecords([]);
        setSummary(null);
        setEmployeeSummary([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setFetchError("");
        const qs = new URLSearchParams({ startDate, endDate });
        const response = await api(`/cleanox/attendance/records?${qs.toString()}`);
        if (!cancelled) {
          setRecords(response.data || []);
          setSummary(response.summary ?? null);
          setEmployeeSummary(response.employeeSummary ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setRecords([]);
          setSummary(null);
          setEmployeeSummary([]);
          setFetchError(err.message || "Gagal memuat riwayat absensi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePeriod.startDate, activePeriod.endDate, refreshKey]);

  const statusOptions = useMemo(
    () => [...new Set(records.map((r) => r.status_label).filter(Boolean))],
    [records],
  );

  const displayedRecords = useMemo(() => {
    if (!statusFilter) return records;
    return records.filter((r) => r.status_label === statusFilter);
  }, [records, statusFilter]);

  const resetPeriodFilters = () => {
    const resetCutoff = getDefaultCutoffSelection(new Date(), 26);
    setPeriodMode("cutoff");
    setCutoffMonth(resetCutoff.cutoffMonth);
    setCutoffYear(resetCutoff.cutoffYear);
    setCustomStartDate(resetCutoff.startDate);
    setCustomEndDate(resetCutoff.endDate);
    setStatusFilter("");
  };

  const openGroomingPhoto = (row, photo) => {
    if (!photo?.url) return;
    setPhotoViewer({
      url: photo.url,
      label: `${photo.label} · ${capitalEachWord(row.full_name)}`,
    });
  };

  const openIn = (row) => {
    if (!row.check_in_photo?.url) return;
    setPhotoViewer({
      url: row.check_in_photo.url,
      label: `Foto check-in ${capitalEachWord(row.full_name)}`,
    });
  };

  const openOut = (row) => {
    if (!row.check_out_photo?.url) return;
    setPhotoViewer({
      url: row.check_out_photo.url,
      label: `Foto check-out ${capitalEachWord(row.full_name)}`,
    });
  };

  const openDeleteModal = (row) => {
    setDeleteError("");
    setDeleteModal(row);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      setDeletingId(deleteModal.id);
      setDeleteError("");
      await api(`/cleanox/attendance/records/${deleteModal.id}`, { method: "DELETE" });
      setDeleteModal(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setDeleteError(err.message || "Gagal menghapus record");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 py-6">
      {fetchError && (
        <div className="mx-auto mb-4 max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{fetchError}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-5 sm:p-6 lg:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Absensi Karyawan Cleanox</h1>
            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Rekap & monitoring absensi per periode cutoff — lihat foto grooming check-in.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
              {activePeriodLabel}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Filter Periode</h2>
                <p className="text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetPeriodFilters}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
              <select
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="cutoff">Periode Cutoff</option>
                <option value="today">Hari Ini</option>
                <option value="custom">Custom Tanggal</option>
              </select>
            </label>
          </div>

          {periodMode === "cutoff" && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
                <select
                  value={cutoffMonth}
                  onChange={(e) => setCutoffMonth(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  {PERIOD_MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
                <select
                  value={cutoffYear}
                  onChange={(e) => setCutoffYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {periodMode === "custom" && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
          )}

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Periode aktif: <strong>{formatDate(activePeriod.startDate)}</strong> sampai{" "}
            <strong>{formatDate(activePeriod.endDate)}</strong>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          <StatCard
            title="Total Record"
            value={summary?.totalRecords ?? 0}
            subtitle="Total record absensi pada periode aktif"
            tone="blue"
            Icon={HiOutlineDocumentCheck}
          />
          <StatCard
            title="Lengkap"
            value={summary?.completeCount ?? 0}
            subtitle="Record dengan check-in & check-out lengkap"
            tone="emerald"
            Icon={HiOutlineCheckCircle}
          />
          <StatCard
            title="Belum Lengkap"
            value={summary?.incompleteCount ?? 0}
            subtitle="Record yang belum check-in/out atau foto"
            tone="rose"
            Icon={HiOutlineExclamationTriangle}
          />
          <StatCard
            title="Sudah Check-In"
            value={summary?.checkedInCount ?? 0}
            subtitle="Total karyawan sudah absen masuk"
            tone="amber"
            Icon={HiOutlineClock}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Ringkasan Per Karyawan</h2>
              <p className="mt-0.5 text-xs text-slate-500">Ringkasan performa kehadiran pada periode aktif.</p>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <table className="min-w-[900px] w-full table-fixed text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="w-[25%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Karyawan
                  </th>
                  <th className="w-[15%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    NIK
                  </th>
                  <th className="w-[25%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Jabatan
                  </th>
                  <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Record
                  </th>
                  <th className="w-[11%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Lengkap
                  </th>
                  <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Belum Lengkap
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                      {loading
                        ? "Memuat ringkasan..."
                        : "Belum ada data ringkasan karyawan untuk periode/filter ini."}
                    </td>
                  </tr>
                ) : (
                  employeeSummary.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-800">
                          {capitalEachWord(row.employee_name)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{row.employee_code || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.jabatan || "-"}</td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                        {row.record_count}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                        {row.complete_count}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-rose-700">
                        {row.incomplete_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Detail Riwayat Absensi</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Lihat detail tanggal masuk, jam absen in/out, foto grooming, dan status kelengkapan.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {loading
                  ? "Memuat..."
                  : `${displayedRecords.length} record ditampilkan${statusFilter ? ` · filter: ${statusFilter}` : ""}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Semua Status</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {statusFilter && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  <HiOutlineXMark className="h-3.5 w-3.5" />
                  Bersihkan
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  try {
                    exportAbsensiCleanoxExcel({
                      records: displayedRecords,
                      periodLabel: activePeriodLabel,
                      activePeriod,
                      statusFilter,
                    });
                  } catch (err) {
                    console.error("Gagal mendownload excel:", err);
                    alert("Gagal mengunduh data excel: " + (err.message || "unknown error"));
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <HiOutlineArrowDownTray className="h-3.5 w-3.5" />
                Download Excel
              </button>
              <button
                type="button"
                onClick={() => setAddModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
              >
                <HiOutlinePlus className="h-3.5 w-3.5" />
                Tambah Absensi
              </button>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tanggal
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Karyawan
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Absen In
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Foto In
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Absen Out
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Foto Out
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Foto Grooming
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Durasi
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading && displayedRecords.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <HiOutlinePhoto className="h-9 w-9 opacity-40" />
                        <p className="text-sm">Data absensi tidak ditemukan pada filter aktif.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  displayedRecords.map((row) => {
                    const duration = calcDuration(row.check_in_at, row.check_out_at);
                    return (
                      <tr key={row.id} className="align-top transition-colors hover:bg-blue-50/30">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {formatDate(row.attendance_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-xs font-bold text-slate-800">{capitalEachWord(row.full_name)}</div>
                          <div className="text-[11px] text-slate-400">{row.employee_code || "-"}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                          {formatDateTime(row.check_in_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {row.check_in_photo?.url ? (
                            <PhotoThumb
                              path={row.check_in_photo.url}
                              label={`Foto check-in ${row.full_name}`}
                              onOpen={() => openIn(row)}
                            />
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                          {row.check_out_at ? formatDateTime(row.check_out_at) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {row.check_out_photo?.url ? (
                            <PhotoThumb
                              path={row.check_out_photo.url}
                              label={`Foto check-out ${row.full_name}`}
                              onOpen={() => openOut(row)}
                            />
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {(row.photos || []).map((photo) => (
                              <PhotoThumb
                                key={photo.photo_type}
                                path={photo.url}
                                label={photo.label}
                                onOpen={() => openGroomingPhoto(row, photo)}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {duration ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              <HiOutlineClock className="h-3 w-3" /> {duration}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge label={row.status_label} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {row.is_off_day ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditModal(row)}
                                title="Edit jam absensi"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(row)}
                                disabled={deletingId === row.id}
                                title="Hapus absensi"
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                              >
                                <HiOutlineTrash className="h-3.5 w-3.5" />
                                {deletingId === row.id ? "Menghapus..." : "Delete"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {loading && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">Memuat...</div>
            )}
            {!loading && displayedRecords.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                Data absensi tidak ditemukan pada filter aktif.
              </div>
            )}
            {!loading &&
              displayedRecords.map((row) => (
                <MobileAttendanceCard
                  key={row.id}
                  row={row}
                  onOpenReview={openGroomingPhoto}
                  onOpenIn={openIn}
                  onOpenOut={openOut}
                  onEdit={setEditModal}
                  onDelete={openDeleteModal}
                  deleting={deletingId === row.id}
                />
              ))}
          </div>
        </section>
      </div>

      <PhotoViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
      {editModal && (
        <EditAttendanceModal
          item={editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => {
            setEditModal(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
      {addModal && (
        <AddAbsensiCleanoxModal
          employeeOptions={employeeOptions}
          onClose={() => setAddModal(false)}
          onSaved={() => {
            setAddModal(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
      <DeleteAttendanceModal
        item={deleteModal}
        onClose={() => {
          setDeleteModal(null);
          setDeleteError("");
        }}
        onConfirm={confirmDelete}
        deleting={Boolean(deletingId)}
        error={deleteError}
      />
    </div>
  );
}
