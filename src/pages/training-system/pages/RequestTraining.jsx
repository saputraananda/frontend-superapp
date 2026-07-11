import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api, BASE_URL } from "../../../lib/api";
import {
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineMapPin,
  HiOutlineInboxArrowDown,
  HiOutlineCalendar,
  HiOutlineFunnel,
  HiOutlineUser,
  HiOutlinePrinter
} from "react-icons/hi2";
import SupervisorApprove from "../components/SupervisorApprove";
import HumanResourceApprove from "../components/HumanResourceApprove";
import { exportToPdfTraining } from "../utils/exportToPdfTraining";

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

export default function RequestTraining() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [trainingTypeFilter, setTrainingTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companies, setCompanies] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [onlyMeFilter, setOnlyMeFilter] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [currentUser, setCurrentUser] = useState(null);

  // Modals state
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast notification
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch logged in user
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  // Fetch master data for filters
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const masterData = await api("/employees/master-data");
        setCompanies(masterData.companies || []);
      } catch (err) {
        console.error("Failed to load master data for filters:", err);
      }
    };
    loadMasters();
  }, []);

  const isHR = [1, 8, 17, 18, 19].includes(Number(currentUser?.employee?.position_id));
  const isSpv = Number(currentUser?.employee?.job_level_id) <= 3;

  // Fetch all request list
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
        search,
        status: statusFilter,
        company_id: companyFilter,
        training_type: trainingTypeFilter,
        date_from: dateFrom,
        date_to: dateTo,
        only_me: onlyMeFilter ? "true" : ""
      });
      const res = await api(`/training?${q}`);
      setData(res.data || []);
      setPagination(prev => ({
        ...prev,
        page,
        total: res.pagination?.total || 0,
        totalPages: res.pagination?.totalPages || 1
      }));
    } catch (err) {
      console.error(err);
      showToast(err.message || "Gagal memuat pengajuan", "error");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, statusFilter, companyFilter, trainingTypeFilter, dateFrom, dateTo, onlyMeFilter, showToast]);

  useEffect(() => {
    fetchData(1);
  }, [search, statusFilter, companyFilter, trainingTypeFilter, dateFrom, dateTo, onlyMeFilter]);

  // Realtime subscription using SSE
  const fetchDataRef = useRef(fetchData);
  const detailTargetRef = useRef(detailTarget);

  useEffect(() => {
    fetchDataRef.current = fetchData;
    detailTargetRef.current = detailTarget;
  });

  useEffect(() => {
    const eventSource = new EventSource(`${BASE_URL}/training/events`, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        if (eventData.type === "update") {
          fetchDataRef.current();
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

  // Fetch single detail when modal is opened
  const fetchDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api(`/training/${id}`);
      setDetailData(res);
    } catch (err) {
      console.error(err);
      showToast("Gagal memuat detail pengajuan", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDirectPrint = async (id) => {
    try {
      const res = await api(`/training/${id}`);
      exportToPdfTraining(res);
    } catch (err) {
      console.error(err);
      showToast("Gagal memuat data cetak", "error");
    }
  };

  useEffect(() => {
    if (detailTarget) {
      fetchDetail(detailTarget);
    } else {
      setDetailData(null);
    }
  }, [detailTarget]);

  // Delete request
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api(`/training/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Pengajuan berhasil dihapus");
      setDeleteTarget(null);
      fetchData(pagination.page);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Gagal menghapus pengajuan", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Body scroll lock
  useEffect(() => {
    if (detailTarget || deleteTarget) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [detailTarget, deleteTarget]);

  return (
    <>
      {/* Toast alert */}
      {toast && (
        <div className={cn(
          "fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-300",
          toast.type === "error"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        )}>
          {toast.type === "error" ? (
            <HiOutlineXMark className="h-4 w-4 shrink-0" />
          ) : (
            <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <main className="min-h-screen bg-slate-50 py-6 sm:py-8">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header Section */}
          <section className="relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-xl shadow-amber-500/10 text-white"
                   style={{ background: "linear-gradient(135deg, #E8823A, #D4A12A)" }}>
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 border border-white/10">
                  <HiOutlineDocumentText className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Daftar Pengajuan Training</h1>
                  <p className="text-xs text-white/80">Kelola dan tinjau seluruh usulan serta jadwal training karyawan</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/training-management-system/request/form")}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-amber-700 hover:bg-slate-50 px-4 py-2.5 text-sm font-bold transition shadow-lg shadow-amber-500/20 shrink-0"
              >
                <HiOutlinePlus className="h-4 w-4" /> Buat Pengajuan
              </button>
            </div>
          </section>

          {/* Filters Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/50 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search Input */}
              <div className="relative w-full sm:max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari topik atau pengaju..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                />
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>

              {/* Toggle Buttons */}
              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                {[statusFilter, companyFilter, trainingTypeFilter, dateFrom, dateTo].filter(Boolean).length > 0 && (
                  <button
                    onClick={() => {
                      setStatusFilter("");
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
                  onClick={() => setOnlyMeFilter(!onlyMeFilter)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold border transition shadow-sm",
                    onlyMeFilter
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <HiOutlineUser className="h-4 w-4" />
                  <span>Pengajuan Saya</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition shadow-sm",
                    showFilters || [statusFilter, companyFilter, trainingTypeFilter, dateFrom, dateTo].filter(Boolean).length > 0
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <HiOutlineFunnel className="h-4 w-4" />
                  <span>Filter Lanjutan</span>
                  {[statusFilter, companyFilter, trainingTypeFilter, dateFrom, dateTo].filter(Boolean).length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-white text-amber-600 h-5 w-5 text-[10px] font-extrabold shadow-sm">
                      {[statusFilter, companyFilter, trainingTypeFilter, dateFrom, dateTo].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-3 border-t border-slate-100 animate-fadeIn">
                {/* Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition w-full"
                  >
                    <option value="">Semua Status</option>
                    {Object.entries(STATUS_META).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* Unit Bisnis Filter */}
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

                {/* Jenis Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jenis</label>
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

                {/* Tgl Awal Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tgl Awal</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition w-full"
                  />
                </div>

                {/* Tgl Akhir Filter */}
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

          {/* Table list */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left">Topik Training</th>
                    <th className="px-6 py-4 text-left">Pengaju</th>
                    <th className="px-6 py-4 text-center">Unit Bisnis</th>
                    <th className="px-6 py-4 text-center">Jenis</th>
                    <th className="px-6 py-4 text-center">Tanggal Pengajuan</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mx-auto" />
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-xs text-slate-400">
                        Tidak ada data pengajuan training
                      </td>
                    </tr>
                  ) : (
                    data.map((row) => {
                      const meta = STATUS_META[row.status] || { label: row.status, cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 text-left">
                            {row.training_code && (
                              <span className="text-[10px] font-extrabold font-mono text-slate-400 block tracking-wider mb-0.5">{row.training_code}</span>
                            )}
                            <span className="font-bold text-slate-800 text-sm block">{row.topic}</span>
                          </td>
                          <td className="px-6 py-4 text-left">
                            <span className="text-sm text-slate-700 block font-semibold">{row.requester_name}</span>
                            <span className="text-xs text-slate-400 block">{row.department_name}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-slate-600 font-semibold">{row.company_name}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-xs text-slate-600 block font-bold">{row.training_type}</span>
                            <span className="text-xs text-slate-400 block mt-0.5">{row.training_method}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            {row.request_date}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border whitespace-nowrap", meta.cls)}>
                                <div className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                                {meta.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setDetailTarget(row.id)}
                                title="Lihat detail"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                              >
                                <HiOutlineEye className="h-4.5 w-4.5" />
                              </button>
                              
                              <button
                                onClick={() => handleDirectPrint(row.id)}
                                title="Cetak / Simpan PDF"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition"
                              >
                                <HiOutlinePrinter className="h-4.5 w-4.5" />
                              </button>
                              
                              {/* Edit permissions */}
                              {(!isHR && ["Pending_Supervisor", "Rejected_Supervisor", "Rejected_HRD"].includes(row.status) && Number(currentUser?.employee?.employee_id) === Number(row.requester_id)) || isHR ? (
                                <button
                                  onClick={() => navigate("/training-management-system/request/form", { state: { editId: row.id } })}
                                  title="Ubah"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition"
                                >
                                  <HiOutlinePencilSquare className="h-4.5 w-4.5" />
                                </button>
                              ) : null}

                              {/* Delete permissions */}
                              {(!isHR && ["Pending_Supervisor", "Rejected_Supervisor", "Rejected_HRD"].includes(row.status) && Number(currentUser?.employee?.employee_id) === Number(row.requester_id)) || isHR ? (
                                <button
                                  onClick={() => setDeleteTarget(row)}
                                  title="Hapus"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                >
                                  <HiOutlineTrash className="h-4.5 w-4.5" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 text-xs font-semibold text-slate-500">
                <span>Total: {pagination.total} pengajuan</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchData(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => fetchData(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || loading}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Delete Confirmation Modal (Portal) */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
             onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10"
               onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
              <HiOutlineTrash className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Hapus Pengajuan?</h3>
            <p className="mt-1 text-sm text-slate-500 mb-5">
              Pengajuan training bertopik <span className="font-semibold text-slate-700">{deleteTarget.topic}</span> akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition flex items-center gap-1.5"
              >
                {deleteLoading && <HiOutlineClock className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detailed Request View Modal (Portal) */}
      {detailTarget && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
             onClick={() => setDetailTarget(null)}>
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 my-8 relative flex flex-col max-h-[90vh]"
               onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>Detail Pengajuan Training</span>
                  {detailData?.training?.training_code && (
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold font-mono border border-amber-200">
                      {detailData.training.training_code}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Rincian data pengusulan dan log persetujuan</p>
              </div>
              <div className="flex items-center gap-2">
                {detailData && detailData.training && (
                  <button
                    type="button"
                    onClick={() => exportToPdfTraining(detailData)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition shadow-sm animate-fadeIn"
                    title="Cetak / Simpan PDF"
                  >
                    <HiOutlinePrinter className="h-4.5 w-4.5" />
                    <span>Cetak PDF</span>
                  </button>
                )}
                <button
                  onClick={() => setDetailTarget(null)}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 transition"
                >
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
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

                    {/* Mentors (if internal) */}
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

                    {/* Vendors (if external) */}
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

                    {/* Narahubung */}
                    {detailData.training.contact_person_name && (
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Narahubung</span>
                        <span className="text-xs text-slate-700 font-semibold">{detailData.training.contact_person_name}</span>
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
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Dokumen / Bukti Pelaksanaan</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                            const ext = filename.split(".").pop().toLowerCase();
                            const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
                            const isPdf = ext === "pdf";

                            if (isImage) {
                              return (
                                <div key={index} className="relative group overflow-hidden border border-slate-200 bg-slate-50 rounded-2xl flex flex-col p-2 transition hover:shadow-md hover:border-amber-500">
                                  <div className="h-28 w-full rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden relative">
                                    <img 
                                      src={`${BASE_URL}/assets/${filepath}`} 
                                      alt={filename} 
                                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://placehold.co/400x300?text=Error+Loading";
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                      <a 
                                        href={`${BASE_URL}/assets/${filepath}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="bg-white text-slate-800 p-2 rounded-full shadow hover:bg-slate-100 transition" 
                                        title="Buka di tab baru"
                                      >
                                        <HiOutlineEye className="h-4 w-4" />
                                      </a>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between px-1">
                                    <span className="text-[10px] font-semibold text-slate-700 truncate max-w-[80%]" title={filename}>
                                      {filename}
                                    </span>
                                    <a 
                                      href={`${BASE_URL}/assets/${filepath}`} 
                                      download 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-amber-500 hover:text-amber-600 transition shrink-0 ml-1" 
                                      title="Unduh"
                                    >
                                      <HiOutlineInboxArrowDown className="h-4 w-4" />
                                    </a>
                                  </div>
                                </div>
                              );
                            }

                            if (isPdf) {
                              return (
                                <div key={index} className="relative group overflow-hidden border border-slate-200 bg-slate-50 rounded-2xl flex flex-col p-2 transition hover:shadow-md hover:border-rose-500">
                                  <div className="h-28 w-full rounded-xl bg-rose-50/50 border border-rose-100 flex flex-col items-center justify-center relative">
                                    <div className="h-9 w-9 bg-rose-500 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-md">
                                      PDF
                                    </div>
                                    <span className="text-[9px] font-bold text-rose-600 uppercase mt-2 tracking-wider">Dokumen PDF</span>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                      <a 
                                        href={`${BASE_URL}/assets/${filepath}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="bg-white text-slate-800 p-2 rounded-full shadow hover:bg-slate-100 transition" 
                                        title="Buka PDF"
                                      >
                                        <HiOutlineEye className="h-4 w-4" />
                                      </a>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between px-1">
                                    <span className="text-[10px] font-semibold text-slate-700 truncate max-w-[80%]" title={filename}>
                                      {filename}
                                    </span>
                                    <a 
                                      href={`${BASE_URL}/assets/${filepath}`} 
                                      download 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-rose-500 hover:text-rose-600 transition shrink-0 ml-1" 
                                      title="Unduh"
                                    >
                                      <HiOutlineInboxArrowDown className="h-4 w-4" />
                                    </a>
                                  </div>
                                </div>
                              );
                            }

                            // Generic file fallback
                            return (
                              <div key={index} className="relative group overflow-hidden border border-slate-200 bg-slate-50 rounded-2xl flex flex-col p-2 transition hover:shadow-md hover:border-blue-500">
                                <div className="h-28 w-full rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col items-center justify-center relative">
                                  <div className="h-9 w-9 bg-blue-500 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-md">
                                    FILE
                                  </div>
                                  <span className="text-[9px] font-bold text-blue-600 uppercase mt-2 tracking-wider">Berkas</span>
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                    <a 
                                      href={`${BASE_URL}/assets/${filepath}`} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="bg-white text-slate-800 p-2 rounded-full shadow hover:bg-slate-100 transition" 
                                      title="Buka Berkas"
                                    >
                                      <HiOutlineEye className="h-4 w-4" />
                                    </a>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between px-1">
                                  <span className="text-[10px] font-semibold text-slate-700 truncate max-w-[80%]" title={filename}>
                                    {filename}
                                  </span>
                                  <a 
                                    href={`${BASE_URL}/assets/${filepath}`} 
                                    download 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-blue-500 hover:text-blue-600 transition shrink-0 ml-1" 
                                    title="Unduh"
                                  >
                                    <HiOutlineInboxArrowDown className="h-4 w-4" />
                                  </a>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Rejection log if exists */}
                  {detailData.training.supervisor_rejection_reason && (
                    <div className="border-t border-slate-100 pt-4 text-xs bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700">
                      <span className="font-bold block mb-1">Ditolak oleh Supervisor ({detailData.training.supervisor_name}):</span>
                      <p className="leading-relaxed">{detailData.training.supervisor_rejection_reason}</p>
                    </div>
                  )}

                  {detailData.training.hrd_rejection_reason && (
                    <div className="border-t border-slate-100 pt-4 text-xs bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700">
                      <span className="font-bold block mb-1">Ditolak oleh HRD ({detailData.training.hrd_name}):</span>
                      <p className="leading-relaxed">{detailData.training.hrd_rejection_reason}</p>
                    </div>
                  )}

                  {/* Approval Actions Panel */}
                  {detailData.training.status === "Pending_Supervisor" && isSpv && Number(currentUser?.employee?.department_id) === Number(detailData.training.department_id) && (
                    <div className="border-t border-slate-200 pt-4 shrink-0">
                      <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-widest">Tindakan Supervisor</h4>
                      <SupervisorApprove
                        trainingId={detailData.training.id}
                        onClose={() => setDetailTarget(null)}
                        onSuccess={(msg) => {
                          showToast(msg);
                          setDetailTarget(null);
                          fetchData(pagination.page);
                        }}
                      />
                    </div>
                  )}

                  {["Pending_HRD", "Review", "Scheduled"].includes(detailData.training.status) && isHR && (
                    <div className="border-t border-slate-200 pt-4 shrink-0">
                      <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-widest">Tindakan HRD</h4>
                      <HumanResourceApprove
                        training={detailData.training}
                        onClose={() => setDetailTarget(null)}
                        onSuccess={(msg) => {
                          showToast(msg);
                          setDetailTarget(null);
                          fetchData(pagination.page);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
