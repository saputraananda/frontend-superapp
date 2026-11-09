import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineArrowsUpDown,
  HiOutlineAdjustmentsHorizontal,
  HiOutlinePaperClip,
  HiOutlinePhone,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import { fmtDateShort, FILTER_SECTION, TABLE_SECTION } from "../../utils/hrisUtils";

const PAGE_SIZE_OPTIONS = [25, 50, 100, "all"];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatRupiah(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val) || 0);
}

const TIER_COLORS = {
  GOLD: "bg-amber-50 text-amber-800 border-amber-200",
  DIAMOND: "bg-sky-50 text-sky-800 border-sky-200",
};

function TierBadge({ tier }) {
  if (!tier) return <span className="text-slate-300">—</span>;
  const key = String(tier).toUpperCase();
  return (
    <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold", TIER_COLORS[key] || "border-slate-200 bg-slate-100 text-slate-700")}>
      {key}
    </span>
  );
}

function StatusBadge({ expired }) {
  const isExpired = Number(expired) === 1;
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", isExpired ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      {isExpired ? "Berakhir" : "Aktif"}
    </span>
  );
}

/** Alamat lengkap bila ada, kalau tidak alamat + kota. */
function addressOf(row) {
  return row.full_address || [row.address, row.city].filter(Boolean).join(", ");
}

/** Sisa masa berlaku: "12 hari lagi" / "berakhir 5 hari lalu". */
function daysLeftLabel(row) {
  const d = Number(row.days_left);
  if (!Number.isFinite(d) || !row.end_date) return null;
  if (d > 0) return `${d} hari lagi`;
  if (d === 0) return "berakhir hari ini";
  return `berakhir ${Math.abs(d)} hari lalu`;
}

function SortTh({ col, label, sortBy, sortDir, onSort, className = "" }) {
  const active = sortBy === col;
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-slate-100", active ? "text-[#5f1340] bg-[#5f1340]/10" : "text-slate-500", className)} onClick={() => onSort(col)}>
      <div className="flex items-center gap-1">{label}{active ? (sortDir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />) : <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />}</div>
    </th>
  );
}

/** Catatan migrasi: "Pembelian e-money Smartlink | nota XXX | MEMBER GOLD | keterangan" → nota, label paket, sisa. */
function parseTopupNotes(notes) {
  const parts = String(notes || "").split("|").map((p) => p.trim()).filter(Boolean);
  const nota = parts.find((p) => /^nota\s/i.test(p))?.replace(/^nota\s+/i, "") || null;
  const label = parts.find((p) => /^(member|top\s*up)/i.test(p)) || null;
  const rest = parts.filter((p) => !/^nota\s/i.test(p) && p !== label && !/^pembelian e-money/i.test(p)).join(" · ");
  return { nota, label, rest, source: /smartlink/i.test(notes || "") ? "Smartlink" : null };
}

function PaymentHistory({ customerId, onLoaded }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    api(`/waschen/memberships/${customerId}/payments`)
      .then((res) => { if (alive) { setRows(res.data || []); onLoaded?.(res.data || []); } })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (rows === null) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>;
  }
  if (!rows.length) {
    return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">Belum ada riwayat top-up.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
      {rows.map((r) => {
        const url = r.payment_proof_url;
        const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url || "");
        const n = parseTopupNotes(r.notes);
        return (
          <li key={r.id} className="flex items-center gap-4 bg-white px-4 py-3 hover:bg-slate-50/70">
            <div className="w-24 shrink-0 text-xs">
              <p className="font-semibold text-slate-800">{fmtDateShort(r.created_at)}</p>
              <p className="text-[10px] text-slate-400">{r.payment_method || "—"}</p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800">{r.package_name || "Top-up saldo"}</span>
                {n.label && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{n.label}</span>}
                {n.source && <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">{n.source}</span>}
              </div>
              {(n.nota || n.rest) && (
                <p className="mt-0.5 truncate text-[11px] text-slate-400" title={r.notes}>
                  {n.nota && <>Nota <span className="font-mono text-slate-500">{n.nota}</span></>}
                  {n.nota && n.rest ? " · " : ""}
                  {n.rest}
                </p>
              )}
            </div>
            <p className="w-28 shrink-0 text-right text-sm font-bold text-emerald-700">{formatRupiah(r.amount)}</p>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" title="Lihat bukti pembayaran" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-[#5f1340]/40">
                {isImage ? <img src={url} alt="Bukti pembayaran" loading="lazy" className="h-full w-full object-cover" /> : <HiOutlinePaperClip className="h-4 w-4 text-slate-400" />}
              </a>
            ) : (
              <span className="hidden h-10 w-10 shrink-0 sm:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-xs">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function MembershipDetail({ row, onClose }) {
  const [history, setHistory] = useState(null);
  const left = daysLeftLabel(row);
  const expired = Number(row.expired) === 1;
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#5f1340] to-[#7c1d54] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight sm:text-2xl">{row.name || "Customer"}</h3>
                <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase text-[#5f1340]">{row.package_tier || "Tanpa Paket"}</span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", expired ? "bg-rose-500 text-white" : "bg-emerald-400/90 text-emerald-950")}>
                  {expired ? "Berakhir" : "Aktif"}
                </span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
                <span className="font-mono">{row.customer_code || "—"}</span>
                {row.phone && <span className="inline-flex items-center gap-1"><HiOutlinePhone className="h-3.5 w-3.5" />{row.phone}</span>}
                {row.outlet_name && <span>{row.outlet_name}</span>}
              </p>
            </div>
            <button type="button" aria-label="Tutup" onClick={onClose} className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Total top-up", formatRupiah(row.total_topup)],
              ["Saldo deposit", formatRupiah(row.deposit_balance)],
              ["Berakhir", row.end_date ? fmtDateShort(row.end_date) : "—"],
              ["Masa berlaku", left || "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/10 px-3.5 py-2.5 ring-1 ring-white/15">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{k}</p>
                <p className="mt-0.5 text-sm font-bold sm:text-base">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[18rem_1fr] lg:overflow-hidden">
          <aside className="border-b border-slate-200 bg-slate-50/60 px-6 py-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Detail membership</p>
            <dl className="divide-y divide-slate-200/70">
              <InfoRow label="Paket">{row.package_name || "—"}</InfoRow>
              <InfoRow label="Mulai">{fmtDateShort(row.start_date)}</InfoRow>
              <InfoRow label="Berakhir">{row.end_date ? fmtDateShort(row.end_date) : "—"}</InfoRow>
              <InfoRow label="Status"><StatusBadge expired={row.expired} /></InfoRow>
              <InfoRow label="Outlet">{row.outlet_name || "—"}</InfoRow>
              <InfoRow label="Telepon">{row.phone || "—"}</InfoRow>
              <InfoRow label="Alamat"><span className="break-words">{addressOf(row) || "—"}</span></InfoRow>
            </dl>
          </aside>
          <section className="px-6 py-5 lg:overflow-y-auto">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Riwayat top-up & bukti pembayaran</p>
              {history && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">{history.length} transaksi</span>}
            </div>
            <PaymentHistory customerId={row.customer_id} onLoaded={setHistory} />
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Membership() {
  const cutoff = useCutoffPeriod();
  const [allPeriods, setAllPeriods] = useState(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, active: 0, expired: 0, topUpTotal: 0, tiers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [outletId, setOutletId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("start_date");
  const [sortDir, setSortDir] = useState("desc");
  const [outlets, setOutlets] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    Promise.all([api("/waschen/outlets"), api("/waschen/membership-packages?isActive=1")])
      .then(([o, p]) => { setOutlets(o.data || []); setPackages(p.data || []); })
      .catch(() => { /* filter opsional */ });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filter berubah → halaman 1
  const filterKey = JSON.stringify([search, outletId, packageId, status, sortBy, sortDir, allPeriods, cutoff.dateFrom, cutoff.dateTo, pageSize]);
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    setPage(1);
  }, [filterKey]);

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(""); }
    const reqId = ++reqIdRef.current;
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(pageSize), sortBy, sortDir });
      if (search) qs.set("search", search);
      if (outletId) qs.set("outletId", outletId);
      if (packageId) qs.set("packageId", packageId);
      if (status) qs.set("status", status);
      if (!allPeriods && cutoff.dateFrom) qs.set("dateFrom", cutoff.dateFrom);
      if (!allPeriods && cutoff.dateTo) qs.set("dateTo", cutoff.dateTo);
      const res = await api(`/waschen/memberships?${qs}`);
      if (reqId !== reqIdRef.current) return;
      setRows(res.data || []);
      setMeta((m) => ({ ...m, ...(res.meta || {}) }));
    } catch (err) {
      if (silent || reqId !== reqIdRef.current) return;
      setError(err.message || "Gagal memuat data membership");
      setRows([]);
    } finally {
      if (!silent && reqId === reqIdRef.current) setLoading(false);
    }
  }, [page, pageSize, search, outletId, packageId, status, sortBy, sortDir, allPeriods, cutoff.dateFrom, cutoff.dateTo]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(() => load(true));

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  };

  const perPage = pageSize === "all" ? Math.max(1, Number(meta.total) || 1) : pageSize;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil((Number(meta.total) || 0) / perPage));
  const selectCls = "mt-1 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10";

  const statCards = [
    { l: "Total Member", v: meta.total },
    { l: "Aktif", v: meta.active, c: "text-emerald-600" },
    { l: "Berakhir", v: meta.expired, c: "text-rose-600" },
    ...(meta.tiers || []).map((t) => ({ l: `Paket ${t.tier}`, v: t.count, c: "text-amber-700" })),
    { l: "Total Top-up", v: formatRupiah(meta.topUpTotal), c: "text-slate-700", small: true },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[90rem] mx-auto">
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Data Membership</h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
            Pantau member Waschen: masa berlaku, paket, dan riwayat top-up
          </p>
        </div>
      </PageHero>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.l}</p>
            <p className={cn("mt-0.5 font-bold", s.small ? "text-lg" : "text-2xl", s.c || "text-slate-800")}>{s.v ?? 0}</p>
          </div>
        ))}
      </div>

      <section className={FILTER_SECTION}>
        <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 sm:text-base">Filter Periode & Data</h2>
              <p className="text-[11px] text-slate-500 sm:text-xs">Filter tanggal berdasarkan tanggal mulai membership. Default: tampilkan semua.</p>
            </div>
          </div>
          <button type="button" aria-label="Muat ulang" onClick={() => load()} className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
        <div className="space-y-3">
          <CutoffPeriodFilter
            cutoff={cutoff}
            allowAll
            showAll={allPeriods}
            onShowAllChange={setAllPeriods}
            allLabel="Tampilkan Semua"
            periodBadgePrefix="Mulai"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cari
              <div className="relative mt-1">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Kode, nama, telepon..." className="block w-full min-w-0 rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10" />
              </div>
            </label>
            <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Outlet
              <select aria-label="Filter outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)} className={selectCls}>
                <option value="">Semua Outlet</option>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Paket
              <select aria-label="Filter paket" value={packageId} onChange={(e) => setPackageId(e.target.value)} className={selectCls}>
                <option value="">Semua Paket</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name || p.tier}</option>)}
              </select>
            </label>
            <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Status
              <select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                <option value="">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="berakhir">Berakhir</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</p>}

      <div className={TABLE_SECTION}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3 text-center">No</th>
                <SortTh col="customer_code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3">Outlet</th>
                <SortTh col="tier" label="Paket" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Status</th>
                <SortTh col="start_date" label="Mulai" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="end_date" label="Berakhir" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="total_topup" label="Total Top-up" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="deposit_balance" label="Saldo Deposit" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={11} className="px-4 py-4"><div className="h-3.5 animate-pulse rounded bg-slate-200" /></td></tr>
              )) : rows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">Tidak ada data membership</td></tr>
              ) : rows.map((r, idx) => (
                <tr key={r.membership_id} onClick={() => setSelected(r)} className="cursor-pointer hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{(page - 1) * perPage + idx + 1}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{r.customer_code || "—"}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{r.name || "—"}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500"><HiOutlinePhone className="h-3 w-3" />{r.phone || "—"}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    <p className="max-w-[16rem] break-words text-[11px] leading-snug line-clamp-2" title={addressOf(r)}>{addressOf(r) || "—"}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{r.outlet_name || "—"}</td>
                  <td className="px-4 py-3.5">
                    <TierBadge tier={r.package_tier} />
                  </td>
                  <td className="px-4 py-3.5"><StatusBadge expired={r.expired} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{fmtDateShort(r.start_date)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                    {fmtDateShort(r.end_date)}
                    {daysLeftLabel(r) && <p className={cn("text-[10px]", Number(r.expired) === 1 ? "text-rose-500" : "text-slate-400")}>{daysLeftLabel(r)}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">{formatRupiah(r.total_topup)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-emerald-700">{formatRupiah(r.deposit_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] text-slate-500">
              Tampilkan
              <select
                aria-label="Jumlah baris per halaman"
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40"
              >
                {PAGE_SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o === "all" ? "Semua" : o}</option>)}
              </select>
            </label>
            <p className="text-[11px] text-slate-400">
              {pageSize === "all" ? (
                <>Menampilkan semua <span className="font-semibold text-slate-600">{meta.total}</span> member</>
              ) : (
                <>Hal <span className="font-semibold text-slate-600">{page}</span>/{totalPages} ({meta.total} member)</>
              )}
            </p>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <HiOutlineChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <HiOutlineChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && <MembershipDetail row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
