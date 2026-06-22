import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXCircle,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { formatRupiah, formatRupiahInput, parseRupiahInput } from "../../utils/rupiah";

function cn(...c) { return c.filter(Boolean).join(" "); }

const inputCls = cn(
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
  "outline-none transition-all placeholder:text-slate-300",
  "focus:ring-2 focus:ring-red-500/30 focus:border-red-400",
  "hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
);

function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</label>
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={cn("fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl",
      toast.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
      {toast.msg}
    </div>
  );
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <HiOutlineTrash className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-500 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
            Batal
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50">
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  linen_id: "",
  hospital_linen_name: "",
  ownership_type: "MILIK_RS",
  unit: "PCS",
  grammage: "",
  washing_price_type: "PCS",
  washing_price: "0",
  rental_price: "0",
  par_stock: "0",
  min_stock: "0",
  is_active: true,
};

export default function HospitalLinenPage({ hospitalId }) {
  const [items, setItems] = useState([]);
  const [linenList, setLinenList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hospitalName, setHospitalName] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Modal tabs: "form" or "quick"
  const [modalTab, setModalTab] = useState("form");
  const [quickSelected, setQuickSelected] = useState([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  // Searchable dropdown
  const [ddOpen, setDdOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");
  const ddRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { document.title = `${hospitalName || "Linen RS"} IKM | Alora Group Indonesia`; }, [hospitalName]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/ikm/master-rs/hospitals");
        const hospitals = res.data || [];
        const h = hospitals.find(h => h.id === hospitalId);
        if (h) setHospitalName(h.hospital_name);
      } catch { /* silent */ }
    })();
  }, [hospitalId]);

  const showToast = useCallback((type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); }, []);

  const basePath = `/ikm/hospital-linen/${hospitalId}`;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api(basePath);
      setItems(r.data || []);
    } catch { showToast("error", "Gagal memuat data linen RS"); }
    finally { setLoading(false); }
  }, [basePath, showToast]);

  const fetchLinenList = useCallback(async () => {
    try {
      const r = await api("/ikm/hospital-linen/linen-list");
      setLinenList(r.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchLinenList(); }, [fetchLinenList]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDdSearch("");
    setModalTab("form");
    setQuickSelected([]);
    setQuickSearch("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setModalTab("form");
    setForm({
      linen_id: item.linen_id,
      hospital_linen_name: item.hospital_linen_name || "",
      ownership_type: item.ownership_type,
      unit: item.unit,
      grammage: item.grammage ?? "",
      washing_price_type: item.washing_price_type,
      washing_price: String(item.washing_price ?? "0"),
      rental_price: String(item.rental_price ?? "0"),
      par_stock: String(item.par_stock ?? "0"),
      min_stock: String(item.min_stock ?? "0"),
      is_active: Boolean(item.is_active),
    });
    setErrors({});
    setDdSearch("");
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const selectedLinen = linenList.find(l => l.id === form.linen_id);

  const validate = () => {
    const e = {};
    if (!form.linen_id) e.linen_id = "Linen wajib dipilih";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      ...form,
      grammage: form.grammage ? parseFloat(form.grammage) : null,
      washing_price: parseFloat(form.washing_price),
      rental_price: parseFloat(form.rental_price),
      par_stock: parseInt(form.par_stock) || 0,
      min_stock: parseInt(form.min_stock) || 0,
    };
    try {
      if (editTarget) {
        await api(`${basePath}/${editTarget.id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("success", "Linen RS berhasil diperbarui");
      } else {
        await api(basePath, { method: "POST", body: JSON.stringify(payload) });
        showToast("success", "Linen RS berhasil ditambahkan");
      }
      closeModal();
      fetchItems();
    } catch (err) { showToast("error", err?.message || "Terjadi kesalahan"); }
    finally { setSaving(false); }
  };

  const handleQuickAdd = async () => {
    if (!quickSelected.length) return;
    setQuickSaving(true);
    let ok = 0, fail = 0;
    for (const lid of quickSelected) {
      try {
        await api(basePath, { method: "POST", body: JSON.stringify({ linen_id: lid }) });
        ok++;
      } catch { fail++; }
    }
    showToast("success", `${ok} linen berhasil ditambahkan${fail ? `, ${fail} gagal` : ""}`);
    setQuickSaving(false);
    setQuickSelected([]);
    setQuickSearch("");
    closeModal();
    fetchItems();
  };

  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.size) return;
    setBatchConfirmOpen(true);
  };

  const executeBatchDelete = async () => {
    setBatchConfirmOpen(false);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try { await api(`${basePath}/${id}`, { method: "DELETE" }); ok++; }
      catch { fail++; }
    }
    showToast("success", `${ok} dihapus${fail ? `, ${fail} gagal` : ""}`);
    setSelectedIds(new Set());
    setBatchLoading(false);
    fetchItems();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api(`${basePath}/${deleteTarget.id}`, { method: "DELETE" }); showToast("success", "Linen RS berhasil dihapus"); fetchItems(); }
    catch (err) { showToast("error", err?.message || "Gagal menghapus"); }
    finally { setConfirmOpen(false); setDeleteTarget(null); setDeleting(false); }
  };

  const filtered = items.filter((a) => {
    const s = (a.master_linen_name + " " + (a.hospital_linen_name || "")).toLowerCase().includes(search.toLowerCase());
    return s;
  });

  // Quick-add list: all linen available
  const quickLinenList = linenList
    .sort((a, b) => ((a.linen_code || "")).localeCompare(b.linen_code || ""));
  const filteredQuick = quickLinenList.filter(l =>
    l.linen_name.toLowerCase().includes(quickSearch.toLowerCase()) ||
    (l.linen_code || "").toLowerCase().includes(quickSearch.toLowerCase())
  );

  const filteredDd = linenList.filter(l =>
    l.linen_name.toLowerCase().includes(ddSearch.toLowerCase()) ||
    (l.linen_code || "").toLowerCase().includes(ddSearch.toLowerCase())
  ).sort((a, b) => ((a.linen_code || "")).localeCompare(b.linen_code || ""));

  const SkeletonRows = () => (<>{Array.from({ length: 4 }).map((_, i) => (<tr key={i} className="animate-pulse">{[4, 36, 14, 14, 18, 14, 14, 14, 14].map((w, j) => (<td key={j} className="px-5 py-4"><div className={`h-3.5 rounded-md bg-slate-100 w-${w}`} /></td>))}</tr>))}</>);

  return (
    <div className="p-6 pb-14">
      <Toast toast={toast} />
      <ConfirmDialog
        open={confirmOpen} title="Hapus Linen RS"
        message={`Yakin ingin menghapus linen "${deleteTarget?.master_linen_name}" dari ${hospitalName}?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        loading={deleting}
      />
      <ConfirmDialog
        open={batchConfirmOpen} title="Hapus Linen Massal"
        message={`Yakin ingin menghapus ${selectedIds.size} linen dari ${hospitalName}?`}
        onConfirm={executeBatchDelete}
        onCancel={() => setBatchConfirmOpen(false)}
        loading={batchLoading}
      />

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-800 to-orange-500 shadow-sm">
            <HiOutlineBuildingOffice2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">{hospitalName}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{items.length} linen terdaftar</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition active:scale-95">
          <HiOutlinePlus className="h-4 w-4" /> Tambah Linen
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari linen..." className={cn(inputCls, "pl-10")} />
        </div>
      </div>

      {/* Batch delete bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl mb-3">
          <span className="text-sm font-semibold text-rose-700">{selectedIds.size} dipilih</span>
          <button onClick={handleBatchDelete} disabled={batchLoading}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50">
            {batchLoading ? "Menghapus..." : `Hapus ${selectedIds.size} Linen`}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700 ml-auto">Batal</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <HiOutlineBuildingOffice2 className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Belum ada linen untuk RS ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {["No", "Nama Linen", "Nama di RS", "Kepemilikan", "Satuan", "Gramasi", "Harga Cuci", "Harga Sewa", "Status", "Aksi"].map((h, i) => (
                    <th key={h} className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider", i === 9 ? "text-center" : "text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <SkeletonRows /> : filtered.map((a, i) => (
                  <tr key={a.id} className={cn("hover:bg-slate-50/60 transition", selectedIds.has(a.id) && "bg-red-50/40")}>
                    <td className="px-4 py-4 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-4 font-semibold text-slate-800 whitespace-nowrap">{a.master_linen_name}{[a.size_name, a.color_name, a.material_name].filter(Boolean).length ? <span> {[a.size_name, a.color_name, a.material_name].filter(Boolean).join(" ")}</span> : ""}</td>
                    <td className="px-4 py-4 text-slate-600">{a.hospital_linen_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", a.ownership_type === "MILIK_RS" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700")}>{a.ownership_type}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{a.unit}</td>
                    <td className="px-4 py-4 text-slate-600">{a.grammage ? `${a.grammage} g` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-4 text-slate-800 font-semibold whitespace-nowrap">{a.washing_price_type === "KG" ? `${formatRupiah(a.washing_price)}/Kg` : formatRupiah(a.washing_price)}</td>
                    <td className="px-4 py-4 text-slate-800 font-semibold whitespace-nowrap">{formatRupiah(a.rental_price)}</td>
                    <td className="px-4 py-4">
                      {a.is_active
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><HiOutlineCheckCircle className="h-4 w-4" /> Aktif</span>
                        : <span className="flex items-center gap-1 text-xs font-semibold text-rose-500"><HiOutlineXCircle className="h-4 w-4" /> Nonaktif</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(a)} className="flex items-center justify-center h-8 w-8 rounded-lg border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 transition" title="Edit">
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setDeleteTarget(a); setConfirmOpen(true); }} className="flex items-center justify-center h-8 w-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition" title="Hapus">
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                        <input type="checkbox" checked={selectedIds.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500" title="Pilih" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-7xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50"><HiOutlineBuildingOffice2 className="h-4 w-4 text-red-600" /></div>
                <h2 className="text-base font-bold text-slate-800">{editTarget ? "Edit Linen RS" : "Tambah Linen RS"}</h2>
              </div>
              <button onClick={closeModal} className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><HiOutlineXMark className="h-4 w-4" /></button>
            </div>

            {/* ── Tab bar ── */}
            {!editTarget && (
              <div className="flex border-b border-slate-100 px-6 shrink-0">
                <button type="button" onClick={() => setModalTab("form")}
                  className={cn("pb-3 pt-3 text-sm font-semibold border-b-2 transition -mb-px mr-6",
                    modalTab === "form" ? "border-red-600 text-red-700" : "border-transparent text-slate-400 hover:text-slate-600")}>
                  Form Detail
                </button>
                <button type="button" onClick={() => setModalTab("quick")}
                  className={cn("pb-3 pt-3 text-sm font-semibold border-b-2 transition -mb-px",
                    modalTab === "quick" ? "border-red-600 text-red-700" : "border-transparent text-slate-400 hover:text-slate-600")}>
                  Tambah Linen Cepat
                </button>
              </div>
            )}

            {/* ── Tab: Form Detail ── */}
            {modalTab === "form" && (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Pilih Linen" required error={errors.linen_id}>
                    <div className="relative" ref={ddRef}>
                      <button type="button" onClick={() => setDdOpen(p => !p)}
                        className={cn(inputCls, "flex items-center justify-between text-left", !selectedLinen && "text-slate-400")}>
                        <span className="truncate">{selectedLinen ? `${selectedLinen.linen_name}${selectedLinen.linen_code ? ` (${selectedLinen.linen_code})` : ""}` : "— Cari & Pilih Linen —"}</span>
                        <svg className={cn("h-4 w-4 shrink-0 text-slate-400 transition", ddOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                      </button>
                      {ddOpen && (
                        <div className="absolute left-0 top-full mt-1 z-50 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-slate-100">
                            <input type="text" value={ddSearch} onChange={(e) => setDdSearch(e.target.value)}
                              placeholder="Cari linen..." className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200" autoFocus />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredDd.length === 0 ? (
                              <p className="px-3 py-4 text-xs text-slate-400 text-center">Tidak ditemukan</p>
                            ) : filteredDd.map(l => (
                              <button key={l.id} type="button" onClick={() => { setForm({ ...form, linen_id: l.id }); setDdOpen(false); setDdSearch(""); }}
                                className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition", form.linen_id === l.id ? "bg-red-50 text-red-700 font-semibold" : "text-slate-600 hover:bg-slate-50")}>
                                <span className="font-medium">{l.linen_name}</span>
                                {l.linen_code && <span className="text-xs text-slate-400">({l.linen_code})</span>}
                                {form.linen_id === l.id && <svg className="ml-auto h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Field>
                  <Field label="Nama di RS (opsional)">
                    <input className={inputCls} placeholder="Nama khusus di RS ini" value={form.hospital_linen_name} onChange={(e) => setForm({ ...form, hospital_linen_name: e.target.value })} />
                  </Field>
                  <Field label="Kepemilikan">
                    <select className={inputCls} value={form.ownership_type} onChange={(e) => setForm({ ...form, ownership_type: e.target.value })}>
                      <option value="MILIK_RS">Milik RS</option>
                      <option value="SEWA">Sewa</option>
                    </select>
                  </Field>
                  <Field label="Satuan">
                    <input className={inputCls} placeholder="PCS" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                  </Field>
                  <Field label="Gramasi (g)">
                    <input className={inputCls} type="number" step="0.01" min="0" placeholder="150" value={form.grammage} onChange={(e) => setForm({ ...form, grammage: e.target.value })} />
                  </Field>
                  <Field label="Tipe Harga Cuci">
                    <select className={inputCls} value={form.washing_price_type} onChange={(e) => setForm({ ...form, washing_price_type: e.target.value })}>
                      <option value="PCS">Per Pcs</option>
                      <option value="KG">Per Kg</option>
                    </select>
                  </Field>
                  <Field label="Harga Cuci" error={errors.washing_price}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">Rp</span>
                      <input className={cn(inputCls, "pl-9")} type="text" inputMode="numeric" placeholder="0"
                        value={formatRupiahInput(form.washing_price)}
                        onChange={(e) => setForm({ ...form, washing_price: parseRupiahInput(e.target.value) })} />
                    </div>
                  </Field>
                  <Field label="Harga Sewa" error={errors.rental_price}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">Rp</span>
                      <input className={cn(inputCls, "pl-9")} type="text" inputMode="numeric" placeholder="0"
                        value={formatRupiahInput(form.rental_price)}
                        onChange={(e) => setForm({ ...form, rental_price: parseRupiahInput(e.target.value) })} />
                    </div>
                  </Field>
                  <Field label="Status">
                    <div className="flex items-center gap-3 h-[42px]">
                      <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })}
                        className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors", form.is_active ? "bg-emerald-500" : "bg-slate-200")}>
                        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", form.is_active ? "translate-x-5" : "translate-x-0")} />
                      </button>
                      <span className={cn("text-sm font-semibold", form.is_active ? "text-emerald-600" : "text-slate-400")}>{form.is_active ? "Aktif" : "Nonaktif"}</span>
                    </div>
                  </Field>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition">
                    {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Linen"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Tab: Tambah Linen Cepat ── */}
            {modalTab === "quick" && (
              <div className="px-6 py-5 overflow-y-auto">
                <div className="relative mb-4">
                  <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="text" value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Cari linen..." className={cn(inputCls, "pl-10")} autoFocus />
                </div>

                {quickLinenList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <HiOutlineCheckCircle className="h-8 w-8 text-emerald-400" />
                    <p className="text-sm font-semibold">Semua linen sudah terdaftar</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-80 overflow-y-auto -mx-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 px-2">
                        {filteredQuick.map(l => {
                          const checked = quickSelected.includes(l.id);
                          return (
                            <label key={l.id} className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition",
                              checked ? "bg-red-50 text-red-800" : "hover:bg-slate-50 text-slate-700"
                            )}>
                              <input type="checkbox" checked={checked}
                                onChange={() => {
                                  setQuickSelected(prev =>
                                    checked ? prev.filter(id => id !== l.id) : [...prev, l.id]
                                  );
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{l.linen_name}</p>
                                {l.linen_code && <p className="text-xs text-slate-400">{l.linen_code}</p>}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                      <p className="text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">{quickSelected.length}</span> linen dipilih
                      </p>
                      <div className="flex gap-3">
                        <button type="button" onClick={closeModal}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                          Batal
                        </button>
                        <button type="button" disabled={!quickSelected.length || quickSaving}
                          onClick={handleQuickAdd}
                          className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition inline-flex items-center gap-2">
                          {quickSaving ? "Menyimpan..." : `Tambah ${quickSelected.length} Linen`}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
