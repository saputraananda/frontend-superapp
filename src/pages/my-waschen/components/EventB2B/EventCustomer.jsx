import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineArrowsUpDown,
  HiOutlinePhone,
  HiOutlineAdjustmentsHorizontal,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import { fmtDateShort, FILTER_SECTION, TABLE_SECTION } from "../../utils/hrisUtils";
import { cn, eventLabel, fmtIDR, useEventOutlets, useEventPeriod } from "./utils/eventUtils";

const PAGE_SIZE = 50;

const SELECT_CLS =
  "mt-1 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10";

function waHref(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return `https://wa.me/${digits}`;
}

function SortTh({ col, label, sortBy, sortDir, onSort, className = "" }) {
  const active = sortBy === col;
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-slate-100", active ? "text-[#5f1340] bg-[#5f1340]/10" : "text-slate-500", className)} onClick={() => onSort(col)}>
      <div className="flex items-center gap-1">{label}{active ? (sortDir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />) : <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />}</div>
    </th>
  );
}

/** Ringkasan satu customer event — gaya sama dengan laporan Master Customer. */
function CustomerReport({ item, onClose }) {
  const facts = [
    ["Telepon", item.phone],
    ["Email", item.email],
    ["Event", item.event_names],
    ["Alamat", item.address],
    ["Kota", item.city],
  ].filter(([, v]) => v != null && String(v).trim() !== "");
  const figures = [
    ["Dibayar", item.paid],
    ["Piutang", item.outstanding],
    ["Nota", null],
  ];
  const href = waHref(item.phone);
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <h3 className="text-xl font-bold tracking-tight text-slate-900">{item.name || "Customer"}</h3>
          <p className="mt-1 font-mono text-[11px] text-slate-400">{item.customer_code || "—"}</p>
        </div>
        <button type="button" aria-label="Tutup" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="rounded-2xl bg-gradient-to-br from-[#5f1340] to-[#3d0c2a] px-5 py-5 text-white">
          <p className="text-xs text-white/70">Total tagihan event</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{fmtIDR(item.billed)}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
            {figures.map(([label, val]) => (
              <div key={label}>
                <p className="text-[11px] text-white/60">{label}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  {val == null ? `${item.order_count ?? 0} nota` : fmtIDR(val)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Transaksi event pertama {fmtDateShort(item.first_order_at)}, terakhir {fmtDateShort(item.last_order_at)}.
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
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            <HiOutlinePhone className="h-3.5 w-3.5" />WhatsApp
          </a>
        )}
        <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-600">Tutup</button>
      </div>
    </>
  );
}

/** Data Customer Event — pelanggan yang bertransaksi di outlet event + ringkasan nota event-nya. */
export default function EventCustomer() {
  const events = useEventOutlets();
  const period = useEventPeriod();
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [eventOutletId, setEventOutletId] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [sortBy, setSortBy] = useState("last_order_at");
  const [sortDir, setSortDir] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams({ sortBy, sortDir, page: String(page), limit: String(PAGE_SIZE) });
      if (search) query.set("search", search);
      if (eventOutletId) query.set("eventOutletId", eventOutletId);
      if (outstandingOnly) query.set("outstandingOnly", "1");
      if (period.dateFrom) query.set("dateFrom", period.dateFrom);
      if (period.dateTo) query.set("dateTo", period.dateTo);
      const res = await api(`/waschen/event/customers?${query}`);
      setData(res.data || []);
      setTotals(res.totals || {});
      setTotal(Number(res.meta?.total) || 0);
      setError("");
    } catch (err) {
      if (!silent) setError(err.message || "Gagal memuat customer event");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => { setPage(1); }, [eventOutletId, outstandingOnly, sortBy, sortDir, period.dateFrom, period.dateTo]);
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, eventOutletId, outstandingOnly, sortBy, sortDir, period.dateFrom, period.dateTo]);
  useLiveRefresh(() => loadData(true));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSort = (col) => { if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };

  const stats = [
    { l: "Total Customer", v: Number(totals.customers) || 0 },
    { l: "Total Nota", v: Number(totals.orders) || 0, c: "text-[#5f1340]" },
    { l: "Total Tagihan", v: fmtIDR(totals.billed) },
    { l: "Sudah Dibayar", v: fmtIDR(totals.paid), c: "text-emerald-700" },
    { l: "Piutang", v: fmtIDR(totals.outstanding), c: "text-rose-600" },
    { l: "Customer Berpiutang", v: Number(totals.customers_outstanding) || 0, c: "text-amber-700" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[90rem] mx-auto">
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Data Customer Event</h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
            Pelanggan B2B yang bertransaksi di outlet event. Ubah data customer lewat Master Customer.
          </p>
        </div>
      </PageHero>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.l}</p>
            <p className={cn("text-xl sm:text-2xl font-bold mt-0.5 truncate", s.c || "text-slate-800")}>{s.v}</p>
          </div>
        ))}
      </div>

      <section className={FILTER_SECTION}>
        <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Filter Periode & Data</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Filter tanggal berdasarkan tanggal nota event. Default: periode cutoff berjalan.</p>
            </div>
          </div>
          <button type="button" aria-label="Muat ulang" onClick={() => loadData()} className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>

        <div className="space-y-3">
          <CutoffPeriodFilter
            cutoff={period.cutoff}
            allowAll
            showAll={period.allPeriods}
            onShowAllChange={period.setAllPeriods}
            allLabel="Tampilkan Semua"
            periodBadgePrefix="Nota"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cari
              <div className="relative mt-1">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Kode, nama, telepon..." className="block w-full min-w-0 rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10" />
              </div>
            </label>
            <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Event
              <select aria-label="Filter event" value={eventOutletId} onChange={(e) => setEventOutletId(e.target.value)} className={SELECT_CLS}>
                <option value="">Semua Event</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{eventLabel(ev)}</option>)}
              </select>
            </label>
            <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pembayaran
              <select aria-label="Filter pembayaran" value={outstandingOnly ? "1" : ""} onChange={(e) => setOutstandingOnly(e.target.value === "1")} className={SELECT_CLS}>
                <option value="">Semua Customer</option>
                <option value="1">Masih Ada Piutang</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center gap-2">
          <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className={TABLE_SECTION}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <SortTh col="customer_code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="phone" label="Telepon" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Event</th>
                <SortTh col="order_count" label="Nota" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <SortTh col="billed" label="Tagihan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="paid" label="Dibayar" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="outstanding" label="Piutang" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="first_order_at" label="Pertama" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="last_order_at" label="Terakhir" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={11} className="px-4 py-4"><div className="h-3.5 bg-slate-200 rounded animate-pulse" /></td></tr>
              )) : data.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">Tidak ada customer event</td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{item.customer_code || "—"}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{item.name || "—"}</p>
                    {(item.full_address || item.address) && (
                      <p className="mt-0.5 max-w-[16rem] text-[10px] leading-snug text-slate-500 line-clamp-2 break-words" title={item.full_address || item.address}>
                        {item.full_address || item.address}
                      </p>
                    )}
                    {item.city && <p className="text-[10px] text-slate-400 mt-0.5">{item.city}</p>}
                  </td>
                  <td className="px-4 py-3.5"><span className="inline-flex items-center gap-1 text-slate-600"><HiOutlinePhone className="h-3 w-3" />{item.phone || "—"}</span></td>
                  <td className="px-4 py-3.5 text-slate-600">{item.event_names || "—"}</td>
                  <td className="px-4 py-3.5 text-center font-mono">{item.order_count ?? 0}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">{fmtIDR(item.billed)}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-emerald-700">{fmtIDR(item.paid)}</td>
                  <td className={cn("px-4 py-3.5 whitespace-nowrap font-semibold", Number(item.outstanding) > 0 ? "text-rose-600" : "text-slate-400")}>{fmtIDR(item.outstanding)}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtDateShort(item.first_order_at)}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtDateShort(item.last_order_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
            <p className="text-[11px] text-slate-400">
              Hal <span className="font-semibold text-slate-600">{page}</span>/{totalPages}
              <span className="ml-1">({total} data)</span>
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

      {selected && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border overflow-hidden max-h-[92vh] flex flex-col">
            <CustomerReport item={selected} onClose={() => setSelected(null)} />
          </div>
        </div>, document.body)}
    </div>
  );
}
