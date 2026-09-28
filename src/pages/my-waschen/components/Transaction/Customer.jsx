import { useEffect, useState } from "react";
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
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineArrowsUpDown,
  HiOutlineSparkles,
  HiOutlinePhone,
  HiOutlineAdjustmentsHorizontal,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import { fmtDateShort, FILTER_SECTION, TABLE_SECTION } from "../../utils/hrisUtils";
import { FilterScroll, FilterPill } from "../HRIS/hrisShared";

const PAGE_SIZE = 50;

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function waHref(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return `https://wa.me/${digits}`;
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
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold border", colors[key] || "bg-slate-100 text-slate-700 border-slate-200")}>
      <HiOutlineSparkles className="h-3 w-3 shrink-0" />{name || "—"}
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
  total_spent: 0,
  spending_value_year: 0,
  monthly_spending: 0,
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

function filled(v) {
  return v != null && String(v).trim() !== "";
}

function CustomerReport({ item, onClose, onEdit }) {
  const facts = [
    ["Telepon", item.phone],
    ["Email", item.email],
    ["Outlet", item.preferred_outlet_name || item.preferred_outlet_full_name],
    ["Cabang", item.home_branch],
    ["Alamat", item.address],
    ["Kota", item.city],
    ["Kode pos", item.postal_code],
    ["Landmark", item.landmark],
    ["Sumber", item.customer_source_label || item.customer_source_name],
  ].filter(([, v]) => filled(v));
  const figures = [
    ["Tahun", item.spending_value_year],
    ["Periode", item.monthly_spending],
    ["Deposit", item.deposit_balance],
  ];
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">{item.name || "Customer"}</h3>
            <TierBadge name={item.spending_tier_name} code={item.spending_tier_code} />
            <StatusBadge isActive={item.is_active} />
          </div>
          <p className="mt-1 font-mono text-[11px] text-slate-400">{item.customer_code || "—"}</p>
        </div>
        <button type="button" aria-label="Tutup" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="rounded-2xl bg-gradient-to-br from-[#5f1340] to-[#3d0c2a] px-5 py-5 text-white">
          <p className="text-xs text-white/70">Total spending</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatRupiah(item.total_spent)}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
            {figures.map(([label, val]) => (
              <div key={label}>
                <p className="text-[11px] text-white/60">{label}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatRupiah(val)}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {item.total_orders ?? 0} order. Terdaftar {fmtDateShort(item.created_at)}. Transaksi terakhir {fmtDateShort(item.last_transaction_at)}.
        </p>
        {facts.length > 0 && (
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
            {facts.map(([label, val]) => (
              <div key={label} className="border-b border-slate-100 py-2.5">
                <dt className="text-[11px] text-slate-400">{label}</dt>
                <dd className="mt-0.5 text-sm text-slate-800">{val}</dd>
              </div>
            ))}
          </dl>
        )}
        {filled(item.notes) && <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.notes}</p>}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
        <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-600">Tutup</button>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 text-xs font-semibold text-white">
          <HiOutlinePencilSquare className="h-3.5 w-3.5" />Edit
        </button>
      </div>
    </>
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
    total_spent: Number(item.total_spent) || 0,
    spending_value_year: Number(item.spending_value_year) || 0,
    monthly_spending: Number(item.monthly_spending) || 0,
    customer_source_id: item.customer_source_id || "",
    notes: item.notes || "",
    is_active: Number(item.is_active) === 0 ? 0 : 1,
  };
}

export default function Customer() {
  const cutoff = useCutoffPeriod();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, active: 0, vip: 0, gold: 0, reguler: 0, oneTime: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [tiers, setTiers] = useState([]);
  const [sources, setSources] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterTierId, setFilterTierId] = useState("");
  const [filterOutletId, setFilterOutletId] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tierList, setTierList] = useState(null);
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

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (filterActive) query.set("isActive", filterActive);
      if (filterTierId) query.set("spendingTierId", filterTierId);
      if (filterOutletId) query.set("preferredOutletId", filterOutletId);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);
      if (cutoff.dateFrom) query.set("dateFrom", cutoff.dateFrom);
      if (cutoff.dateTo) query.set("dateTo", cutoff.dateTo);
      query.set("page", String(page));
      query.set("limit", String(PAGE_SIZE));
      const res = await api(`/waschen/customers?${query.toString()}`);
      setData(res.data || []);
      setMeta((m) => ({ ...m, ...(res.meta || {}) }));
    } catch (err) { if (!silent) showToast(err.message, "error"); } finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => { setPage(1); }, [filterActive, filterTierId, filterOutletId, sortBy, sortDir, cutoff.dateFrom, cutoff.dateTo]);
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterActive, filterTierId, filterOutletId, sortBy, sortDir, cutoff.dateFrom, cutoff.dateTo]);
  useLiveRefresh(() => loadData(true));
  const totalPages = Math.max(1, Math.ceil((Number(meta.total) || 0) / PAGE_SIZE));

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
        showToast("Customer berhasil diperbarui");
      } else {
        await api("/waschen/customers", { method: "POST", body: JSON.stringify(payload) });
        showToast("Customer berhasil ditambahkan");
      }
      setModalMode(null); loadData();
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/customers/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Customer berhasil dihapus"); setDeleteTarget(null); loadData();
    } catch (err) { showToast(err.message, "error"); } finally { setDeleting(false); }
  };

  const closeModal = () => setModalMode(null);
  const openView = (item) => { setSelected(item); setFormData(toFormData(item)); setFormError(""); setModalMode("view"); };
  const openEdit = (item) => {
    if (item) { setSelected(item); setFormData(toFormData(item)); }
    setFormError("");
    setModalMode("edit");
  };

  const openTierList = (card) => {
    const tier = tiers.find((t) => t.code === card.code);
    if (!tier) return;
    setTierList({ label: card.l, tierId: tier.id, page: 1, rows: [], total: 0, loading: true });
  };

  useEffect(() => {
    if (!tierList?.tierId) return undefined;
    let cancel = false;
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (filterActive) query.set("isActive", filterActive);
    if (filterOutletId) query.set("preferredOutletId", filterOutletId);
    query.set("spendingTierId", String(tierList.tierId));
    query.set("sortBy", "name");
    query.set("sortDir", "asc");
    query.set("page", String(tierList.page));
    query.set("limit", "50");
    api(`/waschen/customers?${query}`)
      .then((res) => {
        if (cancel) return;
        setTierList((t) => (t && String(t.tierId) === String(tierList.tierId) && t.page === tierList.page
          ? { ...t, loading: false, rows: res.data || [], total: Number(res.meta?.total) || 0 }
          : t));
      })
      .catch(() => { if (!cancel) setTierList((t) => (t ? { ...t, loading: false } : t)); });
    return () => { cancel = true; };
  }, [tierList?.tierId, tierList?.page, search, filterActive, filterOutletId]);

  const stats = meta;

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
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Master Customer</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Kelola data customer laundry Waschen
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setSelected(null); setFormData(EMPTY_FORM); setFormError(""); setModalMode("edit"); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Tambah Customer
            </button>
          
        
      </PageHero>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { l: "Total Customer", v: stats.total },
          { l: "Aktif", v: stats.active, c: "text-emerald-600" },
          { l: "Tier VIP", v: stats.vip, c: "text-purple-600", code: "VIP" },
          { l: "Gold", v: stats.gold, c: "text-amber-700", code: "GOLD" },
          { l: "Reguler", v: stats.reguler, c: "text-slate-700", code: "REGULER" },
          { l: "One-Time", v: stats.oneTime, c: "text-rose-600", code: "ONE_TIME" },
        ].map((s) => {
          const card = (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.l}</p>
              <p className={cn("text-2xl font-bold mt-0.5", s.c || "text-slate-800")}>{s.v}</p>
            </>
          );
          return s.code ? (
            <button key={s.l} type="button" onClick={() => openTierList(s)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#5f1340]/30">
              {card}
            </button>
          ) : (
            <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{card}</div>
          );
        })}
      </div>

      <section className={FILTER_SECTION}>
        <div className="mb-3 sm:mb-4 flex items-center gap-2">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Filter Periode & Data</h2>
            <p className="text-[11px] sm:text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
          </div>
        </div>

        <div className="space-y-3">
          <CutoffPeriodFilter cutoff={cutoff} />
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari kode, nama, telepon..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40" />
            </div>
            <select aria-label="Filter outlet" value={filterOutletId} onChange={(e) => setFilterOutletId(e.target.value)} className="sm:w-60 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40">
              <option value="">Semua Outlet</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <FilterScroll className="flex-1">
              <FilterPill active={!filterTierId} onClick={() => setFilterTierId("")}>Semua Tier</FilterPill>
              {tiers.map((t) => (
                <FilterPill key={t.id} active={String(filterTierId) === String(t.id)} onClick={() => setFilterTierId(String(t.id))}>{t.name}</FilterPill>
              ))}
            </FilterScroll>
            <FilterScroll className="shrink-0">
              {[["", "Semua Status"], ["1", "Aktif"], ["0", "Nonaktif"]].map(([v, l]) => (
                <FilterPill key={l} active={filterActive === v} onClick={() => setFilterActive(v)}>{l}</FilterPill>
              ))}
            </FilterScroll>
            <button type="button" aria-label="Muat ulang" onClick={() => loadData()} className="shrink-0 self-end sm:self-auto rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </section>

      <div className={TABLE_SECTION}>
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
                <SortTh col="total_spent" label="Total" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="spending_value_year" label="Tahun" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="monthly_spending" label="Periode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="total_orders" label="Order" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <SortTh col="created_at" label="Terdaftar" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="last_transaction_at" label="Transaksi" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={15} className="px-4 py-4"><div className="h-3.5 bg-slate-200 rounded animate-pulse" /></td></tr>
              )) : data.length === 0 ? (
                <tr><td colSpan={15} className="px-4 py-12 text-center text-slate-400">Tidak ada data customer</td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} onClick={() => openView(item)} className="cursor-pointer hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{item.customer_code || "—"}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{item.name || "—"}</p>
                    {item.city && <p className="text-[10px] text-slate-400 mt-0.5">{item.city}</p>}
                  </td>
                  <td className="px-4 py-3.5"><span className="inline-flex items-center gap-1 text-slate-600"><HiOutlinePhone className="h-3 w-3" />{item.phone || "—"}</span></td>
                  <td className="px-4 py-3.5 text-slate-600">{item.preferred_outlet_name || item.home_branch || "—"}</td>
                  <td className="px-4 py-3.5"><TierBadge name={item.spending_tier_name} code={item.spending_tier_code} /></td>
                  <td className="px-4 py-3.5 text-slate-600">{item.customer_source_label || item.customer_source_name || "—"}</td>
                  <td className="px-4 py-3.5 font-semibold text-emerald-700">{formatRupiah(item.deposit_balance)}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">{formatRupiah(item.total_spent)}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">{formatRupiah(item.spending_value_year)}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">{formatRupiah(item.monthly_spending)}</td>
                  <td className="px-4 py-3.5 text-center font-mono">{item.total_orders ?? 0}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtDateShort(item.created_at)}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtDateShort(item.last_transaction_at)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" aria-label={`Edit ${item.name}`} onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="rounded-lg border p-1.5 hover:border-[#5f1340]/30 hover:bg-[#5f1340]/5"><HiOutlinePencilSquare className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Hapus ${item.name}`} onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="rounded-lg border p-1.5 hover:border-rose-300 hover:bg-rose-50"><HiOutlineTrash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
            <p className="text-[11px] text-slate-400">
              Hal <span className="font-semibold text-slate-600">{page}</span>/{totalPages}
              <span className="ml-1">({meta.total} data)</span>
            </p>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <HiOutlineChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <HiOutlineChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalMode && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border overflow-hidden max-h-[92vh] flex flex-col">
            {modalMode !== "view" && (
              <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/95 shrink-0">
                <h3 className="font-bold text-sm">{formData.id ? "Edit Customer" : "Tambah Customer Baru"}</h3>
                <button type="button" onClick={closeModal}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
              </div>
            )}
            {modalMode === "view" && selected ? (
              <CustomerReport item={selected} onClose={closeModal} onEdit={() => openEdit()} />
            ) : (
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{formError}</div>}

              <FormSection title="Identitas">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Kode Customer</label>
                    <input type="text" value={formData.customer_code} onChange={(e) => setFormData((p) => ({ ...p, customer_code: e.target.value.toUpperCase() }))} placeholder="Auto: CUSCG26080001" className={cn(inputCls, "font-mono")} />
                    <p className="mt-1 text-[10px] text-slate-400">Kosongkan untuk generate otomatis dari outlet pilihan</p>
                  </div>
                  <div><label className="block font-semibold mb-1">Nama Lengkap *</label><input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Contoh: Angga Nurman" className={inputCls} required /></div>
                  <div><label className="block font-semibold mb-1">Telepon *</label><input type="tel" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} placeholder="Contoh: 087770597000 / +61421620240" className={inputCls} required /></div>
                  <div><label className="block font-semibold mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="Contoh: nama@email.com" className={inputCls} /></div>
                </div>
              </FormSection>

              <FormSection title="Alamat & Cabang">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2"><label className="block font-semibold mb-1">Alamat</label><textarea rows={2} value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} placeholder="Nama jalan / cluster, blok, nomor rumah" className={inputCls} /></div>
                  <div><label className="block font-semibold mb-1">Kota</label><input type="text" value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} placeholder="Contoh: Bogor" className={inputCls} /></div>
                  <div><label className="block font-semibold mb-1">Kode Pos</label><input type="text" value={formData.postal_code} onChange={(e) => setFormData((p) => ({ ...p, postal_code: e.target.value }))} placeholder="Contoh: 16968" className={inputCls} /></div>
                  <div><label className="block font-semibold mb-1">Landmark</label><input type="text" value={formData.landmark} onChange={(e) => setFormData((p) => ({ ...p, landmark: e.target.value }))} placeholder="Patokan, contoh: dekat masjid" className={inputCls} /></div>
                  <div><label className="block font-semibold mb-1">Cabang Favorit (teks)</label><input type="text" value={formData.home_branch} onChange={(e) => setFormData((p) => ({ ...p, home_branch: e.target.value }))} placeholder="Contoh: Waschen Laundry Citra Gran" className={inputCls} /></div>
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
                  <div><label className="block font-semibold mb-1">Total Spending</label><input readOnly value={formatRupiah(formData.total_spent)} className={cn(inputCls, "bg-slate-50 text-slate-500")} /></div>
                  <div><label className="block font-semibold mb-1">Spending Periode</label><input readOnly value={formatRupiah(formData.monthly_spending)} className={cn(inputCls, "bg-slate-50 text-slate-500")} /></div>
                  <div><label className="block font-semibold mb-1">Spending Tahun</label><input readOnly value={formatRupiah(formData.spending_value_year)} className={cn(inputCls, "bg-slate-50 text-slate-500")} /></div>
                  <div><label className="block font-semibold mb-1">Sumber Customer</label><select value={formData.customer_source_id} onChange={(e) => setFormData((p) => ({ ...p, customer_source_id: e.target.value }))} className={inputCls}><option value="">— Pilih Sumber —</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}</select></div>
                  <div><label className="block font-semibold mb-1">Status</label><select value={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))} className={inputCls}><option value={1}>Aktif</option><option value={0}>Nonaktif</option></select></div>
                  <div className="sm:col-span-2"><label className="block font-semibold mb-1">Catatan</label><textarea rows={2} value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} placeholder="Catatan tambahan tentang customer" className={inputCls} /></div>
                </div>
                {formData.id && (
                  <p className="text-[10px] text-slate-400">Deposit, total order, dan membership aktif dikelola otomatis oleh sistem POS.</p>
                )}
              </FormSection>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={closeModal} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 font-semibold text-white disabled:opacity-50">
                  {submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}Simpan
                </button>
              </div>
            </form>
            )}
          </div>
        </div>, document.body)}

      {tierList && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-sm font-bold">{tierList.label}</h3>
                <p className="text-[11px] text-slate-400">{tierList.total} customer</p>
              </div>
              <button type="button" aria-label="Tutup" onClick={() => setTierList(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {tierList.loading ? (
                <p className="px-5 py-8 text-center text-xs text-slate-400">Memuat...</p>
              ) : tierList.rows.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-slate-400">Tidak ada customer</p>
              ) : tierList.rows.map((c) => {
                const href = waHref(c.phone);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{c.name || "—"}</p>
                      <p className="truncate text-[11px] text-slate-400">{c.preferred_outlet_name || c.home_branch || "—"}</p>
                    </div>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0 font-mono text-[11px] text-emerald-700 hover:underline">{c.phone}</a>
                    ) : (
                      <span className="shrink-0 text-[11px] text-slate-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
            {tierList.total > 50 && (
              <div className="flex items-center justify-between border-t px-5 py-3">
                <p className="text-[11px] text-slate-400">Hal {tierList.page}/{Math.max(1, Math.ceil(tierList.total / 50))}</p>
                <div className="flex gap-1">
                  <button type="button" disabled={tierList.page <= 1 || tierList.loading} onClick={() => setTierList((t) => (t ? { ...t, page: t.page - 1, loading: true } : t))} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Sebelumnya</button>
                  <button type="button" disabled={tierList.page >= Math.ceil(tierList.total / 50) || tierList.loading} onClick={() => setTierList((t) => (t ? { ...t, page: t.page + 1, loading: true } : t))} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Berikutnya</button>
                </div>
              </div>
            )}
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
