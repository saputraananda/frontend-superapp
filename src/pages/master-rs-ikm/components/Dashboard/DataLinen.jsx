import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../../../lib/api";
import {
  HiOutlineTableCells, HiOutlinePlus, HiOutlinePencilSquare,
  HiOutlineTrash, HiOutlineMagnifyingGlass, HiOutlineXMark,
  HiOutlineClock, HiOutlineExclamationTriangle, HiOutlineCheckCircle,
  HiOutlineCurrencyDollar, HiOutlineArchiveBox,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function fmtMoney(n) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

/* ── Toast ── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
      toast.type === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700",
    )}>
      {toast.type === "error"
        ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
        : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

/* ── Delete Confirmation Modal ── */
function DeleteModal({ open, onClose, onConfirm, target, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <HiOutlineTrash className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Hapus Linen?</h3>
        <p className="mt-1 text-sm text-slate-500 mb-5">
          Linen <span className="font-semibold text-slate-700">{target?.linen_name}</span> akan dihapus permanen.
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
    </div>
  );
}

/* ── Price History Modal ── */
function PriceHistoryModal({ open, onClose, linen, onToast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ purchase_price: "", effective_date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!linen) return;
    setLoading(true);
    try {
      const res = await api(`/ikm/master-linen/${linen.id}/price-history`);
      setHistory(res.data || []);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [linen, onToast]);

  useEffect(() => { if (open) fetchHistory(); }, [open, fetchHistory]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/ikm/master-linen/${linen.id}/price-history`, {
        method: "POST",
        body: JSON.stringify({
          purchase_price: Number(form.purchase_price),
          effective_date: form.effective_date,
          notes: form.notes,
        }),
      });
      setAddOpen(false);
      setForm({ purchase_price: "", effective_date: "", notes: "" });
      fetchHistory();
      onToast?.("Harga beli berhasil ditambahkan");
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (priceId) => {
    if (!confirm("Hapus riwayat harga ini?")) return;
    try {
      await api(`/ikm/master-linen/price-history/${priceId}`, { method: "DELETE" });
      fetchHistory();
      onToast?.("Riwayat harga berhasil dihapus");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800">Riwayat Harga Beli</h3>
            <p className="text-xs text-slate-500 mt-0.5">{linen?.linen_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
            <HiOutlineXMark className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!addOpen && (
            <button onClick={() => setAddOpen(true)}
              className="w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-slate-500 hover:border-red-400 hover:text-red-600 transition flex items-center justify-center gap-2">
              <HiOutlinePlus className="h-4 w-4" /> Tambah Harga Baru
            </button>
          )}

          {addOpen && (
            <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Harga Beli (Rp) <span className="text-rose-500">*</span></label>
                  <input type="number" value={form.purchase_price}
                    onChange={e => setForm(p => ({ ...p, purchase_price: e.target.value }))}
                    required min={0} step="100"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tgl Efektif <span className="text-rose-500">*</span></label>
                  <input type="date" value={form.effective_date}
                    onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
                <input type="text" value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Opsional"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAddOpen(false)} disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition flex items-center gap-1">
                  {saving && <HiOutlineClock className="h-3 w-3 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="py-8 text-center text-slate-400"><HiOutlineClock className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Belum ada riwayat harga</div>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{fmtMoney(h.purchase_price)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Efektif: {fmtDate(h.effective_date)}{h.notes ? ` — ${h.notes}` : ""}</div>
                  </div>
                  <button onClick={() => handleDelete(h.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Form Modal (Create/Edit) ── */
function LinenFormModal({ open, onClose, onSave, editData, loading, categories, sizes, colors, materials }) {
  const isEdit = Boolean(editData);
  const initialForm = useMemo(() => ({
    linen_code: editData?.linen_code || "",
    linen_name: editData?.linen_name || "",
    category_id: editData?.category_id || "",
    size_id: editData?.size_id || "",
    color_id: editData?.color_id || "",
    material_id: editData?.material_id || "",
    default_qty: editData?.default_qty ?? 0,
    description: editData?.description || "",
  }), [editData]);
  const [form, setForm] = useState(initialForm);

  useEffect(() => { setForm(initialForm); }, [initialForm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-slate-800">{isEdit ? "Edit Linen" : "Tambah Linen Baru"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
            <HiOutlineXMark className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kode Linen</label>
              <input type="text" value={form.linen_code}
                onChange={e => setForm(p => ({ ...p, linen_code: e.target.value }))}
                placeholder="Contoh: LIN-001"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Linen <span className="text-rose-500">*</span>
              </label>
              <input type="text" value={form.linen_name}
                onChange={e => setForm(p => ({ ...p, linen_name: e.target.value }))}
                placeholder="Contoh: Sprei Single"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ukuran</label>
              <select value={form.size_id}
                onChange={e => setForm(p => ({ ...p, size_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition bg-white">
                <option value="">— Pilih —</option>
                {sizes.map(s => (
                  <option key={s.id} value={s.id}>{s.size_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Warna</label>
              <select value={form.color_id}
                onChange={e => setForm(p => ({ ...p, color_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition bg-white">
                <option value="">— Pilih —</option>
                {colors.map(c => (
                  <option key={c.id} value={c.id}>{c.color_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bahan</label>
              <select value={form.material_id}
                onChange={e => setForm(p => ({ ...p, material_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition bg-white">
                <option value="">— Pilih —</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.material_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Qty Default</label>
              <input type="number" value={form.default_qty}
                onChange={e => setForm(p => ({ ...p, default_qty: Number(e.target.value) }))}
                min={0}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori</label>
              <select value={form.category_id}
                onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition bg-white">
                <option value="">— Pilih (opsional) —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.category_code} — {cat.category_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi</label>
            <textarea value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Deskripsi singkat (opsional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2">
              {loading && <HiOutlineClock className="h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */
export default function DataLinenPage() {
  const PAGE_OPTS = [10, 25, 50, "ALL"];
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [priceTarget, setPriceTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => { document.title = "Data Linen IKM | Alora Group Indonesia"; }, []);

  /* fetch master data for dropdowns */
  useEffect(() => {
    (async () => {
      try {
        const [catRes, szRes, clRes, mtRes] = await Promise.all([
          api("/ikm/master-linen/categories"),
          api("/ikm/master-linen/sizes"),
          api("/ikm/master-linen/colors"),
          api("/ikm/master-linen/materials"),
        ]);
        setCategories(catRes || []);
        setSizes(szRes || []);
        setColors(clRes || []);
        setMaterials(mtRes || []);
      } catch { /* silent */ }
    })();
  }, []);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const effectiveLimit = limit === "ALL" ? 9999 : limit;
  const totalPages = total > 0 ? Math.ceil(total / effectiveLimit) : 1;

  const fetchData = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: String(effectiveLimit) });
      if (search) qs.set("search", search);
      if (filterCategory) qs.set("category_id", filterCategory);
      const res = await api(`/ikm/master-linen?${qs}`);
      setData(res.data || []);
      setTotal(res.pagination?.total || 0);
      setPage(res.pagination?.page || pg);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [effectiveLimit, search, filterCategory, showToast]);

  useEffect(() => { fetchData(1); }, [limit, search, filterCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Body scroll lock */
  useEffect(() => {
    if (formOpen || Boolean(deleteTarget) || Boolean(priceTarget)) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [formOpen, deleteTarget, priceTarget]);

  /* Save (create/update) */
  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editData) {
        await api(`/ikm/master-linen/${editData.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        showToast("Linen berhasil diperbarui");
      } else {
        await api("/ikm/master-linen", {
          method: "POST",
          body: JSON.stringify(form),
        });
        showToast("Linen berhasil ditambahkan");
      }
      setFormOpen(false);
      setEditData(null);
      fetchData(page);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  /* Delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/ikm/master-linen/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Linen berhasil dihapus");
      setDeleteTarget(null);
      fetchData(page);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => { setEditData(null); setFormOpen(true); };
  const openEdit = (row) => { setEditData(row); setFormOpen(true); };

  return (
    <>
      <Toast toast={toast} />

      <div className="flex flex-col min-h-full bg-rose-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-orange-500 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                <HiOutlineTableCells className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Data Linen</h1>
                <p className="text-sm text-red-100 mt-0.5">Manajemen master data linen IKM</p>
              </div>
            </div>
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm">
              <HiOutlinePlus className="h-4 w-4" /> Tambah Linen
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-4">
          {/* Search & Filter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Cari kode / nama / kategori / deskripsi..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition" />
              </div>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                <option value="">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 whitespace-nowrap">Tampil:</label>
                <select
                  value={limit}
                  onChange={e => setLimit(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 focus:ring-2 focus:ring-red-500 outline-none"
                >
                  {PAGE_OPTS.map(o => (
                    <option key={o} value={o}>{o === "ALL" ? "Semua" : o}</option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-slate-500">{total} data</span>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs w-10">No</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">Kode</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">Nama Linen</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">Ukuran</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">Warna</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">Bahan</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">Qty</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">Kategori</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <HiOutlineClock className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Memuat data...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <HiOutlineTableCells className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold">Belum ada data linen</p>
                        <p className="text-xs mt-1">Klik tombol "Tambah Linen" untuk menambahkan data baru</p>
                      </td>
                    </tr>
                  ) : data.map((row, i) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-xs text-slate-400">{(page - 1) * effectiveLimit + i + 1}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-xs font-mono font-semibold">
                          {row.linen_code || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{row.linen_name}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{row.size_name || "—"}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{row.color_name || "—"}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{row.material_name || "—"}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{row.default_qty ?? 0}</td>
                      <td className="py-3 px-4">
                        {row.category_name
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">{row.category_name}</span>
                          : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => setPriceTarget(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                            title="Riwayat Harga Beli">
                            <HiOutlineCurrencyDollar className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition"
                            title="Edit">
                            <HiOutlinePencilSquare className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus">
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && limit !== "ALL" && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <span className="text-xs text-slate-500">
                  Halaman {page} dari {totalPages}
                </span>
                <div className="flex gap-1">
                  <button disabled={page <= 1}
                    onClick={() => fetchData(page - 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">
                    Prev
                  </button>
                  {(() => {
                    const maxVisible = 5;
                    let start = Math.max(1, page - Math.floor(maxVisible / 2));
                    let end = Math.min(totalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) {
                      start = Math.max(1, end - maxVisible + 1);
                    }
                    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                    <button key={p} onClick={() => fetchData(p)}
                      className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg border transition",
                        p === page
                          ? "bg-red-600 text-white border-red-600"
                          : "border-slate-200 hover:bg-slate-50"
                      )}>
                      {p}
                    </button>
                    ));
                  })()}
                  <button disabled={page >= totalPages}
                    onClick={() => fetchData(page + 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LinenFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditData(null); }}
        onSave={handleSave}
        editData={editData}
        loading={saving}
        categories={categories}
        sizes={sizes}
        colors={colors}
        materials={materials}
      />
      <DeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        target={deleteTarget}
        loading={deleting}
      />
      <PriceHistoryModal
        open={Boolean(priceTarget)}
        onClose={() => setPriceTarget(null)}
        linen={priceTarget}
        onToast={showToast}
      />
    </>
  );
}
