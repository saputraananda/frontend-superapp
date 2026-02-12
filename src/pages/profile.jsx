import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import AlertSuccess from "../components/AlertSuccess";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Section({
  title,
  desc,
  isOpen,
  onToggle,
  children,
  right,
  id,
}) {
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
            {desc && <p className="mt-1 text-xs sm:text-sm text-slate-600">{desc}</p>}
          </div>
          <div className="flex items-center gap-3">
            {right}
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

function Field({
  label,
  required,
  hint,
  error,
  children,
  rightSlot,
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <label className="text-xs font-medium text-slate-700">
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </label>
        {rightSlot}
      </div>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

const baseInput =
  "w-full rounded-2xl border border-white bg-white/70 px-4 py-2.5 text-sm text-slate-700 outline-none shadow-sm transition " +
  "focus:ring-4 focus:ring-purple-200/60 focus:border-white/70 placeholder:text-slate-400";

const baseSelect =
  "w-full rounded-2xl border border-white bg-white/70 px-4 py-2.5 text-sm text-slate-700 outline-none shadow-sm transition " +
  "focus:ring-4 focus:ring-purple-200/60 focus:border-white/70";

export default function Profile() {
  const [masterData, setMasterData] = useState({});
  const [formData, setFormData] = useState({});
  const [initialData, setInitialData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [open, setOpen] = useState({
    personal: true,
    employment: true,
    financial: true,
    emergency: true,
    notes: true,
  });

  const topRef = useRef(null);

  useEffect(() => {
    document.title = "Profil | Alora Group Indonesia";
    Promise.all([api("/employees/profile"), api("/employees/master-data")])
      .then(([profileRes, masterRes]) => {
        let employee = { ...(profileRes.employee || {}) };

        ["birth_date", "join_date", "contract_end_date", "exit_date"].forEach(
          (field) => {
            if (employee[field]) employee[field] = employee[field].split("T")[0];
          }
        );

        setFormData(employee);
        setInitialData(employee);
        setMasterData(masterRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const dirty = useMemo(() => {
    try {
      return JSON.stringify(formData) !== JSON.stringify(initialData);
    } catch {
      return false;
    }
  }, [formData, initialData]);

  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.full_name?.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    // email disabled; tidak divalidasi
    if (formData.phone_number && !/^[0-9+()\-\s]{6,}$/.test(formData.phone_number))
      errs.phone_number = "Format nomor telepon terlihat tidak valid.";
    if (formData.ktp_number && formData.ktp_number.length < 10)
      errs.ktp_number = "No. KTP terlalu pendek.";
    if (formData.npwp_number && formData.npwp_number.length < 10)
      errs.npwp_number = "No. NPWP terlalu pendek.";
    return errs;
  };

  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError("Masih ada field yang perlu diperbaiki.");
      setSaving(false);
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return;
    }

    try {
      await api("/employees/profile", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setSuccess("Profil berhasil diperbarui!");
      setInitialData(formData);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } finally {
      setSaving(false);
    }
  };

  const allFieldNames = useMemo(
    () => [
      "full_name",
      "email",
      "gender",
      "birth_place",
      "birth_date",
      "phone_number",
      "address",
      "ktp_number",
      "family_card_number",
      "religion_id",
      "marital_status",
      "company_id",
      "department_id",
      "position_id",
      "employment_status_id",
      "join_date",
      "contract_end_date",
      "education_level_id",
      "school_name",
      "bank_id",
      "bank_account_number",
      "bpjs_health_number",
      "bpjs_employment_number",
      "npwp_number",
      "emergency_contact",
      "notes",
    ],
    []
  );

  const completion = useMemo(() => {
    const filled = allFieldNames.reduce((acc, k) => {
      const v = formData?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return acc + 1;
      return acc;
    }, 0);
    const total = allFieldNames.length;
    const pct = Math.round((filled / total) * 100);
    return { filled, total, pct };
  }, [formData, allFieldNames]);

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
          <p className="mt-4 text-xs text-slate-600">Loading profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100 py-10">
      {success && <AlertSuccess message={success} onClose={() => setSuccess("")} />}

      <div className="mx-auto max-w-4xl px-6" ref={topRef}>
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Profil Saya</h1>
            <p className="text-sm text-slate-600">
              Kelola informasi profil Anda •{" "}
              <span className="font-medium text-slate-700">
                {completion.filled}/{completion.total}
              </span>{" "}
              terisi
            </p>

            {/* Progress */}
            <div className="mt-3 w-full max-w-sm">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Kelengkapan profil</span>
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

          <div className="flex items-center gap-3">
            {dirty && (
              <span className="rounded-full border border-amber-200 bg-amber-50/70 px-3 py-1 text-[11px] font-medium text-amber-700">
                Perubahan belum disimpan
              </span>
            )}
            <a
              href="/portal"
              className="rounded-2xl bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white/80 transition"
            >
              ← Kembali
            </a>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="relative rounded-3xl border border-white/60 bg-white/40 p-4 sm:p-6 backdrop-blur-xl shadow-xl"
        >
          {error && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Personal Info */}
          <Section
            id="personal"
            title="Informasi Pribadi"
            desc="Data identitas dan kontak Anda."
            isOpen={open.personal}
            onToggle={() => setOpen((p) => ({ ...p, personal: !p.personal }))}
            right={
              <span className="text-[11px] text-slate-600">
                {["full_name", "gender", "birth_place", "birth_date", "phone_number", "address", "ktp_number", "family_card_number", "religion_id", "marital_status"]
                  .filter((k) => String(formData?.[k] ?? "").trim() !== "").length}
                /10
              </span>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Lengkap" required error={fieldErrors.full_name}>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ""}
                  onChange={handleChange}
                  className={cn(
                    baseInput,
                    fieldErrors.full_name && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )} placeholder="Masukkan nama lengkap"
                  required
                />
              </Field>

              <Field label="Email" required hint="Email tidak dapat diubah dari halaman ini.">
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  className={cn(
                    baseInput,
                    fieldErrors.email && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )} disabled
                />
              </Field>

              <Field label="Jenis Kelamin" hint="Pilih sesuai identitas pada dokumen.">
                <select
                  name="gender"
                  value={formData.gender || ""}
                  onChange={handleChange}
                  className={cn(
                    baseInput,
                    fieldErrors.gender && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </Field>

              <Field label="Tempat Lahir">
                <input
                  type="text"
                  name="birth_place"
                  value={formData.birth_place || ""}
                  onChange={handleChange}
                  className={cn(
                    baseInput,
                    fieldErrors.birth_place && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                  placeholder="Contoh: Jakarta"
                />
              </Field>

              <Field label="Tanggal Lahir">
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date || ""}
                  onChange={handleChange}
                  className={cn(
                    baseInput,
                    fieldErrors.full_name && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                />
              </Field>

              <Field label="No. Telepon" hint="Gunakan format angka, boleh +62." error={fieldErrors.phone_number}>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number || ""}
                  onChange={handleChange}
                  className={cn(
                    baseInput,
                    fieldErrors.phone_number && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                  placeholder="Contoh: +62 812-3456-7890"
                />
              </Field>

              <Field label="Alamat">
                <textarea
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  rows={3}
                  className={cn(
                    baseInput,
                    "resize-none",
                    fieldErrors.address && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                  placeholder="Tulis alamat lengkap"
                />
              </Field>

              <Field label="No. KTP" error={fieldErrors.ktp_number} hint="Opsional, isi jika diminta HR.">
                <input
                  type="text"
                  name="ktp_number"
                  value={formData.ktp_number || ""}
                  onChange={handleChange}
                  className={cn(
                    baseInput,
                    fieldErrors.ktp_number && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                  placeholder="Contoh: 3276xxxxxxxxxxxx"
                />
              </Field>

              <Field label="No. KK">
                <input
                  type="text"
                  name="family_card_number"
                  value={formData.family_card_number || ""}
                  onChange={handleChange}
                  className={cn(
                    baseInput,
                    fieldErrors.family_card_number && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                  placeholder="Contoh: 3276xxxxxxxxxxxx"
                />
              </Field>

              <Field label="Agama">
                <select
                  name="religion_id"
                  value={formData.religion_id || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.religion_id && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  {masterData.religions?.map((r) => (
                    <option key={r.religion_id} value={r.religion_id}>
                      {r.religion_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status Pernikahan">
                <select
                  name="marital_status"
                  value={formData.marital_status || ""}
                  onChange={handleChange}
                  className={cn(
                    baseInput,
                    fieldErrors.marital_status && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Employment Info */}
          <Section
            id="employment"
            title="Informasi Pekerjaan"
            desc="Data terkait posisi dan status kerja."
            isOpen={open.employment}
            onToggle={() => setOpen((p) => ({ ...p, employment: !p.employment }))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Perusahaan">
                <select
                  name="company_id"
                  value={formData.company_id || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.company_id && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  {masterData.companies?.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Department">
                <select
                  name="department_id"
                  value={formData.department_id || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.department_id && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  {masterData.departments?.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Posisi">
                <select
                  name="position_id"
                  value={formData.position_id || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.position_id && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  {masterData.positions?.map((p) => (
                    <option key={p.position_id} value={p.position_id}>
                      {p.position_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Jabatan">
                <select
                  name="job_level_id"
                  value={formData.job_level_id || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.job_level_id && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  {masterData.jobLevels?.map((j) => (
                    <option key={j.job_level_id} value={j.job_level_id}>
                      {j.job_level_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status Kepegawaian">
                <select
                  name="employment_status_id"
                  value={formData.employment_status_id || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.employment_status_id && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  {masterData.employmentStatuses?.map((e) => (
                    <option key={e.employment_status_id} value={e.employment_status_id}>
                      {e.employment_status_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tanggal Bergabung">
                <input
                  type="date"
                  name="join_date"
                  value={formData.join_date || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.join_date && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                />
              </Field>

              <Field label="Tanggal Akhir Kontrak" hint="Isi jika Anda kontrak.">
                <input
                  type="date"
                  name="contract_end_date"
                  value={formData.contract_end_date || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.contract_end_date && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                />
              </Field>

              <Field label="Pendidikan Terakhir">
                <select
                  name="education_level_id"
                  value={formData.education_level_id || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.education_level_id && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  {masterData.educationLevels?.map((e) => (
                    <option key={e.education_level_id} value={e.education_level_id}>
                      {e.education_level_name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Nama Sekolah/Universitas">
                  <input
                    type="text"
                    name="school_name"
                    value={formData.school_name || ""}
                    onChange={handleChange}
                    className={cn(
                      baseSelect,
                      fieldErrors.school_name && "ring-4 ring-rose-200/60",
                      "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                    )}
                    placeholder="Contoh: Universitas Indonesia"
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Financial Info */}
          <Section
            id="financial"
            title="Informasi Keuangan"
            desc="Data rekening dan identitas pajak (jika diperlukan)."
            isOpen={open.financial}
            onToggle={() => setOpen((p) => ({ ...p, financial: !p.financial }))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank">
                <select
                  name="bank_id"
                  value={formData.bank_id || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.bank_id && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                >
                  <option value="">Pilih</option>
                  {masterData.banks?.map((b) => (
                    <option key={b.bank_id} value={b.bank_id}>
                      {b.bank_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="No. Rekening" hint="Pastikan sesuai buku tabungan.">
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.bank_account_number && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                  placeholder="Contoh: 1234567890"
                />
              </Field>

              <Field label="No. BPJS Kesehatan">
                <input
                  type="text"
                  name="bpjs_health_number"
                  value={formData.bpjs_health_number || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.bpjs_health_number && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                />
              </Field>

              <Field label="No. BPJS Ketenagakerjaan">
                <input
                  type="text"
                  name="bpjs_employment_number"
                  value={formData.bpjs_employment_number || ""}
                  onChange={handleChange}
                  className={cn(
                    baseSelect,
                    fieldErrors.bpjs_employment_number && "ring-4 ring-rose-200/60",
                    "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                  )}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="No. NPWP" error={fieldErrors.npwp_number}>
                  <input
                    type="text"
                    name="npwp_number"
                    value={formData.npwp_number || ""}
                    onChange={handleChange}
                    className={cn(
                      baseSelect,
                      fieldErrors.npwp_number && "ring-4 ring-rose-200/60",
                      "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                    )}
                    placeholder="Contoh: 12.345.678.9-012.345"
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Emergency Contact */}
          <Section
            id="emergency"
            title="Kontak Darurat"
            desc="Orang yang bisa dihubungi jika terjadi keadaan darurat."
            isOpen={open.emergency}
            onToggle={() => setOpen((p) => ({ ...p, emergency: !p.emergency }))}
          >
            <Field label="Nama & No. Telepon" hint="Contoh: Bapak Deny (082198765432)">
              <input
                type="text"
                name="emergency_contact"
                value={formData.emergency_contact || ""}
                onChange={handleChange}
                placeholder="Contoh: Bapak Deny (082198765432)"
                className={cn(
                  baseSelect,
                  fieldErrors.emergency_contact && "ring-4 ring-rose-200/60",
                  "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
                )}
              />
            </Field>
          </Section>

          {/* Notes */}
          <Section
            id="notes"
            title="Catatan"
            desc="Tambahkan informasi tambahan bila perlu."
            isOpen={open.notes}
            onToggle={() => setOpen((p) => ({ ...p, notes: !p.notes }))}
          >
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              rows={4}
              className={cn(
                baseSelect,
                fieldErrors.notes && "ring-4 ring-rose-200/60",
                "shadow-[0_2px_8px_rgba(80,80,120,0.10)]"
              )} placeholder="Tambahkan catatan tambahan..."
            />
          </Section>

          {/* Sticky action bar */}
          <div className="sticky bottom-4 mt-6">
            <div className="rounded-3xl border border-white/60 bg-white/70 p-3 backdrop-blur-xl shadow-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <span className="text-xs text-slate-600">
                    Status:{" "}
                    <span className={cn("font-medium", dirty ? "text-amber-700" : "text-emerald-700")}>
                      {dirty ? "Belum disimpan" : "Tersimpan"}
                    </span>
                  </span>
                  <span className="text-xs text-slate-600">
                    Kelengkapan: <span className="font-medium text-slate-700">{completion.pct}%</span>
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
                    disabled={saving}
                    className="rounded-2xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-700 disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick jump */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
            <button type="button" onClick={() => document.getElementById("personal")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80">
              Personal
            </button>
            <button type="button" onClick={() => document.getElementById("employment")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80">
              Pekerjaan
            </button>
            <button type="button" onClick={() => document.getElementById("financial")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80">
              Keuangan
            </button>
            <button type="button" onClick={() => document.getElementById("emergency")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80">
              Darurat
            </button>
            <button type="button" onClick={() => document.getElementById("notes")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-white/60 px-3 py-1 hover:bg-white/80">
              Catatan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}