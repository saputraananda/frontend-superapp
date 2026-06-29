import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import {
  HiOutlineLockClosed,
  HiOutlineKey,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineSparkles,
} from "react-icons/hi2";

// Definisi pertanyaan berdasarkan AnalysisBurnout.md
const SURVEY_QUESTIONS = [
  {
    category: "A",
    title: "Emotional Exhaustion (Kelelahan Emosional)",
    description: "Bagian ini mengukur sejauh mana Anda merasakan kelelahan secara mental dan fisik akibat beban pekerjaan Anda.",
    questions: [
      { id: "a1", text: "Saya merasa lelah bahkan sebelum mulai bekerja" },
      { id: "a2", text: "Energi saya cepat habis saat bekerja" },
      { id: "a3", text: "Saya merasa pekerjaan ini menguras mental saya" },
      { id: "a4", text: "Saya merasa butuh istirahat lebih dari biasanya" },
    ],
  },
  {
    category: "B",
    title: "Depersonalization (Sikap Cuek/Skeptis)",
    description: "Bagian ini mengukur jarak psikologis yang Anda bangun terhadap pekerjaan atau rekan kerja sebagai respons terhadap stres.",
    questions: [
      { id: "b1", text: "Saya mulai merasa cuek terhadap pekerjaan saya" },
      { id: "b2", text: "Saya merasa kurang peduli dengan hasil kerja" },
      { id: "b3", text: "Saya menjadi lebih sensitif / mudah kesal saat bekerja" },
      { id: "b4", text: "Saya merasa interaksi dengan tim terasa melelahkan" },
    ],
  },
  {
    category: "C",
    title: "Personal Accomplishment (Pencapaian Pribadi)",
    description: "Bagian ini menilai kepuasan, dampak, dan perasaan berharga yang Anda peroleh dari kontribusi pekerjaan Anda.",
    questions: [
      { id: "c1", text: "Saya merasa yang saya kerjakan tidak ada impact" },
      { id: "c2", text: "Saya jarang merasa bangga dengan hasil kerja saya" },
      { id: "c3", text: "Saya merasa kontribusi saya belum sepenuhnya dihargai" },
      { id: "c4", text: "Saya merasa perkembangan saya dalam pekerjaan ini masih terbatas" },
    ],
  },
  {
    category: "D",
    title: "Root Cause (Pemicu Utama)",
    description: "Mengevaluasi faktor eksternal lingkungan kerja, beban kerja, kejelasan instruksi, dan dukungan yang Anda rasakan.",
    questions: [
      { id: "d1", text: "Beban kerja saya saat ini terasa berlebihan" },
      { id: "d2", text: "Target kerja terasa tidak realistis" },
      { id: "d3", text: "Saya memahami dengan jelas apa yang harus saya kerjakan" },
      { id: "d4", text: "Saya tidak mendapat dukungan dari atasan" },
    ],
  },
  {
    category: "E",
    title: "Gejala Fisik",
    description: "Mendeteksi manifestasi klinis atau gangguan kesehatan fisik yang timbul akibat ketegangan kerja.",
    questions: [
      { id: "e1", text: "Saya merasa mudah lelah saat bekerja" },
      { id: "e2", text: "Saya sering mengalami sakit kepala atau ketegangan saat bekerja" },
      { id: "e3", text: "Saya mengalami gangguan tidur belakangan ini" },
      { id: "e4", text: "Saya merasa kondisi fisik saya lebih sering menurun / mudah sakit" },
    ],
  },
  {
    category: "F",
    title: "Gejala Emosional",
    description: "Mendeteksi perubahan kondisi suasana hati (mood), kecemasan, dan motivasi kerja Anda.",
    questions: [
      { id: "f1", text: "Saya merasa lebih mudah marah atau sensitif saat bekerja" },
      { id: "f2", text: "Saya merasa kehilangan motivasi dalam bekerja" },
      { id: "f3", text: "Saya sering merasa cemas atau overthinking terkait pekerjaan" },
      { id: "f4", text: "Saya merasa stuck atau tidak berkembang dalam pekerjaan saya" },
    ],
  },
  {
    category: "G",
    title: "Gejala Perilaku",
    description: "Mengukur dampak stres kerja pada kebiasaan kerja Anda, hubungan sosial, dan produktivitas harian.",
    questions: [
      { id: "g1", text: "Saya sering menunda pekerjaan yang seharusnya bisa segera diselesaikan" },
      { id: "g2", text: "Saya cenderung menarik diri dari interaksi dengan tim" },
      { id: "g3", text: "Produktivitas kerja saya menurun dibanding biasanya" },
      { id: "g4", text: "Saya lebih sering datang terlambat atau merasa ingin izin" },
    ],
  },
  {
    category: "H",
    title: "Gejala Kognitif",
    description: "Mengukur pengaruh burnout terhadap konsentrasi, kepercayaan diri, dan kejelasan arah karir Anda.",
    questions: [
      { id: "h1", text: "Saya merasa sulit untuk fokus saat bekerja" },
      { id: "h2", text: "Saya memiliki pikiran negatif terhadap pekerjaan saya" },
      { id: "h3", text: "Saya merasa kurang percaya diri dengan kemampuan saya" },
      { id: "h4", text: "Saya merasa kehilangan arah atau tujuan dalam pekerjaan" },
    ],
  },
];

const LIKERT_OPTIONS = [
  { value: 1, label: "Sangat Tidak Sesuai" },
  { value: 2, label: "Tidak Sesuai" },
  { value: 3, label: "Netral" },
  { value: 4, label: "Sesuai" },
  { value: 5, label: "Sangat Sesuai" },
];

export default function AnalysisBurnout({ onSubmitted }) {
  const [surveyKey, setSurveyKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showExistsModal, setShowExistsModal] = useState(false);

  // Cek riwayat survey untuk mengetahui apakah sudah pernah isi
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api("/analysis-burnout/history");
        if (res.success) {
          setHistory(res.history);
        }
      } catch (err) {
        console.error("Gagal memuat riwayat survei:", err);
      }
    };
    fetchHistory();
  }, [success]);

  // Validasi kunci survey
  const handleVerifyKey = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api("/analysis-burnout/verify-key", {
        method: "POST",
        body: JSON.stringify({ survey_key: surveyKey }),
      });
      if (res.success) {
        if (res.alreadyExists) {
          setShowExistsModal(true);
        } else {
          setIsUnlocked(true);
          // Inisialisasi jawaban jika kosong
          const initialAnswers = {};
          SURVEY_QUESTIONS.forEach((cat) => {
            cat.questions.forEach((q) => {
              initialAnswers[q.id] = null;
            });
          });
          setAnswers(initialAnswers);
        }
      } else {
        setError(res.message || "Kunci survei salah.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  // Pilih opsi jawaban
  const handleSelectOption = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Menghitung jumlah pertanyaan yang telah dijawab
  const totalQuestions = 32;
  const answeredCount = Object.values(answers).filter((val) => val !== null).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Submit survei ke backend
  const handleSubmitSurvey = async () => {
    setError("");
    setSuccess("");

    if (answeredCount < totalQuestions) {
      setError("Silakan jawab semua pertanyaan terlebih dahulu sebelum mengirim.");
      const firstUnanswered = Object.keys(answers).find((key) => answers[key] === null);
      if (firstUnanswered) {
        const el = document.getElementById(`q-container-${firstUnanswered}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        survey_key: surveyKey,
        ...answers,
      };

      const res = await api("/analysis-burnout/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccess(res.message || "Survei berhasil dikirim!");
        // Reset state
        setAnswers({});
        setSurveyKey("");
        setIsUnlocked(false);
        if (onSubmitted) onSubmitted();
      } else {
        setError(res.message || "Gagal mengirim survei.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setSubmitting(false);
    }
  };

  // Tampilan Utama sebelum Kunci Survei diverifikasi
  if (!isUnlocked) {
    return (
      <div className="max-w-xl mx-auto my-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
            <HiOutlineLockClosed className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Kunci Akses Survei Burnout</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Untuk mengisi Survei Burnout Karyawan, silakan masukkan <strong>Kunci Survei</strong> atau password khusus yang diberikan oleh HR Department.
          </p>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <HiOutlineKey className="w-5 h-5" />
              </span>
              <input
                type="password"
                placeholder="Masukkan kunci survei..."
                value={surveyKey}
                onChange={(e) => setSurveyKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleVerifyKey(e);
                  }
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                disabled={loading}
                required
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 flex items-center justify-center gap-1 bg-rose-50 border border-rose-100 rounded-lg py-2">
                <HiOutlineExclamationCircle className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleVerifyKey}
              disabled={loading || !surveyKey}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                  Memverifikasi...
                </>
              ) : (
                "Buka Survei"
              )}
            </button>
          </div>

          {history.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-left">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Riwayat Pengisian Anda</h4>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {history.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-150 p-2.5 rounded-lg">
                    <span className="font-medium text-slate-600">Pengisian {history.length - idx}</span>
                    <span className="text-slate-400 font-mono">
                      {new Date(item.created_at).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Alert if already exists */}
        {showExistsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExistsModal(false)} />
            <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-slate-100 transform transition-all">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 text-amber-600 mb-4 border border-amber-100 animate-bounce">
                <HiOutlineExclamationCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Sudah Mengisi Survei</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Anda sudah pernah menyelesaikan kuesioner Survei Burnout Karyawan sebelumnya menggunakan kunci survei ini. Batas pengisian survei adalah satu kali.
              </p>
              <button
                type="button"
                onClick={() => setShowExistsModal(false)}
                className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-100"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tampilan Form Kuesioner (Bila Akses Terbuka)
  return (
    <div className="space-y-6">
      {/* Header Form & Progress */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <HiOutlineSparkles className="w-24 h-24 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight">Kuesioner Burnout Karyawan</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Kuesioner ini dirancang untuk mendeteksi tanda-tanda stres kerja, kelelahan fisik-mental, dan tingkat kenyamanan kerja Anda. Jawablah dengan jujur sesuai kondisi aktual Anda.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 min-w-[200px]">
            <div className="flex items-center justify-between text-xs text-slate-200 mb-1.5 font-semibold">
              <span>Progres Pengisian</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-300 mt-1.5 text-right font-medium">
              {answeredCount} dari {totalQuestions} pertanyaan terisi
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 flex items-start gap-2.5">
          <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Perhatian</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Skala Legend Sticky */}
      <div className="sticky top-0 z-30 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1.5 justify-center md:justify-between items-center">
        <span className="font-semibold text-slate-700">Keterangan Skala Jawaban:</span>
        <div className="flex flex-wrap gap-3 justify-center">
          {LIKERT_OPTIONS.map((opt) => (
            <span key={opt.value} className="flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                {opt.value}
              </span>
              <span className="text-[11px] font-medium text-slate-500">{opt.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Bagian Pertanyaan Kategori */}
      <div className="space-y-6">
        {SURVEY_QUESTIONS.map((section) => (
          <div key={section.category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-600 text-white font-bold text-sm">
                  {section.category}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight">{section.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{section.description}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {section.questions.map((q, idx) => (
                <div
                  key={q.id}
                  id={`q-container-${q.id}`}
                  className={`p-4 sm:p-5 transition-colors ${
                    answers[q.id] === null ? "bg-amber-50/10 hover:bg-slate-50/40" : "bg-white hover:bg-slate-50/40"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex gap-2.5 max-w-2xl">
                      <span className="text-xs font-semibold text-slate-400 mt-0.5">{idx + 1}.</span>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{q.text}</p>
                    </div>

                    {/* Skala Pilihan Bulat */}
                    <div className="flex items-center gap-2 self-start lg:self-center">
                      {LIKERT_OPTIONS.map((opt) => {
                        const isSelected = answers[q.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.value)}
                            title={opt.label}
                            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex flex-col items-center justify-center border font-bold text-sm transition-all focus:outline-none ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 scale-105"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50"
                            }`}
                          >
                            <span>{opt.value}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Button Simpan */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <HiOutlineCheckCircle className="w-5 h-5 text-indigo-600" />
          <span className="text-xs text-slate-500 font-medium">
            Pastikan semua dari <strong>{totalQuestions}</strong> pertanyaan telah dijawab dengan teliti.
          </span>
        </div>
        <button
          type="button"
          onClick={handleSubmitSurvey}
          disabled={submitting}
          className="w-full sm:w-auto min-w-[165px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
              Mengirim data...
            </>
          ) : (
            "Kirim Jawaban Survei"
          )}
        </button>
      </div>
    </div>
  );
}
