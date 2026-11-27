import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineTicket,
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
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
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

// Input rupiah: tampil dengan pemisah ribuan (1.000.000), nilai yang disimpan tetap angka murni.
function RupiahInput({ value, onChange, placeholder, disabled }) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  const shown = digits ? Number(digits).toLocaleString("id-ID") : "";
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={shown}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        className="w-full rounded-xl border pl-9 pr-3 py-2 tabular-nums outline-none focus:border-[#5f1340] disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}

function DiscountBadge({ type, value, max }) {
  if (type === "none") return <span className="text-slate-400 text-[11px]">Tanpa diskon</span>;
  if (type === "percentage") return <span className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700">{value}%{Number(max) > 0 ? ` · maks ${formatRupiah(max)}` : ""}</span>;
  return <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{formatRupiah(value)}</span>;
}

const MEMBER_TIERS = ["Gold", "Platinum", "Diamond"];
const TIER_STYLE = {
  Gold: "border-amber-200 bg-amber-50 text-amber-700",
  Platinum: "border-slate-300 bg-slate-100 text-slate-700",
  Diamond: "border-sky-200 bg-sky-50 text-sky-700",
};
const tierList = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((t) => t.trim()).filter((t) => MEMBER_TIERS.includes(t));

// Badge cakupan promo: outlet, tier member, otomatis, wajib potong saldo, layanan.
function ScopeBadges({ item }) {
  const tiers = tierList(item.member_tiers);
  const serviceCount = (item.service_ids || []).length;
  const pill = "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap";
  return (
    <div className="flex flex-wrap gap-1 max-w-[280px]">
      <span className={cn(pill, item.outlet_id ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-500")}>
        {item.outlet_id ? item.outlet_name || `Outlet #${item.outlet_id}` : "Semua outlet"}
      </span>
      {tiers.map((t) => <span key={t} className={cn(pill, TIER_STYLE[t])}>{t}</span>)}
      {Number(item.is_auto) === 1 && <span className={cn(pill, "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700")}>Otomatis (member)</span>}
      {Number(item.requires_member_balance) === 1 && <span className={cn(pill, "border-violet-200 bg-violet-50 text-violet-700")}>Wajib Potong Saldo</span>}
      <span className={cn(pill, serviceCount ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500")} title={item.service_names || ""}>
        {serviceCount ? `${serviceCount} layanan` : "Semua layanan"}
      </span>
    </div>
  );
}

// Pilih layanan promo (multi-select dengan pencarian). Kosong = semua layanan.
function ServicePicker({ services, value, onChange }) {
  const [q, setQ] = useState("");
  const selected = useMemo(() => new Set((value || []).map(Number)), [value]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return services.filter((x) => !s || `${x.code} ${x.name} ${x.category_name || ""}`.toLowerCase().includes(s));
  }, [services, q]);
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange([...next]);
  };
  const chosen = services.filter((x) => selected.has(Number(x.id)));
  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 p-2">
        {chosen.length === 0 ? (
          <span className="text-[11px] text-slate-400">Belum dipilih = berlaku untuk semua layanan</span>
        ) : (
          <>
            {chosen.map((x) => (
              <span key={x.id} className="inline-flex items-center gap-1 rounded-full bg-[#5f1340]/10 px-2 py-0.5 text-[10px] font-semibold text-[#5f1340]">
                {x.name}
                <button type="button" onClick={() => toggle(Number(x.id))}><HiOutlineXMark className="h-3 w-3" /></button>
              </span>
            ))}
            <button type="button" onClick={() => onChange([])} className="ml-auto text-[10px] font-bold text-rose-600 underline">Hapus semua</button>
          </>
        )}
      </div>
      <div className="relative border-b border-slate-100">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama layanan..." className="w-full py-2 pl-8 pr-3 outline-none" />
      </div>
      <div className="max-h-44 overflow-y-auto divide-y divide-slate-50">
        {filtered.length === 0 ? (
          <p className="p-3 text-center text-[11px] text-slate-400">Layanan tidak ditemukan</p>
        ) : filtered.map((x) => (
          <label key={x.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-slate-50">
            <input type="checkbox" checked={selected.has(Number(x.id))} onChange={() => toggle(Number(x.id))} className="accent-[#5f1340]" />
            <span className="flex-1 truncate">{x.name}{Number(x.is_active) !== 1 && <span className="ml-1 text-[10px] text-slate-400">(nonaktif)</span>}</span>
            <span className="font-mono text-[10px] text-slate-400">{x.code}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  id: null, code: "", name: "", discount_type: "none", discount_value: "", max_discount: "", description: "", sort_order: "", is_active: 1,
  outlet_id: "", member_tiers: [], is_auto: 0, requires_member_balance: 0, service_ids: [],
};

export default function Promo() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("sort_order");
  const [sortDir, setSortDir] = useState("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    api("/waschen/outlets?sortBy=name&sortDir=asc").then((res) => setOutlets(res.data || [])).catch(() => setOutlets([]));
    api("/waschen/services")
      .then((res) => setServices((res.data || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "id"))))
      .catch(() => setServices([]));
  }, []);

  const showToast = (message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (filterActive) query.set("isActive", filterActive);
      if (filterType) query.set("discountType", filterType);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);
      const res = await api(`/waschen/promos?${query.toString()}`);
      setData(res.data || []);
    } catch (err) { showToast(err.message, "error"); } finally { if (!silent) setLoading(false); }
  };

  useLiveRefresh(() => loadData(true));
  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, filterActive, filterType, sortBy, sortDir]);

  const handleSort = (col) => { if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) { setFormError("Kode dan Nama promo wajib diisi"); return; }
    setSubmitting(true); setFormError("");
    try {
      const payload = { ...formData, discount_value: Number(formData.discount_value) || 0, max_discount: Number(formData.max_discount) > 0 ? Number(formData.max_discount) : null, sort_order: Number(formData.sort_order) || 0, outlet_id: formData.outlet_id || null, member_tiers: tierList(formData.member_tiers), is_auto: Number(formData.is_auto) === 1 ? 1 : 0, requires_member_balance: Number(formData.requires_member_balance) === 1 ? 1 : 0, service_ids: (formData.service_ids || []).map(Number) };
      if (formData.id) {
        await api(`/waschen/promos/${formData.id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Promo berhasil diperbarui");
      } else {
        await api("/waschen/promos", { method: "POST", body: JSON.stringify(payload) });
        showToast("Promo berhasil ditambahkan");
      }
      setModalOpen(false); loadData();
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/promos/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Promo berhasil dihapus"); setDeleteTarget(null); loadData();
    } catch (err) { showToast(err.message, "error"); } finally { setDeleting(false); }
  };

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((d) => Number(d.is_active) === 1).length,
    withDiscount: data.filter((d) => d.discount_type !== "none").length,
  }), [data]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 2xl:px-12 space-y-6 max-w-[1920px] mx-auto">
      {toast && <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl", toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}><span>{toast.message}</span></div>}

      {/* Hero Header */}
      <PageHero>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Master Promo</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Kelola promo dan diskon untuk pelanggan
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFormData(EMPTY_FORM); setFormError(""); setModalOpen(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Tambah Promo
            </button>
          
        
      </PageHero>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ l: "Total Promo", v: stats.total }, { l: "Aktif", v: stats.active, c: "text-emerald-600" }, { l: "Berisi Diskon", v: stats.withDiscount, c: "text-violet-600" }].map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.l}</p><p className={cn("text-2xl font-bold mt-0.5", s.c || "text-slate-800")}>{s.v}</p></div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Cari kode, nama promo..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Semua Tipe</option><option value="none">Tanpa Diskon</option><option value="percentage">Persentase</option><option value="nominal">Nominal</option></select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Semua Status</option><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <SortTh col="code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama Promo" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Diskon</th>
                <th className="px-4 py-3">Berlaku</th>
                <th className="px-4 py-3">Deskripsi</th>
                <SortTh col="sort_order" label="Urutan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={9} className="px-4 py-4"><div className="h-3.5 bg-slate-200 rounded animate-pulse" /></td></tr>) : data.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Tidak ada data promo</td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{item.code}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3.5"><DiscountBadge type={item.discount_type} value={item.discount_value} max={item.max_discount} /></td>
                  <td className="px-4 py-3.5"><ScopeBadges item={item} /></td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">{item.description || "—"}</td>
                  <td className="px-4 py-3.5 text-center font-mono text-slate-500">{item.sort_order}</td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge isActive={item.is_active} /></td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => { setFormData({ ...item, discount_value: Number(item.discount_value), max_discount: Number(item.max_discount) > 0 ? Number(item.max_discount) : "", outlet_id: item.outlet_id ?? "", member_tiers: tierList(item.member_tiers), is_auto: Number(item.is_auto) === 1 ? 1 : 0, requires_member_balance: Number(item.requires_member_balance) === 1 ? 1 : 0, service_ids: item.service_ids || [] }); setFormError(""); setModalOpen(true); }} className="rounded-lg border p-1.5 hover:border-amber-300 hover:bg-amber-50"><HiOutlinePencilSquare className="h-4 w-4" /></button>
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
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl border overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm">{formData.id ? "Edit Promo" : "Tambah Promo"}</h3>
              <button type="button" onClick={() => setModalOpen(false)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{formError}</div>}
              <div><label className="block font-semibold mb-1">Kode Promo *</label><input type="text" value={formData.code} placeholder="Contoh: DISKON_MEMBER" onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))} className="w-full rounded-xl border px-3 py-2 font-mono uppercase outline-none focus:border-[#5f1340]" required /></div>
              <div><label className="block font-semibold mb-1">Nama Promo *</label><input type="text" value={formData.name} placeholder="Contoh: Diskon Member 90%" onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#5f1340]" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-semibold mb-1">Tipe Diskon</label><select value={formData.discount_type} onChange={(e) => setFormData((p) => ({ ...p, discount_type: e.target.value }))} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#5f1340]"><option value="none">Tanpa Diskon</option><option value="percentage">Persentase (%)</option><option value="nominal">Nominal (Rp)</option></select></div>
                <div><label className="block font-semibold mb-1">Nilai Diskon</label>{formData.discount_type === "nominal" ? <RupiahInput placeholder="Contoh: 10.000" value={formData.discount_value} onChange={(v) => setFormData((p) => ({ ...p, discount_value: v }))} /> : <input type="number" min="0" step="0.01" placeholder={formData.discount_type === "percentage" ? "Contoh: 90 (artinya 90%)" : formData.discount_type === "nominal" ? "Contoh: 10000" : "-"} disabled={formData.discount_type === "none"} value={formData.discount_value} onChange={(e) => setFormData((p) => ({ ...p, discount_value: e.target.value }))} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#5f1340] disabled:bg-slate-50 disabled:text-slate-400" />}</div>
              </div>
              {formData.discount_type === "percentage" && (
                <div><label className="block font-semibold mb-1">Maksimal Potongan (Rp)</label><RupiahInput placeholder="Kosongkan = tanpa batas" value={formData.max_discount} onChange={(v) => setFormData((p) => ({ ...p, max_discount: v }))} /><p className="mt-1 text-[10px] text-slate-400">Contoh: diskon 90% maksimal Rp 10.000. Potongan tidak akan melebihi angka ini.</p></div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Outlet</label>
                  <select value={formData.outlet_id ?? ""} onChange={(e) => setFormData((p) => ({ ...p, outlet_id: e.target.value }))} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#5f1340]">
                    <option value="">Semua outlet</option>
                    {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tier Member</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MEMBER_TIERS.map((t) => {
                      const on = tierList(formData.member_tiers).includes(t);
                      return (
                        <button key={t} type="button" onClick={() => setFormData((p) => { const cur = tierList(p.member_tiers); return { ...p, member_tiers: on ? cur.filter((x) => x !== t) : MEMBER_TIERS.filter((x) => x === t || cur.includes(x)) }; })} className={cn("rounded-full border px-3 py-1.5 text-[11px] font-bold transition", on ? TIER_STYLE[t] : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50")}>
                          {on ? "✓ " : ""}{t}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Tidak dipilih = semua customer.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
                  <span><span className="block font-semibold text-slate-800">Otomatis (promo member)</span><span className="text-[10px] text-slate-500">Diterapkan otomatis di POS, tidak dipilih kasir.</span></span>
                  <input type="checkbox" checked={Number(formData.is_auto) === 1} onChange={(e) => setFormData((p) => ({ ...p, is_auto: e.target.checked ? 1 : 0 }))} className="h-5 w-5 accent-[#5f1340]" />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
                  <span><span className="block font-semibold text-slate-800">Wajib bayar Potong Saldo Member</span><span className="text-[10px] text-slate-500">Promo hanya berlaku bila bayar dengan saldo member.</span></span>
                  <input type="checkbox" checked={Number(formData.requires_member_balance) === 1} onChange={(e) => setFormData((p) => ({ ...p, requires_member_balance: e.target.checked ? 1 : 0 }))} className="h-5 w-5 accent-[#5f1340]" />
                </label>
              </div>
              <div>
                <label className="block font-semibold mb-1">Layanan</label>
                <ServicePicker services={services} value={formData.service_ids} onChange={(ids) => setFormData((p) => ({ ...p, service_ids: ids }))} />
              </div>
              <div><label className="block font-semibold mb-1">Deskripsi</label><textarea rows={2} placeholder="Contoh: Diskon 90% untuk member, maksimal Rp 10.000 per nota" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#5f1340]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-semibold mb-1">Urutan</label><input type="number" min="0" placeholder="Contoh: 1 (angka kecil tampil lebih dulu)" value={formData.sort_order} onChange={(e) => setFormData((p) => ({ ...p, sort_order: e.target.value }))} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#5f1340]" /></div>
                <div><label className="block font-semibold mb-1">Status</label><select value={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#5f1340]"><option value={1}>Aktif</option><option value={0}>Nonaktif</option></select></div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 font-semibold text-white disabled:opacity-50">{submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}Simpan</button>
              </div>
            </form>
          </div>
        </div>, document.body)}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-4 border">
            <h3 className="font-bold text-sm">Hapus promo {deleteTarget.name}?</h3>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border px-4 py-2 text-xs font-semibold">Batal</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">{deleting ? "Hapus..." : "Ya, Hapus"}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
