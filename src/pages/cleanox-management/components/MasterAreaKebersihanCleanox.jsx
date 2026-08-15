import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlinePhoto,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api, BASE_URL } from "../../../lib/api";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
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

function capitalEachWord(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusBadge({ label }) {
  const map = {
    Lengkap: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: HiOutlineCheckCircle },
    "Belum lengkap": { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: HiOutlineClock },
    "Belum mulai": { cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: HiOutlineExclamationTriangle },
  };
  const { cls, Icon: BadgeIcon } = map[label] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: null };

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls)}>
      {BadgeIcon ? <BadgeIcon className="h-3.5 w-3.5" /> : null}
      {label || "-"}
    </span>
  );
}

function SessionBadge({ session }) {
  const isPagi = session === "pagi";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
        isPagi
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-violet-200 bg-violet-50 text-violet-700",
      )}
    >
      {isPagi ? "Pagi" : "Sore"}
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

  if (error || !src) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100 text-slate-300", className)}>
        <HiOutlinePhoto className={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      className={cn(objectFit === "contain" ? "object-contain" : "object-cover", className)}
    />
  );
}

function PhotoThumb({ path, label, onOpen, className = "h-11 w-11" }) {
  if (!path) {
    return (
      <div className={cn("rounded-lg border border-dashed border-slate-200 bg-slate-50", className)} title="Belum ada foto" />
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:border-[#97bd3f]",
        className,
      )}
      title={label}
    >
      <AuthenticatedImage path={path} alt={label} className="h-full w-full" />
    </button>
  );
}

function PhotoViewerModal({ item, onClose }) {
  if (!item) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md"
          aria-label="Tutup foto"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
        <AuthenticatedImage
          path={item.url}
          alt={item.label}
          className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl bg-black/20"
          objectFit="contain"
          iconSize="h-10 w-10"
        />
      </div>
    </div>,
    document.body,
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-slate-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 w-20 rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

export default function MasterAreaKebersihanCleanox() {
  const initial = useMemo(() => defaultDateRange(), []);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [photoViewer, setPhotoViewer] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.title = "Report Area Kebersihan | Alora Group Indonesia";
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (startDate > endDate) {
        setFetchError("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai");
        setRecords([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setFetchError("");
        const qs = new URLSearchParams({ startDate, endDate });
        const response = await api(`/cleanox/kebersihan/records?${qs.toString()}`);
        if (!cancelled) setRecords(response.data || []);
      } catch (err) {
        if (!cancelled) {
          setRecords([]);
          setFetchError(err.message || "Gagal memuat riwayat kebersihan");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, refreshKey]);

  const statusOptions = useMemo(
    () => [...new Set(records.map((r) => r.status_label).filter(Boolean))],
    [records],
  );

  const displayedRecords = useMemo(() => {
    return records.filter((r) => {
      if (sessionFilter && r.session !== sessionFilter) return false;
      if (statusFilter && r.status_label !== statusFilter) return false;
      return true;
    });
  }, [records, sessionFilter, statusFilter]);

  return (
    <>
      <main className="min-h-screen bg-slate-50 py-6 sm:py-10">
        <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] p-5 shadow-sm sm:p-6">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <h1 className="relative text-2xl font-bold text-white sm:text-3xl">Report Area Kebersihan</h1>
            <p className="relative mt-2 text-sm text-white/75">
              Riwayat kebersihan pagi &amp; sore (satu laporan bersama per sesi; nama = pengirim terakhir).
            </p>
          </section>

          {fetchError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {fetchError}
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b3459]"
                />
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b3459]"
                />
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Sesi</span>
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b3459]"
                >
                  <option value="">Semua Sesi</option>
                  <option value="pagi">Pagi</option>
                  <option value="sore">Sore</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b3459]"
                >
                  <option value="">Semua Status</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Daftar Kebersihan</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
                {displayedRecords.length} data
              </span>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sesi</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pengirim</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Foto Area</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Progress</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                  {!loading && displayedRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">
                        Data kebersihan tidak ditemukan pada filter aktif.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    displayedRecords.map((row) => (
                      <tr key={row.id} className="align-top hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {formatDate(row.report_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <SessionBadge session={row.session} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-xs font-bold text-slate-800">{capitalEachWord(row.full_name)}</div>
                          <div className="text-[11px] text-slate-400">{row.employee_code || "-"}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {(row.photos || []).map((photo) => (
                              <PhotoThumb
                                key={photo.area_id}
                                path={photo.url}
                                label={photo.name}
                                onOpen={() =>
                                  photo.url &&
                                  setPhotoViewer({
                                    url: photo.url,
                                    label: `${photo.name} · ${capitalEachWord(row.full_name)} · ${row.session}`,
                                  })
                                }
                              />
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {row.uploaded_count}/{row.required_count}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge label={row.status_label} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {loading && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-400">Memuat...</div>}
              {!loading && displayedRecords.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                  Data kebersihan tidak ditemukan.
                </div>
              )}
              {!loading &&
                displayedRecords.map((row) => (
                  <div key={row.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{capitalEachWord(row.full_name)}</p>
                        <p className="text-[11px] text-slate-400">Pengirim terakhir</p>
                        <p className="text-xs text-slate-400">{formatDate(row.report_date)}</p>
                      </div>
                      <StatusBadge label={row.status_label} />
                    </div>
                    <SessionBadge session={row.session} />
                    <div className="flex flex-wrap gap-2">
                      {(row.photos || []).map((photo) => (
                        <div key={photo.area_id} className="flex flex-col items-center gap-1">
                          <PhotoThumb
                            path={photo.url}
                            label={photo.name}
                            onOpen={() =>
                              photo.url &&
                              setPhotoViewer({
                                url: photo.url,
                                label: `${photo.name} · ${capitalEachWord(row.full_name)}`,
                              })
                            }
                            className="h-12 w-12"
                          />
                          <span className="max-w-[3.5rem] truncate text-[10px] text-slate-400">{photo.name}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Progress: {row.uploaded_count}/{row.required_count}
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </main>
      <PhotoViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
    </>
  );
}
