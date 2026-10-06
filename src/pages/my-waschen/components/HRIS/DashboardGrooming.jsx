import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineArrowPath, HiOutlineMagnifyingGlass, HiOutlineSparkles, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import useHrisOutletRoleFilters from "../../hooks/useHrisOutletRoleFilters";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import HrisOutletRoleFilter from "../HrisOutletRoleFilter";
import { FILTER_SECTION, TABLE_SECTION, cn, fmtDateShort, fmtDateTime, fmtEmployeeName } from "../../utils/hrisUtils";
import { FilterPill, FilterScroll, PhotoViewerModal } from "./hrisShared";

const INNER_TABS = [
  { id: "grooming", label: "Grooming" },
  { id: "kebersihan", label: "Kebersihan" },
];
const STATUS_FILTERS = [
  { id: "semua", label: "Semua" },
  { id: "kosong", label: "Belum foto" },
  { id: "kurang", label: "Belum lengkap" },
  { id: "lengkap", label: "Lengkap" },
];
const CLEANLINESS_ROLE_ORDER = ["Frontliner", "Delivery Staff", "Washing Staff", "Ironing Staff", "Packing Staff"];
const CLEANLINESS_SESSIONS = ["Pagi", "Pulang"];
const EMPTY_SUMMARY = {
  employees: 0, days: 0, lengkap: 0, kurang: 0, kosong: 0,
  belum_foto_people: 0, belum_lengkap_people: 0, lengkap_people: 0, discipline_pct: 0,
};
function SessionDivider({ session, count }) {
  const pulang = session === "Pulang";
  return (
    <div className={`mb-2 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold ${pulang ? "bg-indigo-50 text-indigo-800" : "bg-amber-50 text-amber-800"}`}>
      <span>Foto Kebersihan {session}</span>
      <span className="font-semibold">{count} foto</span>
    </div>
  );
}

function todayIso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function datesInRange(from, to) {
  if (!from || !to) return [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out.reverse();
}

function fmtDateCard(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function groupPhotosByRole(photos, collapseRoles) {
  if (collapseRoles) return [{ role: null, photos }];
  const map = new Map();
  photos.forEach((p) => {
    const k = p.role_code || "Lainnya";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  });
  const rank = (r) => {
    const i = CLEANLINESS_ROLE_ORDER.indexOf(r);
    return i === -1 ? CLEANLINESS_ROLE_ORDER.length : i;
  };
  return [...map.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((role) => ({ role, photos: map.get(role) }));
}

function matchFilter(emp, filter) {
  if (filter === "kosong") return emp.kosong > 0;
  if (filter === "kurang") return emp.kurang > 0;
  if (filter === "lengkap") return emp.days_count > 0 && emp.lengkap === emp.days_count;
  return true;
}

export default function DashboardGrooming() {
  const cutoff = useCutoffPeriod();
  const { dateFrom: startDate, dateTo: endDate } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters();
  const { appendFilters, outlets } = hrisFilters;

  const [innerTab, setInnerTab] = useState("grooming");
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [photoView, setPhotoView] = useState(null);
  const [error, setError] = useState("");
  const groomingReq = useRef(0);

  const [cleanlinessRows, setCleanlinessRows] = useState([]);
  const [cleanlinessLoading, setCleanlinessLoading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [openDate, setOpenDate] = useState(null);

  const loadGrooming = useCallback(async (silent = false) => {
    if (!startDate || !endDate) return;
    const seq = ++groomingReq.current;
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      appendFilters(q);
      const res = await api(`/waschen/hris/attendance/grooming-dashboard?${q}`);
      if (seq !== groomingReq.current) return;
      setSummary(res.summary || EMPTY_SUMMARY);
      setEmployees(res.employees || []);
      setError("");
    } catch (err) {
      if (seq !== groomingReq.current || silent) return;
      setError(err.message || "Gagal memuat dashboard grooming");
      setEmployees([]);
      setSummary(EMPTY_SUMMARY);
    } finally {
      if (seq === groomingReq.current) setLoading(false);
    }
  }, [startDate, endDate, appendFilters]);

  const loadCleanliness = useCallback(async (silent = false) => {
    if (!startDate || !endDate) return;
    if (!silent) setCleanlinessLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      appendFilters(q);
      const res = await api(`/waschen/hris/attendance/cleanliness?${q}`);
      setCleanlinessRows(res.data || []);
      setError("");
    } catch (err) {
      if (silent) return;
      setError(err.message || "Gagal memuat foto kebersihan");
      setCleanlinessRows([]);
    } finally {
      if (!silent) setCleanlinessLoading(false);
    }
  }, [startDate, endDate, appendFilters]);

  const removeCleanlinessPhoto = async () => {
    const photoId = photoToDelete?.cleanliness_photo_id;
    if (!photoId) return;
    setDeletingPhotoId(photoId);
    setError("");
    try {
      await api(`/waschen/hris/attendance/cleanliness/${photoId}`, { method: "DELETE" });
      setCleanlinessRows((rows) => rows.filter((p) => p.cleanliness_photo_id !== photoId));
      setPhotoToDelete(null);
    } catch (err) {
      setError(err.message || "Gagal menghapus foto kebersihan");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  useLiveRefresh(() => {
    if (innerTab === "kebersihan") loadCleanliness(true);
    else loadGrooming(true);
  });

  useEffect(() => {
    if (innerTab === "kebersihan") loadCleanliness();
    else loadGrooming();
  }, [innerTab, loadGrooming, loadCleanliness]);

  const outletById = useMemo(() => new Map(outlets.map((o) => [String(o.id), o])), [outlets]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => !q || `${e.employee_name} ${e.employee_code || ""}`.toLowerCase().includes(q))
      .sort((a, b) =>
        b.discipline_pct - a.discipline_pct
        || b.lengkap - a.lengkap
        || a.employee_name.localeCompare(b.employee_name, "id"),
      )
      .map((e, i) => ({ ...e, rank: i + 1, dim: !matchFilter(e, statusFilter) }));
  }, [employees, statusFilter, search]);

  const cleanlinessDates = useMemo(() => {
    const map = new Map();
    cleanlinessRows.forEach((p) => {
      const k = p.work_date || "";
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    const today = todayIso();
    const rangeEnd = !cutoff.isCustomDate && endDate && endDate > today ? today : endDate;
    const dates = datesInRange(startDate, rangeEnd);
    const keys = dates.length ? dates : [...map.keys()].sort((a, b) => b.localeCompare(a));
    return keys.map((date) => ({ date, photos: map.get(date) || [] }));
  }, [cleanlinessRows, startDate, endDate, cutoff.isCustomDate]);

  const cards = [
    { id: "kosong", label: "Belum foto", people: summary.belum_foto_people, days: summary.kosong, tone: "border-rose-200 bg-rose-50/60 text-rose-800" },
    { id: "kurang", label: "Belum lengkap", people: summary.belum_lengkap_people, days: summary.kurang, tone: "border-amber-200 bg-amber-50/60 text-amber-900" },
    { id: "lengkap", label: "Sudah lengkap", people: summary.lengkap_people, days: summary.lengkap, tone: "border-emerald-200 bg-emerald-50/60 text-emerald-800" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-full sm:w-auto sm:inline-flex">
        {INNER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setInnerTab(t.id)}
            className={cn(
              "flex-1 sm:flex-none rounded-xl px-4 py-2 text-xs font-bold transition",
              innerTab === t.id ? "bg-[#5f1340] text-white" : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">{error}</div>
      )}

      {innerTab === "kebersihan" ? (
        <section className={TABLE_SECTION}>
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Foto Kebersihan</h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Satu kartu per tanggal di periode filter. Klik tanggal untuk rincian per tim.</p>
            </div>
            <button type="button" onClick={() => loadCleanliness()} className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", cleanlinessLoading && "animate-spin")} />
            </button>
          </div>
          <div className="px-4 py-3 border-b border-slate-100">
            <CutoffPeriodFilter cutoff={cutoff} showToday />
            <div className="mt-3">
              <HrisOutletRoleFilter
                outlets={hrisFilters.outlets}
                outletId={hrisFilters.outletId}
                onOutletChange={hrisFilters.setOutletId}
                role={hrisFilters.role}
                onRoleChange={hrisFilters.setRole}
              />
            </div>
          </div>
          {cleanlinessLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : cleanlinessDates.length === 0 ? (
            <div className="py-16 text-center text-slate-400 px-4">
              <HiOutlineSparkles className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm font-semibold">Tidak ada foto kebersihan</p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 space-y-2">
              {cleanlinessDates.map(({ date, photos }) => {
                const open = openDate === date;
                const dayNum = Number(String(date).slice(8, 10)) || date;
                const groups = groupPhotosByRole(photos, Boolean(hrisFilters.outletId || hrisFilters.role));
                return (
                  <div key={date} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpenDate(open ? null : date)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left sm:gap-4 sm:px-4"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#5f1340]/10 text-sm font-bold tabular-nums text-[#5f1340]">
                        {dayNum}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{fmtDateCard(date)}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{photos.length} foto</p>
                      </div>
                    </button>
                    {open && (
                      <div className="space-y-5 border-t border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-4">
                        {photos.length === 0 ? (
                          <p className="py-6 text-center text-xs font-semibold text-slate-400">Tidak ada foto kebersihan</p>
                        ) : groups.map((g) => (
                          <div key={g.role || "all"}>
                            {g.role && (
                              <h3 className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl bg-[#5f1340]/10 px-3 py-2 text-xs">
                                <span className="min-w-0 truncate font-bold text-[#5f1340]">{g.role}</span>
                                <span className="shrink-0 font-semibold text-[#5f1340]/70">{g.photos.length} foto</span>
                              </h3>
                            )}
                            {CLEANLINESS_SESSIONS.map((session) => {
                              const sessionPhotos = g.photos.filter((p) => (p.photo_session || "Pagi") === session);
                              if (!sessionPhotos.length) return null;
                              return (
                                <div key={session} className="mb-3">
                                  <SessionDivider session={session} count={sessionPhotos.length} />
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {sessionPhotos.map((p) => (
                                      <div
                                        key={p.cleanliness_photo_id}
                                        className="relative text-left rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => setPhotoView({ url: p.photo_url, label: `Kebersihan · ${p.uploaded_by_name || "—"}` })}
                                          className="block w-full text-left hover:border-[#5f1340]/30"
                                        >
                                          <div className="aspect-square bg-slate-100">
                                            {p.photo_url ? (
                                              <img src={p.photo_url} alt="Kebersihan" className="h-full w-full object-cover" loading="lazy" />
                                            ) : (
                                              <div className="h-full w-full grid place-items-center text-slate-300 text-xs">No photo</div>
                                            )}
                                          </div>
                                          <div className="p-2.5 space-y-0.5">
                                            <p className="text-[11px] font-bold text-slate-800 truncate">{p.uploaded_by_name || "—"}</p>
                                            <p className="flex flex-wrap items-center gap-1 pt-0.5">
                                              <span className="rounded-full bg-[#5f1340]/10 px-2 py-0.5 text-[10px] font-bold text-[#5f1340]">{p.role_code || "—"}</span>
                                              <span className="text-[10px] font-semibold text-slate-600">{outletById.get(String(p.outlet_id))?.name || "—"}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400">{fmtDateTime(p.taken_at)}</p>
                                          </div>
                                        </button>
                                        <button
                                          type="button"
                                          title="Hapus foto"
                                          disabled={deletingPhotoId === p.cleanliness_photo_id}
                                          onClick={() => setPhotoToDelete(p)}
                                          className="absolute right-2 top-2 rounded-lg bg-white/95 p-1.5 text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-50"
                                        >
                                          <HiOutlineTrash className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setStatusFilter((cur) => (cur === c.id ? "semua" : c.id))}
                className={cn("rounded-2xl border p-3 sm:p-4 text-left shadow-sm transition", c.tone, statusFilter === c.id && "ring-2 ring-[#5f1340]/40")}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{c.label}</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold">{c.people}</p>
                <p className="text-[11px] font-semibold opacity-70">{c.days} hari</p>
              </button>
            ))}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Disiplin</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-[#5f1340]">{summary.discipline_pct}%</p>
              <p className="text-[11px] font-semibold text-slate-500">{summary.lengkap}/{summary.days} hari lengkap</p>
            </div>
          </div>

          <section className={FILTER_SECTION}>
            <CutoffPeriodFilter cutoff={cutoff} showToday />
            <div className="mt-3">
              <HrisOutletRoleFilter
                outlets={hrisFilters.outlets}
                outletId={hrisFilters.outletId}
                onOutletChange={hrisFilters.setOutletId}
                role={hrisFilters.role}
                onRoleChange={hrisFilters.setRole}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Frontliner dan Delivery Staff. Satu hari dihitung dari absensi di periode ini. Lengkap = 6 foto.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama karyawan..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40"
                />
              </div>
              <FilterScroll>
                {STATUS_FILTERS.map((f) => (
                  <FilterPill key={f.id} active={statusFilter === f.id} onClick={() => setStatusFilter(f.id)}>{f.label}</FilterPill>
                ))}
              </FilterScroll>
              <button type="button" onClick={() => loadGrooming()} className="shrink-0 self-end sm:self-auto rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
              </button>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Peringkat disiplin</h2>
                <p className="text-[11px] text-slate-500">{cutoff.todayOnly ? "Hanya absensi hari ini." : "Nomor 1 adalah yang paling lengkap di periode ini."}</p>
              </div>
              <p className="text-[11px] font-semibold text-slate-400">{visible.length} karyawan</p>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />)}
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-400 px-4">
                <p className="text-sm font-semibold">{cutoff.todayOnly ? "Tidak ada data grooming hari ini" : "Tidak ada data grooming di periode ini"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visible.map((e) => {
                  const open = openId === e.employee_id;
                  const hot = e.discipline_pct >= 80;
                  const mid = e.discipline_pct >= 50 && !hot;
                  const tone = hot ? "text-emerald-700" : mid ? "text-amber-700" : "text-rose-700";
                  const bar = hot ? "bg-emerald-500" : mid ? "bg-amber-500" : "bg-rose-500";
                  const rankFace = e.rank === 1
                    ? "bg-[#5f1340] text-white"
                    : e.rank <= 3
                      ? "bg-[#5f1340]/10 text-[#5f1340]"
                      : "bg-slate-100 text-slate-500";
                  return (
                    <div key={e.employee_id} className={cn("overflow-hidden rounded-2xl border bg-white shadow-sm", e.rank <= 3 ? "border-[#5f1340]/20" : "border-slate-200", e.dim && "opacity-40")}>
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : e.employee_id)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left sm:gap-4 sm:px-4"
                      >
                        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold tabular-nums", rankFace)}>
                          {e.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate text-sm font-bold text-slate-800">{fmtEmployeeName(e.employee_name, e.employee_id)}</p>
                            <p className={cn("shrink-0 text-xl font-bold tabular-nums leading-none", tone)}>{e.discipline_pct}%</p>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {e.role_code} · {e.days_count} hari hadir{e.employee_code ? ` · ${e.employee_code}` : ""}
                          </p>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className={cn("h-full rounded-full", bar)} style={{ width: `${e.discipline_pct}%` }} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">Tidak foto {e.kosong}</span>
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Belum lengkap {e.kurang}</span>
                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Lengkap {e.lengkap}</span>
                          </div>
                        </div>
                      </button>
                      {open && (
                        <div className="space-y-4 border-t border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-4">
                          {e.days.map((d) => (
                            <div key={d.attendance_id}>
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="font-bold text-slate-700">{fmtDateShort(d.work_date)}</span>
                                <span className="text-slate-500">{outletById.get(String(d.outlet_id))?.name || "—"}</span>
                                <span className={cn(
                                  "rounded-full border px-2 py-0.5 font-bold",
                                  d.status === "lengkap" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                                  d.status === "kurang" && "border-amber-200 bg-amber-50 text-amber-800",
                                  d.status === "kosong" && "border-rose-200 bg-rose-50 text-rose-700",
                                )}
                                >
                                  {d.status === "lengkap" ? "Lengkap" : d.status === "kurang" ? `Kurang ${d.photo_count}/6` : "Belum foto"}
                                </span>
                              </div>
                              {d.reason && <p className="mb-2 text-[11px] text-rose-700">Alasan: {d.reason}</p>}
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {d.photos.map((p) => (
                                  <button
                                    key={p.step_code}
                                    type="button"
                                    disabled={!p.url}
                                    onClick={() => p.url && setPhotoView({ url: p.url, label: `${fmtEmployeeName(e.employee_name)} · ${p.step_label}` })}
                                    className="text-left disabled:cursor-default"
                                  >
                                    <div className={cn("aspect-[3/4] overflow-hidden rounded-lg border bg-white", p.url ? "border-slate-200" : "border-dashed border-slate-300")}>
                                      {p.url ? (
                                        <img src={p.url} alt={p.step_label} className="h-full w-full object-cover" loading="lazy" />
                                      ) : (
                                        <div className="grid h-full place-items-center px-1 text-center text-[10px] font-semibold text-slate-400">Belum</div>
                                      )}
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-[10px] font-semibold text-slate-500">{p.step_label}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <PhotoViewerModal open={Boolean(photoView)} url={photoView?.url} label={photoView?.label} onClose={() => setPhotoView(null)} />

      {photoToDelete && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => !deletingPhotoId && setPhotoToDelete(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-800">Hapus foto kebersihan</h3>
              <button type="button" onClick={() => setPhotoToDelete(null)} disabled={Boolean(deletingPhotoId)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                Hapus foto kebersihan <strong className="text-slate-800">{photoToDelete.uploaded_by_name || "ini"}</strong>
                {photoToDelete.photo_session ? ` sesi ${photoToDelete.photo_session}` : ""}?
              </p>
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">Foto ini akan dihapus permanen.</p>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setPhotoToDelete(null)} disabled={Boolean(deletingPhotoId)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="button" disabled={Boolean(deletingPhotoId)} onClick={removeCleanlinessPhoto} className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{deletingPhotoId ? "Menghapus..." : "Hapus"}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
