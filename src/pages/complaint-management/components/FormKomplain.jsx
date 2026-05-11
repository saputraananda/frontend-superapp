import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { api, apiUpload, assetUrl } from "../../../lib/api";
import {
  HiOutlineChevronDown,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationCircle,
  HiOutlinePaperClip,
  HiOutlineTag,
  HiOutlineUser,
  HiOutlineArrowLeft,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlinePencil,
} from "react-icons/hi2";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const DEDUCTION_OPTIONS = ["None", "Company", "Management"];

const EMPTY_FORM = {
  type_id: "",
  category_id: "",
  topic_id: "",
  outlet_id: "",
  complaint_name: "",
  nota_number: "",
  qty: 1,
  description: "",
  deduction: "None",
  pic_employee_id: "",
  pic_name: "",
  submitted_at: "",
};

// ── Nota searchable field ─────────────────────────────────────────────────────
// Searches rekap_transaksi_reguler by no_nota, fills nota_number + complaint_name

function NotaSearchField({ label, required, notaValue, onPick, placeholder, error }) {
  const [query, setQuery]   = useState(notaValue || "");
  const [options, setOptions] = useState([]);
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef  = useRef(null);
  const debounce = useRef(null);

  // Sync when parent resets
  useEffect(() => { setQuery(notaValue || ""); }, [notaValue]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const search = useCallback((q) => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (!q.trim()) { setOptions([]); return; }
      setLoading(true);
      try {
        const data = await api(`/complaints/nota?q=${encodeURIComponent(q)}`);
        setOptions(Array.isArray(data) ? data : []);
      } catch { setOptions([]); }
      finally { setLoading(false); }
    }, 280);
  }, []);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    onPick(v, ""); // update nota only, clear customer name to signal manual
    setOpen(true);
    search(v);
  };

  const pick = (row) => {
    setQuery(row.no_nota);
    onPick(row.no_nota, row.customer_nama || "");
    setOpen(false);
    setOptions([]);
  };

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      <label className="text-xs font-semibold text-slate-500">
        {label}{required && <span className="ml-0.5 text-fuchsia-600">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (query.trim()) { search(query); setOpen(true); } }}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-300",
            "focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20",
            error ? "border-fuchsia-500 bg-fuchsia-50/40" : "border-slate-300 hover:border-slate-400",
          )}
        />
        {loading
          ? <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
          : <HiOutlineMagnifyingGlass className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        }
        {open && options.length > 0 && (
          <ul className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {options.map((row) => (
              <li
                key={row.no_nota}
                onMouseDown={() => pick(row)}
                className="cursor-pointer px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-fuchsia-50 hover:text-fuchsia-700"
              >
                <span className="block font-semibold">{row.no_nota}</span>
                {row.customer_nama && (
                  <span className="text-xs text-slate-400">{row.customer_nama}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {open && !loading && query.trim() && options.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-400 shadow-xl">
            Nota tidak ditemukan — nomor yang diketik akan disimpan langsung.
          </div>
        )}
      </div>
      {error && <p className="flex items-center gap-1 text-xs text-fuchsia-700"><span>⚠</span> {error}</p>}
    </div>
  );
}

// ── Searchable dropdown (autocomplete + free text) ────────────────────────────

function SearchableField({ label, required, value, onChange, fetchUrl, placeholder, error }) {
  const [query, setQuery]           = useState(value || "");
  const [options, setOptions]       = useState([]);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);
  const debounce = useRef(null);

  // Sync outward value → query when parent resets
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q) => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (!q.trim()) { setOptions([]); return; }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q });
        const data = await api(`${fetchUrl}?${params}`);
        setOptions(Array.isArray(data) ? data : []);
      } catch { setOptions([]); }
      finally { setLoading(false); }
    }, 280);
  }, [fetchUrl]);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setOpen(true);
    if (!customMode) search(v);
  };

  const pick = (name) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
    setOptions([]);
  };

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500">
          {label}{required && <span className="ml-0.5 text-fuchsia-600">*</span>}
        </label>
        <button
          type="button"
          onClick={() => { setCustomMode((m) => !m); setOpen(false); setOptions([]); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition"
        >
          {customMode ? <><HiOutlineCheck className="h-3 w-3" /> Dari referensi</> : <><HiOutlinePencil className="h-3 w-3" /> Input manual</>}
        </button>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (!customMode && query.trim()) { search(query); setOpen(true); } }}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-300",
            "focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20",
            error ? "border-fuchsia-500 bg-fuchsia-50/40" : "border-slate-300 hover:border-slate-400",
          )}
        />
        {loading
          ? <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
          : <HiOutlineMagnifyingGlass className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        }

        {/* Dropdown */}
        {open && !customMode && options.length > 0 && (
          <ul className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {options.map((opt) => {
              const name = opt.nama ?? opt.full_name ?? "";
              return (
                <li
                  key={opt.customer_id ?? opt.employee_id}
                  onMouseDown={() => pick(name)}
                  className="flex cursor-pointer items-center gap-2 px-3.5 py-2 text-sm text-slate-700 transition hover:bg-fuchsia-50 hover:text-fuchsia-700"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-[10px] font-bold text-fuchsia-700">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  {name}
                </li>
              );
            })}
          </ul>
        )}
        {open && !customMode && !loading && query.trim() && options.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-400 shadow-xl">
            Tidak ada hasil — teks yang diketik akan disimpan sebagai nama.
          </div>
        )}
      </div>
      {error && <p className="flex items-center gap-1 text-xs text-fuchsia-700"><span>⚠</span> {error}</p>}
    </div>
  );
}



function FormSection({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-100 shadow-sm">
          <Icon className="h-4 w-4 text-fuchsia-700" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-700">{title}</span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6 space-y-4 shadow-sm">
        {children}
      </div>
    </div>
  );
}

// ── Field components ───────────────────────────────────────────────────────────

function SelectField({ label, required, value, onChange, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500">
        {label}{required && <span className="ml-0.5 text-fuchsia-600">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className={cn(
            "w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-800 outline-none transition",
            "focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20",
            error ? "border-fuchsia-500 bg-fuchsia-50/40" : "border-slate-300 hover:border-slate-400",
          )}
        >
          {children}
        </select>
        <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <p className="flex items-center gap-1 text-xs text-fuchsia-700"><span>⚠</span> {error}</p>}
    </div>
  );
}

function TextField({ label, required, value, onChange, error, placeholder, type = "text", as: As = "input", hint }) {
  const cls = cn(
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-300",
    "focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20",
    error ? "border-fuchsia-500 bg-fuchsia-50/40" : "border-slate-300 hover:border-slate-400",
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500">
          {label}{required && <span className="ml-0.5 text-fuchsia-600">*</span>}
        </label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {As === "textarea"
        ? <textarea rows={4} value={value} onChange={onChange} placeholder={placeholder} className={cn(cls, "resize-none")} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={cls} />
      }
      {error && <p className="flex items-center gap-1 text-xs text-fuchsia-700"><span>⚠</span> {error}</p>}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ src, name, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  if (!src) return null;
  const isImg = /\.(jpe?g|png|gif|webp)$/i.test(src);
  const isPdf = /\.pdf$/i.test(src);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-1.5 text-white transition hover:bg-black/60"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
        {isImg ? (
          <img src={src} alt={name || "Preview"} className="max-h-[85vh] max-w-[85vw] object-contain rounded-2xl" />
        ) : isPdf ? (
          <iframe src={src} title={name || "PDF"} className="h-[85vh] w-[85vw] rounded-2xl" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-16">
            <HiOutlinePaperClip className="h-14 w-14 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">{name || "Dokumen"}</p>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-gradient-to-r from-fuchsia-700 to-pink-700 px-5 py-2 text-sm font-semibold text-white shadow hover:from-fuchsia-800 hover:to-pink-700"
            >
              Download / Buka File
            </a>
          </div>
        )}
        {(isImg || isPdf) && name && (
          <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500 truncate">{name}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function FormKomplain() {
  const navigate = useNavigate();
  const location = useLocation();
  const editTarget = location.state?.editTarget || null;

  const [meta, setMeta] = useState({ types: [], categories: [], topics: [], outlets: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formFiles, setFormFiles] = useState([]);
  const [existingDocs, setExistingDocs] = useState([]);
  const [deletedDocIds, setDeletedDocIds] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState({ src: null, name: null });
  const [fileUrls, setFileUrls] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const urls = formFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setFileUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u.url));
  }, [formFiles]);

  useEffect(() => {
    document.title = editTarget ? "Edit Komplain | Alora App" : "Tambah Komplain | Alora App";
    api("/complaints/meta").then((d) => setMeta(d)).catch(() => {});
    
    if (editTarget) {
      setForm({
        type_id:        editTarget.type_id || "",
        category_id:    editTarget.category_id || "",
        topic_id:       editTarget.topic_id || "",
        outlet_id:      editTarget.outlet_id || "",
        complaint_name: editTarget.complaint_name || "",
        nota_number:    editTarget.nota_number || "",
        qty:            editTarget.qty || 1,
        description:    editTarget.description || "",
        deduction:      editTarget.deduction || "None",
        pic_employee_id: editTarget.pic_employee_id || "",
        pic_name:       editTarget.pic_name || "",
        submitted_at:   editTarget.submitted_at ? new Date(new Date(editTarget.submitted_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
      });

      api(`/complaints/${editTarget.complaint_id}`).then(res => {
        if (res.documents) setExistingDocs(res.documents);
      }).catch(() => {});
    }
  }, [editTarget]);

  const validate = () => {
    const e = {};
    if (!form.type_id)        e.type_id = "Wajib dipilih";
    if (!form.category_id)    e.category_id = "Wajib dipilih";
    if (!form.topic_id)       e.topic_id = "Wajib dipilih";
    if (!form.outlet_id)      e.outlet_id = "Wajib dipilih";
    if (!form.complaint_name?.toString().trim()) e.complaint_name = "Wajib diisi";
    if (!form.nota_number?.toString().trim())    e.nota_number = "Wajib diisi";
    if (!form.description?.toString().trim())    e.description = "Wajib diisi";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      formFiles.forEach((f) => fd.append("documents", f));
      if (deletedDocIds.length > 0) {
        fd.append("deleted_doc_ids", JSON.stringify(deletedDocIds));
      }
      if (editTarget) {
        await apiUpload(`/complaints/${editTarget.complaint_id}`, { method: "PUT", body: fd });
      } else {
        await apiUpload("/complaints", { method: "POST", body: fd });
      }
      navigate("/complaint-list");
    } catch (err) {
      setErrors({ _: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 w-full max-w-none">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200">
        {/* Gradient Header */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-fuchsia-700 to-pink-700 px-6 py-5 sm:px-8 sm:py-6">
          <button
            type="button"
            onClick={() => navigate("/complaint-list")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white/30"
          >
            <HiOutlineArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {editTarget ? "Edit Komplain" : "Tambah Komplain Baru"}
            </h2>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-white/80">
              {editTarget ? "Perbarui data komplain yang ada" : "Lengkapi semua informasi komplain pelanggan"}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
          {errors._ && (
            <div className="flex items-center gap-2.5 rounded-xl border border-fuchsia-300 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-800">
              <HiOutlineExclamationCircle className="h-4 w-4 shrink-0" />
              {errors._}
            </div>
          )}

          {/* Section 1: Klasifikasi */}
          <FormSection title="Klasifikasi Komplain" icon={HiOutlineTag}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField label="Tipe" required value={form.type_id} onChange={(e) => setForm((f) => ({ ...f, type_id: e.target.value }))} error={errors.type_id}>
                <option value="">— Pilih Tipe —</option>
                {meta.types.map((t) => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
              </SelectField>
              <SelectField label="Kategori Bahan" required value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} error={errors.category_id}>
                <option value="">— Pilih Kategori —</option>
                {meta.categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </SelectField>
              <SelectField label="Topik" required value={form.topic_id} onChange={(e) => setForm((f) => ({ ...f, topic_id: e.target.value }))} error={errors.topic_id}>
                <option value="">— Pilih Topik —</option>
                {meta.topics.map((t) => <option key={t.topic_id} value={t.topic_id}>{t.topic_name}</option>)}
              </SelectField>
              <TextField label="Tanggal Diajukan" type="datetime-local" value={form.submitted_at} onChange={(e) => setForm((f) => ({ ...f, submitted_at: e.target.value }))} hint="Opsional" />
            </div>
          </FormSection>

          {/* Section 2: Informasi Pelanggan */}
          <FormSection title="Informasi Pelanggan & Transaksi" icon={HiOutlineUser}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField label="Outlet" required value={form.outlet_id} onChange={(e) => setForm((f) => ({ ...f, outlet_id: e.target.value }))} error={errors.outlet_id}>
                <option value="">— Pilih Outlet —</option>
                {meta.outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </SelectField>
              <NotaSearchField
                label="Nomor Nota"
                required
                notaValue={form.nota_number}
                onPick={(nota, customerName) => setForm((f) => ({
                  ...f,
                  nota_number: nota,
                  // hanya auto-fill nama jika customerName tidak kosong
                  ...(customerName ? { complaint_name: customerName } : {}),
                }))}
                placeholder="Ketik sebagian / 6 digit terakhir nota..."
                error={errors.nota_number}
              />
              <TextField
                label="Nama Pelapor / Pelanggan"
                required
                value={form.complaint_name}
                onChange={(e) => setForm((f) => ({ ...f, complaint_name: e.target.value }))}
                placeholder="Auto-isi dari nota, atau ketik manual"
                error={errors.complaint_name}
              />
              <TextField label="Qty" type="number" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="1" hint="Jumlah item" />
            </div>
          </FormSection>

          {/* Section 3: Detail & Penanganan */}
          <FormSection title="Detail & Penanganan" icon={HiOutlineClipboardDocumentList}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField label="Deduction" value={form.deduction} onChange={(e) => setForm((f) => ({ ...f, deduction: e.target.value }))}>
                {DEDUCTION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </SelectField>
              <SearchableField
                label="Nama PIC"
                value={form.pic_name}
                onChange={(v) => setForm((f) => ({ ...f, pic_name: v }))}
                fetchUrl="/complaints/employees"
                placeholder="Ketik untuk cari karyawan..."
              />
            </div>
            <TextField label="Deskripsi / Kronologi" required as="textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} error={errors.description} placeholder="Ceritakan kronologi komplain secara detail..." />
          </FormSection>

          {/* Section 4: Dokumentasi */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-fuchsia-100">
                <HiOutlinePaperClip className="h-3.5 w-3.5 text-fuchsia-700" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-700">Dokumentasi</span>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition",
                formFiles.length > 0
                  ? "border-fuchsia-400 bg-fuchsia-100/60"
                  : "border-slate-200 bg-slate-50/70 hover:border-fuchsia-400 hover:bg-fuchsia-100/30",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files);
                  setFormFiles((prev) => {
                    const existing = prev.map((f) => f.name + f.size);
                    const unique = newFiles.filter((f) => !existing.includes(f.name + f.size));
                    return [...prev, ...unique];
                  });
                  e.target.value = "";
                }}
              />
              <HiOutlinePaperClip className="mx-auto mb-2 h-7 w-7 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Klik untuk upload dokumentasi</p>
              <p className="mt-0.5 text-xs text-slate-400">Foto, PDF, atau dokumen lainnya · Maks. 5 MB per file</p>
            </div>

            {/* New file preview grid */}
            {fileUrls.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {fileUrls.length} File Dipilih — Klik untuk preview
                </p>
                <div className="flex flex-wrap gap-3">
                  {fileUrls.map(({ url, name }, i) => {
                    const isImg = /\.(jpe?g|png|gif|webp)$/i.test(name);
                    return (
                      <div
                        key={i}
                        className="group relative h-24 w-24 overflow-hidden rounded-xl border border-fuchsia-300 bg-slate-50 shadow-sm"
                      >
                        {isImg ? (
                          <img src={url} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                            <HiOutlinePaperClip className="mb-1 h-6 w-6 text-slate-400" />
                            <span className="line-clamp-2 text-[9px] text-slate-500">{name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setLightbox({ src: url, name })}
                            className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/40"
                            title="Lihat"
                          >
                            <HiOutlineMagnifyingGlass className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="rounded-lg bg-red-500/80 p-1.5 text-white hover:bg-red-600"
                            title="Hapus"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing Documents Preview */}
            {existingDocs.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Dokumen Tersimpan</p>
                <div className="flex flex-wrap gap-3">
                  {existingDocs.map((d) => {
                    const isDeleted = deletedDocIds.includes(d.doc_id);
                    if (isDeleted) return null; // hide if marked for deletion
                    
                    const url = assetUrl(d.file_path);
                    const isImg = /\.(jpe?g|png|gif|webp)$/i.test(d.file_path);
                    return (
                      <div key={d.doc_id} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                        {isImg ? (
                          <img src={url} alt={d.original_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                            <HiOutlinePaperClip className="mb-1 h-6 w-6 text-slate-400" />
                            <span className="text-[9px] text-slate-500 line-clamp-2">{d.original_name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setLightbox({ src: url, name: d.original_name })}
                            className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/40"
                            title="Lihat"
                          >
                            <HiOutlineMagnifyingGlass className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletedDocIds([...deletedDocIds, d.doc_id])}
                            className="rounded-lg bg-red-500/80 p-1.5 text-white hover:bg-red-600"
                            title="Hapus"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button type="button" onClick={() => navigate("/complaint-list")} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-fuchsia-700 to-pink-700 px-8 py-2.5 text-sm font-semibold text-white shadow-md shadow-fuchsia-300/50 transition hover:from-fuchsia-800 hover:to-pink-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Simpan Komplain"}
            </button>
          </div>
        </form>
      </div>
      </div>
      <Lightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox({ src: null, name: null })} />
    </div>
  );
}
