import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineArrowsUpDown,
  HiOutlineSparkles,
  HiOutlinePhone,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatRupiah(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val) || 0);
}

function SortTh({ col, label, sortBy, sortDir, onSort, className = "" }) {
  const active = sortBy === col;
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-slate-100", active ? "text-[#5f1340] bg-[#5f1340]/10" : "text-slate-500", className)} onClick={() => onSort(col)}>
      <div className="flex items-center gap-1">{label}{active ? (sortDir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />) : <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />}</div>
    </th>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", Number(isActive) === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500")}>
      {Number(isActive) === 1 ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function TierBadge({ name, code }) {
  const colors = {
    VIP: "bg-purple-50 text-purple-700 border-purple-200",
    GOLD: "bg-amber-50 text-amber-700 border-amber-200",
    REGULER: "bg-slate-100 text-slate-700 border-slate-200",
    ONE_TIME: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const key = (code || name || "").toUpperCase().replace("-", "_");
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border", colors[key] || "bg-slate-100 text-slate-700 border-slate-200")}>
      <HiOutlineSparkles className="h-3 w-3" />{name || "—"}
    </span>
  );
}

const EMPTY_FORM = {
  id: null,
  customer_code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  postal_code: "",
  landmark: "",
  home_branch: "",
  preferred_outlet_id: "",
  spending_tier_id: "",
  customer_source_id: "",
  notes: "",
  is_active: 1,
};

function FormSection({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f1340]">{title}</p>
      {children}
    </div>
  );
}

function toFormData(item) {
  return {
    id: item.id ?? null,
    customer_code: item.customer_code || "",
    name: item.name || "",
    phone: item.phone || "",
    email: item.email || "",
    address: item.address || "",
    city: item.city || "",
    postal_code: item.postal_code || "",
    landmark: item.landmark || "",
    home_branch: item.home_branch || "",
    preferred_outlet_id: item.preferred_outlet_id || "",
    spending_tier_id: item.spending_tier_id || "",
    customer_source_id: item.customer_source_id || "",
    notes: item.notes || "",
    is_active: Number(item.is_active) === 0 ? 0 : 1,
  };
}

export default function Customer() {
  const [data, setData] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [sources, setSources] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterTierId, setFilterTierId] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const loadLookups = async () => {
    try {
      const [tierRes, sourceRes, outletRes] = await Promise.all([
        api("/waschen/customer-tiers?isActive=1"),
        api("/waschen/customer-sources?isActive=1"),
        api("/waschen/outlets"),
      ]);
      setTiers(tierRes.data || []);
      setSources(sourceRes.data || []);
      setOutlets(outletRes.data || []);
    } catch { /* optional */ }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (filterActive) query.set("isActive", filterActive);
      if (filterTierId) query.set("spendingTierId", filterTierId);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);
      const res = await api(`/waschen/customers?${query.toString()}`);
      setData(res.data || []);
    } catch (err) { showToast(err.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadLookups();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterActive, filterTierId, sortBy, sortDir]);

  const handleSort = (col) => { if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) { setFormError("Nama dan Nomor Telepon wajib diisi"); return; }
    setSubmitting(true); setFormError("");
    try {
      const payload = {
        customer_code: formData.customer_code.trim() || undefined,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        landmark: formData.landmark.trim() || null,
        home_branch: formData.home_branch.trim() || null,
        preferred_outlet_id: formData.preferred_outlet_id ? Number(formData.preferred_outlet_id) : null,
        spending_tier_id: formData.spending_tier_id ? Number(formData.spending_tier_id) : null,
        customer_source_id: formData.customer_source_id ? Number(formData.customer_source_id) : null,
        notes: formData.notes.trim() || null,
        is_active: Number(formData.is_active),
      };
      if (formData.id) {
        await api(`/waschen/customers/${formData.id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Pelanggan berhasil diperbarui");
      } else {
        await api("/waschen/customers", { method: "POST", body: JSON.stringify(payload) });
        showToast("Pelanggan berhasil ditambahkan");
      }
      setModalOpen(false); loadData();
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/customers/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Pelanggan berhasil dihapus"); setDeleteTarget(null); loadData();
    } catch (err) { showToast(err.message, "error"); } finally { setDeleting(false); }
  };

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((d) => Number(d.is_active) === 1).length,
    vip: data.filter((d) => d.spending_tier_code === "VIP").length,
    totalDeposit: data.reduce((sum, d) => sum + (Number(d.deposit_balance) || 0), 0),
  }), [data]);

  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340] focus:ring-1 focus:ring-[#5f1340]";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[90rem] mx-auto">
      {toast && (
        <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl", toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <PageHero>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Master Pelanggan</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Kelola data pelanggan laundry Waschen
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFormData(EMPTY_FORM); setFormError(""); setModalOpen(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Tambah Pelanggan
            </button>
          
        
      </PageHero>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { l: "Total Pelanggan", v: stats.total },
          { l: "Aktif", v: stats.active, c: "text-emerald-600" },
          { l: "Tier VIP", v: stats.vip, c: "text-purple-600" },
          { l: "Total Deposit", v: formatRupiah(stats.totalDeposit), c: "text-[#5f1340]", small: true },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.l}</p>
            <p className={cn(s.small ? "text-lg" : "text-2xl", "font-bold mt-0.5", s.c || "text-slate-800")}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-80">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Cari kode, nama, telepon..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
          </div>
          <select value={filterTierId} onChange={(e) => setFilterTierId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <option value="">Semua Tier Spending</option>
            {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <option value="">Semua Status</option><option value="1">Aktif</option><option value="0">Nonaktif</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <SortTh col="customer_code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="phone" label="Telepon" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Outlet</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Sumber</th>
                <SortTh col="deposit_balance" label="Deposit" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="total_orders" label="Order" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={11} className="px-4 py-4"><div className="h-3.5 bg-slate-200 rounded animate-pulse" /></td></tr>
              )) : data.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">Tidak ada data pelanggan</td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{item.customer_code || "—"}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    {item.city && <p className="text-[10px] text-slate-400 mt-0.5">{item.city}</p>}
                  </td>
                  <td className="px-4 py-3.5"><span className="inline-flex items-center gap-1 text-slate-600"><HiOutlinePhone className="h-3 w-3" />{item.phone}</span></td>
                  <td className="px-4 py-3.5 text-slate-600">{item.preferred_outlet_name || item.home_branch || "—"}</td>
                  <td className="px-4 py-3.5"><TierBadge name={item.spending_tier_name} code={item.spending_tier_code} /></td>
                  <td className="px-4 py-3.5 text-slate-600">{item.customer_source_label || item.customer_source_name || "—"}</td>
                  <td className="px-4 py-3.5 font-semibold text-emerald-700">{formatRupiah(item.deposit_balance)}</td>
                  <td className="px-4 py-3.5 text-center font-mono">{item.total_orders ?? 0}</td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge isActive={item.is_active} /></td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => { setFormData(toFormData(item)); setFormError(""); setModalOpen(true); }} className="rounded-lg border p-1.5 hover:border-amber-300 hover:bg-amber-50"><HiOutlinePencilSquare className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-lg border p-1.5 hover:border-rose-300 hover:bg-rose-50"><HiOutlineTrash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/95 shrink-0">
              <h3 className="font-bold text-sm">{formData.id ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}</h3>
              <button type="button" onClick={() => setModalOpen(false)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{formError}</div>}

              <FormSection title="Identitas">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Kode Pelanggan</label>
                    <input type="text" value={formData.customer_code} onChange={(e) => setFormData((p) => ({ ...p, customer_code: e.target.value.toUpperCase() }))} placeholder="Auto: CUSCG26080001" className={cn(inputCls, "font-mono")} />
                    <p className="mt-1 text-[10px] text-slate-400">Kosongkan untuk generate otomatis dari outlet pilihan</p>
                  </div>
                  <div><label className="block font-semibold mb-1">Nama Lengkap *</label><input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className={inputCls} required /></div>
                  <div><label className="block font-semibold mb-1">Telepon *</label><input type="tel" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} className={inputCls} required /></div>
                  <div><label className="block font-semibold mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className={inputCls} /></div>
                </div>
              </FormSection>

              <FormSection title="Alamat & Cabang">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2"><label className="block font-semibold mb-1">Alamat</label><textarea rows={2} value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} className={inputCls} /></div>
                  <div><label className="block font-semibold mb-1">Kota</label><input type="text" value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} className={inputCls} /></div>
                  <div><label className="block font-semibold mb-1">Kode Pos</label><input type="text" value={formData.postal_code} onChange={(e) => setFormData((p) => ({ ...p, postal_code: e.target.value }))} className={inputCls} /></div>
                  <div><label className="block font-semibold mb-1">Landmark</label><input type="text" value={formData.landmark} onChange={(e) => setFormData((p) => ({ ...p, landmark: e.target.value }))} className={inputCls} /></div>
                  <div><label className="block font-semibold mb-1">Cabang Favorit (teks)</label><input type="text" value={formData.home_branch} onChange={(e) => setFormData((p) => ({ ...p, home_branch: e.target.value }))} className={inputCls} /></div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1">Outlet Preferensi</label>
                    <select value={formData.preferred_outlet_id} onChange={(e) => setFormData((p) => ({ ...p, preferred_outlet_id: e.target.value }))} className={inputCls}>
                      <option value="">— Pilih Outlet —</option>
                      {outlets.map((o) => <option key={o.id} value={o.id}>{o.outlet_code} — {o.name}</option>)}
                    </select>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Tier & Catatan">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block font-semibold mb-1">Tier Spending</label><select value={formData.spending_tier_id} onChange={(e) => setFormData((p) => ({ ...p, spending_tier_id: e.target.value }))} className={inputCls}><option value="">— Pilih Tier —</option>{tiers.map((t) => <option key={t.id} value={t.id}>{t.label || t.name}</option>)}</select></div>
                  <div><label className="block font-semibold mb-1">Sumber Pelanggan</label><select value={formData.customer_source_id} onChange={(e) => setFormData((p) => ({ ...p, customer_source_id: e.target.value }))} className={inputCls}><option value="">— Pilih Sumber —</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}</select></div>
                  <div><label className="block font-semibold mb-1">Status</label><select value={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))} className={inputCls}><option value={1}>Aktif</option><option value={0}>Nonaktif</option></select></div>
                  <div className="sm:col-span-2"><label className="block font-semibold mb-1">Catatan</label><textarea rows={2} value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className={inputCls} /></div>
                </div>
                {formData.id && (
                  <p className="text-[10px] text-slate-400">Deposit, total order, dan membership aktif dikelola otomatis oleh sistem POS.</p>
                )}
              </FormSection>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 font-semibold text-white disabled:opacity-50">
                  {submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}Simpan
                </button>
              </div>
            </form>
          </div>
        </div>, document.body)}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-4 border">
            <h3 className="font-bold text-sm">Hapus {deleteTarget.name}?</h3>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border px-4 py-2 text-xs font-semibold">Batal</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">{deleting ? "Hapus..." : "Ya, Hapus"}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
