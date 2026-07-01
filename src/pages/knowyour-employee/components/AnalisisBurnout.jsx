import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineSparkles,
  HiOutlineCalendarDays,
  HiOutlineEye,
  HiOutlineInformationCircle,
} from "react-icons/hi2";

// Definisi pertanyaan yang sama dengan kuesioner
const SURVEY_QUESTIONS = [
  {
    category: "A",
    title: "Emotional Exhaustion",
    questions: [
      { id: "a1", text: "Saya merasa lelah bahkan sebelum mulai bekerja", positive: false },
      { id: "a2", text: "Energi saya cepat habis saat bekerja", positive: false },
      { id: "a3", text: "Saya merasa pekerjaan ini menguras mental saya", positive: false },
      { id: "a4", text: "Saya merasa butuh istirahat lebih dari biasanya", positive: false },
    ],
  },
  {
    category: "B",
    title: "Depersonalization",
    questions: [
      { id: "b1", text: "Saya mulai merasa cuek terhadap pekerjaan saya", positive: false },
      { id: "b2", text: "Saya merasa kurang peduli dengan hasil kerja", positive: false },
      { id: "b3", text: "Saya menjadi lebih sensitif / mudah kesal saat bekerja", positive: false },
      { id: "b4", text: "Saya merasa interaksi dengan tim terasa melelahkan", positive: false },
    ],
  },
  {
    category: "C",
    title: "Personal Accomplishment",
    questions: [
      { id: "c1", text: "Saya merasa yang saya kerjakan tidak ada impact", positive: false },
      { id: "c2", text: "Saya jarang merasa bangga dengan hasil kerja saya", positive: false },
      { id: "c3", text: "Saya merasa kontribusi saya belum sepenuhnya dihargai", positive: false },
      { id: "c4", text: "Saya merasa perkembangan saya dalam pekerjaan ini masih terbatas", positive: false },
    ],
  },
  {
    category: "D",
    title: "Root Cause",
    questions: [
      { id: "d1", text: "Beban kerja saya saat ini terasa berlebihan", positive: false },
      { id: "d2", text: "Target kerja terasa tidak realistis", positive: false },
      { id: "d3", text: "Saya memahami dengan jelas apa yang harus saya kerjakan", positive: true },
      { id: "d4", text: "Saya tidak mendapat dukungan dari atasan", positive: false },
    ],
  },
  {
    category: "E",
    title: "Gejala Fisik",
    questions: [
      { id: "e1", text: "Saya merasa mudah lelah saat bekerja", positive: false },
      { id: "e2", text: "Saya sering mengalami sakit kepala atau ketegangan saat bekerja", positive: false },
      { id: "e3", text: "Saya mengalami gangguan tidur belakangan ini", positive: false },
      { id: "e4", text: "Saya merasa kondisi fisik saya lebih sering menurun / mudah sakit", positive: false },
    ],
  },
  {
    category: "F",
    title: "Gejala Emosional",
    questions: [
      { id: "f1", text: "Saya merasa lebih mudah marah atau sensitif saat bekerja", positive: false },
      { id: "f2", text: "Saya merasa kehilangan motivasi dalam bekerja", positive: false },
      { id: "f3", text: "Saya sering merasa cemas atau overthinking terkait pekerjaan", positive: false },
      { id: "f4", text: "Saya merasa stuck atau tidak berkembang dalam pekerjaan saya", positive: false },
    ],
  },
  {
    category: "G",
    title: "Gejala Perilaku",
    questions: [
      { id: "g1", text: "Saya sering menunda pekerjaan yang seharusnya bisa segera diselesaikan", positive: false },
      { id: "g2", text: "Saya cenderung menarik diri dari interaksi dengan tim", positive: false },
      { id: "g3", text: "Produktivitas kerja saya menurun dibanding biasanya", positive: false },
      { id: "g4", text: "Saya lebih sering datang terlambat atau merasa ingin izin", positive: false },
    ],
  },
  {
    category: "H",
    title: "Gejala Kognitif",
    questions: [
      { id: "h1", text: "Saya merasa sulit untuk fokus saat bekerja", positive: false },
      { id: "h2", text: "Saya memiliki pikiran negatif terhadap pekerjaan saya", positive: false },
      { id: "h3", text: "Saya merasa kurang percaya diri dengan kemampuan saya", positive: false },
      { id: "h4", text: "Saya merasa kehilangan arah atau tujuan dalam pekerjaan", positive: false },
    ],
  },
];

// Helper kalkulasi burnout score (0 - 100)
// Negative questions: (Value - 1) * 25
// Positive questions: (5 - Value) * 25
const calcBurnoutIndex = (item) => {
  let sum = 0;
  let count = 0;
  SURVEY_QUESTIONS.forEach((section) => {
    section.questions.forEach((q) => {
      const val = item[q.id];
      if (val !== undefined && val !== null) {
        const score = q.positive ? 5 - val : val - 1;
        sum += score * 25; // Map to 0-100 scale per question
        count++;
      }
    });
  });
  return count > 0 ? Math.round(sum / count) : 0;
};

// Kategori Risiko berdasarkan Index
const getRiskCategory = (index) => {
  if (index >= 70) return { label: "Risiko Tinggi", cls: "bg-rose-50 border-rose-200 text-rose-700", badgeCls: "bg-rose-100 text-rose-800" };
  if (index >= 40) return { label: "Peringatan (Sedang)", cls: "bg-amber-50 border-amber-200 text-amber-700", badgeCls: "bg-amber-100 text-amber-800" };
  return { label: "Risiko Rendah", cls: "bg-emerald-50 border-emerald-200 text-emerald-700", badgeCls: "bg-emerald-100 text-emerald-800" };
};

export default function AnalisisBurnout() {
  const [dataList, setDataList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [summaryModalType, setSummaryModalType] = useState(null); // null | 'high' | 'warning' | 'low'

  // Filters State
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });

  // Load master departemen
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api("/departments");
        if (Array.isArray(res)) {
          setDepartments(res);
        } else if (res?.success && Array.isArray(res.departments)) {
          setDepartments(res.departments);
        }
      } catch (err) {
        console.error("Gagal memuat departemen:", err);
      }
    };
    fetchDepts();
  }, []);

  // Fetch list kuesioner
  const fetchList = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: pagination.limit,
        search,
        department_id: deptFilter,
        date_from: dateFrom,
        date_to: dateTo,
      });
      const res = await api(`/analysis-burnout/monitoring?${queryParams.toString()}`);
      if (res.success) {
        setDataList(res.data || []);
        setPagination(res.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Gagal mengambil monitoring list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, deptFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  const handleResetFilters = () => {
    setSearch("");
    setDeptFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Ambil detail kuesioner
  const handleOpenDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api(`/analysis-burnout/monitoring/${id}`);
      if (res.success) {
        setSelectedResponse(res.data);
      }
    } catch (err) {
      console.error("Gagal mengambil detail survei:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Hitung data ringkasan dashboard kye
  const statsSummary = () => {
    let total = dataList.length;
    let high = 0;
    let warning = 0;
    let low = 0;

    dataList.forEach((item) => {
      const index = calcBurnoutIndex(item);
      if (index >= 70) high++;
      else if (index >= 40) warning++;
      else low++;
    });

    return { total, high, warning, low };
  };

  const summary = statsSummary();

  return (
    <main className="min-h-screen bg-violet-50/40 py-6 sm:py-8">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* ── Page Header ── */}
        <section className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-slate-950 via-violet-800 to-purple-600 p-5 shadow-sm sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-purple-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                <HiOutlineClipboardDocumentList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">Pemantauan Analisis Burnout</h1>
                <p className="text-sm text-white/70">
                  Pantau indikasi risiko stress, burnout mental, kelelahan fisik, dan faktor pemicu kerja karyawan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-2">
              <HiOutlineSparkles className="h-4 w-4 text-amber-300 animate-pulse" />
              <span className="text-xs font-semibold text-white/80">Overview Realtime</span>
            </div>
          </div>
        </section>

        {/* ── Quick Summary Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setSummaryModalType("all")}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-violet-300 hover:shadow-md transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center shrink-0">
              <HiOutlineUserGroup className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Partisipan</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{pagination.total}</h3>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSummaryModalType("high")}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-rose-300 hover:shadow-md transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <HiOutlineExclamationTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Risiko Tinggi (Burnout)</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-0.5">{summary.high} <span className="text-xs font-normal text-slate-400">karyawan</span></h3>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSummaryModalType("warning")}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-amber-300 hover:shadow-md transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <HiOutlineInformationCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Peringatan (Mending)</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{summary.warning} <span className="text-xs font-normal text-slate-400">karyawan</span></h3>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSummaryModalType("low")}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <HiOutlineCheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Risiko Rendah (Sehat)</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{summary.low} <span className="text-xs font-normal text-slate-400">karyawan</span></h3>
            </div>
          </button>
        </div>

        {/* ── Filters Section ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">
              <HiOutlineFunnel className="h-4 w-4" /> Filter & Pencarian
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <HiOutlineMagnifyingGlass className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Nama / Kode Karyawan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs transition-all"
                />
              </div>

              {/* Department */}
              <div>
                <select
                  value={deptFilter}
                  onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs transition-all cursor-pointer"
                >
                  <option value="">— Semua Departemen —</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <HiOutlineCalendarDays className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs transition-all"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <HiOutlineCalendarDays className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition"
              >
                <HiOutlineXMark className="h-4 w-4" /> Reset
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2 text-xs font-semibold text-white transition shadow-sm"
              >
                Cari Data
              </button>
            </div>
          </form>
        </div>

        {/* ── Responses List Table ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 w-16">No</th>
                  <th className="px-6 py-4">Karyawan</th>
                  <th className="px-6 py-4">Departemen</th>
                  <th className="px-6 py-4">Tanggal Pengisian</th>
                  <th className="px-6 py-4">Kunci Survei</th>
                  <th className="px-6 py-4 text-center">Indeks Burnout</th>
                  <th className="px-6 py-4 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : dataList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      Tidak ada data respon survei burnout yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  dataList.map((item, idx) => {
                    const burnoutIndex = calcBurnoutIndex(item);
                    const risk = getRiskCategory(burnoutIndex);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-slate-400">
                          {(page - 1) * pagination.limit + idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{item.full_name || "—"}</div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{item.employee_code || "—"}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {item.department_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono">
                          {new Date(item.created_at).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[10px] font-mono text-slate-600 font-bold">
                            {item.survey_key || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${risk.badgeCls}`}>
                              {burnoutIndex}% · {risk.label}
                            </span>
                            <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  burnoutIndex >= 70
                                    ? "bg-rose-500"
                                    : burnoutIndex >= 40
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${burnoutIndex}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition shadow-sm"
                          >
                            <HiOutlineEye className="h-3.5 w-3.5" /> Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">
                Menunjukkan {(page - 1) * pagination.limit + 1} -{" "}
                {Math.min(page * pagination.limit, pagination.total)} dari{" "}
                {pagination.total} entri
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-55 disabled:cursor-not-allowed transition"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center px-3 font-semibold text-slate-600">
                  Halaman {page} dari {pagination.totalPages}
                </div>
                <button
                  type="button"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-55 disabled:cursor-not-allowed transition"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>

{/* ── Interactive Detail Modal ── */}
        {selectedResponse && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-12 m-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedResponse(null)} />
            <div
              className="relative z-10 w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
                    <HiOutlineClipboardDocumentList className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight">Detail Hasil Jawaban Burnout</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Karyawan: <span className="text-slate-700 font-semibold">{selectedResponse.full_name}</span> ({selectedResponse.employee_code})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedResponse(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                >
                  <HiOutlineXMark className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-5">

                {/* Meta details & Overall Index */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waktu Pengisian</p>
                    <p className="text-sm font-bold text-slate-700 mt-1 font-mono">
                      {new Date(selectedResponse.created_at).toLocaleString("id-ID", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Departemen: {selectedResponse.department_name || "—"}</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kunci Survei</p>
                    <p className="text-sm font-bold text-slate-700 mt-1 font-mono bg-slate-50 border border-slate-200 inline-block px-2.5 py-0.5 rounded-lg w-max">
                      {selectedResponse.survey_key}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Password verifikasi kuesioner</p>
                  </div>

                  {(() => {
                    const idx = calcBurnoutIndex(selectedResponse);
                    const risk = getRiskCategory(idx);
                    return (
                      <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-center ${risk.cls}`}>
                        <p className="text-[10px] font-bold opacity-75 uppercase tracking-widest">Indeks Burnout</p>
                        <h4 className="text-xl font-bold mt-0.5">{idx}% · {risk.label}</h4>
                        <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full ${
                              idx >= 70 ? "bg-rose-500" : idx >= 40 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${idx}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Score breakdown per category */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Analisis per Kategori</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {SURVEY_QUESTIONS.map((cat) => {
                      // Hitung total score kategori
                      let score = 0;
                      let count = 0;
                      cat.questions.forEach((q) => {
                        const val = selectedResponse[q.id];
                        if (val !== undefined && val !== null) {
                          const valScore = q.positive ? 5 - val : val - 1;
                          score += valScore * 25;
                          count++;
                        }
                      });
                      const catAvg = count > 0 ? Math.round(score / count) : 0;
                      const catRisk = getRiskCategory(catAvg);

                      return (
                        <div key={cat.category} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-1">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-violet-100 text-violet-700 font-bold text-[10px]">
                              {cat.category}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${catRisk.badgeCls}`}>
                              {catAvg}%
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-800 leading-tight truncate" title={cat.title}>
                              {cat.title}
                            </p>
                            <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{catRisk.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Question Details List */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detail Pertanyaan & Jawaban</h5>

                  {SURVEY_QUESTIONS.map((cat) => (
                    <div key={cat.category} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-violet-600 text-white font-bold text-[10px]">
                          {cat.category}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{cat.title}</span>
                      </div>
                      <div className="divide-y divide-slate-150">
                        {cat.questions.map((q, idx) => {
                          const val = selectedResponse[q.id];
                          const score = q.positive ? 5 - val : val - 1;
                          const pct = score * 25; // 0 - 100%

                          // Tentukan warna bullet jawaban
                          // Untuk negative question, 4 & 5 itu buruk (burnout)
                          // Untuk positive question (D3), 1 & 2 itu buruk (burnout)
                          let isHarmful = false;
                          if (q.positive) {
                            if (val <= 2) isHarmful = true; // 1-2 indicates low positive feeling
                          } else {
                            if (val >= 4) isHarmful = true; // 4-5 indicates high negative feeling
                          }

                          return (
                            <div key={q.id} className="p-3.5 sm:p-4 hover:bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-3 transition">
                              <div className="flex gap-2">
                                <span className="text-xs font-semibold text-slate-400">{idx + 1}.</span>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed max-w-xl">{q.text}</p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                                <div className="text-[10px] text-slate-400 text-right hidden sm:block">
                                  <div>Skor: <span className="font-bold text-slate-700">{val}</span></div>
                                  <div className="text-[9px]">Indikasi: <span className={isHarmful ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>{pct}%</span></div>
                                </div>
                                <div className={`h-8 w-8 rounded-lg font-bold text-xs flex items-center justify-center border font-mono ${
                                  isHarmful
                                    ? "bg-rose-50 border-rose-200 text-rose-700"
                                    : val === 3
                                    ? "bg-slate-100 border-slate-200 text-slate-600"
                                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                }`}>
                                  {val}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedResponse(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2 text-xs font-bold text-slate-700 transition shadow-sm"
                >
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Summary Detail Modal ── */}
        {summaryModalType && (() => {
          const meta = {
            high: {
              label: "Risiko Tinggi (Burnout)",
              icon: HiOutlineExclamationTriangle,
              cls: "bg-rose-50 border-rose-200 text-rose-700",
              badgeCls: "bg-rose-100 text-rose-800",
              headerCls: "bg-rose-600",
              accent: "rose",
            },
            warning: {
              label: "Peringatan (Sedang)",
              icon: HiOutlineInformationCircle,
              cls: "bg-amber-50 border-amber-200 text-amber-700",
              badgeCls: "bg-amber-100 text-amber-800",
              headerCls: "bg-amber-600",
              accent: "amber",
            },
            low: {
              label: "Risiko Rendah (Sehat)",
              icon: HiOutlineCheckCircle,
              cls: "bg-emerald-50 border-emerald-200 text-emerald-700",
              badgeCls: "bg-emerald-100 text-emerald-800",
              headerCls: "bg-emerald-600",
              accent: "emerald",
            },
            all: {
              label: "Total Partisipan",
              icon: HiOutlineUserGroup,
              cls: "bg-violet-50 border-violet-200 text-violet-700",
              badgeCls: "bg-violet-100 text-violet-800",
              headerCls: "bg-violet-600",
              accent: "violet",
            },
          };
          const m = meta[summaryModalType];
          const Icon = m.icon;
          const filteredData = summaryModalType === "all" ? dataList : dataList.filter((item) => {
            const idx = calcBurnoutIndex(item);
            if (summaryModalType === "high") return idx >= 70;
            if (summaryModalType === "warning") return idx >= 40 && idx < 70;
            return idx < 40;
          });

          return (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-12 m-0">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSummaryModalType(null)} />
              <div
                className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${m.headerCls}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight">{m.label}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {filteredData.length} karyawan terindikasi
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSummaryModalType(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                  >
                    <HiOutlineXMark className="h-4 w-4" />
                  </button>
                </div>

                {/* List */}
                {filteredData.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Tidak ada karyawan dalam kategori ini.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredData.map((item, idx) => {
                      const index = calcBurnoutIndex(item);
                      const risk = getRiskCategory(index);
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-mono font-semibold text-slate-400 w-6 shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{item.full_name || "—"}</p>
                              <p className="text-[10px] font-mono text-slate-400 truncate">
                                {item.employee_code || "—"} · {item.department_name || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${risk.badgeCls}`}>
                              {index}%
                            </span>
                            <button
                              type="button"
                              onClick={() => { handleOpenDetail(item.id); setSummaryModalType(null); }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition shadow-sm"
                            >
                              <HiOutlineEye className="h-3 w-3" /> Detail
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSummaryModalType(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2 text-xs font-bold text-slate-700 transition shadow-sm"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </main>
  );
}