import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { api, BASE_URL } from "../../../lib/api";
import {
  HiOutlineAcademicCap,
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineChevronRight,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlineInboxArrowDown,
  HiOutlineMapPin,
  HiOutlineFunnel
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const STATUS_META = {
  Pending_Supervisor: { label: "Menunggu Supervisor", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  Pending_HRD: { label: "Menunggu HRD", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  Review: { label: "Proses Review", cls: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  Scheduled: { label: "Telah Dijadwalkan", cls: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  Selesai: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Rejected_Supervisor: { label: "Ditolak Supervisor", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  Rejected_HRD: { label: "Ditolak HRD", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" }
};

export default function DashboardTraining() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    scheduled: 0,
    completed: 0
  });

  // Dashboard filters
  const [companyFilter, setCompanyFilter] = useState("");
  const [trainingTypeFilter, setTrainingTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companies, setCompanies] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Modal States
  const [listModalType, setListModalType] = useState(null); // 'all' | 'pending' | 'scheduled' | 'completed'
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch all training data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: "1000" });
      if (companyFilter) q.set("company_id", companyFilter);
      if (trainingTypeFilter) q.set("training_type", trainingTypeFilter);
      if (dateFrom) q.set("date_from", dateFrom);
      if (dateTo) q.set("date_to", dateTo);

      const res = await api(`/training?${q}`);
      const list = res.data || [];
      setData(list);

      // Compute stats
      const total = list.length;
      const pending = list.filter(r => ["Pending_Supervisor", "Pending_HRD", "Review"].includes(r.status)).length;
      const scheduled = list.filter(r => r.status === "Scheduled").length;
      const completed = list.filter(r => r.status === "Selesai").length;

      setStats({ total, pending, scheduled, completed });
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [companyFilter, trainingTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    document.title = "Dashboard Training | Alora Group Indonesia";
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Load masters for filters
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const masterData = await api("/employees/master-data");
        setCompanies(masterData.companies || []);
      } catch (err) {
        console.error("Failed to load masters:", err);
      }
    };
    loadMasters();
  }, []);

  // Realtime subscription using SSE
  const fetchDashboardDataRef = useRef(fetchDashboardData);
  const detailTargetRef = useRef(detailTarget);

  useEffect(() => {
    fetchDashboardDataRef.current = fetchDashboardData;
    detailTargetRef.current = detailTarget;
  });

  useEffect(() => {
    const eventSource = new EventSource(`${BASE_URL}/training/events`, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        if (eventData.type === "update") {
          fetchDashboardDataRef.current();
          if (detailTargetRef.current) {
            fetchDetail(detailTargetRef.current);
          }
        }
      } catch (err) {
        console.error("SSE error:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Fetch detail for selected request
  const fetchDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api(`/training/${id}`);
      setDetailData(res);
    } catch (err) {
      console.error("Gagal memuat detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (detailTarget) {
      fetchDetail(detailTarget);
    } else {
      setDetailData(null);
    }
  }, [detailTarget]);

  // Filter requests based on stat card clicked
  const getFilteredModalList = () => {
    if (!listModalType) return [];
    if (listModalType === "all") return data;
    if (listModalType === "pending") return data.filter(r => ["Pending_Supervisor", "Pending_HRD", "Review"].includes(r.status));
    if (listModalType === "scheduled") return data.filter(r => r.status === "Scheduled");
    if (listModalType === "completed") return data.filter(r => r.status === "Selesai");
    return [];
  };

  return (
    <main className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Banner header */}
        <section
          className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-amber-500/10"
          style={{ background: "linear-gradient(135deg, #E8823A, #D4A12A)" }}
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25 border border-white/15 shadow-inner">
              <HiOutlineAcademicCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ringkasan Aktivitas Pelatihan</h1>
              <p className="text-xs text-white/80 mt-0.5">Analisis pengajuan, status, dan jadwal pelaksanaan training</p>
            </div>
          </div>
        </section>

        {/* Dashboard Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
              <HiOutlineFunnel className="h-4 w-4 text-amber-500" />
              <span>Filter Analisis</span>
            </div>
            
            <div className="flex gap-2">
              {[companyFilter, trainingTypeFilter, dateFrom, dateTo].filter(Boolean).length > 0 && (
                <button
                  onClick={() => {
                    setCompanyFilter("");
                    setTrainingTypeFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition shadow-sm",
                  showFilters || [companyFilter, trainingTypeFilter, dateFrom, dateTo].filter(Boolean).length > 0
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                )}
              >
                <span>{showFilters ? "Sembunyikan" : "Tampilkan Filter"}</span>
                {[companyFilter, trainingTypeFilter, dateFrom, dateTo].filter(Boolean).length > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-white text-amber-600 h-5 w-5 text-[10px] font-extrabold shadow-sm">
                    {[companyFilter, trainingTypeFilter, dateFrom, dateTo].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 animate-fadeIn">
              {/* Unit Bisnis */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Unit Bisnis</label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition w-full"
                >
                  <option value="">Semua Unit Bisnis</option>
                  {companies.map((comp) => (
                    <option key={comp.company_id} value={comp.company_id}>{comp.company_name}</option>
                  ))}
                </select>
              </div>

              {/* Jenis Training */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jenis Training</label>
                <select
                  value={trainingTypeFilter}
                  onChange={(e) => setTrainingTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition w-full"
                >
                  <option value="">Semua Jenis</option>
                  <option value="Refreshment">Refreshment</option>
                  <option value="Upskilling">Upskilling</option>
                  <option value="Corrective Training">Corrective Training</option>
                </select>
              </div>

              {/* Tgl Awal */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tgl Awal</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition w-full"
                />
              </div>

              {/* Tgl Akhir */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tgl Akhir</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition w-full"
                />
              </div>
            </div>
          )}
        </section>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              type: "all",
              label: "Total Pengajuan",
              value: stats.total,
              icon: HiOutlineDocumentText,
              color: "text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300",
              desc: "Seluruh pengajuan training"
            },
            {
              type: "pending",
              label: "Menunggu Approval",
              value: stats.pending,
              icon: HiOutlineClock,
              color: "text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300",
              desc: "Butuh persetujuan segera"
            },
            {
              type: "scheduled",
              label: "Telah Dijadwalkan",
              value: stats.scheduled,
              icon: HiOutlineCalendar,
              color: "text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300",
              desc: "Akan segera dilaksanakan"
            },
            {
              type: "completed",
              label: "Selesai Pelaksanaan",
              value: stats.completed,
              icon: HiOutlineCheckCircle,
              color: "text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300",
              desc: "Telah selesai di-input bukti"
            }
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.type}
                onClick={() => setListModalType(card.type)}
                className={cn(
                  "rounded-2xl border p-5 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between",
                  card.color
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{card.label}</span>
                    <h2 className="text-3xl font-extrabold text-slate-800">{loading ? "..." : card.value}</h2>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-100/50 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{card.desc}</span>
                  <div className="flex items-center gap-0.5 font-semibold text-slate-500">
                    Detail <HiOutlineChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Content splits */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activities List (Span 2) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">Pengajuan Terbaru</h3>
                <p className="text-xs text-slate-400">Daftar pengajuan training yang paling baru dimasukkan</p>
              </div>
              <button
                onClick={() => setListModalType("all")}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition"
              >
                Lihat Semua
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
              ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400">
                  Tidak ada pengajuan training baru
                </div>
              ) : (
                data.slice(0, 10).map((row) => {
                  const meta = STATUS_META[row.status] || { label: row.status, cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                  return (
                    <div
                      key={row.id}
                      onClick={() => setDetailTarget(row.id)}
                      className="flex items-center justify-between border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50/70 rounded-2xl p-4 transition cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="font-bold text-slate-800 text-xs block truncate">{row.topic}</span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-600">{row.requester_name}</span>
                          <span>•</span>
                          <span>{row.department_name}</span>
                          <span>•</span>
                          <span>{row.request_date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold border bg-white", meta.cls)}>
                          <div className={cn("h-1 w-1 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                        <HiOutlineChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Schedule Overview */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">Jadwal Terdekat</h3>
                <p className="text-xs text-slate-400">Pelatihan yang telah dijadwalkan oleh HRD</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
              ) : data.filter(r => r.status === "Scheduled").length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400">
                  Tidak ada jadwal pelaksanaan terdekat
                </div>
              ) : (
                data
                  .filter(r => r.status === "Scheduled")
                  .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                  .slice(0, 10)
                  .map((row) => (
                    <div
                      key={row.id}
                      onClick={() => setDetailTarget(row.id)}
                      className="border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-3.5 transition cursor-pointer flex gap-3.5 items-start"
                    >
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-indigo-600 font-extrabold shrink-0">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 leading-none">
                          {new Date(row.scheduled_date).toLocaleString("id-ID", { month: "short" })}
                        </span>
                        <span className="text-sm mt-0.5 leading-none">
                          {new Date(row.scheduled_date).getDate()}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 text-xs block truncate">{row.topic}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-medium truncate">
                          {row.company_name} • {row.training_method}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Stats List Modal (Portal) */}
      {listModalType && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
             onClick={() => setListModalType(null)}>
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 flex flex-col max-h-[80vh]"
               onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {listModalType === "all" && "Semua Pengajuan Training"}
                  {listModalType === "pending" && "Pengajuan Menunggu Approval"}
                  {listModalType === "scheduled" && "Training Telah Dijadwalkan"}
                  {listModalType === "completed" && "Training Selesai Pelaksanaan"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Daftar item untuk kategori stats yang dipilih</p>
              </div>
              <button
                onClick={() => setListModalType(null)}
                className="rounded-xl border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 transition"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
              {getFilteredModalList().length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Tidak ada data untuk status ini</p>
              ) : (
                getFilteredModalList().map((row) => {
                  const meta = STATUS_META[row.status] || { label: row.status, cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                  return (
                    <div
                      key={row.id}
                      onClick={() => {
                        setDetailTarget(row.id);
                      }}
                      className="flex items-center justify-between border border-slate-100 hover:border-amber-200 bg-slate-50/40 hover:bg-amber-50/10 rounded-2xl p-3.5 transition cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="font-bold text-slate-800 text-xs block truncate">{row.topic}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {row.requester_name} • {row.department_name}
                        </span>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border bg-white shrink-0", meta.cls)}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detailed Request View Modal (Portal) */}
      {detailTarget && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
             onClick={() => setDetailTarget(null)}>
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 my-8 relative flex flex-col max-h-[90vh]"
               onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">Detail Pengajuan Training</h3>
                <p className="text-xs text-slate-400 mt-0.5">Rincian data pengusulan dan log persetujuan</p>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 transition"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
              {detailLoading || !detailData ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* Grid details */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Topik Training</span>
                      <span className="font-bold text-slate-800 text-sm block mt-0.5">{detailData.training.topic}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status Pengajuan</span>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold border bg-white">
                        <div className={cn("h-1.5 w-1.5 rounded-full", (STATUS_META[detailData.training.status] || {}).dot)} />
                        {(STATUS_META[detailData.training.status] || {}).label || detailData.training.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Pengaju</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">{detailData.training.requester_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Departemen</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">{detailData.training.department_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Perusahaan Penyelenggara</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">{detailData.training.company_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tanggal Pengajuan</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">{detailData.training.request_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Jenis Training</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">{detailData.training.training_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Metode Training</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">{detailData.training.training_method}</span>
                    </div>
                    {detailData.training.scheduled_date && (
                      <div className="col-span-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                        <HiOutlineCalendar className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                        <div>
                          <span className="text-slate-400 text-[10px] block">Tanggal Pelaksanaan Terjadwal</span>
                          <span className="font-bold text-indigo-700 text-xs mt-0.5">{detailData.training.scheduled_date}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Relational Arrays */}
                  <div className="space-y-4">
                    {/* Trainees */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <HiOutlineUserGroup className="h-4 w-4" /> Karyawan Yang Di-training
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {detailData.trainees.map(t => (
                          <span key={t.employee_id} className="inline-flex bg-slate-100 text-slate-700 rounded-lg px-2 py-1 text-xs border border-slate-200">
                            {t.full_name} <span className="text-slate-400 ml-1">({t.employee_code})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Mentors */}
                    {detailData.training.training_method === "Internal" && detailData.mentors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <HiOutlineUserGroup className="h-4 w-4" /> Mentor Yang Direkomendasikan
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {detailData.mentors.map(m => (
                            <span key={m.employee_id} className="inline-flex bg-slate-100 text-slate-700 rounded-lg px-2 py-1 text-xs border border-slate-200">
                              {m.full_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vendors */}
                    {detailData.training.training_method === "Eksternal" && detailData.vendors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <HiOutlineMapPin className="h-4 w-4" /> Vendor Yang Direkomendasikan
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {detailData.vendors.map(v => (
                            <span key={v.id} className="inline-flex bg-slate-100 text-slate-700 rounded-lg px-2 py-1 text-xs border border-slate-200">
                              {v.nama_vendor || v.vendor_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Uraian details */}
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div>
                      <span className="text-slate-400 text-xs block font-semibold mb-1">Alasan Pengajuan Training & Dampak</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        {detailData.training.reasons_and_impact}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs block font-semibold mb-1">Kompetensi Karyawan Saat Ini</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        {detailData.training.current_competency}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs block font-semibold mb-1">Kompetensi yang Ingin Ditingkatkan</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        {detailData.training.target_competency}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs block font-semibold mb-1">Target Setelah Training</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        {detailData.training.training_target}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs block font-semibold mb-1">Materi Paling Prioritas</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        {detailData.training.priority_material}
                      </p>
                    </div>
                  </div>

                  {/* Evidence Files List */}
                  {detailData.training.evidence_files && (
                    <div className="border-t border-slate-100 pt-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Dokumen / Bukti Pelaksanaan</span>
                      <div className="space-y-2">
                        {(() => {
                          const raw = detailData.training.evidence_files;
                          let files = [];
                          if (raw) {
                            try {
                              const parsed = JSON.parse(raw);
                              files = Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) {
                              if (typeof raw === "string" && raw.includes(",")) {
                                files = raw.split(",").map(item => item.trim());
                              } else {
                                files = [raw];
                              }
                            }
                          }
                          return files.map((filepath, index) => {
                            const filename = String(filepath || "").split("/").pop();
                            return (
                              <a
                                key={index}
                                href={`${BASE_URL}/assets/${filepath}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between border border-slate-200 bg-white hover:bg-slate-50 rounded-xl p-2.5 text-xs text-amber-700 font-semibold transition"
                              >
                                <span className="truncate max-w-[80%]">{filename}</span>
                                <HiOutlineInboxArrowDown className="h-4.5 w-4.5 shrink-0 text-amber-500" />
                              </a>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Rejection logs */}
                  {detailData.training.supervisor_rejection_reason && (
                    <div className="border-t border-slate-100 pt-4 text-xs bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700">
                      <span className="font-bold block mb-1">Ditolak oleh Supervisor:</span>
                      <p className="leading-relaxed">{detailData.training.supervisor_rejection_reason}</p>
                    </div>
                  )}

                  {detailData.training.hrd_rejection_reason && (
                    <div className="border-t border-slate-100 pt-4 text-xs bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700">
                      <span className="font-bold block mb-1">Ditolak oleh HRD:</span>
                      <p className="leading-relaxed">{detailData.training.hrd_rejection_reason}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
