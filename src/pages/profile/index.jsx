import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import AlertSuccess from "../../components/AlertSuccess";
import { Link } from "react-router-dom";
import LoadingScreen from "../../components/LoadingScreen";
import PhotoUpload from "./components/PhotoUpload";
import {
  HiOutlinePhoto,
  HiOutlineUser,
  HiOutlineBriefcase,
  HiOutlineBanknotes,
  HiOutlinePhone,
  HiOutlineDocumentText,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineArrowLeft,
} from "react-icons/hi2";
import { FiSave } from "react-icons/fi";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const TABS = [
  { id: "personal", label: "Data Pribadi", Icon: HiOutlineUser },
  { id: "employment", label: "Data Pekerjaan", Icon: HiOutlineBriefcase },
  { id: "financial", label: "Data Keuangan", Icon: HiOutlineBanknotes },
  { id: "emergency", label: "Kontak Darurat", Icon: HiOutlinePhone },
  { id: "photos", label: "Unggah Dokumen", Icon: HiOutlinePhoto },
  { id: "notes", label: "Catatan", Icon: HiOutlineDocumentText },
];

function Field({ label, required, hint, error, children, colSpan }) {
  return (
    <div className={cn(colSpan === 2 && "sm:col-span-2")}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1">
          <HiOutlineExclamationCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (err) => cn(
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800",
  "outline-none transition-all duration-150 placeholder:text-slate-300",
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
  err ? "border-rose-300 ring-2 ring-rose-200/50" : "border-slate-200 hover:border-slate-300"
);

const selectCls = (err) => cn(
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800",
  "outline-none transition-all duration-150 cursor-pointer",
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
  err ? "border-rose-300 ring-2 ring-rose-200/50" : "border-slate-200 hover:border-slate-300"
);

function Panel({ title, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-slate-100" />
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{title}</h3>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ pct }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Badge({ filled }) {
  if (filled) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      <HiOutlineCheckCircle className="w-3 h-3" />
      Lengkap
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
      <HiOutlineExclamationCircle className="w-3 h-3" />
      Belum diisi
    </span>
  );
}

export default function Profile() {
  const [masterData, setMasterData] = useState({});
  const [formData, setFormData] = useState({});
  const [initialData, setInitialData] = useState({});
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState("personal");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profilePhoto, setProfilePhoto] = useState({ path: null, name: null });
  const [ktpPhoto, setKtpPhoto] = useState({ path: null, name: null });
  const topRef = useRef(null);

  useEffect(() => {
    document.title = "Profil Karyawan | Alora Group Indonesia";
    const loadData = async () => {
      try {
        const [profileRes, masterRes] = await Promise.all([
          api("/employees/profile"),
          api("/employees/master-data"),
        ]);
        let employee = { ...(profileRes.employee || {}) };
        ["birth_date", "join_date", "contract_end_date", "exit_date"].forEach((f) => {
          if (employee[f]) employee[f] = employee[f].split("T")[0];
        });
        setProfilePhoto({ path: employee.profile_path || null, name: employee.profile_name || null });
        setKtpPhoto({ path: employee.ktp_path || null, name: employee.ktp_name || null });
        setFormData(employee);
        setInitialData(employee);
        setMasterData(masterRes);
        setDataReady(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const dirty = useMemo(() => {
    try { return JSON.stringify(formData) !== JSON.stringify(initialData); } catch { return false; }
  }, [formData, initialData]);

  useEffect(() => {
    const h = (e) => { if (!dirty) return; e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.full_name?.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    if (formData.phone_number && !/^[0-9+()\-\s]{6,}$/.test(formData.phone_number))
      errs.phone_number = "Format nomor telepon tidak valid.";
    if (formData.ktp_number && formData.ktp_number.length < 10)
      errs.ktp_number = "No. KTP terlalu pendek.";
    if (formData.npwp_number && formData.npwp_number.length < 10)
      errs.npwp_number = "No. NPWP terlalu pendek.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError("Masih ada field yang kosong / tidak valid.");
      setSaving(false);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    try {
      await api("/employees/profile", { method: "PUT", body: JSON.stringify(formData) });
      setSuccess("Profil berhasil diperbarui.");
      setInitialData(formData);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setSaving(false);
    }
  };

  const ALL_FIELDS = useMemo(() => [
    "full_name", "email", "gender", "birth_place", "birth_date", "phone_number",
    "address", "ktp_number", "family_card_number", "religion_id", "marital_status",
    "company_id", "department_id", "position_id", "employment_status_id", "join_date",
    "contract_end_date", "education_level_id", "school_name", "bank_id",
    "bank_account_number", "bpjs_health_number", "bpjs_employment_number",
    "npwp_number", "emergency_contact", "notes", "profile_path", "ktp_path",
  ], []);

  const completion = useMemo(() => {
    const combined = { ...formData, profile_path: profilePhoto.path, ktp_path: ktpPhoto.path };
    const filled = ALL_FIELDS.filter((k) => String(combined[k] ?? "").trim() !== "").length;
    return { filled, total: ALL_FIELDS.length, pct: Math.round((filled / ALL_FIELDS.length) * 100) };
  }, [formData, ALL_FIELDS, profilePhoto, ktpPhoto]);

  const tabCompletion = useMemo(() => {
    const combined = { ...formData, profile_path: profilePhoto.path, ktp_path: ktpPhoto.path };
    const check = (keys) => keys.every((k) => String(combined[k] ?? "").trim() !== "");
    return {
      photos: check(["profile_path", "ktp_path"]),
      personal: check(["full_name", "gender", "birth_date", "phone_number", "address", "ktp_number"]),
      employment: check(["company_id", "department_id", "position_id", "join_date"]),
      financial: check(["bank_id", "bank_account_number"]),
      emergency: check(["emergency_contact"]),
      notes: check(["notes"]),
    };
  }, [formData, profilePhoto, ktpPhoto]);

  const handleTabChange = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading || !dataReady) return <LoadingScreen />;

  const activeTabObj = TABS.find((t) => t.id === activeTab);
  const activeTabIdx = TABS.findIndex((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#f4f6f9]" ref={topRef}>
      {success && <AlertSuccess message={success} onClose={() => setSuccess("")} />}

      {/* ── TOP BANNER ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div className="flex items-center gap-3">
              {/* Hamburger mobile */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 transition border border-slate-200 shrink-0"
              >
                <HiOutlineBars3 className="h-5 w-5 text-slate-600" />
              </button>

              <a href="/portal" className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition shrink-0">
                <HiOutlineArrowLeft className="w-4 h-4" />
              </a>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                  <a href="/portal" className="hover:text-blue-600 transition">Portal</a>
                  <span>/</span>
                  <span className="text-slate-600 font-medium">Profil Karyawan</span>
                </div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
                  Data Karyawan
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formData.full_name || "—"}
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="text-slate-400">{formData.email}</span>
                </p>
              </div>
            </div>

            {/* Completion */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="min-w-[160px] sm:min-w-[200px]">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Kelengkapan Profil</span>
                  <span className={cn(
                    "font-bold text-sm",
                    completion.pct >= 80 ? "text-emerald-600" :
                      completion.pct >= 50 ? "text-blue-600" : "text-amber-600"
                  )}>{completion.pct}%</span>
                </div>
                <ProgressBar pct={completion.pct} />
                <p className="text-[10px] text-slate-400 mt-1">
                  {completion.filled} dari {completion.total} field terisi
                </p>
              </div>

              {dirty && (
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Belum disimpan
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-5">
        <form onSubmit={handleSubmit}>

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <HiOutlineExclamationTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError("")} className="text-rose-400 hover:text-rose-600 transition">
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dirty warning mobile */}
          {dirty && (
            <div className="sm:hidden mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              Ada perubahan yang belum disimpan
            </div>
          )}

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-40 flex">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
              <div className="relative z-50 w-64 bg-white h-full shadow-2xl flex flex-col p-4 gap-1">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-700">Menu Profil</h2>
                  <button type="button" onClick={() => setSidebarOpen(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition">
                    <HiOutlineXMark className="w-4 h-4" />
                  </button>
                </div>

                {TABS.map(({ id, label, Icon }) => (
                  <button key={id} type="button" onClick={() => handleTabChange(id)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-left w-full transition-all",
                      activeTab === id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    )}>
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </span>
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      tabCompletion[id] ? "bg-emerald-400" : "bg-slate-300"
                    )} />
                  </button>
                ))}

                <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
                  <button type="submit" disabled={saving || !dirty}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                      dirty ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}>
                    <FiSave className="w-4 h-4" />
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                  <Link to="/portal"
                    className="flex items-center justify-center gap-1.5 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition border border-slate-200">
                    <HiOutlineArrowLeft className="w-4 h-4" />
                    Kembali
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-5">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0 gap-3 self-start sticky top-6">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 space-y-1">
                {TABS.map(({ id, label, Icon }) => (
                  <button key={id} type="button" onClick={() => handleTabChange(id)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-left w-full transition-all",
                      activeTab === id
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    )}>
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </span>
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      tabCompletion[id] ? "bg-emerald-400" : "bg-slate-300"
                    )} />
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 space-y-2">
                <button type="submit" disabled={saving || !dirty}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                    dirty
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}>
                  {saving
                    ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Menyimpan...</>
                    : <><FiSave className="w-4 h-4" />Simpan Perubahan</>
                  }
                </button>
                <Link to="/portal"
                  className="flex items-center justify-center gap-1.5 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition border border-slate-200">
                  <HiOutlineArrowLeft className="w-4 h-4" />
                  Kembali
                </Link>
              </div>
            </aside>

            {/* Content Panel */}
            <main className="flex-1 min-w-0">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {/* Panel Header */}
                <div className="border-b border-slate-100 bg-slate-50 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {activeTabObj && (
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-600 text-white shrink-0">
                        <activeTabObj.Icon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-800 truncate">{activeTabObj?.label}</h2>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {activeTab === "photos" && "Upload pas foto dan foto KTP Anda."}
                        {activeTab === "personal" && "Informasi identitas dan kontak."}
                        {activeTab === "employment" && "Data posisi, jabatan, dan masa kerja."}
                        {activeTab === "financial" && "Rekening bank, BPJS, dan NPWP."}
                        {activeTab === "emergency" && "Kontak yang bisa dihubungi saat darurat."}
                        {activeTab === "notes" && "Catatan pengalaman kerja sebelumnya."}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Badge filled={tabCompletion[activeTab]} />
                  </div>
                </div>

                {/* Panel Body */}
                <div className="px-4 sm:px-6 py-5 sm:py-6">

                  {/* TAB: FOTO */}
                  {activeTab === "photos" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {[
                        {
                          label: "Pas Foto",
                          desc: "Foto formal, latar belakang polos. Maks. 5 MB (JPG/PNG/WEBP).",
                          photo: profilePhoto,
                          type: "profile",
                          onUploaded: ({ path, name }) => { setProfilePhoto({ path, name }); setSuccess("Pas foto berhasil diupload."); setTimeout(() => setSuccess(""), 3000); },
                          onDeleted: () => { setProfilePhoto({ path: null, name: null }); setSuccess("Pas foto berhasil dihapus."); setTimeout(() => setSuccess(""), 3000); },
                        },
                        {
                          label: "Foto KTP",
                          desc: "Foto KTP terlihat jelas. Maks. 5 MB (JPG/PNG/WEBP).",
                          photo: ktpPhoto,
                          type: "ktp",
                          onUploaded: ({ path, name }) => { setKtpPhoto({ path, name }); setSuccess("Foto KTP berhasil diupload."); setTimeout(() => setSuccess(""), 3000); },
                          onDeleted: () => { setKtpPhoto({ path: null, name: null }); setSuccess("Foto KTP berhasil dihapus."); setTimeout(() => setSuccess(""), 3000); },
                        },
                      ].map(({ label, desc, photo, type, onUploaded, onDeleted }) => (
                        <div key={type} className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-6 flex flex-col items-center gap-3 text-center">
                          <div className="w-full flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</p>
                            <Badge filled={!!photo.path} />
                          </div>
                          <p className="text-[11px] text-slate-400">{desc}</p>
                          <PhotoUpload
                            type={type}
                            currentPath={photo.path}
                            currentName={photo.name}
                            onUploaded={onUploaded}
                            onDeleted={onDeleted}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB: PERSONAL */}
                  {activeTab === "personal" && (
                    <div className="space-y-6">
                      <Panel title="Identitas Diri">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="Nama Lengkap" required error={fieldErrors.full_name}>
                            <input type="text" name="full_name" value={formData.full_name || ""} onChange={handleChange}
                              className={inputCls(fieldErrors.full_name)} placeholder="Masukkan nama lengkap" />
                          </Field>
                          <Field label="Email">
                            <input type="email" value={formData.email || ""}
                              className={cn(inputCls(false), "bg-slate-50 text-slate-400 cursor-not-allowed")} disabled />
                          </Field>
                          <Field label="Jenis Kelamin">
                            <select name="gender" value={formData.gender || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              <option value="L">Laki-laki</option>
                              <option value="P">Perempuan</option>
                            </select>
                          </Field>
                          <Field label="Status Pernikahan">
                            <select name="marital_status" value={formData.marital_status || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              <option value="Single">Single</option>
                              <option value="Married">Menikah</option>
                              <option value="Divorced">Cerai</option>
                              <option value="Widowed">Duda/Janda</option>
                            </select>
                          </Field>
                          <Field label="Tempat Lahir">
                            <input type="text" name="birth_place" value={formData.birth_place || ""} onChange={handleChange}
                              className={inputCls(false)} placeholder="Contoh: Jakarta" />
                          </Field>
                          <Field label="Tanggal Lahir">
                            <input type="date" name="birth_date" value={formData.birth_date || ""} onChange={handleChange}
                              className={inputCls(false)} />
                          </Field>
                          <Field label="Agama">
                            <select name="religion_id" value={formData.religion_id || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              {masterData.religions?.map((r) => (
                                <option key={r.religion_id} value={r.religion_id}>{r.religion_name}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="No. Telepon" error={fieldErrors.phone_number}>
                            <input type="text" name="phone_number" value={formData.phone_number || ""} onChange={handleChange}
                              className={inputCls(fieldErrors.phone_number)} placeholder="+62 812-3456-7890" />
                          </Field>
                        </div>
                      </Panel>

                      <Panel title="Dokumen Identitas">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="No. KTP" error={fieldErrors.ktp_number}>
                            <input type="text" name="ktp_number" autoComplete="off" value={formData.ktp_number || ""} onChange={handleChange}
                              className={inputCls(fieldErrors.ktp_number)} placeholder="16 digit NIK" />
                          </Field>
                          <Field label="No. Kartu Keluarga">
                            <input type="text" name="family_card_number" value={formData.family_card_number || ""} onChange={handleChange}
                              className={inputCls(false)} placeholder="16 digit No. KK" />
                          </Field>
                          <div className="sm:col-span-2 xl:col-span-3">
                            <Field label="Alamat Lengkap">
                              <textarea name="address" rows={3} value={formData.address || ""} onChange={handleChange}
                                className={cn(inputCls(false), "resize-none")} placeholder="Alamat sesuai KTP" />
                            </Field>
                          </div>
                        </div>
                      </Panel>
                    </div>
                  )}

                  {/* TAB: EMPLOYMENT */}
                  {activeTab === "employment" && (
                    <div className="space-y-6">
                      <Panel title="Informasi Jabatan">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="Perusahaan">
                            <select name="company_id" value={formData.company_id || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              {masterData.companies?.map((c) => (
                                <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Departemen">
                            <select name="department_id" value={formData.department_id || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              {masterData.departments?.map((d) => (
                                <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Posisi / Jabatan">
                            <select name="position_id" value={formData.position_id || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              {masterData.positions?.map((p) => (
                                <option key={p.position_id} value={p.position_id}>{p.position_name}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Level Jabatan">
                            <select name="job_level_id" value={formData.job_level_id || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              {masterData.jobLevels?.map((j) => (
                                <option key={j.job_level_id} value={j.job_level_id}>{j.job_level_name}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Status Kepegawaian">
                            <select name="employment_status_id" value={formData.employment_status_id || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              {masterData.employmentStatuses?.map((e) => (
                                <option key={e.employment_status_id} value={e.employment_status_id}>{e.employment_status_name}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Tanggal Bergabung">
                            <input type="date" name="join_date" value={formData.join_date || ""} onChange={handleChange}
                              className={inputCls(false)} />
                          </Field>
                          <Field label="Tanggal Akhir Kontrak" hint="Kosongkan jika karyawan tetap.">
                            <input type="date" name="contract_end_date" value={formData.contract_end_date || ""} onChange={handleChange}
                              className={inputCls(false)} />
                          </Field>
                        </div>
                      </Panel>

                      <Panel title="Riwayat Pendidikan">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <Field label="Pendidikan Terakhir">
                            <select name="education_level_id" value={formData.education_level_id || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih —</option>
                              {masterData.educationLevels?.map((e) => (
                                <option key={e.education_level_id} value={e.education_level_id}>{e.education_level_name}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Nama Institusi">
                            <input type="text" name="school_name" value={formData.school_name || ""} onChange={handleChange}
                              className={inputCls(false)} placeholder="Universitas / Sekolah" />
                          </Field>
                        </div>
                      </Panel>
                    </div>
                  )}

                  {/* TAB: FINANCIAL */}
                  {activeTab === "financial" && (
                    <div className="space-y-6">
                      <Panel title="Informasi Rekening">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <Field label="Bank">
                            <select name="bank_id" value={formData.bank_id || ""} onChange={handleChange} className={selectCls(false)}>
                              <option value="">— Pilih Bank —</option>
                              {masterData.banks?.map((b) => (
                                <option key={b.bank_id} value={b.bank_id}>{b.bank_name}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Nomor Rekening">
                            <input type="text" name="bank_account_number" autoComplete="off" value={formData.bank_account_number || ""} onChange={handleChange}
                              className={inputCls(false)} placeholder="Nomor rekening aktif" />
                          </Field>
                        </div>
                      </Panel>

                      <Panel title="Identitas Perpajakan & Jaminan">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="No. BPJS Kesehatan">
                            <input type="text" name="bpjs_health_number" autoComplete="off" value={formData.bpjs_health_number || ""} onChange={handleChange}
                              className={inputCls(false)} placeholder="13 digit" />
                          </Field>
                          <Field label="No. BPJS Ketenagakerjaan">
                            <input type="text" name="bpjs_employment_number" autoComplete="off" value={formData.bpjs_employment_number || ""} onChange={handleChange}
                              className={inputCls(false)} placeholder="11 digit" />
                          </Field>
                          <Field label="No. NPWP" error={fieldErrors.npwp_number}>
                            <input type="text" name="npwp_number" autoComplete="off" value={formData.npwp_number || ""} onChange={handleChange}
                              className={inputCls(fieldErrors.npwp_number)} placeholder="12.345.678.9-012.345" />
                          </Field>
                        </div>
                      </Panel>
                    </div>
                  )}

                  {/* TAB: EMERGENCY */}
                  {activeTab === "emergency" && (
                    <Panel title="Kontak Darurat">
                      <div className="max-w-lg">
                        <Field label="Nama & Nomor Telepon">
                          <input type="text" name="emergency_contact" value={formData.emergency_contact || ""} onChange={handleChange}
                            className={inputCls(false)} placeholder="Contoh: Bapak Deny — 082198765432" />
                        </Field>
                        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                          Berikan nama lengkap dan nomor telepon yang dapat dihubungi saat darurat.
                        </p>
                      </div>
                    </Panel>
                  )}

                  {/* TAB: NOTES */}
                  {activeTab === "notes" && (
                    <Panel title="Catatan Pengalaman Kerja">
                      <Field label="Riwayat Pekerjaan Sebelumnya">
                        <textarea name="notes" rows={8} value={formData.notes || ""} onChange={handleChange}
                          className={cn(inputCls(false), "resize-y")}
                          placeholder="Jelaskan pengalaman kerja Anda sebelumnya: Departemen, Jobdesk, Masa Kerja, dan hal-hal relevan." />
                      </Field>
                    </Panel>
                  )}

                </div>

                {/* Panel Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex gap-2">
                      {activeTabIdx > 0 && (
                        <button type="button"
                          onClick={() => handleTabChange(TABS[activeTabIdx - 1].id)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                          <HiOutlineChevronLeft className="w-4 h-4" />
                          Sebelumnya
                        </button>
                      )}
                      {activeTabIdx < TABS.length - 1 && (
                        <button type="button"
                          onClick={() => handleTabChange(TABS[activeTabIdx + 1].id)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition">
                          Berikutnya
                          <HiOutlineChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button type="submit" disabled={saving || !dirty}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all w-full sm:w-auto",
                        dirty
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}>
                      {saving
                        ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Menyimpan...</>
                        : <><FiSave className="w-4 h-4" />Simpan Perubahan</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </form>
      </div>
    </div>
  );
}