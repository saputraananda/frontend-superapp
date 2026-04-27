import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineFunnel, HiOutlinePaperClip, HiOutlinePhoto,
  HiOutlineXMark, HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineExclamationTriangle, HiOutlineClipboardDocumentList,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";
import { api, apiUpload, BASE_URL } from "../../../lib/api";

function cn(...c) { return c.filter(Boolean).join(" "); }

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const p = JSON.parse(raw);
    const u = p?.user ?? p;
    return { name: u?.employee?.full_name || u?.name || "", id: u?.employee?.employee_id };
  } catch { return {}; }
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}

const FINDING_LOCATIONS = ["Rumah Sakit", "IKM"];
const EMPTY_FORM = {
  reporter_name: "", report_date: todayISO(), area_id: "",
  hospital_id: "", finding_location: "IKM", linen_type: "",
  finding_type: "", finding_qty: 1,
};

function Toast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg pointer-events-auto",
          t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        )}>
          {t.type === "success" ? "✓" : "✕"} {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Modal Form ──────────────────────────────────────────────────────────────
function FormModal({ open, onClose, onSaved, editData, areas, hospitals }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    if (!open) return;
    if (editData) {
      setForm({
        reporter_name: editData.reporter_name || "",
        report_date: editData.report_date?.slice(0, 10) || todayISO(),
        area_id: String(editData.area_id || ""),
        hospital_id: String(editData.hospital_id || ""),
        finding_location: editData.finding_location || "IKM",
        linen_type: editData.linen_type || "",
        finding_type: editData.finding_type || "",
        finding_qty: editData.finding_qty ?? 1,
      });
      setFilePreview(editData.attachment_url || null);
    } else {
      const user = getCurrentUser();
      setForm({ ...EMPTY_FORM, reporter_name: user.name || "" });
      setFilePreview(null);
    }
    setFile(null);
    setError("");
  }, [open, editData]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("attachment", file);

      if (editData) {
        await apiUpload(`/ikm/linen-report/${editData.id}`, { method: "PUT", body: fd });
      } else {
        await apiUpload("/ikm/linen-report", { method: "POST", body: fd });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">
            {editData ? "Edit Linen Report" : "Tambah Linen Report"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Pelapor *</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.reporter_name} onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                placeholder="Nama pelapor" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Laporan *</label>
              <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lokasi Temuan *</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.finding_location} onChange={(e) => setForm({ ...form, finding_location: e.target.value })}>
                {FINDING_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Area *</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })} required>
                <option value="">-- Pilih Area --</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Rumah Sakit *</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.hospital_id} onChange={(e) => setForm({ ...form, hospital_id: e.target.value })} required>
                <option value="">-- Pilih RS --</option>
                {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Linen *</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.linen_type} onChange={(e) => setForm({ ...form, linen_type: e.target.value })}
                placeholder="Contoh: Sprei, Handuk..." required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Temuan *</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.finding_type} onChange={(e) => setForm({ ...form, finding_type: e.target.value })}
                placeholder="Contoh: Robek, Kotor, Hilang..." required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Jumlah *</label>
              <input type="number" min="1" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.finding_qty} onChange={(e) => setForm({ ...form, finding_qty: e.target.value })} required />
            </div>

            {/* File upload */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lampiran (Foto/PDF)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
              >
                {filePreview ? (
                  filePreview.startsWith("blob:") || filePreview.match(/\.(jpg|jpeg|png|webp)/i) ? (
                    <img src={filePreview} alt="preview" className="max-h-32 rounded-lg object-contain" />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <HiOutlinePaperClip className="h-5 w-5" />
                      {file?.name || "File terlampir"}
                    </div>
                  )
                ) : (
                  <>
                    <HiOutlinePhoto className="h-8 w-8 text-slate-300" />
                    <p className="text-xs text-slate-500">Klik untuk upload foto atau PDF (maks 10MB)</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
              {editData?.attachment_url && !file && (
                <a href={editData.attachment_url} target="_blank" rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <HiOutlineArrowDownTray className="h-3.5 w-3.5" /> Lihat lampiran saat ini
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition">
              {saving ? "Menyimpan..." : editData ? "Simpan Perubahan" : "Tambah Laporan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ──────────────────────────────────────────────────────────
function DeleteModal({ open, onClose, onConfirm, target, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <HiOutlineExclamationTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Hapus Laporan?</h3>
        <p className="text-sm text-slate-500 mb-5">
          Laporan linen <strong>{target?.linen_type}</strong> tanggal{" "}
          <strong>{fmtDate(target?.report_date)}</strong> akan dihapus permanen.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition">
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function LinenReport() {
  const [records, setRecords] = useState([]);
  const [areas, setAreas] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: firstDayOfMonth(), endDate: todayISO(),
    area_id: "", hospital_id: "", finding_location: "",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const fetchData = useCallback(async (pg = pagination.page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: String(pagination.limit) });
      if (filters.startDate) qs.set("startDate", filters.startDate);
      if (filters.endDate)   qs.set("endDate", filters.endDate);
      if (filters.area_id)   qs.set("area_id", filters.area_id);
      if (filters.hospital_id) qs.set("hospital_id", filters.hospital_id);
      if (filters.finding_location) qs.set("finding_location", filters.finding_location);

      const res = await api(`/ikm/linen-report?${qs}`);
      setRecords(res.data || []);
      setPagination((p) => ({ ...p, page: pg, total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || 0 }));
      if (res.areas?.length)    setAreas(res.areas);
      if (res.hospitals?.length) setHospitals(res.hospitals);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // fetch meta on mount (for form dropdowns even when no records)
  useEffect(() => {
    api("/ikm/linen-report/meta").then((r) => {
      if (r.areas?.length) setAreas(r.areas);
      if (r.hospitals?.length) setHospitals(r.hospitals);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchData(1); }, [filters]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/ikm/linen-report/${deleteTarget.id}`, { method: "DELETE" });
      addToast("Laporan berhasil dihapus");
      setDeleteTarget(null);
      fetchData(pagination.page);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const locationBadge = (loc) => loc === "Rumah Sakit"
    ? "bg-blue-100 text-blue-700 border-blue-200"
    : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <Toast toasts={toasts} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <HiOutlineClipboardDocumentList className="h-6 w-6 text-blue-600" />
            Linen Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Catatan temuan & kondisi linen</p>
        </div>
        <button onClick={() => { setEditData(null); setFormOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm">
          <HiOutlinePlus className="h-4 w-4" /> Tambah Laporan
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineFunnel className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Filter</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
            <input type="date" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
            <input type="date" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Area</label>
            <select className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.area_id} onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}>
              <option value="">Semua Area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rumah Sakit</label>
            <select className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.hospital_id} onChange={(e) => setFilters({ ...filters, hospital_id: e.target.value })}>
              <option value="">Semua RS</option>
              {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Lokasi Temuan</label>
            <select className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.finding_location} onChange={(e) => setFilters({ ...filters, finding_location: e.target.value })}>
              <option value="">Semua Lokasi</option>
              {FINDING_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {loading ? "Memuat..." : `${pagination.total} laporan ditemukan`}
        </p>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500">Per halaman:</label>
          <select className="text-xs rounded-lg border border-slate-200 px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
            value={pagination.limit}
            onChange={(e) => setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}>
            {[25, 50, 100].map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table — Desktop */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">Pelapor</th>
                <th className="px-4 py-3 text-left">Area</th>
                <th className="px-4 py-3 text-left">Rumah Sakit</th>
                <th className="px-4 py-3 text-left">Lokasi</th>
                <th className="px-4 py-3 text-left">Jenis Linen</th>
                <th className="px-4 py-3 text-left">Temuan</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-center">Lampiran</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                    Tidak ada data laporan linen
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtDate(r.report_date)}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-800">{r.reporter_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.area_name || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.hospital_name || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-semibold", locationBadge(r.finding_location))}>
                        {r.finding_location}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{r.linen_type}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{r.finding_type}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {r.finding_qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.attachment_url ? (
                        <a href={r.attachment_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <HiOutlinePaperClip className="h-3.5 w-3.5" /> Lihat
                        </a>
                      ) : <span className="text-xs text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => { setEditData(r); setFormOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition">
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition">
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards — Mobile */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))
        ) : records.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            Tidak ada data
          </div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{r.linen_type} — {r.finding_type}</p>
                  <p className="text-[10px] text-slate-500">{fmtDate(r.report_date)} · {r.reporter_name}</p>
                </div>
                <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-semibold", locationBadge(r.finding_location))}>
                  {r.finding_location}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">
                <span>📍 {r.area_name || "-"}</span>
                <span>🏥 {r.hospital_name || "-"}</span>
                <span>📦 Qty: {r.finding_qty}</span>
              </div>
              {r.attachment_url && (
                <a href={r.attachment_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                  <HiOutlinePaperClip className="h-3 w-3" /> Lihat lampiran
                </a>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setEditData(r); setFormOpen(true); }}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-1">
                  <HiOutlinePencilSquare className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => setDeleteTarget(r)}
                  className="flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-1">
                  <HiOutlineTrash className="h-3.5 w-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Halaman {pagination.page} dari {pagination.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchData(pagination.page - 1)} disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
              <HiOutlineChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => fetchData(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
              <HiOutlineChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <FormModal open={formOpen} onClose={() => setFormOpen(false)}
        onSaved={() => { addToast(editData ? "Laporan diperbarui" : "Laporan ditambahkan"); fetchData(pagination.page); }}
        editData={editData} areas={areas} hospitals={hospitals} />

      <DeleteModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} target={deleteTarget} loading={deleting} />
    </div>
  );
}
