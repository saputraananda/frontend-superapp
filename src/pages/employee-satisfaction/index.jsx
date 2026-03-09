import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import AlertSuccess from "../../components/AlertSuccess";
import LoadingScreen from "../../components/LoadingScreen";
import {
  HiOutlineUser,
  HiOutlineClipboardDocumentList,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineExclamationTriangle,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineArrowLeft,
} from "react-icons/hi2";
import { FiSend } from "react-icons/fi";
import UnderDevelopmentDialog from "../../components/UnderDevelopmentDialog";

function cn(...c) { return c.filter(Boolean).join(" "); }

const inputCls = cn(
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
  "outline-none transition-all placeholder:text-slate-300",
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
  "hover:border-slate-300",
  "disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-80 disabled:cursor-not-allowed"
);

const textareaCls = cn(
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
  "outline-none transition-all placeholder:text-slate-300 resize-y",
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
  "hover:border-slate-300",
  "disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-80 disabled:cursor-not-allowed"
);

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1">
          <HiOutlineExclamationTriangle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}

function Panel({ title, Icon, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
      <div className="border-b border-slate-100 bg-slate-50 px-4 sm:px-6 py-4 flex items-center gap-3">
        {Icon && (
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-600 text-white shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>
      <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-5">
        {children}
      </div>
    </div>
  );
}

function SectionDivider({ title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-slate-100" />
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{title}</h3>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// Likert scale questions
const likertQuestions = [
  { key: "c1", group: "Keterlibatan Kerja", text: "Aku merasa bersemangat saat memulai hari kerja." },
  { key: "c2", group: "Keterlibatan Kerja", text: "Pekerjaan yang aku lakukan terasa bermakna, bukan sekadar rutinitas." },
  { key: "c3", group: "Keterlibatan Kerja", text: "Saat bekerja, aku merasa berenergi dan antusias." },
  { key: "c4", group: "Keterlibatan Kerja", text: "Aku merasa fokus dan terlibat dengan apa yang sedang aku kerjakan." },
  { key: "c5", group: "Keterlibatan Kerja", text: "Ada rasa bangga tersendiri dengan pekerjaan yang aku lakukan." },
  { key: "c6", group: "Kompensasi & Fasilitas", text: "Secara keseluruhan, gaji yang aku terima sudah sesuai dengan kontribusiku." },
  { key: "c7", group: "Kompensasi & Fasilitas", text: "Tunjangan dan fasilitas dari perusahaan mendukung kebutuhanku dengan baik." },
  { key: "c8", group: "Lingkungan Kerja", text: "Lingkungan kerja (baik secara fisik maupun suasana tim) terasa nyaman." },
  { key: "c9", group: "Lingkungan Kerja", text: "Rekan kerja di sekitarku suportif dan menyenangkan untuk diajak bekerja sama." },
  { key: "c10", group: "Lingkungan Kerja", text: "Atasan langsungku memberikan arahan yang jelas serta dukungan yang aku butuhkan." },
  { key: "c11", group: "Lingkungan Kerja", text: "Aku melihat adanya peluang untuk berkembang dan belajar di perusahaan ini." },
  { key: "c12", group: "Keterikatan Perusahaan", text: "Aku merasa memiliki keterikatan emosional dengan perusahaan ini." },
  { key: "c13", group: "Keterikatan Perusahaan", text: "Aku merasa bangga bisa menjadi bagian dari perusahaan ini." },
  { key: "c14", group: "Keterikatan Perusahaan", text: "Perusahaan ini memiliki arti penting bagiku, bukan sekadar tempat bekerja." },
  { key: "c15", group: "Keterikatan Perusahaan", text: "Saat ini, aku punya keinginan untuk tetap bekerja di perusahaan ini ke depannya." },
  { key: "c16", group: "Keterikatan Perusahaan", text: "Aku merasa punya tanggung jawab untuk ikut berkontribusi terhadap kemajuan perusahaan." },
];

const likertOptions = [
  { value: 1, label: "Sangat Tidak Setuju" },
  { value: 2, label: "Tidak Setuju" },
  { value: 3, label: "Netral" },
  { value: 4, label: "Setuju" },
  { value: 5, label: "Sangat Setuju" },
];

const likertColors = {
  1: "border-rose-300 bg-rose-50 text-rose-700",
  2: "border-orange-300 bg-orange-50 text-orange-700",
  3: "border-slate-300 bg-slate-100 text-slate-700",
  4: "border-blue-300 bg-blue-50 text-blue-700",
  5: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

function LikertScale({ value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {likertOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(name, opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-lg border transition-all font-medium",
            value === opt.value
              ? likertColors[opt.value]
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function EmployeeSatisfaction() {
  const [showDevDialog, setShowDevDialog] = useState(true);
  const [masterData, setMasterData] = useState({});
  const [surveyStatus, setSurveyStatus] = useState({ hasSubmitted: false, surveyKey: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [apiDataLoaded, setApiDataLoaded] = useState(false);
  const [formDataReady, setFormDataReady] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    company_name: "",
    department_name: "",
    job_level_name: "",
    tenure: "",
    overall_satisfaction: "",
    main_factors: [],
    main_factors_other: "",
    c1: null, c2: null, c3: null, c4: null,
    c5: null, c6: null, c7: null, c8: null,
    c9: null, c10: null, c11: null, c12: null,
    c13: null, c14: null, c15: null, c16: null,
    d1: "",
    d2: "",
    d3: "",
  });

  const topRef = useRef(null);

  function getTenureLabel(joinDateStr) {
    if (!joinDateStr) return "";
    const joinDate = new Date(joinDateStr);
    const now = new Date();
    const diffMs = now - joinDate;
    const diffMonth = diffMs / (1000 * 60 * 60 * 24 * 30.44);
    if (diffMonth < 3) return "< 3 bulan";
    if (diffMonth < 6) return "3 - 6 bulan";
    if (diffMonth < 12) return "6 - 12 bulan";
    return "> 1 tahun";
  }

  useEffect(() => {
    document.title = "Employee Satisfaction Survey | Alora Group Indonesia";
    const loadAllData = async () => {
      try {
        let userData = null;
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            userData = JSON.parse(storedUser);
          } catch (e) {
            console.warn('Invalid storedUser JSON:', e);
          }
        }
        setUserDataLoaded(true);

        const [statusRes, masterRes] = await Promise.all([
          api("/satisfaction/status"),
          api("/satisfaction/master-data"),
        ]);
        setSurveyStatus(statusRes);
        setMasterData(masterRes);
        setApiDataLoaded(true);

        if (userData?.employee) {
          const emp = userData.employee;
          setFormData((prev) => ({
            ...prev,
            full_name: emp.full_name || "",
            company_name: emp.company_name || "",
            department_name: emp.department_name || "",
            job_level_name: emp.job_level_name || "",
            tenure: getTenureLabel(emp.join_date) || "",
          }));
        }
        setFormDataReady(true);
      } catch (err) {
        setError(err.message);
        setApiDataLoaded(true);
        setFormDataReady(true);
      }
    };
    loadAllData();
  }, []);

  useEffect(() => {
    if (userDataLoaded && apiDataLoaded && formDataReady) {
      const t = setTimeout(() => setLoading(false), 100);
      return () => clearTimeout(t);
    }
  }, [userDataLoaded, apiDataLoaded, formDataReady]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => {
        const cur = prev.main_factors || [];
        return {
          ...prev,
          main_factors: checked ? [...cur, value] : cur.filter((f) => f !== value),
        };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLikertChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const completion = useMemo(() => {
    let filled = 0, total = 0;
    total += 5;
    if (formData.full_name) filled++;
    if (formData.department_name) filled++;
    if (formData.job_level_name) filled++;
    if (formData.tenure) filled++;
    if (formData.overall_satisfaction) filled++;
    total += 16;
    likertQuestions.forEach((q) => { if (formData[q.key] !== null) filled++; });
    total += 3;
    if (formData.d1) filled++;
    if (formData.d2) filled++;
    if (formData.d3) filled++;
    return { filled, total, pct: Math.round((filled / total) * 100) };
  }, [formData]);

  // Group likert questions by group
  const likertGroups = useMemo(() => {
    const groups = {};
    likertQuestions.forEach((q) => {
      if (!groups[q.group]) groups[q.group] = [];
      groups[q.group].push(q);
    });
    return groups;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!formData.full_name || !formData.department_name || !formData.job_level_name || !formData.tenure) {
      setError("Mohon lengkapi informasi umum terlebih dahulu.");
      setSubmitting(false);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!formData.overall_satisfaction) {
      setError("Mohon pilih tingkat kepuasan kerja Anda.");
      setSubmitting(false);
      return;
    }
    const unanswered = likertQuestions.filter((q) => formData[q.key] === null);
    if (unanswered.length > 0) {
      setError(`Mohon jawab semua pertanyaan penilaian aspek kerja (${unanswered.length} belum dijawab).`);
      setSubmitting(false);
      document.getElementById("section-aspects")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    try {
      let finalFactors = [...formData.main_factors];
      if (formData.main_factors_other?.trim()) {
        finalFactors.push(`Lainnya: ${formData.main_factors_other.trim()}`);
      }
      const payload = { ...formData, main_factors: finalFactors };
      delete payload.main_factors_other;

      const res = await api("/satisfaction/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(res.message || "Survei berhasil dikirim!");
      setSurveyStatus({ hasSubmitted: true, surveyKey: res.surveyKey });
    } catch (err) {
      setError(err.message);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (surveyStatus.hasSubmitted) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
            <HiOutlineCheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Survei Terkirim!</h1>
          <p className="text-sm text-slate-500 mb-1">
            Terima kasih, <span className="font-semibold text-slate-700">{surveyStatus.submittedBy}</span>!
          </p>
          <p className="text-sm text-slate-500 mb-1">
            Periode: <span className="font-semibold text-blue-600">{surveyStatus.surveyKey}</span>
          </p>
          <p className="text-xs text-slate-400 mt-3 mb-6">
            Masukan Anda sangat berarti bagi perkembangan perusahaan. Survei berikutnya tersedia di periode selanjutnya.
          </p>
          <a href="/portal"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
            <HiOutlineArrowLeft className="w-4 h-4" />
            Kembali ke Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <UnderDevelopmentDialog
        open={showDevDialog}
        onClose={() => setShowDevDialog(false)}
      />
      {success && <AlertSuccess message={success} onClose={() => setSuccess("")} />}

      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <a href="/portal"
                className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 transition shrink-0">
                <HiOutlineArrowLeft className="w-4 h-4 text-slate-600" />
              </a>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                  <a href="/portal" className="hover:text-blue-600 transition">Portal</a>
                  <span>/</span>
                  <span className="text-slate-600 font-medium">Employee Satisfaction Survey</span>
                </div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">Alora Employee Satisfaction</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Periode: <span className="font-semibold text-blue-600">{surveyStatus.surveyKey}</span>
                </p>
              </div>
            </div>

            {/* Progress di banner */}
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <span className="text-xs text-slate-500">Progress pengisian</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      completion.pct === 100 ? "bg-emerald-500" : "bg-blue-500"
                    )}
                    style={{ width: `${completion.pct}%` }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-semibold",
                  completion.pct === 100 ? "text-emerald-600" : "text-blue-600"
                )}>
                  {completion.pct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-5" ref={topRef}>
        {/* Info banner */}
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          <span className="font-semibold">Head Office – PT. Waschen Alora Indonesia.</span>{" "}
          Survei ini bertujuan meningkatkan kualitas lingkungan kerja dan sistem manajemen.
          Data Anda digunakan untuk analisis internal. Mohon isi dengan jujur dan lengkap.
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <HiOutlineExclamationTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError("")}><HiOutlineXMark className="w-4 h-4" /></button>
            </div>
          )}

          {/* ── Section A: Informasi Umum ── */}
          <Panel title="A. Informasi Umum" Icon={HiOutlineUser}>
            <p className="text-xs text-slate-400 -mt-2 mb-4">
              Data terisi otomatis dari profil. Jika ada perubahan, kunjungi halaman profil karyawan.
            </p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Field label="Nama Lengkap" required>
                <input type="text" name="full_name" value={formData.full_name} readOnly disabled
                  className={cn(inputCls, "bg-slate-50 text-slate-400 cursor-not-allowed")} />
              </Field>
              <Field label="Perusahaan">
                <input type="text" name="company_name" value={formData.company_name} readOnly disabled
                  className={cn(inputCls, "bg-slate-50 text-slate-400 cursor-not-allowed")} />
              </Field>
              <Field label="Departemen / Unit Kerja" required>
                <input type="text" name="department_name" value={formData.department_name} readOnly disabled
                  className={cn(inputCls, "bg-slate-50 text-slate-400 cursor-not-allowed")} />
              </Field>
              <Field label="Jabatan" required>
                <input type="text" name="job_level_name" value={formData.job_level_name} readOnly disabled
                  className={cn(inputCls, "bg-slate-50 text-slate-400 cursor-not-allowed")} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Masa Kerja" required>
                  <input type="text" name="tenure" value={formData.tenure} readOnly disabled
                    className={cn(inputCls, "bg-slate-50 text-slate-400 cursor-not-allowed")} />
                </Field>
              </div>
            </div>
          </Panel>

          {/* ── Section B: Kepuasan Kerja ── */}
          <Panel title="B. Kepuasan Kerja" Icon={HiOutlineClipboardDocumentList}>
            <div className="space-y-6">
              {/* Pertanyaan 1 */}
              <Field label="1. Bagaimana tingkat kepuasan kerja kamu secara keseluruhan?" required>
                <div className="flex flex-wrap gap-2 mt-2">
                  {masterData.satisfactionLevels?.map((level) => (
                    <label key={level.value}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm font-medium",
                        formData.overall_satisfaction === level.value
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      )}>
                      <input type="radio" name="overall_satisfaction" value={level.value}
                        checked={formData.overall_satisfaction === level.value}
                        onChange={handleChange} className="sr-only" />
                      {level.label}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Pertanyaan 2 */}
              <Field label="2. Faktor utama yang paling memengaruhi tingkat kepuasan kerja kamu saat ini:"
                hint="Dapat memilih lebih dari satu">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {masterData.mainFactors?.map((factor) => (
                    <label key={factor.value}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-all",
                        formData.main_factors.includes(factor.value)
                          ? "bg-blue-50 border-blue-300 text-blue-800"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      )}>
                      <input type="checkbox" name="main_factors" value={factor.value}
                        checked={formData.main_factors.includes(factor.value)}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm">{factor.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <input type="text" name="main_factors_other" value={formData.main_factors_other}
                    onChange={handleChange} className={inputCls}
                    placeholder="Lainnya (sebutkan)..." />
                </div>
              </Field>
            </div>
          </Panel>

          {/* ── Section C: Penilaian Aspek Kerja ── */}
          <Panel
            title="C. Penilaian Aspek Kerja"
            Icon={HiOutlineChartBarSquare}
          >
            <div id="section-aspects">
              {/* Progress aspek */}
              <div className="flex items-center justify-between text-xs text-slate-500 mb-4 -mt-2">
                <span>Pertanyaan terjawab</span>
                <span className={cn(
                  "font-semibold",
                  likertQuestions.filter((q) => formData[q.key] !== null).length === 16
                    ? "text-emerald-600" : "text-slate-700"
                )}>
                  {likertQuestions.filter((q) => formData[q.key] !== null).length} / 16
                </span>
              </div>

              <div className="space-y-6">
                {Object.entries(likertGroups).map(([groupName, questions]) => (
                  <div key={groupName}>
                    <SectionDivider title={groupName} />
                    <div className="space-y-4">
                      {questions.map((q) => {
                        const globalIdx = likertQuestions.findIndex((lq) => lq.key === q.key);
                        return (
                          <div key={q.key}
                            className={cn(
                              "rounded-lg border p-4 transition-all",
                              formData[q.key] !== null
                                ? "border-blue-100 bg-blue-50/40"
                                : "border-slate-200 bg-white"
                            )}>
                            <p className="text-sm text-slate-700">
                              <span className="font-semibold text-slate-400 mr-1.5">{globalIdx + 1}.</span>
                              {q.text}
                            </p>
                            <LikertScale name={q.key} value={formData[q.key]} onChange={handleLikertChange} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* ── Section D: Pengalaman Kerja ── */}
          <Panel title="D. Pengalaman Kerja" Icon={HiOutlineChatBubbleLeftRight}>
            <p className="text-xs text-slate-400 -mt-2 mb-4">
              Isi dengan jujur dan konstruktif. Masukan Anda sangat berarti bagi perkembangan karyawan dan perusahaan.
            </p>
            <div className="space-y-5">
              <Field label="1. Hal apa yang paling membuat kamu kurang nyaman atau lelah secara mental selama bekerja di sini?">
                <textarea name="d1" value={formData.d1} onChange={handleChange}
                  rows={3} className={textareaCls}
                  placeholder="Ceritakan pengalamanmu..." />
              </Field>
              <Field label="2. Hal apa yang paling membuat kamu betah, senang, atau termotivasi bekerja di sini?">
                <textarea name="d2" value={formData.d2} onChange={handleChange}
                  rows={3} className={textareaCls}
                  placeholder="Ceritakan pengalamanmu..." />
              </Field>
              <Field label="3. Menurut kamu, hal apa yang paling perlu dibenahi agar bekerja di sini menjadi lebih nyaman?">
                <textarea name="d3" value={formData.d3} onChange={handleChange}
                  rows={3} className={textareaCls}
                  placeholder="Berikan saranmu..." />
              </Field>
            </div>
          </Panel>

          {/* Thank you note */}
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            <span className="font-semibold">Terima kasih atas waktu dan partisipasi kamu.</span>{" "}
            Masukan kamu akan menjadi bagian penting dalam proses perbaikan dan pengembangan perusahaan.
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-4">
            <div className="rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm shadow-lg px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          completion.pct === 100 ? "bg-emerald-500" : "bg-blue-500"
                        )}
                        style={{ width: `${completion.pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{completion.pct}%</span>
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {completion.filled}/{completion.total} terjawab
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a href="/portal"
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                    Batal
                  </a>
                  <button type="submit" disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-sm">
                    {submitting
                      ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Mengirim...</>
                      : <><FiSend className="w-4 h-4" />Kirim Survei</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}