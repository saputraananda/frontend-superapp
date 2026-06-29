import { useCallback, useEffect, useState } from "react";
import { api, apiUpload, assetUrl } from "../../../lib/api";
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlineClock,
  HiOutlineArchiveBox,
  HiOutlineExclamationCircle,
  HiOutlineCalendarDays,
  HiOutlineUser,
  HiOutlineCloudArrowUp,
  HiOutlineInformationCircle,
  HiOutlinePaperClip,
  HiOutlineDocument,
  HiOutlinePhoto,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const toTitleCase = (str) => {
  if (!str) return "";
  return String(str).toLowerCase().replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
};

const STATUS_CONFIG = {
  active:   { label: "Aktif",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactive: { label: "Nonaktif",   cls: "bg-slate-100 text-slate-600 border-slate-200" },
  expired:  { label: "Kadaluarsa", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  archived: { label: "Diarsipkan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const formatFileSize = (kb) => {
  if (!kb) return "";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const isImage = (mime) => mime && /^image\//i.test(mime);
const isPdf   = (mime) => mime && /pdf/i.test(mime);

const getRemainingDays = (expiryDateStr) => {
  if (!expiryDateStr) return null;
  const expiry = new Date(expiryDateStr);
  if (Number.isNaN(expiry.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

function StatusBadge({ status, expiryDate }) {
  let c = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  
  if (status === "active" && expiryDate) {
    const days = getRemainingDays(expiryDate);
    if (days !== null) {
      if (days <= 0) {
        c = { label: "Kadaluarsa", cls: "bg-rose-50 text-rose-700 border-rose-200" };
      } else if (days <= 30) {
        c = { label: `Aktif (≤${days} Hari)`, cls: "bg-rose-50 text-rose-700 border-rose-200" };
      } else if (days <= 60) {
        c = { label: `Aktif (≤${days} Hari)`, cls: "bg-orange-50 text-orange-700 border-orange-200" };
      }
    }
  }

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", c.cls)}>
      {c.label}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={cn(
      "fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-lg border",
      toast.type === "success"
        ? "bg-emerald-50/95 border-emerald-200 text-emerald-700"
        : "bg-rose-50/95 border-rose-200 text-rose-700")}>
      {toast.type === "success"
        ? <HiOutlineCheckCircle className="h-5 w-5" />
        : <HiOutlineExclamationTriangle className="h-5 w-5" />}
      {toast.msg}
    </div>
  );
}

// ── Shared field styles ──────────────────────────────────────────────────────
const labelCls  = "block text-[12px] font-semibold text-slate-700 mb-1.5";
const inputCls  = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-700 transition placeholder:text-slate-400";
const selectCls = "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-700 transition bg-no-repeat bg-[right_0.75rem_center] bg-[length:0.85em] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23475569%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22/%3E%3C/svg%3E')]";

function SectionLabel({ icon: Icon, children, hint }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[13px] font-bold text-slate-800 leading-tight">{children}</h3>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

const VALIDITY_UNITS = [
  { value: "days",   label: "Hari" },
  { value: "months", label: "Bulan" },
  { value: "years",  label: "Tahun" },
];

const toInDays = (val, unit) => {
  if (!val) return null;
  const n = Number(val);
  if (unit === "months") return n * 30;
  if (unit === "years")  return n * 365;
  return n;
};

const fromDays = (days) => {
  if (!days) return { val: "", unit: "days" };
  if (days % 365 === 0) return { val: days / 365, unit: "years" };
  if (days % 30  === 0) return { val: days / 30,  unit: "months" };
  return { val: days, unit: "days" };
};

// Hitung selisih bulan antara dua tanggal (basis kalender, bukan ÷30 hari)
const monthsBetween = (startStr, endStr) => {
  if (!startStr || !endStr) return null;
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  if (e < s) return null;
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) months--;
  return months;
};

// ── File Preview Modal ───────────────────────────────────────────────────────
function FilePreviewModal({ open, onClose, file }) {
  if (!open || !file) return null;
  const url = file.url;
  const name = file.name;
  const mime = file.mime || "";
  const image = isImage(mime) || /\.(jpe?g|png|webp|gif)$/i.test(name);
  const pdf   = isPdf(mime)   || /\.pdf$/i.test(name);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              {image ? <HiOutlinePhoto className="h-4 w-4" /> : <HiOutlineDocument className="h-4 w-4" />}
            </div>
            <p className="text-sm font-semibold text-slate-700 truncate">{name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-semibold text-blue-700 hover:underline">
              Buka di tab baru ↗
            </a>
            <button onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center">
          {image ? (
            <img src={url} alt={name} className="max-w-full max-h-full object-contain" />
          ) : pdf ? (
            <iframe src={url} title={name} className="w-full h-full min-h-[70vh]" />
          ) : (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <HiOutlineDocument className="h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">Preview tidak tersedia untuk tipe file ini</p>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition">
                Unduh File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ open, onClose, onConfirm, title, message, itemName, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Red accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-rose-600" />
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 border-2 border-rose-200">
            <HiOutlineExclamationTriangle className="h-7 w-7 text-rose-600" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-rose-100 animate-ping opacity-40" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-800">
            {title || "Hapus Dokumen?"}
          </h3>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            {message || "Tindakan ini tidak dapat dibatalkan."}
          </p>
          {itemName && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dokumen</p>
              <p className="text-sm font-semibold text-slate-700 truncate mt-0.5">{itemName}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition shadow-sm">
            Batal
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-sm font-semibold text-white hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:ring-offset-2">
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <HiOutlineTrash className="h-4 w-4" />
                Ya, Hapus
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Attachment Card Component ────────────────────────────────────────────────
function AttachmentCard({ name, size, mime, onPreview, onRemove }) {
  const image = isImage(mime) || /\.(jpe?g|png|webp|gif)$/i.test(name);
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-blue-300 transition">
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        image ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
      )}>
        {image ? <HiOutlinePhoto className="h-4 w-4" /> : <HiOutlineDocument className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-700 truncate">{name}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{size || ""}</p>
      </div>
      <button type="button" onClick={onPreview}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition" title="Preview">
        <HiOutlineEye className="h-4 w-4" />
      </button>
      <button type="button" onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition" title="Hapus">
        <HiOutlineTrash className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────
function FormModal({ open, onClose, onSaved, editData, lookups }) {
  const [form, setForm] = useState({
    document_name: "", document_number: "", entity: "",
    effective_date: "", expiry_date: "",
    status: "active", pic_id: "", department_id: "", archive_location: "", notes: "",
  });
  const [validityVal, setValidityVal]   = useState("");
  const [validityUnit, setValidityUnit] = useState("days");
  const [validityManual, setValidityManual] = useState(false); // user pernah edit manual
  const [picSearch, setPicSearch]       = useState("");
  const [picFocused, setPicFocused]     = useState(false);

  // Existing attachments dari server (saat edit)
  const [existingAtts, setExistingAtts] = useState([]);
  // File baru yang akan di-upload
  const [newFiles, setNewFiles]         = useState([]);
  // Preview modal
  const [previewFile, setPreviewFile]   = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Load existing data + attachments
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (editData) {
        const { val, unit } = fromDays(editData.validity_period);
        setForm({
          document_name:    editData.document_name    || "",
          document_number:  editData.document_number  || "",
          entity:           editData.entity           || "",
          effective_date:   editData.effective_date   ? editData.effective_date.split("T")[0]  : "",
          expiry_date:      editData.expiry_date       ? editData.expiry_date.split("T")[0]    : "",
          status:           editData.status           || "active",
          pic_id:           editData.pic_id           || "",
          department_id:    editData.department_id    || "",
          archive_location: editData.archive_location || "",
          notes:            editData.notes            || "",
        });
        setValidityVal(val);
        setValidityUnit(unit);
        // Saat edit data lama: kalau ada validity_period tersimpan, anggap sudah manual
        setValidityManual(!!editData.validity_period);
        setPicSearch(toTitleCase(editData.pic_name || ""));

        // Fetch attachments
        try {
          const d = await api(`/doc-alora/documents/${editData.id}`);
          setExistingAtts(d.attachments || []);
        } catch { setExistingAtts([]); }
      } else {
        setForm({ document_name:"", document_number:"", entity:"", effective_date:"", expiry_date:"", status:"active", pic_id:"", department_id:"", archive_location:"", notes:"" });
        setValidityVal(""); setValidityUnit("days"); setPicSearch("");
        setValidityManual(false);
        setExistingAtts([]);
      }
      setNewFiles([]); setError(""); setPicFocused(false);
    })();
  }, [editData, open]);

  // Auto-hitung Masa Berlaku berdasarkan selisih bulan Tgl Efektif s/d Tgl Kadaluarsa.
  // Tetap diskip jika user sudah edit manual (validityManual = true).
  useEffect(() => {
    if (!open) return;
    if (validityManual) return;
    const months = monthsBetween(form.effective_date, form.expiry_date);
    if (months != null && months > 0) {
      setValidityVal(months);
      setValidityUnit("months");
    } else if (!form.expiry_date) {
      // Reset jika tanggal kadaluarsa dikosongkan
      setValidityVal("");
      setValidityUnit("days");
    }
  }, [form.effective_date, form.expiry_date, validityManual, open]);

  if (!open) return null;

  const filteredEmployees = lookups.employees.filter(e =>
    toTitleCase(e.full_name).toLowerCase().includes(picSearch.toLowerCase())
  );

  // Handle file input change
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setNewFiles(prev => [...prev, ...files]);
    e.target.value = ""; // reset agar bisa pilih file yang sama lagi
  };

  // Remove new file (sebelum di-upload)
  const removeNewFile = (idx) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Remove existing attachment dari server
  const removeExistingAtt = async (att) => {
    if (!confirm(`Hapus lampiran "${att.original_name}"?`)) return;
    try {
      await api(`/doc-alora/attachments/${att.id}`, { method: "DELETE" });
      setExistingAtts(prev => prev.filter(a => a.id !== att.id));
    } catch (err) { alert(err.message || "Gagal menghapus lampiran"); }
  };

  // Preview new file (object URL)
  const previewNewFile = (file) => {
    const url = URL.createObjectURL(file);
    setPreviewFile({ url, name: file.name, mime: file.type });
  };

  // Preview existing attachment
  const previewExistingAtt = (att) => {
    setPreviewFile({
      url: assetUrl(att.file_path),
      name: att.original_name,
      mime: att.mime_type,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.document_name || !form.document_number || !form.entity || !form.effective_date || !form.pic_id || !form.department_id) {
      setError("Mohon lengkapi semua field wajib (*)");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== "" && v != null) fd.append(k, v); });
      const inDays = toInDays(validityVal, validityUnit);
      if (inDays) fd.append("validity_period", inDays);
      newFiles.forEach(f => fd.append("attachments", f));

      const url    = editData ? `/doc-alora/documents/${editData.id}` : "/doc-alora/documents";
      const method = editData ? "PUT" : "POST";
      await apiUpload(url, { method, body: fd });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-slate-200 bg-gradient-to-r from-blue-900 to-blue-800 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <HiOutlineDocumentText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base lg:text-lg font-bold leading-tight truncate">
                {editData ? "Edit Dokumen" : "Tambah Dokumen Baru"}
              </h2>
              <p className="text-[11px] text-blue-100 mt-0.5">
                {editData ? "Perbarui informasi dokumen perusahaan" : "Lengkapi detail dokumen baru"}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition shrink-0">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="docFormMaster" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden px-6 lg:px-8 py-6">

          {error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
              <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Section: Informasi Dasar */}
          <section className="mb-6">
            <SectionLabel icon={HiOutlineInformationCircle} hint="Identitas dan tipe dokumen">
              Informasi Dasar
            </SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nama Dokumen <span className="text-rose-500">*</span></label>
                <input value={form.document_name}
                  onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))}
                  placeholder="Contoh: Sertifikat ISO 9001:2015"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nomor Dokumen <span className="text-rose-500">*</span></label>
                <input value={form.document_number}
                  onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))}
                  placeholder="Contoh: DOC/HR/2024/001"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Entitas <span className="text-rose-500">*</span></label>
                <input value={form.entity}
                  onChange={e => setForm(f => ({ ...f, entity: e.target.value }))}
                  placeholder="Nama entitas / badan hukum penerbit"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className={selectCls}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                  <option value="expired">Kadaluarsa</option>
                  <option value="archived">Diarsipkan</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section: Periode Berlaku */}
          <section className="mb-6">
            <SectionLabel icon={HiOutlineCalendarDays} hint="Tanggal efektif dan masa berlaku dokumen">
              Periode Berlaku
            </SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Tanggal Efektif <span className="text-rose-500">*</span></label>
                <input type="date" value={form.effective_date}
                  onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tanggal Kadaluarsa</label>
                <input type="date" value={form.expiry_date}
                  onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  Masa Berlaku
                  {!validityManual && validityVal && (
                    <span className="ml-1.5 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                      otomatis
                    </span>
                  )}
                </label>
                <div className="flex rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-blue-900/15 focus-within:border-blue-700 transition overflow-hidden">
                  <input
                    type="number"
                    min="1"
                    value={validityVal}
                    onChange={e => { setValidityVal(e.target.value); setValidityManual(true); }}
                    placeholder="Contoh: 12"
                    className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 border-none min-w-0 flex-1"
                  />
                  <div className="w-[1px] bg-slate-200 my-2 shrink-0" />
                  <select
                    value={validityUnit}
                    onChange={e => { setValidityUnit(e.target.value); setValidityManual(true); }}
                    className="appearance-none bg-transparent px-3.5 py-2.5 pr-8 text-sm text-slate-700 font-medium outline-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:0.85em] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23475569%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22/%3E%3C/svg%3E')] border-none cursor-pointer w-[95px] shrink-0"
                  >
                    {VALIDITY_UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                {validityManual && form.effective_date && form.expiry_date && (
                  <button type="button"
                    onClick={() => setValidityManual(false)}
                    className="mt-1 text-[11px] text-blue-700 hover:underline block">
                    Hitung otomatis dari tanggal
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Section: Tanggung Jawab */}
          <section className="mb-6">
            <SectionLabel icon={HiOutlineUser} hint="Penanggung jawab dan departemen">
              Tanggung Jawab
            </SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PIC dengan search */}
              <div className="relative">
                <label className={labelCls}>PIC (Person in Charge) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    value={picSearch}
                    onChange={e => { setPicSearch(e.target.value); setForm(f => ({ ...f, pic_id: "" })); }}
                    onFocus={() => setPicFocused(true)}
                    onBlur={() => setTimeout(() => setPicFocused(false), 150)}
                    placeholder="Cari nama karyawan..."
                    className={cn(inputCls, "pl-9")}
                  />
                  {form.pic_id && (
                    <HiOutlineCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  )}
                </div>

                {picFocused && picSearch.length > 0 && !form.pic_id && filteredEmployees.length > 0 && (
                  <div className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                    {filteredEmployees.slice(0, 10).map(emp => (
                      <button key={emp.employee_id} type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setForm(f => ({ ...f, pic_id: emp.employee_id })); setPicSearch(toTitleCase(emp.full_name)); setPicFocused(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition text-slate-700 border-b border-slate-50 last:border-0">
                        {toTitleCase(emp.full_name)}
                      </button>
                    ))}
                  </div>
                )}
                {picFocused && picSearch.length > 0 && !form.pic_id && filteredEmployees.length === 0 && (
                  <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl px-4 py-3 text-xs text-slate-400">
                    Tidak ada karyawan ditemukan
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Departemen <span className="text-rose-500">*</span></label>
                <select value={form.department_id}
                  onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  className={selectCls}>
                  <option value="">— Pilih departemen —</option>
                  {lookups.departments.map(d => (
                    <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Section: Penyimpanan & Catatan */}
          <section className="mb-6">
            <SectionLabel icon={HiOutlineArchiveBox} hint="Lokasi arsip fisik dan catatan tambahan">
              Penyimpanan & Catatan
            </SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Lokasi Penyimpanan Arsip</label>
                <select value={form.archive_location}
                  onChange={e => setForm(f => ({ ...f, archive_location: e.target.value }))}
                  className={selectCls}>
                  <option value="">— Pilih lokasi arsip —</option>
                  {lookups.companies.map(c => (
                    <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Catatan Tambahan</label>
                <textarea value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={1}
                  placeholder="Tambahkan catatan atau keterangan tambahan..."
                  className={cn(inputCls, "resize-y min-h-[42px]")} />
              </div>
            </div>
          </section>

          {/* Section: Lampiran (Multi file) */}
          <section className="mb-2">
            <SectionLabel icon={HiOutlinePaperClip} hint="Bisa lampirkan lebih dari satu file (gambar / PDF)">
              Lampiran Dokumen
            </SectionLabel>

            {/* Upload zone */}
            <label className="flex items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 px-4 py-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <HiOutlineCloudArrowUp className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">Klik untuk pilih file</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Format: PDF, JPG, PNG, WEBP · maks 10 MB per file · bisa pilih banyak file
                </p>
              </div>
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden" />
            </label>

            {/* Existing attachments (saat edit) */}
            {existingAtts.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Lampiran Tersimpan ({existingAtts.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {existingAtts.map(att => (
                    <AttachmentCard
                      key={att.id}
                      name={att.original_name}
                      size={formatFileSize(att.file_size_kb)}
                      mime={att.mime_type}
                      onPreview={() => previewExistingAtt(att)}
                      onRemove={() => removeExistingAtt(att)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* New files belum di-upload */}
            {newFiles.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Lampiran Baru ({newFiles.length}) <span className="text-blue-700">— belum disimpan</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {newFiles.map((f, idx) => (
                    <AttachmentCard
                      key={idx}
                      name={f.name}
                      size={formatFileSize(Math.round(f.size / 1024))}
                      mime={f.type}
                      onPreview={() => previewNewFile(f)}
                      onRemove={() => removeNewFile(idx)}
                    />
                  ))}
                </div>
              </div>
            )}

            {existingAtts.length === 0 && newFiles.length === 0 && (
              <p className="text-[11px] text-slate-400 italic text-center py-3">
                Belum ada lampiran. Silakan pilih file di atas.
              </p>
            )}
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 lg:px-8 py-4 border-t border-slate-200 bg-slate-50/80">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Batal
          </button>
          <button type="submit" form="docFormMaster" disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-blue-900 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm flex items-center gap-2">
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <HiOutlineCheckCircle className="h-4 w-4" />
                {editData ? "Perbarui Dokumen" : "Simpan Dokumen"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* File preview modal */}
    <FilePreviewModal
      open={!!previewFile}
      file={previewFile}
      onClose={() => {
        if (previewFile?.url?.startsWith("blob:")) URL.revokeObjectURL(previewFile.url);
        setPreviewFile(null);
      }}
    />
    </>
  );
}

// ── Summary Detail Modal ──────────────────────────────────────────────────────
function SummaryDetailModal({ open, type, onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !type) return;
    (async () => {
      setLoading(true);
      try {
        let url = "";
        if (type === "active") {
          url = "/doc-alora/documents?status=active&limit=100";
        } else if (type === "expiring_soon") {
          url = "/doc-alora/documents?expiring_soon=true&limit=100";
        } else if (type === "borrowed") {
          url = "/doc-alora/transactions?status=borrowed&limit=100";
        } else if (type === "overdue") {
          url = "/doc-alora/documents?overdue=true&limit=100";
        }

        if (url) {
          const res = await api(url);
          setList(res.data || []);
        }
      } catch (err) {
        console.error("Gagal memuat detail summary:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, type]);

  if (!open) return null;

  const titles = {
    active: "Daftar Dokumen Aktif",
    expiring_soon: "Daftar Dokumen Segera Expired (≤30 Hari)",
    borrowed: "Daftar Dokumen Sedang Dipinjam",
    overdue: "Daftar Dokumen Overdue (Kadaluarsa)",
  };

  const title = titles[type] || "Detail Summary";
  const isDocType = type === "active" || type === "expiring_soon" || type === "overdue";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-blue-900 border-t-transparent animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-center py-12 text-sm text-slate-400 italic">Tidak ada data ditemukan</p>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {isDocType ? (
                      <>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Dokumen</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Entitas & Dept</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Masa Berlaku</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Aging</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Kode & Dokumen</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Peminjam</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Tgl Pinjam / Batas</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {list.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition">
                      {isDocType ? (
                        <>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-slate-800">{row.document_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{row.document_number}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-700">{row.entity}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{row.department_name || "—"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-600">{formatDate(row.effective_date)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">s/d {formatDate(row.expiry_date)}</p>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const days = getRemainingDays(row.expiry_date);
                              if (days === null) return <span className="text-slate-400 text-xs">—</span>;
                              if (days < 0) {
                                return <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">Expired</span>;
                              }
                              if (days <= 30) {
                                return <span className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">{days} Hari</span>;
                              }
                              if (days <= 60) {
                                return <span className="inline-flex rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">{days} Hari</span>;
                              }
                              return <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{days} Hari</span>;
                            })()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-slate-800">{row.document_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{row.transaction_code} · {row.document_number}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-700">{row.borrower_name || "—"}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{row.department_name || "—"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-600">{formatDate(row.borrow_date)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">s/d {formatDate(row.return_due)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                              row.status === "borrowed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              row.status === "returned" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              row.status === "overdue" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-300"
                            )}>
                              {row.status === "borrowed" ? "Dipinjam" :
                               row.status === "returned" ? "Dikembalikan" :
                               row.status === "overdue" ? "Terlambat" : "Hilang"}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MasterDocument() {
  const [data, setData]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [searchInput, setSI]      = useState("");
  const [search, setSearch]       = useState("");
  const [filterStatus, setFS]     = useState("");
  const [toast, setToast]         = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [summaryDetailType, setSummaryDetailType] = useState(null);
  const [lookups, setLookups]     = useState({ employees: [], departments: [], companies: [] });
  const [summary, setSummary]     = useState(null);

  // Preview untuk row attachment
  const [rowPreview, setRowPreview] = useState(null);

  // Confirm delete master document
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting]         = useState(false);

  const LIMIT = 15;
  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    (async () => {
      try {
        const [empRes, deptRes, compRes, summaryRes] = await Promise.all([
          api("/doc-alora/lookup/employees"),
          api("/doc-alora/lookup/departments"),
          api("/doc-alora/lookup/companies"),
          api("/doc-alora/dashboard"),
        ]);
        setLookups({
          employees:   empRes.data   || [],
          departments: deptRes.data  || [],
          companies:   compRes.data  || [],
        });
        setSummary(summaryRes);
      } catch { /* ignore */ }
    })();
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search)       params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      const d = await api(`/doc-alora/documents?${params}`);
      setData(d.data || []);
      setTotal(d.total || 0);
    } catch (err) {
      showToast("error", err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => { loadList(); }, [loadList]);

  const askDelete = (row) => setDeleteTarget({ id: row.id, name: row.document_name });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/doc-alora/documents/${deleteTarget.id}`, { method: "DELETE" });
      showToast("success", "Dokumen berhasil dihapus");
      setDeleteTarget(null);
      loadList();
    } catch (err) {
      showToast("error", err.message || "Gagal menghapus dokumen");
    } finally {
      setDeleting(false);
    }
  };

  // Klik ikon eye di row → fetch attachments → kalau hanya 1 langsung preview, kalau banyak buka modal pertama
  const handleViewAttachments = async (row) => {
    try {
      const d = await api(`/doc-alora/documents/${row.id}`);
      const atts = d.attachments || [];
      if (atts.length === 0) {
        showToast("error", "Belum ada lampiran");
        return;
      }
      // Tampilkan attachment pertama di preview
      const first = atts[0];
      setRowPreview({
        url: assetUrl(first.file_path),
        name: first.original_name,
        mime: first.mime_type,
      });
    } catch (err) { showToast("error", err.message); }
  };

  const openEdit   = (row) => { setEditData(row);  setModalOpen(true); };
  const openCreate = ()    => { setEditData(null);  setModalOpen(true); };
  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Master Dokumen</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola data dokumen perusahaan</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition shadow-sm">
          <HiOutlinePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah Dokumen</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div onClick={() => setSummaryDetailType("active")}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <HiOutlineDocumentText className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Aktif</p>
              <p className="text-xl font-bold text-slate-800">{summary.summary?.active || 0}</p>
            </div>
          </div>
          <div onClick={() => setSummaryDetailType("expiring_soon")}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <HiOutlineClock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Segera Expired</p>
              <p className="text-xl font-bold text-slate-800">{summary.expiring_soon || 0}</p>
            </div>
          </div>
          <div onClick={() => setSummaryDetailType("borrowed")}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <HiOutlineArchiveBox className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Dipinjam</p>
              <p className="text-xl font-bold text-slate-800">{summary.active_borrows || 0}</p>
            </div>
          </div>
          <div onClick={() => setSummaryDetailType("overdue")}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
              <HiOutlineExclamationCircle className="h-5 w-5 text-rose-700" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Overdue</p>
              <p className="text-xl font-bold text-slate-800">{summary.overdue_borrows || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={searchInput} onChange={e => setSI(e.target.value)}
            placeholder="Cari nama dokumen, nomor, atau entitas..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
        </div>
        <select value={filterStatus} onChange={e => { setFS(e.target.value); setPage(1); }}
          className={cn(selectCls, "w-full sm:w-52")}>
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="expired">Kadaluarsa</option>
          <option value="archived">Diarsipkan</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-2 border-blue-900 border-t-transparent animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <HiOutlineDocumentText className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Belum ada dokumen terdaftar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dokumen</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Entitas</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">PIC</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Berlaku</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Aging</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map(row => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4 max-w-[280px] sm:max-w-xs md:max-w-sm lg:max-w-md">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
                          <HiOutlineDocumentText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 break-words whitespace-normal">{row.document_name}</p>
                          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                            {row.document_number}
                            {row.attachment_count > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-[9px] font-semibold">
                                <HiOutlinePaperClip className="h-3 w-3" />{row.attachment_count}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-700">{row.entity}</p>
                      <p className="text-[11px] text-slate-400">{row.department_name || "—"}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-sm text-slate-700">{toTitleCase(row.pic_name) || "—"}</p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-xs text-slate-600">{formatDate(row.effective_date)}</p>
                      <p className="text-[11px] text-slate-400">s/d {formatDate(row.expiry_date)}</p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {(() => {
                        const days = getRemainingDays(row.expiry_date);
                        if (days === null) return <span className="text-slate-400">—</span>;
                        if (days < 0) {
                          return (
                            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-400">
                              Expired
                            </span>
                          );
                        }
                        if (days <= 30) {
                          return (
                            <span className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                              {days} Hari Lagi
                            </span>
                          );
                        }
                        if (days <= 60) {
                          return (
                            <span className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
                              {days} Hari Lagi
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {days} Hari Lagi
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={row.status} expiryDate={row.expiry_date} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {row.attachment_count > 0 && (
                          <button onClick={() => handleViewAttachments(row)}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Lihat lampiran">
                            <HiOutlineEye className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => openEdit(row)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Edit">
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                        <button onClick={() => askDelete(row)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Hapus">
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
            <p className="text-[11px] text-slate-400">
              Hal <span className="font-semibold text-slate-600">{page}</span>/{totalPages}
              <span className="ml-1">({total} dokumen)</span>
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <HiOutlineChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <HiOutlineChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { showToast("success", editData ? "Dokumen diperbarui" : "Dokumen ditambahkan"); loadList(); }}
        editData={editData}
        lookups={lookups}
      />

      {/* Row preview modal */}
      <FilePreviewModal
        open={!!rowPreview}
        file={rowPreview}
        onClose={() => setRowPreview(null)}
      />

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Hapus Dokumen?"
        message="Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan dan semua lampiran akan ikut terhapus."
        itemName={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      {/* Summary Detail Modal */}
      <SummaryDetailModal
        open={!!summaryDetailType}
        type={summaryDetailType}
        onClose={() => setSummaryDetailType(null)}
      />
    </div>
  );
}
