import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowPath,
  HiOutlineCalendarDays,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUp,
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

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.produksi;
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

function MonthNavigator({ viewYear, viewMonth, onPrev, onNext, onRefresh }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#97bd3f]/10 text-[#1b3459]">
            <HiOutlineCalendarDays className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Kebersihan Bulanan</p>
            <p className="text-xs text-slate-500">Pilih bulan, lalu klik tanggal untuk melihat foto area</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button type="button" onClick={onPrev} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-white">
              <HiOutlineChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-[9.5rem] text-center text-sm font-bold capitalize text-slate-800">
              {formatMonthYear(viewYear, viewMonth)}
            </p>
            <button type="button" onClick={onNext} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-white">
              <HiOutlineChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <HiOutlineArrowPath className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}

function AreaPhotoList({ record }) {
  const [lightbox, setLightbox] = useState(null);
  const photoCount = (record.areas || []).filter((a) => a.has_photo).length;

  return (
    <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
      <p className="text-[11px] font-medium text-slate-500">{photoCount} foto area tersedia</p>
      <div className="space-y-3">
        {(record.areas || []).map((area) => (
          <div key={area.area_id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex gap-3">
              {area.has_photo ? (
                <AuthenticatedImage
                  path={area.url}
                  alt={area.name}
                  className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-100"
                  onClick={() => setLightbox({ path: area.url, label: area.name })}
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                  <HiOutlinePhoto className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">{area.name}</p>
                  {area.has_photo && (
                    <button
                      type="button"
                      onClick={() => setLightbox({ path: area.url, label: area.name })}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white"
                    >
                      <HiOutlineMagnifyingGlassPlus className="h-3.5 w-3.5" />
                      Lihat full
                    </button>
                  )}
                </div>
                {!area.has_photo ? (
                  <p className="mt-2 text-[11px] text-slate-400">Belum ada foto</p>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400">
                    {area.uploaded_at ? `Diunggah ${formatDateTime(area.uploaded_at)}` : "Foto tersedia"}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {lightbox && <PhotoLightbox path={lightbox.path} label={lightbox.label} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function ReportDateRow({ record, selected, onToggle }) {
  const photoCount = (record.areas || []).filter((a) => a.has_photo).length;
  return (
    <div className={cn("overflow-hidden border-b border-slate-100 last:border-b-0", selected && "bg-[#97bd3f]/5")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#97bd3f]/5 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{formatDate(record.report_date)}</p>
            <span className="text-[11px] font-medium text-slate-400">{photoCount} foto tersedia</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Status upload: {record.status || "-"}</p>
        </div>
        {selected ? <HiOutlineChevronUp className="h-5 w-5 text-slate-400" /> : <HiOutlineChevronDown className="h-5 w-5 text-slate-400" />}
      </button>
      {selected && <AreaPhotoList record={record} />}
    </div>
  );
}

export default function MasterAreaKebersihanDetailCleanox() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [employee, setEmployee] = useState(null);
  const [records, setRecords] = useState([]);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const bounds = useMemo(() => monthBounds(viewYear, viewMonth), [viewYear, viewMonth]);

  const goPrevMonth = () => {
    setSelectedReportId(null);
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    setSelectedReportId(null);
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError("");
      const qs = new URLSearchParams({ startDate: bounds.startDate, endDate: bounds.endDate });
      const res = await api(`/cleanox/kebersihan/employees/${employeeId}/records?${qs}`);
      setEmployee(res.employee || null);
      setRecords(res.data || []);
    } catch (err) {
      setEmployee(null);
      setRecords([]);
      setFetchError(err.message || "Gagal memuat riwayat kebersihan");
    } finally {
      setLoading(false);
    }
  }, [employeeId, bounds.startDate, bounds.endDate]);

  useEffect(() => {
    document.title = "Report Area Kebersihan | Alora Group Indonesia";
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);
  useEffect(() => {
    setSelectedReportId(null);
  }, [viewYear, viewMonth]);

  return (
    <div className="min-h-full bg-slate-50 py-6">
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/cleanox-management-system/report-area-kebersihan")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <HiOutlineArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Report Area Kebersihan
        </button>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-5 sm:p-6 lg:p-8">
            {employee ? (
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
                  {(employee.full_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">{capitalEachWord(employee.full_name)}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/75">
                    <span className="font-mono text-xs">{employee.employee_code || "-"}</span>
                    <RoleBadge role={employee.cleanox_role} />
                  </div>
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-white">Detail Report Area Kebersihan</h1>
            )}
          </div>
        </section>

        <MonthNavigator viewYear={viewYear} viewMonth={viewMonth} onPrev={goPrevMonth} onNext={goNextMonth} onRefresh={() => setRefreshKey((k) => k + 1)} />

        {fetchError && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5" />
            <p>{fetchError}</p>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-800">Daftar Tanggal Kebersihan</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatMonthYear(viewYear, viewMonth)} · klik tanggal untuk melihat foto
            </p>
          </div>
          {loading ? (
            <div className="space-y-0 divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse px-5 py-4">
                  <div className="h-4 w-40 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="px-4 py-14 text-center text-sm text-slate-500">Tidak ada laporan kebersihan di bulan ini.</div>
          ) : (
            records.map((record) => (
              <ReportDateRow
                key={record.id}
                record={record}
                selected={selectedReportId === record.id}
                onToggle={() => setSelectedReportId((prev) => (prev === record.id ? null : record.id))}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
