import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import AlertSuccess from "../components/AlertSuccess";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Section({ title, desc, isOpen, onToggle, children, badge, id }) {
  return (
    <section
      id={id}
      className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/50 backdrop-blur-xl shadow-lg"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-5 text-left hover:bg-white/40 transition"
        aria-expanded={isOpen}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">
              {title}
            </h2>
            {desc && (
              <p className="mt-1 text-xs sm:text-sm text-slate-600">{desc}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {badge}
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-white/60 text-slate-700 shadow-sm",
                "transition",
                isOpen ? "rotate-180" : "rotate-0"
              )}
              aria-hidden="true"
            >
              ▾
            </span>
          </div>
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-6 pb-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error && (
        <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
      )}
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

const baseInput =
  "w-full rounded-2xl border border-white bg-white/70 px-4 py-2.5 text-sm text-slate-700 outline-none shadow-sm transition " +
  "focus:ring-4 focus:ring-purple-200/60 focus:border-white/70 placeholder:text-slate-400 shadow-[0_2px_8px_rgba(80,80,120,0.20)]";

const baseSelect =
  "w-full rounded-2xl border border-white bg-white/70 px-4 py-2.5 text-sm text-slate-700 outline-none shadow-sm transition " +
  "focus:ring-4 focus:ring-purple-200/60 focus:border-white/70 shadow-[0_2px_8px_rgba(80,80,120,0.20)]";

// Likert scale questions for Section C
const likertQuestions = [
  { key: "c1", text: "Aku merasa bersemangat saat memulai hari kerja." },
  { key: "c2", text: "Pekerjaan yang aku lakukan terasa bermakna, bukan sekadar rutinitas." },
  { key: "c3", text: "Saat bekerja, aku merasa berenergi dan antusias." },
  { key: "c4", text: "Aku merasa fokus dan terlibat dengan apa yang sedang aku kerjakan." },
  { key: "c5", text: "Ada rasa bangga tersendiri dengan pekerjaan yang aku lakukan." },
  { key: "c6", text: "Secara keseluruhan, gaji yang aku terima sudah sesuai dengan kontribusiku." },
  { key: "c7", text: "Tunjangan dan fasilitas dari perusahaan mendukung kebutuhanku dengan baik." },
  { key: "c8", text: "Lingkungan kerja (baik secara fisik maupun suasana tim) terasa nyaman." },
  { key: "c9", text: "Rekan kerja di sekitarku suportif dan menyenangkan untuk diajak bekerja sama." },
  { key: "c10", text: "Atasan langsungku memberikan arahan yang jelas serta dukungan yang aku butuhkan." },
  { key: "c11", text: "Aku melihat adanya peluang untuk berkembang dan belajar di perusahaan ini." },
  { key: "c12", text: "Aku merasa memiliki keterikatan emosional dengan perusahaan ini." },
  { key: "c13", text: "Aku merasa bangga bisa menjadi bagian dari perusahaan ini." },
  { key: "c14", text: "Perusahaan ini memiliki arti penting bagiku, bukan sekadar tempat bekerja." },
  { key: "c15", text: "Saat ini, aku punya keinginan untuk tetap bekerja di perusahaan ini ke depannya." },
  { key: "c16", text: "Aku merasa punya tanggung jawab untuk ikut berkontribusi terhadap kemajuan perusahaan." },
];

const likertOptions = [
  { value: 1, label: "Sangat Tidak Setuju" },
  { value: 2, label: "Tidak Setuju" },
  { value: 3, label: "Netral" },
  { value: 4, label: "Setuju" },
  { value: 5, label: "Sangat Setuju" },
];

function LikertScale({ value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {likertOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(name, opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-xl border transition-all",
            value === opt.value
              ? "bg-purple-600 text-white border-purple-600 shadow-md"
              : "bg-white/70 text-slate-600 border-white/70 hover:bg-purple-50 hover:border-purple-200"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function EmployeeSatisfaction() {
  const [masterData, setMasterData] = useState({});
  const [surveyStatus, setSurveyStatus] = useState({ hasSubmitted: false, surveyKey: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [open, setOpen] = useState({
    info: true,
    satisfaction: true,
    aspects: true,
    feedback: true,
  });

  const [formData, setFormData] = useState({
    company_id: "",
    department_text: "",
    job_level: "",
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

  useEffect(() => {
    document.title = "Employee Satisfaction Survey | Alora Group Indonesia";
    Promise.all([
      api("/satisfaction/status"),
      api("/satisfaction/master-data"),
    ])
      .then(([statusRes, masterRes]) => {
        setSurveyStatus(statusRes);
        setMasterData(masterRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => {
        const currentFactors = prev.main_factors || [];
        if (checked) {
          return { ...prev, main_factors: [...currentFactors, value] };
        } else {
          return {
            ...prev,
            main_factors: currentFactors.filter((f) => f !== value),
          };
        }
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLikertChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const completion = useMemo(() => {
    let filled = 0;
    let total = 0;

    // Section A - Info (4 fields required)
    total += 4;
    if (formData.department_text) filled++;
    if (formData.job_level) filled++;
    if (formData.tenure) filled++;
    if (formData.overall_satisfaction) filled++;

    // Section C - Likert (16 questions)
    total += 16;
    likertQuestions.forEach((q) => {
      if (formData[q.key] !== null) filled++;
    });

    const pct = Math.round((filled / total) * 100);
    return { filled, total, pct };
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Validation
    if (!formData.department_text || !formData.job_level || !formData.tenure) {
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

    // Check if all likert questions are answered
    const unanswered = likertQuestions.filter((q) => formData[q.key] === null);
    if (unanswered.length > 0) {
      setError(`Mohon jawab semua pertanyaan penilaian aspek kerja (${unanswered.length} belum dijawab).`);
      setSubmitting(false);
      document.getElementById("aspects")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    try {
      // Prepare main_factors with "Lainnya" if filled
      let finalFactors = [...formData.main_factors];
      if (formData.main_factors_other?.trim()) {
        finalFactors.push(`Lainnya: ${formData.main_factors_other.trim()}`);
      }

      const payload = {
        ...formData,
        main_factors: finalFactors,
      };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100 flex items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white/50 p-6 backdrop-blur-xl shadow-xl">
          <div className="h-5 w-40 animate-pulse rounded bg-white/70" />
          <div className="mt-2 h-3 w-64 animate-pulse rounded bg-white/60" />
          <div className="mt-6 space-y-3">
            <div className="h-11 w-full animate-pulse rounded-2xl bg-white/70" />
            <div className="h-11 w-full animate-pulse rounded-2xl bg-white/70" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-white/70" />
          </div>
          <p className="mt-4 text-xs text-slate-600">Memuat survei...</p>
        </div>
      </div>
    );
  }

  // Already submitted
  if (surveyStatus.hasSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100 py-10">
        <div className="mx-auto max-w-2xl px-6">
          <div className="rounded-3xl border border-white/60 bg-white/50 p-8 backdrop-blur-xl shadow-xl text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-3">
              Terima Kasih!
            </h1>
            <p className="text-slate-600 mb-6">
              Anda sudah mengisi survei kepuasan karyawan untuk periode{" "}
              <span className="font-semibold text-purple-700">{surveyStatus.surveyKey}</span>.
            </p>
            <p className="text-sm text-slate-500 mb-8">
              Masukan Anda sangat berarti bagi perkembangan perusahaan. 
              Survei berikutnya akan tersedia di periode selanjutnya.
            </p>
            <a
              href="/portal"
              className="inline-block rounded-2xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-700"
            >
              Kembali ke Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100 py-10">
      {success && <AlertSuccess message={success} onClose={() => setSuccess("")} />}

      <div className="mx-auto max-w-4xl px-6" ref={topRef}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                Alora Employee Satisfaction
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Periode: <span className="font-semibold text-purple-700">{surveyStatus.surveyKey}</span>
              </p>
            </div>
            <a
              href="/portal"
              className="rounded-2xl bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white/80 transition"
            >
              ← Kembali
            </a>
          </div>

          {/* Info Banner */}
          <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50/70 p-4">
            <p className="text-sm text-purple-800">
              <strong>Head Office – PT. Waschen Alora Indonesia</strong>
            </p>
            <p className="text-xs text-purple-700 mt-1">
              Survei ini bertujuan untuk meningkatkan kualitas lingkungan kerja dan sistem manajemen. 
              Seluruh jawaban bersifat <strong>rahasia</strong>, tidak digunakan untuk penilaian individu, 
              dan akan diolah secara agregat.
            </p>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Progress pengisian</span>
              <span className="font-medium text-slate-700">{completion.pct}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/60">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{ width: `${completion.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Section A: Informasi Umum */}
          <Section
            id="info"
            title="A. Informasi Umum"
            desc="Data demografis untuk analisis agregat."
            isOpen={open.info}
            onToggle={() => setOpen((p) => ({ ...p, info: !p.info }))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Departemen / Unit Kerja" required>
                <input
                  type="text"
                  name="department_text"
                  value={formData.department_text}
                  onChange={handleChange}
                  className={baseInput}
                  placeholder="Contoh: Finance, IT, Marketing"
                />
              </Field>

              <Field label="Jabatan" required>
                <select
                  name="job_level"
                  value={formData.job_level}
                  onChange={handleChange}
                  className={baseSelect}
                >
                  <option value="">Pilih jabatan</option>
                  {masterData.jobLevels?.map((j) => (
                    <option key={j.value} value={j.value}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Masa Kerja" required>
                <select
                  name="tenure"
                  value={formData.tenure}
                  onChange={handleChange}
                  className={baseSelect}
                >
                  <option value="">Pilih masa kerja</option>
                  {masterData.tenures?.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Perusahaan" hint="Opsional">
                <select
                  name="company_id"
                  value={formData.company_id}
                  onChange={handleChange}
                  className={baseSelect}
                >
                  <option value="">Pilih perusahaan</option>
                  {masterData.companies?.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Section B: Kepuasan Kerja */}
          <Section
            id="satisfaction"
            title="B. Kepuasan Kerja"
            desc="Penilaian umum kepuasan Anda."
            isOpen={open.satisfaction}
            onToggle={() => setOpen((p) => ({ ...p, satisfaction: !p.satisfaction }))}
          >
            <div className="space-y-6">
              <Field
                label="1. Bagaimana tingkat kepuasan kerja kamu secara keseluruhan di perusahaan ini?"
                required
              >
                <div className="flex flex-wrap gap-2 mt-2">
                  {masterData.satisfactionLevels?.map((level) => (
                    <label
                      key={level.value}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer transition-all",
                        formData.overall_satisfaction === level.value
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white/70 text-slate-700 border-white/70 hover:bg-purple-50 hover:border-purple-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="overall_satisfaction"
                        value={level.value}
                        checked={formData.overall_satisfaction === level.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-sm">{level.label}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field
                label="2. Faktor utama yang paling memengaruhi tingkat kepuasan kerja kamu saat ini adalah:"
                hint="Dapat memilih lebih dari satu"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {masterData.mainFactors?.map((factor) => (
                    <label
                      key={factor.value}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-2xl border cursor-pointer transition-all",
                        formData.main_factors.includes(factor.value)
                          ? "bg-purple-100 border-purple-300"
                          : "bg-white/70 border-white/70 hover:bg-purple-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        name="main_factors"
                        value={factor.value}
                        checked={formData.main_factors.includes(factor.value)}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-700">{factor.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <input
                    type="text"
                    name="main_factors_other"
                    value={formData.main_factors_other}
                    onChange={handleChange}
                    className={baseInput}
                    placeholder="Lainnya (sebutkan)..."
                  />
                </div>
              </Field>
            </div>
          </Section>

          {/* Section C: Penilaian Aspek Kerja */}
          <Section
            id="aspects"
            title="C. Penilaian Aspek Kerja"
            desc="Berikan penilaian kamu terhadap aspek-aspek berikut."
            isOpen={open.aspects}
            onToggle={() => setOpen((p) => ({ ...p, aspects: !p.aspects }))}
            badge={
              <span className="text-[11px] text-slate-600">
                {likertQuestions.filter((q) => formData[q.key] !== null).length}/16
              </span>
            }
          >
            <div className="space-y-6">
              {likertQuestions.map((q, idx) => (
                <div
                  key={q.key}
                  className={cn(
                    "p-4 rounded-2xl transition-all",
                    formData[q.key] !== null
                      ? "bg-purple-50/50 border border-purple-100"
                      : "bg-white/40 border border-white/60"
                  )}
                >
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-purple-700">{idx + 1}.</span> {q.text}
                  </p>
                  <LikertScale
                    name={q.key}
                    value={formData[q.key]}
                    onChange={handleLikertChange}
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Section D: Pengalaman Kerja */}
          <Section
            id="feedback"
            title="D. Pengalaman Kerja"
            desc="Silakan isi dengan jujur dan konstruktif. Masukan Anda sangat berarti bagi perkembangan karyawan dan perusahaan."
            isOpen={open.feedback}
            onToggle={() => setOpen((p) => ({ ...p, feedback: !p.feedback }))}
          >
            <div className="space-y-6">
              <Field
                label="1. Hal apa sih yang paling bikin kamu kurang nyaman atau capek secara mental selama kerja di sini?"
              >
                <textarea
                  name="d1"
                  value={formData.d1}
                  onChange={handleChange}
                  rows={3}
                  className={cn(baseInput, "resize-none")}
                  placeholder="Ceritakan pengalamanmu..."
                />
              </Field>

              <Field
                label="2. Hal apa yang paling bikin kamu betah, senang, atau termotivasi kerja di sini?"
              >
                <textarea
                  name="d2"
                  value={formData.d2}
                  onChange={handleChange}
                  rows={3}
                  className={cn(baseInput, "resize-none")}
                  placeholder="Ceritakan pengalamanmu..."
                />
              </Field>

              <Field
                label="3. Menurut kamu, hal apa yang paling butuh dibenahi secepatnya supaya kerja di sini menjadi lebih nyaman?"
              >
                <textarea
                  name="d3"
                  value={formData.d3}
                  onChange={handleChange}
                  rows={3}
                  className={cn(baseInput, "resize-none")}
                  placeholder="Berikan saranmu..."
                />
              </Field>
            </div>
          </Section>

          {/* Thank you message */}
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-sm text-emerald-800 font-medium">
              Terima kasih atas waktu dan partisipasi kamu.
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Masukan kamu akan menjadi bagian penting dalam proses perbaikan dan pengembangan perusahaan.
            </p>
          </div>

          {/* Sticky Submit Button */}
          <div className="sticky bottom-4">
            <div className="rounded-3xl border border-white/60 bg-white/70 p-4 backdrop-blur-xl shadow-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-600">
                    Progress: <span className="font-medium text-slate-700">{completion.pct}%</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {completion.filled}/{completion.total} pertanyaan dijawab
                  </span>
                </div>
                <div className="flex justify-end gap-3">
                  <a
                    href="/portal"
                    className="rounded-2xl bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-white transition"
                  >
                    Batal
                  </a>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-700 disabled:opacity-60"
                  >
                    {submitting ? "Mengirim..." : "Kirim Survei"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick navigation */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
            <button
              type="button"
              onClick={() => document.getElementById("info")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80"
            >
              Info Umum
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("satisfaction")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80"
            >
              Kepuasan
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("aspects")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80"
            >
              Aspek Kerja
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80"
            >
              Pengalaman
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}