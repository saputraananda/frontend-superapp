import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineFunnel, HiOutlineXMark,
  HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineExclamationTriangle, HiOutlineClipboardDocumentList,
  HiOutlineArrowsUpDown, HiOutlineChevronUp, HiOutlineChevronDown,
  HiOutlineMagnifyingGlass, HiOutlineCheckCircle, HiOutlineClock,
  HiOutlineEye, HiOutlineRectangleGroup,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const CUTOFF_START_DAY = 26;

const PERIOD_MONTHS = [
  { value: 1, label: "Januari" }, { value: 2, label: "Februari" },
  { value: 3, label: "Maret" }, { value: 4, label: "April" },
  { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
  { value: 7, label: "Juli" }, { value: 8, label: "Agustus" },
  { value: 9, label: "September" }, { value: 10, label: "Oktober" },
  { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

function getDefaultCutoffSelection(now = new Date()) {
  const startDay = CUTOFF_START_DAY;
  const endDay = startDay - 1;
  let cutoffMonth = now.getMonth() + 1;
  let cutoffYear = now.getFullYear();
  if (now.getDate() > endDay) {
    cutoffMonth += 1;
    if (cutoffMonth > 12) { cutoffMonth = 1; cutoffYear += 1; }
  }
  const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
  const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
  return {
    cutoffMonth, cutoffYear,
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
}

function generatePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

const EMPTY_FORM = {
  reporter_name: "", report_date: todayISO(), hospital_id: "",
  hospital_linen_id: "", qty: 1, notes: "",
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
        toast.type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {toast.type === "error"
        ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
        : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

// ─── SortTh ───────────────────────────────────────────────────────────────────
function SortTh({ col, label, sort, onSort, className = "" }) {
  const active = sort.col === col;
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100",
        active ? "text-blue-600 bg-blue-50/60" : "text-slate-500",
        className,
      )}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sort.dir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />
        ) : (
          <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </th>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols = 8 }) {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className={cn("h-3.5 rounded-md bg-slate-200", i <= 1 ? "w-28" : i <= 3 ? "w-20" : "w-14")} />
        </td>
      ))}
    </tr>
  );
}

// ─── DeleteModal (React Portal) ──────────────────────────────────────────────
function DeleteModal({ open, onClose, onConfirm, target, loading }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <HiOutlineTrash className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Hapus Data Rewash?</h3>
        <p className="mt-1 text-sm text-slate-500 mb-5">
          Data rewash dari pelapor <span className="font-semibold text-slate-700">{target?.reporter_name}</span> tanggal{" "}
          <span className="font-semibold text-slate-700">{fmtDate(target?.report_date)}</span> akan dihapus permanen.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-2">
            {loading && <HiOutlineClock className="h-4 w-4 animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── FormModal (React Portal) ─────────────────────────────────────────────────
function FormModal({ open, onClose, onSaved, editData, hospitals }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [linens, setLinens] = useState([]);
  const [loadingLinens, setLoadingLinens] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editData) {
      setForm({
        reporter_name: editData.reporter_name || "",
        report_date: editData.report_date?.slice(0, 10) || todayISO(),
        hospital_id: String(editData.hospital_id || ""),
        hospital_linen_id: String(editData.hospital_linen_id || ""),
        qty: editData.qty ?? 1,
        notes: editData.notes || "",
      });
    } else {
      const user = getCurrentUser();
      setForm({ ...EMPTY_FORM, reporter_name: user.name || "" });
    }
    setError("");
    setLinens([]);
  }, [open, editData]);

  // Load linens dynamically when hospital changes
  useEffect(() => {
    if (!form.hospital_id) {
      setLinens([]);
      return;
    }
    const loadHospitalLinens = async () => {
      setLoadingLinens(true);
      try {
        const res = await api(`/ikm/hospital-linen/${form.hospital_id}`);
        setLinens(res.data || []);
      } catch (err) {
        console.error("Gagal load linen rumah sakit:", err);
      } finally {
        setLoadingLinens(false);
      }
    };
    loadHospitalLinens();
  }, [form.hospital_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editData) {
        await api(`/ikm/rewash-linen/${editData.id}/header`, {
          method: "PUT",
          body: JSON.stringify({
            reporter_name: form.reporter_name,
            report_date: form.report_date,
            notes: form.notes,
          }),
        });
      } else {
        await api("/ikm/rewash-linen", {
          method: "POST",
          body: JSON.stringify(form),
        });
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

  const labelClass = "block text-xs font-semibold text-slate-500 mb-1";
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white/95 backdrop-blur rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
              <HiOutlineClipboardDocumentList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {editData ? "Detail & Edit Rewash" : "Tambah Data Rewash"}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Nama Pelapor <span className="text-rose-500">*</span></label>
            <input className={inputClass} value={form.reporter_name} onChange={(e) => setForm({ ...form, reporter_name: e.target.value })} placeholder="Nama pelapor" required disabled={saving} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tanggal Laporan <span className="text-rose-500">*</span></label>
              <input type="date" className={inputClass} value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required disabled={saving} />
            </div>
            <div>
              <label className={labelClass}>Jumlah Qty <span className="text-rose-500">*</span></label>
              <input type="number" min="0" className={inputClass} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} required disabled={saving} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Rumah Sakit <span className="text-rose-500">*</span></label>
            <select className={inputClass} value={form.hospital_id} onChange={(e) => setForm({ ...form, hospital_id: e.target.value, hospital_linen_id: "" })} required disabled={saving}>
              <option value="">-- Pilih RS --</option>
              {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Linen Rumah Sakit <span className="text-rose-500">*</span></label>
            <select className={inputClass} value={form.hospital_linen_id} onChange={(e) => setForm({ ...form, hospital_linen_id: e.target.value })} required disabled={saving || loadingLinens || !form.hospital_id}>
              {loadingLinens ? (
                <option value="">Memuat linen...</option>
              ) : !form.hospital_id ? (
                <option value="">-- Pilih RS Terlebih Dahulu --</option>
              ) : linens.length === 0 ? (
                <option value="">Linen tidak ditemukan untuk RS ini</option>
              ) : (
                <>
                  <option value="">-- Pilih Linen --</option>
                  {linens.map((l) => {
                    const parts = [l.master_linen_name, l.size_name, l.color_name, l.material_name].filter(Boolean);
                    return (
                      <option key={l.id} value={l.id}>
                        {parts.join(" ")} ({l.ownership_type === "SEWA" ? "Sewa" : "Rumah Sakit"})
                      </option>
                    );
                  })}
                </>
              )}
            </select>
          </div>

          <div>
            <label className={labelClass}>Catatan (Notes)</label>
            <textarea className={inputClass + " min-h-[80px]"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan laporan rewash (opsional)" disabled={saving} />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Batal
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
              {saving && <HiOutlineClock className="h-4 w-4 animate-spin" />}
              {editData ? "Simpan Perubahan" : "Tambah Data"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── DetailModal — lihat/edit/hapus/tambah linen ────────────────────────────
function DetailModal({ open, onClose, group, onRefresh, hospitals }) {
  const [linens, setLinens] = useState([]);
  const [loadingLinens, setLoadingLinens] = useState(false);
  const [items, setItems] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addLinenId, setAddLinenId] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addError, setAddError] = useState("");
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && group) {
      setItems([...group.items]);
      setEditId(null);
      setAdding(false);
      setAddLinenId("");
      setAddQty(1);
      setAddError("");
      setError("");
    }
  }, [open, group]);

  // Load linens for the add dropdown
  useEffect(() => {
    if (!open || !group?.hospital_id) return;
    const load = async () => {
      setLoadingLinens(true);
      try {
        const res = await api(`/ikm/hospital-linen/${group.hospital_id}`);
        setLinens(res.data || []);
      } catch (err) {
        console.error("Gagal load linen:", err);
      } finally {
        setLoadingLinens(false);
      }
    };
    load();
  }, [open, group?.hospital_id]);

  // Available linens for add (exclude already added)
  const availableLinens = useMemo(() => {
    const usedIds = new Set(items.map(i => i.hospital_linen_id));
    return linens.filter(l => !usedIds.has(l.id));
  }, [linens, items]);

  const totalQty = useMemo(() => items.reduce((s, i) => s + (i.qty || 0), 0), [items]);

  // Edit qty inline
  const handleSaveQty = async (item) => {
    setSavingId(item.id);
    setError("");
    try {
      await api(`/ikm/rewash-linen/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ qty: item.edit_qty ?? item.qty }),
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: i.edit_qty ?? i.qty, edit_qty: undefined } : i));
      setEditId(null);
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  // Delete linen from rewash
  const handleDeleteItem = async (itemId) => {
    setDeletingId(itemId);
    setError("");
    try {
      await api(`/ikm/rewash-linen/${itemId}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== itemId));
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Add new linen
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addLinenId || !addQty) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await api("/ikm/rewash-linen", {
        method: "POST",
        body: JSON.stringify({
          reporter_name: group.reporter_name,
          report_date: group.report_date?.slice(0, 10),
          hospital_id: group.hospital_id,
          hospital_linen_id: Number(addLinenId),
          qty: addQty,
        }),
      });
      // Add to local items with basic info (full name comes from next fetch)
      const sel = linens.find(l => l.id === Number(addLinenId));
      const parts = [sel?.master_linen_name, sel?.size_name, sel?.color_name, sel?.material_name].filter(Boolean);
      setItems(prev => [...prev, {
        id: res.id,
        hospital_linen_id: Number(addLinenId),
        linen_display_name: parts.join(" "),
        master_linen_name: sel?.master_linen_name || "",
        qty: addQty,
      }]);
      setAddLinenId("");
      setAddQty(1);
      setAdding(false);
      onRefresh?.();
    } catch (err) {
      setAddError(err.message);
      setAdding(false);
    }
  };

  if (!open || !group) return null;

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white/95">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
              <HiOutlineRectangleGroup className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Detail Laporan Rewash</h2>
              <p className="text-xs text-slate-500">{fmtDate(group.report_date)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Info pelapor */}
        <div className="shrink-0 px-6 py-4 bg-slate-50/50 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Pelapor</span>
              <span className="text-sm font-bold text-slate-800">{group.reporter_name}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Rumah Sakit</span>
              <span className="text-sm font-semibold text-slate-700">{group.hospital_name}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Qty</span>
              <span className="inline-flex items-center justify-center h-7 rounded-full bg-orange-50 px-3 text-sm font-bold text-orange-700">{totalQty} Pcs</span>
            </div>
          </div>
          {group.notes && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Catatan</span>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{group.notes}</p>
            </div>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
              <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Tabel linen */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Daftar Linen Rewash</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 pb-2 px-2">No</th>
                  <th className="text-left text-xs font-semibold text-slate-500 pb-2 px-2">Nama Linen</th>
                  <th className="text-center text-xs font-semibold text-slate-500 pb-2 px-2 w-20">Qty</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 px-2 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="py-2.5 px-2 text-xs font-semibold text-slate-800">{item.linen_display_name}</td>
                    <td className="py-2.5 px-2 text-center">
                      {editId === item.id ? (
                        <div className="inline-flex items-center gap-1">
                          <input type="number" min="1"
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center outline-none focus:border-blue-400"
                            value={item.edit_qty ?? item.qty}
                            onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, edit_qty: Number(e.target.value) } : i))} />
                          <button onClick={() => handleSaveQty(item)} disabled={savingId === item.id}
                            className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                            {savingId === item.id ? <HiOutlineClock className="h-3 w-3 animate-spin" /> : "Simpan"}
                          </button>
                          <button onClick={() => { setEditId(null); setItems(prev => prev.map(i => i.id === item.id ? { ...i, edit_qty: undefined } : i)); }}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">
                            Batal
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-blue-50 px-2 text-xs font-bold text-blue-700">
                          {item.qty}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditId(item.id); setItems(prev => prev.map(i => i.id === item.id ? { ...i, edit_qty: i.qty } : i)); }}
                          className="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition" title="Edit qty">
                          <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} disabled={deletingId === item.id}
                          className="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:border-rose-300 hover:text-rose-600 transition disabled:opacity-50" title="Hapus">
                          {deletingId === item.id ? <HiOutlineClock className="h-3.5 w-3.5 animate-spin" /> : <HiOutlineTrash className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tambah linen baru */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tambah Linen Baru</h4>
            {addError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <HiOutlineExclamationTriangle className="h-3.5 w-3.5 shrink-0" />
                {addError}
              </div>
            )}
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="mb-1 block text-[10px] font-semibold text-slate-400">Pilih Linen</label>
                <select className={inputClass} value={addLinenId} onChange={(e) => setAddLinenId(e.target.value)} required disabled={adding || loadingLinens}>
                  {loadingLinens ? (
                    <option value="">Memuat...</option>
                  ) : availableLinens.length === 0 ? (
                    <option value="">Semua linen sudah ditambahkan</option>
                  ) : (
                    <>
                      <option value="">-- Pilih Linen --</option>
                      {availableLinens.map(l => {
                        const parts = [l.master_linen_name, l.size_name, l.color_name, l.material_name].filter(Boolean);
                        return <option key={l.id} value={l.id}>{parts.join(" ")}</option>;
                      })}
                    </>
                  )}
                </select>
              </div>
              <div className="w-24 shrink-0">
                <label className="mb-1 block text-[10px] font-semibold text-slate-400">Qty</label>
                <input type="number" min="1" className={inputClass} value={addQty} onChange={(e) => setAddQty(Number(e.target.value))} required disabled={adding} />
              </div>
              <button type="submit" disabled={adding || !addLinenId || !addQty}
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                {adding ? <HiOutlineClock className="h-4 w-4 animate-spin" /> : <HiOutlinePlus className="h-4 w-4" />}
                Tambah
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RewashLinen() {
  const [records, setRecords] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const todayStr = useMemo(() => toDateInput(new Date()), []);
  const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date()), []);

  // Filter States
  const [periodMode, setPeriodMode] = useState("cutoff");
  const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
  const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
  const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);

  const [filterRS, setFilterRS] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState({ col: "report_date", dir: "desc" });

  const [toast, setToast] = useState(null);

  // Dialog Modals
  const [detailGroup, setDetailGroup] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
  }, []);

  const activePeriod = useMemo(() => {
    if (periodMode === "today") return { startDate: todayStr, endDate: todayStr };
    if (periodMode === "custom") return { startDate: customStartDate || todayStr, endDate: customEndDate || customStartDate || todayStr };
    const startDay = CUTOFF_START_DAY;
    const endDay = startDay - 1;
    const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
    const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
    return { startDate: toDateInput(start), endDate: toDateInput(end) };
  }, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear]);

  // Load Data function
  const fetchData = useCallback(async (pg = pagination.page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(pg),
        limit: String(pagination.limit),
      });
      if (activePeriod.startDate) qs.set("startDate", activePeriod.startDate);
      if (activePeriod.endDate) qs.set("endDate", activePeriod.endDate);
      if (filterRS) qs.set("hospital_id", filterRS);
      if (search) qs.set("search", search);

      const res = await api(`/ikm/rewash-linen?${qs.toString()}`);
      setRecords(res.data || []);
      setPagination((p) => ({ ...p, page: pg, total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || 0 }));
      if (res.hospitals) setHospitals(res.hospitals);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [activePeriod.startDate, activePeriod.endDate, filterRS, search, pagination.limit, showToast]);

  useEffect(() => {
    api("/ikm/rewash-linen/meta").then((r) => {
      if (r.hospitals?.length) setHospitals(r.hospitals);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [activePeriod.startDate, activePeriod.endDate, filterRS, search, pagination.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formOpen || Boolean(deleteTarget)) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [formOpen, deleteTarget]);

  useEffect(() => {
    document.title = "Linen Rewash IKM | Alora Group Indonesia";
  }, []);

  // Sorting logic
  const handleSort = (col) => {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc",
    }));
  };

  const sortedGroups = useMemo(() => {
    if (!sort.col) return records;
    const sorted = [...records];
    sorted.sort((a, b) => {
      let valA, valB;

      if (sort.col === "report_date") {
        valA = new Date(a.report_date).getTime();
        valB = new Date(b.report_date).getTime();
        return sort.dir === "asc" ? valA - valB : valB - valA;
      }

      valA = String(a[sort.col] ?? "").toLowerCase();
      valB = String(b[sort.col] ?? "").toLowerCase();
      if (valA < valB) return sort.dir === "asc" ? -1 : 1;
      if (valA > valB) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [records, sort]);

  // Total qty across all groups
  const totalQty = useMemo(() => {
    return records.reduce((sum, g) => sum + g.items.reduce((s, i) => s + (i.qty || 0), 0), 0);
  }, [records]);


  // Delete Action
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/ikm/rewash-linen/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Data rewash linen berhasil dihapus");
      setDeleteTarget(null);
      fetchData(pagination.page);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handlePage = (p) => fetchData(Math.max(1, Math.min(p, pagination.totalPages)));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const pages = generatePages(pagination.page, pagination.totalPages);
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <Toast toast={toast} />

      <main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Page Header */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 p-5 shadow-sm sm:p-6">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-blue-300/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                  <HiOutlineClipboardDocumentList className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">Linen Rewash</h1>
                  <p className="text-sm text-white/70">Pemantauan &amp; rekapitulasi data rewash linen</p>
                </div>
              </div>
              <button
                onClick={() => { setEditRecord(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0"
              >
                <HiOutlinePlus className="h-4 w-4" /> Tambah Rewash
              </button>
            </div>
          </section>

          {/* Filters */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
              Filter
            </div>

            {/* Baris 1: Mode Periode + Bulan/Tahun/Custom */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Kolom 1: Mode Periode */}
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
                <select
                  value={periodMode}
                  onChange={(e) => { setPeriodMode(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="cutoff">Periode Cutoff</option>
                  <option value="today">Hari Ini</option>
                  <option value="custom">Custom Tanggal</option>
                </select>
              </label>

              {/* Kolom 2 */}
              {periodMode === "cutoff" && (
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
                  <select
                    value={cutoffMonth}
                    onChange={(e) => { setCutoffMonth(Number(e.target.value)); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    {PERIOD_MONTHS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                  </select>
                </label>
              )}
              {periodMode === "custom" && (
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
                  <input type="date"
                    value={customStartDate}
                    onChange={(e) => { setCustomStartDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
                </label>
              )}
              {periodMode === "today" && <div />}

              {/* Kolom 3 */}
              {periodMode === "cutoff" && (
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
                  <select
                    value={cutoffYear}
                    onChange={(e) => { setCutoffYear(Number(e.target.value)); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </label>
              )}
              {periodMode === "custom" && (
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
                  <input type="date"
                    value={customEndDate}
                    onChange={(e) => { setCustomEndDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
                </label>
              )}
              {periodMode === "today" && <div />}
            </div>

            {/* Baris 2: Rumah Sakit */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Rumah Sakit</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filterRS} onChange={(e) => setFilterRS(e.target.value)}>
                  <option value="">Semua RS</option>
                  {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
                </select>
              </label>
            </div>

            {/* Info periode aktif */}
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
              <span className="font-semibold">Periode aktif:</span>
              <span>{fmtDate(activePeriod.startDate)} — {fmtDate(activePeriod.endDate)}</span>
              <span className="mx-2 text-blue-300">|</span>
              <span className="font-semibold">Total Qty Rewash:</span>
              <span className="font-bold">{totalQty} Pcs</span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Cari pelapor, RS, jenis linen..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <button type="submit"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cari
                </button>
              </form>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Per halaman:</span>
                <select value={pagination.limit}
                  onChange={(e) => setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400">
                  {[25, 40, 50, 100].map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HiOutlineClipboardDocumentList className="h-5 w-5 text-blue-500" />
                <h2 className="text-base font-bold text-slate-800">Daftar Data Rewash Linen</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
                {pagination.total.toLocaleString("id-ID")} data
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap w-12">No</th>
                    <SortTh col="report_date" label="Tanggal" sort={sort} onSort={handleSort} />
                    <SortTh col="reporter_name" label="Pelapor" sort={sort} onSort={handleSort} />
                    <SortTh col="hospital_name" label="Rumah Sakit" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Jumlah Jenis Linen</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap w-24">Total Linen</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                  ) : sortedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                        Tidak ada data rewash linen
                      </td>
                    </tr>
                  ) : (
                    sortedGroups.map((g, idx) => (
                      <tr key={`${g.report_date}|${g.hospital_id}|${g.reporter_name}`}
                        className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setDetailGroup(g)}>
                        <td className="px-4 py-3.5 text-xs font-medium text-slate-400 tabular-nums">
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-700 font-medium">
                          {fmtDate(g.report_date)}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                          {g.reporter_name}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{g.hospital_name}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          <span className="text-xs font-medium text-slate-700">{g.items.length} linen</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-orange-50 px-2 text-xs font-bold text-orange-700 tabular-nums">
                            {g.items.reduce((s, i) => s + (i.qty || 0), 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button onClick={(e) => { e.stopPropagation(); setDetailGroup(g); }}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-amber-300 hover:text-amber-600 transition"
                              title="Lihat Detail">
                              <HiOutlineEye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded-md w-1/2" />
                    <div className="h-3 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-200 rounded-md w-1/3" />
                  </div>
                ))
              ) : sortedGroups.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Tidak ada data</div>
              ) : (
                sortedGroups.map((g) => (
                  <div key={`${g.report_date}|${g.hospital_id}|${g.reporter_name}`} className="p-4 space-y-2.5 cursor-pointer hover:bg-slate-50 hover:border-amber-100 transition rounded-xl mx-2 my-1 border border-transparent" onClick={() => setDetailGroup(g)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{g.reporter_name}</p>
                        <p className="text-xs text-slate-500">{fmtDate(g.report_date)} · {g.hospital_name}</p>
                      </div>
                      <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-orange-50 px-2 text-xs font-bold text-orange-700 tabular-nums shrink-0">
                        {g.items.reduce((s, i) => s + (i.qty || 0), 0)} Pcs
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>📋 {g.items.length} jenis linen</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); setDetailGroup(g); }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition">
                        <HiOutlineEye className="h-3.5 w-3.5" /> Detail
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {from}–{to} dari {pagination.total.toLocaleString("id-ID")} data
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePage(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
                    <HiOutlineChevronLeft className="h-4 w-4" />
                  </button>
                  {pages.map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs select-none">…</span>
                    ) : (
                      <button key={p} onClick={() => handlePage(p)}
                        className={cn(
                          "inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border text-xs font-semibold transition",
                          p === pagination.page
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}>
                        {p}
                      </button>
                    )
                  )}
                  <button onClick={() => handlePage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
                    <HiOutlineChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          showToast(editRecord ? "Data rewash diperbarui" : "Data rewash ditambahkan");
          fetchData(pagination.page);
        }}
        editData={editRecord}
        hospitals={hospitals}
      />

      <DetailModal
        open={Boolean(detailGroup)}
        onClose={() => setDetailGroup(null)}
        group={detailGroup}
        onRefresh={() => fetchData(pagination.page)}
        hospitals={hospitals}
      />

      <DeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        target={deleteTarget}
        loading={deleting}
      />
    </>
  );
}
