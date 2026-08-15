import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowPath,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUp,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlassPlus,
  HiOutlinePhoto,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api, BASE_URL } from "../../../lib/api";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
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

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
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

function capitalEachWord(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function monthBounds(year, month) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function formatMonthYear(year, month) {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

const ROLE_META = {
  produksi: { label: "Produksi", cls: "border-amber-300 bg-amber-50 text-amber-700" },
  frontliner: { label: "Frontliner", cls: "border-blue-300 bg-blue-50 text-blue-700" },
};

const REVIEW_META = {
  belum: { label: "Belum", cls: "border-slate-200 bg-slate-50 text-slate-600" },
  sebagian: { label: "Sebagian", cls: "border-amber-300 bg-amber-50 text-amber-700" },
  selesai: { label: "Selesai", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.produksi;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", meta.cls)}>
      {meta.label}
    </span>
  );
}

function ReviewBadge({ status }) {
  const meta = REVIEW_META[status] || REVIEW_META.belum;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", meta.cls)}>
      {meta.label}
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

function PhotoLightbox({ path, label, onClose }) {
  useEffect(() => {
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
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>
        <div className="flex max-h-[75vh] items-center justify-center bg-slate-50 p-3">
          <AuthenticatedImage
            path={path}
            alt={label}
            className="max-h-[70vh] w-auto max-w-full rounded-xl"
            iconSize="h-8 w-8"
            objectFit="contain"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function emptyDraftFromPhotos(photos) {
  const draft = {};
  for (const photo of photos || []) {
    draft[photo.photo_type] = {
      score: photo.review?.score === 0 || photo.review?.score === 1 ? photo.review.score : null,
      reason: photo.review?.reason || "",
    };
  }
  return draft;
}

function MonthNavigator({ viewYear, viewMonth, onPrev, onNext, onRefresh }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#97bd3f]/10 text-[#1b3459]">
            <HiOutlineCalendarDays className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Absensi Bulanan</p>
            <p className="text-xs text-slate-500">Pilih bulan, lalu klik tanggal untuk menilai foto</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={onPrev}
              title="Bulan sebelumnya"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-white"
            >
              <HiOutlineChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-[9.5rem] text-center text-sm font-bold capitalize text-slate-800">
              {formatMonthYear(viewYear, viewMonth)}
            </p>
            <button
              type="button"
              onClick={onNext}
              title="Bulan berikutnya"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-white"
            >
              <HiOutlineChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <HiOutlineArrowPath className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}

function AttendancePhotoList({ record, onSaved }) {
  const [draft, setDraft] = useState(() => emptyDraftFromPhotos(record.photos));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setDraft(emptyDraftFromPhotos(record.photos));
    setError("");
    setSuccess("");
  }, [record]);

  const updateDraft = (photoType, patch) => {
    setDraft((prev) => ({
      ...prev,
      [photoType]: { ...prev[photoType], ...patch },
    }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    const reviews = [];
    for (const photo of record.photos) {
      const item = draft[photo.photo_type] || {};
      if (item.score !== 0 && item.score !== 1) {
        setError(`Pilih penilaian untuk ${photo.label}`);
        return;
      }
      if (item.score === 0 && !String(item.reason || "").trim()) {
        setError(`Alasan wajib diisi untuk ${photo.label}`);
        return;
      }
      reviews.push({
        photo_type: photo.photo_type,
        score: item.score,
        reason: item.score === 0 ? String(item.reason).trim() : "",
      });
    }

    try {
      setSaving(true);
      const res = await api(`/cleanox/attendance/records/${record.id}/reviews`, {
        method: "PUT",
        body: JSON.stringify({ reviews }),
      });
      setSuccess(res.message || "Penilaian berhasil disimpan");
      onSaved?.();
    } catch (err) {
      setError(err.message || "Gagal menyimpan penilaian");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <HiOutlineCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="space-y-3">
        {record.photos.map((photo) => {
          const item = draft[photo.photo_type] || { score: null, reason: "" };
          return (
            <div
              key={photo.photo_type}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex gap-3">
                <AuthenticatedImage
                  path={photo.url}
                  alt={photo.label}
                  className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-100"
                  iconSize="h-5 w-5"
                  onClick={() => setLightbox({ path: photo.url, label: photo.label })}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800">{photo.label}</p>
                    <div className="flex items-center gap-2">
                      {photo.review && (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            photo.review.score === 1
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-rose-300 bg-rose-50 text-rose-700",
                          )}
                        >
                          {photo.review.score === 1 ? "Sesuai" : "Tidak sesuai"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setLightbox({ path: photo.url, label: photo.label })}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white transition-colors"
                      >
                        <HiOutlineMagnifyingGlassPlus className="h-3.5 w-3.5" />
                        Lihat full
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateDraft(photo.photo_type, { score: 1 })}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition",
                        item.score === 1
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      Sesuai (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraft(photo.photo_type, { score: 0 })}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition",
                        item.score === 0
                          ? "border-rose-400 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      Tidak Sesuai (0)
                    </button>
                  </div>

                  {item.score === 0 && (
                    <label className="mt-2 block">
                      <span className="mb-1 block text-[11px] font-semibold text-slate-600">Alasan penilaian (wajib)</span>
                      <textarea
                        rows={2}
                        value={item.reason}
                        onChange={(e) => updateDraft(photo.photo_type, { reason: e.target.value })}
                        placeholder="Tuliskan alasan mengapa foto tidak sesuai..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-[#1b3459] focus:bg-white focus:ring-2 focus:ring-[#1b3459]/10"
                      />
                    </label>
                  )}
                  {photo.review?.reviewed_at && (
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      Terakhir dinilai {formatDateTime(photo.review.reviewed_at)}
                      {photo.review.reviewed_by_name ? ` · ${photo.review.reviewed_by_name}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#97bd3f] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#97bd3f]/20 transition hover:bg-[#86aa34] disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
        >
          {saving ? "Menyimpan..." : "Simpan penilaian hari ini"}
        </button>
      </div>

      {lightbox && <PhotoLightbox path={lightbox.path} label={lightbox.label} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function AttendanceDateRow({ record, selected, onToggle, onSaved }) {
  return (
    <div className={cn("overflow-hidden border-b border-slate-100 last:border-b-0", selected && "bg-[#97bd3f]/5")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#97bd3f]/5 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{formatDate(record.attendance_date)}</p>
            <ReviewBadge status={record.review_status} />
            <span className="text-[11px] font-medium text-slate-400">
              {record.reviewed_count || 0}/4 foto
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <HiOutlineClock className="h-3.5 w-3.5 text-slate-300" />
              Check-in: {formatTime(record.check_in_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <HiOutlineClock className="h-3.5 w-3.5 text-slate-300" />
              Check-out: {formatTime(record.check_out_at)}
            </span>
          </div>
        </div>
        {selected ? (
          <HiOutlineChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
        ) : (
          <HiOutlineChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
        )}
      </button>
      {selected && <AttendancePhotoList record={record} onSaved={onSaved} />}
    </div>
  );
}

export default function AbsensiKaryawanDetailCleanox() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);

  const [employee, setEmployee] = useState(null);
  const [records, setRecords] = useState([]);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const bounds = useMemo(() => monthBounds(viewYear, viewMonth), [viewYear, viewMonth]);

  const goPrevMonth = () => {
    setSelectedAttendanceId(null);
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    setSelectedAttendanceId(null);
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError("");
      const qs = new URLSearchParams({
        startDate: bounds.startDate,
        endDate: bounds.endDate,
      });
      const res = await api(`/cleanox/attendance/employees/${employeeId}/records?${qs.toString()}`);
      setEmployee(res.employee || null);
      setRecords(res.data || []);
    } catch (err) {
      setEmployee(null);
      setRecords([]);
      setFetchError(err.message || "Gagal memuat riwayat absensi");
    } finally {
      setLoading(false);
    }
  }, [employeeId, bounds.startDate, bounds.endDate]);

  useEffect(() => {
    document.title = "Detail Absensi Karyawan | Alora Group Indonesia";
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  useEffect(() => {
    setSelectedAttendanceId(null);
  }, [viewYear, viewMonth]);

  const toggleRecord = (id) => {
    setSelectedAttendanceId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-full bg-slate-50 py-6">
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/cleanox-management-system/absensi")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <HiOutlineArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Absensi Karyawan
          </button>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative p-5 sm:p-6 lg:p-8">
            {employee ? (
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
                  {(employee.full_name || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {capitalEachWord(employee.full_name) || "Karyawan"}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/75">
                    <span className="font-mono text-xs">{employee.employee_code || "-"}</span>
                    <RoleBadge role={employee.cleanox_role} />
                    {employee.email && <span className="text-xs">{employee.email}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Detail Absensi Karyawan</h1>
            )}
          </div>
        </section>

        <MonthNavigator
          viewYear={viewYear}
          viewMonth={viewMonth}
          onPrev={goPrevMonth}
          onNext={goNextMonth}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />

        {fetchError && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{fetchError}</p>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-800">Daftar Tanggal Absensi</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatMonthYear(viewYear, viewMonth)} · klik baris tanggal untuk membuka list 4 foto QC
            </p>
          </div>

          {loading ? (
            <div className="space-y-0 divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse px-5 py-4">
                  <div className="h-4 w-40 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-64 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <HiOutlinePhoto className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Tidak ada absensi di bulan ini.</p>
            </div>
          ) : (
            <div>
              {records.map((record) => (
                <AttendanceDateRow
                  key={record.id}
                  record={record}
                  selected={selectedAttendanceId === record.id}
                  onToggle={() => toggleRecord(record.id)}
                  onSaved={() => setRefreshKey((k) => k + 1)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
