import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, assetUrl } from "../../lib/api";
import LoadingScreen from "../../components/LoadingScreen";
import AlertSuccess from "../../components/AlertSuccess";
import {
  HiOutlineUser, HiOutlineBriefcase, HiOutlineBanknotes,
  HiOutlinePhone, HiOutlineDocumentText, HiOutlinePhoto,
  HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineArrowLeft, HiOutlineExclamationTriangle,
  HiOutlineXMark, HiOutlineCheckCircle, HiOutlineExclamationCircle,
  HiOutlineArrowTopRightOnSquare, HiOutlineArrowDownTray,
} from "react-icons/hi2";
import { FiSave } from "react-icons/fi";

function cn(...c) { return c.filter(Boolean).join(" "); }

// ── PhotoCard — pakai assetUrl dari lib/api ────────────────────────────────
function PhotoCard({ label, filePath, fileName }) {
  const url = assetUrl(filePath);
  const [imgError, setImgError] = useState(false);

  const handleDownload = async () => {
    if (!url) return;
    try {
      const res  = await fetch(url, { credentials: "include" });
      const blob = await res.blob();
      const a    = document.createElement("a");
      a.href     = URL.createObjectURL(blob);
      a.download = fileName || url.split("/").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</p>
        {url ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <HiOutlineCheckCircle className="w-3 h-3 mr-1" />Tersedia
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            Belum diupload
          </span>
        )}
      </div>

      {fileName && (
        <p className="text-[11px] text-slate-400 -mt-2 truncate" title={fileName}>{fileName}</p>
      )}

      {url && !imgError ? (
        <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center min-h-[10rem]">
          <img
            src={url}
            alt={label}
            className="w-full max-h-64 object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : url && imgError ? (
        <div className="h-40 w-full rounded-lg border border-dashed border-rose-200 bg-rose-50 flex flex-col items-center justify-center gap-2">
          <HiOutlineExclamationTriangle className="w-7 h-7 text-rose-300" />
          <p className="text-xs text-rose-400">Gagal memuat gambar</p>
          <p className="text-[10px] text-rose-300 max-w-[80%] text-center truncate">{url}</p>
        </div>
      ) : (
        <div className="h-40 w-full rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2">
          <HiOutlinePhoto className="w-8 h-8 text-slate-300" />
          <p className="text-xs text-slate-400">Belum ada foto</p>
        </div>
      )}

      {url && (
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
            <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
            Buka Tab Baru
          </a>
          <button type="button" onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition">
            <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      )}
    </div>
  );
}

// ── Konstanta & helper kecil ───────────────────────────────────────────────
const TABS = [
  { id: "personal",   label: "Data Pribadi",   Icon: HiOutlineUser          },
  { id: "employment", label: "Data Pekerjaan", Icon: HiOutlineBriefcase     },
  { id: "financial",  label: "Data Keuangan",  Icon: HiOutlineBanknotes     },
  { id: "emergency",  label: "Kontak Darurat", Icon: HiOutlinePhone         },
  { id: "docs",       label: "Dokumen",        Icon: HiOutlinePhoto         },
  { id: "notes",      label: "Catatan",        Icon: HiOutlineDocumentText  },
];

const inputCls = (err) => cn(
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800",
  "outline-none transition-all placeholder:text-slate-300",
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
  err ? "border-rose-300 ring-2 ring-rose-200/50" : "border-slate-200 hover:border-slate-300"
);
const selectCls = () => cn(
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
  "outline-none transition-all cursor-pointer hover:border-slate-300",
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
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
          <HiOutlineExclamationCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-slate-100" />
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{title}</h3>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function EmployeeDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [employee, setEmployee]       = useState(null);
  const [formData, setFormData]       = useState({});
  const [initialData, setInitialData] = useState({});
  const [masterData, setMasterData]   = useState({});
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [success, setSuccess]         = useState("");
  const [error, setError]             = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab]     = useState("personal");

  const [showResignModal, setShowResignModal] = useState(false);
  const [resignDate, setResignDate]           = useState("");
  const [resignReason, setResignReason]       = useState("");
  const [resignSaving, setResignSaving]       = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, masterRes] = await Promise.all([
          api(`/hr/employees/${id}`),
          api("/employees/master-data"),
        ]);
        const emp = { ...(empRes.employee || {}) };
        ["birth_date","join_date","contract_end_date","exit_date"].forEach((f) => {
          if (emp[f]) emp[f] = emp[f].split("T")[0];
        });
        setEmployee(empRes.employee);
        setFormData(emp);
        setInitialData(emp);
        setMasterData(masterRes);
        document.title = `${emp.full_name ?? "Karyawan"} | Master Karyawan`;
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const dirty = useMemo(() => {
    try { return JSON.stringify(formData) !== JSON.stringify(initialData); } catch { return false; }
  }, [formData, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name?.trim()) {
      setFieldErrors({ full_name: "Nama wajib diisi." });
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(`/hr/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setSuccess("Data karyawan berhasil disimpan.");
      setInitialData(formData);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResign = async () => {
    if (!resignDate) return;
    setResignSaving(true);
    try {
      await api(`/hr/employees/${id}/resign`, {
        method: "POST",
        body: JSON.stringify({ exit_date: resignDate, exit_reason: resignReason }),
      });
      setSuccess("Status karyawan berhasil diperbarui.");
      setFormData((p) => ({ ...p, exit_date: resignDate, exit_reason: resignReason }));
      setInitialData((p) => ({ ...p, exit_date: resignDate, exit_reason: resignReason }));
      setShowResignModal(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setResignSaving(false);
    }
  };

  const activeTabIdx = TABS.findIndex((t) => t.id === activeTab);
  const activeTabObj = TABS.find((t) => t.id === activeTab);

  if (loading) return <LoadingScreen />;

  const isResigned = !!formData.exit_date;

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      {success && <AlertSuccess message={success} onClose={() => setSuccess("")} />}

      {/* ── Resign Modal ── */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResignModal(false)} />
          <div className="relative z-50 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Tandai Keluar / Resign</h2>
              <button onClick={() => setShowResignModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Tanggal Keluar" required>
                <input type="date" value={resignDate} onChange={(e) => setResignDate(e.target.value)} className={inputCls(false)} />
              </Field>
              <Field label="Alasan Keluar">
                <textarea rows={3} value={resignReason} onChange={(e) => setResignReason(e.target.value)}
                  className={cn(inputCls(false), "resize-none")}
                  placeholder="Mengundurkan diri, PHK, kontrak habis, dll." />
              </Field>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowResignModal(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Batal
              </button>
              <button disabled={!resignDate || resignSaving} onClick={handleResign}
                className="flex-1 rounded-lg bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition">
                {resignSaving ? "Menyimpan..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Banner ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/master-karyawan")}
                className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 transition shrink-0">
                <HiOutlineArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                  <button onClick={() => navigate("/portal")} className="hover:text-blue-600 transition">Portal</button>
                  <span>/</span>
                  <button onClick={() => navigate("/master-karyawan")} className="hover:text-blue-600 transition">Master Karyawan</button>
                  <span>/</span>
                  <span className="text-slate-600 font-medium truncate max-w-[160px]">{formData.full_name ?? "Detail"}</span>
                </div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">{formData.full_name ?? "—"}</h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-400">{formData.email}</span>
                  {isResigned ? (
                    <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                      Keluar · {formData.exit_date}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <HiOutlineCheckCircle className="w-3 h-3 mr-1" />Aktif
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isResigned && (
                <button type="button" onClick={() => setShowResignModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 transition">
                  <HiOutlineExclamationTriangle className="w-4 h-4" />
                  Tandai Keluar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-5">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <HiOutlineExclamationTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError("")}><HiOutlineXMark className="w-4 h-4" /></button>
            </div>
          )}

          <div className="flex gap-5">
            {/* ── Sidebar ── */}
            <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0 gap-3 self-start sticky top-6">
              {/* Foto profil di sidebar */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col items-center gap-3">
                {employee?.profile_path ? (
                  <img
                    src={assetUrl(employee.profile_path)}
                    alt={employee.full_name}
                    className="h-20 w-20 rounded-full object-cover border-2 border-slate-200"
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                ) : null}
                <div className={`h-20 w-20 rounded-full bg-slate-100 border-2 border-slate-200 items-center justify-center ${employee?.profile_path ? "hidden" : "flex"}`}>
                  <HiOutlineUser className="w-8 h-8 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800 leading-tight">{employee?.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{employee?.position_name ?? "—"}</p>
                </div>
              </div>

              {/* Tab list */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 space-y-1">
                {TABS.map(({ id: tid, label, Icon }) => (
                  <button key={tid} type="button" onClick={() => setActiveTab(tid)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-left w-full transition-all",
                      activeTab === tid
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    )}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Simpan */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3">
                <button type="submit" disabled={saving || !dirty}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                    dirty ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}>
                  {saving
                    ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Menyimpan...</>
                    : <><FiSave className="w-4 h-4" />Simpan Perubahan</>
                  }
                </button>
              </div>

              {/* Info singkat */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider">Info</p>
                <div className="space-y-1.5 text-slate-600">
                  {[
                    ["Cabang",    employee?.company_name],
                    ["Dept.",     employee?.department_name],
                    ["Jabatan",   employee?.position_name],
                    ["Bergabung", formData.join_date],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-slate-400 shrink-0">{k}</span>
                      <span className="font-medium truncate text-right">{v ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* ── Content ── */}
            <main className="flex-1 min-w-0">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {/* Header */}
                <div className="border-b border-slate-100 bg-slate-50 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {activeTabObj && (
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-600 text-white shrink-0">
                        <activeTabObj.Icon className="w-4 h-4" />
                      </div>
                    )}
                    <h2 className="text-base font-bold text-slate-800">{activeTabObj?.label}</h2>
                  </div>
                  {dirty && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Belum disimpan
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">

                  {/* ── PERSONAL ── */}
                  {activeTab === "personal" && (
                    <>
                      <Panel title="Identitas Diri">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="Nama Lengkap" required error={fieldErrors.full_name}>
                            <input type="text" name="full_name" value={formData.full_name || ""} onChange={handleChange} className={inputCls(fieldErrors.full_name)} />
                          </Field>
                          <Field label="Email">
                            <input type="email" value={formData.email || ""} className={cn(inputCls(false), "bg-slate-50 text-slate-400 cursor-not-allowed")} disabled />
                          </Field>
                          <Field label="Jenis Kelamin">
                            <select name="gender" value={formData.gender || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              <option value="L">Laki-laki</option>
                              <option value="P">Perempuan</option>
                            </select>
                          </Field>
                          <Field label="Status Pernikahan">
                            <select name="marital_status" value={formData.marital_status || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              <option value="Single">Single</option>
                              <option value="Married">Menikah</option>
                              <option value="Divorced">Cerai</option>
                              <option value="Widowed">Duda/Janda</option>
                            </select>
                          </Field>
                          <Field label="Tempat Lahir">
                            <input type="text" name="birth_place" value={formData.birth_place || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                          <Field label="Tanggal Lahir">
                            <input type="date" name="birth_date" value={formData.birth_date || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                          <Field label="Agama">
                            <select name="religion_id" value={formData.religion_id || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              {masterData.religions?.map((r) => <option key={r.religion_id} value={r.religion_id}>{r.religion_name}</option>)}
                            </select>
                          </Field>
                          <Field label="No. Telepon">
                            <input type="text" name="phone_number" value={formData.phone_number || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                        </div>
                      </Panel>
                      <Panel title="Dokumen Identitas">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="No. KTP">
                            <input type="text" name="ktp_number" autoComplete="off" value={formData.ktp_number || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                          <Field label="No. Kartu Keluarga">
                            <input type="text" name="family_card_number" value={formData.family_card_number || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                          <div className="sm:col-span-2 xl:col-span-3">
                            <Field label="Alamat Lengkap">
                              <textarea name="address" rows={3} value={formData.address || ""} onChange={handleChange} className={cn(inputCls(false), "resize-none")} />
                            </Field>
                          </div>
                        </div>
                      </Panel>
                    </>
                  )}

                  {/* ── EMPLOYMENT ── */}
                  {activeTab === "employment" && (
                    <>
                      <Panel title="Informasi Jabatan">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="Perusahaan">
                            <select name="company_id" value={formData.company_id || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              {masterData.companies?.map((c) => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
                            </select>
                          </Field>
                          <Field label="Departemen">
                            <select name="department_id" value={formData.department_id || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              {masterData.departments?.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                            </select>
                          </Field>
                          <Field label="Posisi">
                            <select name="position_id" value={formData.position_id || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              {masterData.positions?.map((p) => <option key={p.position_id} value={p.position_id}>{p.position_name}</option>)}
                            </select>
                          </Field>
                          <Field label="Level Jabatan">
                            <select name="job_level_id" value={formData.job_level_id || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              {masterData.jobLevels?.map((j) => <option key={j.job_level_id} value={j.job_level_id}>{j.job_level_name}</option>)}
                            </select>
                          </Field>
                          <Field label="Status Kepegawaian">
                            <select name="employment_status_id" value={formData.employment_status_id || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              {masterData.employmentStatuses?.map((e) => <option key={e.employment_status_id} value={e.employment_status_id}>{e.employment_status_name}</option>)}
                            </select>
                          </Field>
                          <Field label="Tanggal Bergabung">
                            <input type="date" name="join_date" value={formData.join_date || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                          <Field label="Tanggal Akhir Kontrak" hint="Kosongkan jika karyawan tetap.">
                            <input type="date" name="contract_end_date" value={formData.contract_end_date || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                        </div>
                      </Panel>
                      <Panel title="Riwayat Pendidikan">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <Field label="Pendidikan Terakhir">
                            <select name="education_level_id" value={formData.education_level_id || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih —</option>
                              {masterData.educationLevels?.map((e) => <option key={e.education_level_id} value={e.education_level_id}>{e.education_level_name}</option>)}
                            </select>
                          </Field>
                          <Field label="Nama Institusi">
                            <input type="text" name="school_name" value={formData.school_name || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                        </div>
                      </Panel>
                      {isResigned && (
                        <Panel title="Data Keluar">
                          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                            <Field label="Tanggal Keluar">
                              <input type="date" name="exit_date" value={formData.exit_date || ""} onChange={handleChange} className={inputCls(false)} />
                            </Field>
                            <Field label="Alasan Keluar">
                              <input type="text" name="exit_reason" value={formData.exit_reason || ""} onChange={handleChange} className={inputCls(false)} />
                            </Field>
                          </div>
                        </Panel>
                      )}
                    </>
                  )}

                  {/* ── FINANCIAL ── */}
                  {activeTab === "financial" && (
                    <>
                      <Panel title="Informasi Rekening">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <Field label="Bank">
                            <select name="bank_id" value={formData.bank_id || ""} onChange={handleChange} className={selectCls()}>
                              <option value="">— Pilih Bank —</option>
                              {masterData.banks?.map((b) => <option key={b.bank_id} value={b.bank_id}>{b.bank_name}</option>)}
                            </select>
                          </Field>
                          <Field label="Nomor Rekening">
                            <input type="text" name="bank_account_number" autoComplete="off" value={formData.bank_account_number || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                        </div>
                      </Panel>
                      <Panel title="Identitas Perpajakan & Jaminan">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="No. BPJS Kesehatan">
                            <input type="text" name="bpjs_health_number" autoComplete="off" value={formData.bpjs_health_number || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                          <Field label="No. BPJS Ketenagakerjaan">
                            <input type="text" name="bpjs_employment_number" autoComplete="off" value={formData.bpjs_employment_number || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                          <Field label="No. NPWP">
                            <input type="text" name="npwp_number" autoComplete="off" value={formData.npwp_number || ""} onChange={handleChange} className={inputCls(false)} />
                          </Field>
                        </div>
                      </Panel>
                    </>
                  )}

                  {/* ── EMERGENCY ── */}
                  {activeTab === "emergency" && (
                    <Panel title="Kontak Darurat">
                      <div className="max-w-lg">
                        <Field label="Nama & Nomor Telepon">
                          <input type="text" name="emergency_contact" value={formData.emergency_contact || ""} onChange={handleChange}
                            className={inputCls(false)} placeholder="Contoh: Bapak Deny — 082198765432" />
                        </Field>
                      </div>
                    </Panel>
                  )}

                  {/* ── DOCS ── */}
                  {activeTab === "docs" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <PhotoCard
                          label="Pas Foto"
                          filePath={employee?.profile_path}
                          fileName={employee?.profile_name}
                        />
                        <PhotoCard
                          label="Foto KTP"
                          filePath={employee?.ktp_path}
                          fileName={employee?.ktp_name}
                        />
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                        Klik <span className="font-semibold text-slate-600">Buka Tab Baru</span> untuk melihat foto ukuran penuh,
                        atau <span className="font-semibold text-slate-600">Download</span> untuk mengunduh file ke perangkat Anda.
                      </div>
                    </div>
                  )}

                  {/* ── NOTES ── */}
                  {activeTab === "notes" && (
                    <Panel title="Catatan HR">
                      <Field label="Catatan">
                        <textarea name="notes" rows={8} value={formData.notes || ""} onChange={handleChange}
                          className={cn(inputCls(false), "resize-y")}
                          placeholder="Riwayat pekerjaan, catatan kinerja, dll." />
                      </Field>
                    </Panel>
                  )}
                </div>

                {/* Footer navigasi tab */}
                <div className="border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                      {activeTabIdx > 0 && (
                        <button type="button" onClick={() => setActiveTab(TABS[activeTabIdx - 1].id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                          <HiOutlineChevronLeft className="w-4 h-4" /> Sebelumnya
                        </button>
                      )}
                      {activeTabIdx < TABS.length - 1 && (
                        <button type="button" onClick={() => setActiveTab(TABS[activeTabIdx + 1].id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition">
                          Berikutnya <HiOutlineChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button type="submit" disabled={saving || !dirty}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
                        dirty ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "bg-slate-100 text-slate-400 cursor-not-allowed"
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